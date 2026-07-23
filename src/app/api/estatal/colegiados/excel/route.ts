import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireApiAuth } from "@/lib/apiAuth";
import { query } from "@/lib/db";

// ─── Colour palette (MARO brand) ─────────────────────────────────────────────
const TEAL_DARK = "0F4737" as const;
const TEAL_MID = "1A6B56" as const;
const TEAL_LIGHT = "E6F2EE" as const;
const GRAY_HEADER = "374151" as const;
const GRAY_ROW_ALT = "F9FAFB" as const;
const WHITE = "FFFFFF" as const;
const BORDER_COLOR = "D1D5DB" as const;
const RED_BG = "FEE2E2" as const;
const RED_TEXT = "991B1B" as const;
const AMBER_TEXT = "92400E" as const;

function thinBorder(color = BORDER_COLOR): Partial<ExcelJS.Border> {
  return { style: "thin", color: { argb: "FF" + color } };
}

function applyBorders(cell: ExcelJS.Cell) {
  const b = thinBorder();
  cell.border = { top: b, left: b, bottom: b, right: b };
}

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + argb } };
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function parseFocosDeAlerta(row: any): string {
  const focos: string[] = [];

  if (row.fondo_uterino_acorde_sdg === 1) focos.push("Fondo uterino no acorde a SDG");
  if (row.ivu_repeticion === 1) focos.push("IVU de repetición");
  
  if (row.estado_conciencia && row.estado_conciencia !== "alerta") {
    focos.push(`Estado conciencia: ${row.estado_conciencia}`);
  }
  if (row.hemorragia && row.hemorragia !== "ausente") {
    focos.push(`Hemorragia: ${row.hemorragia}`);
  }
  if (row.respiracion && row.respiracion !== "normal") {
    focos.push(`Respiración: ${row.respiracion}`);
  }
  if (row.color_piel && row.color_piel !== "normal") {
    focos.push(`Color piel: ${row.color_piel}`);
  }

  // Agregamos alertas para signos vitales extremos (simulación de lógica)
  if (Number(row.ta_sistolica) >= 140 || Number(row.ta_diastolica) >= 90) {
    focos.push(`TA Alta (${row.ta_sistolica}/${row.ta_diastolica})`);
  } else if (Number(row.ta_sistolica) <= 90 && Number(row.ta_sistolica) > 0) {
    focos.push(`TA Baja (${row.ta_sistolica}/${row.ta_diastolica})`);
  }

  if (Number(row.frecuencia_cardiaca) > 100 || (Number(row.frecuencia_cardiaca) < 60 && Number(row.frecuencia_cardiaca) > 0)) {
    focos.push(`FC Anormal (${row.frecuencia_cardiaca})`);
  }

  if (Number(row.temperatura) >= 38) {
    focos.push(`Fiebre (${row.temperatura}°C)`);
  }

  return focos.length > 0 ? focos.join(", ") : "Sin focos clínicos específicos reportados";
}

async function hasColumn(columnName: string) {
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM consultas_prenatales LIKE '${columnName}'`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const authResult = await requireApiAuth(request, 3);
  if (!authResult.ok) return authResult.response;

  try {
    const [hasColegiado, hasFechaColegiado] = await Promise.all([
      hasColumn("colegiado"),
      hasColumn("fecha_colegiado"),
    ]);

    if (!hasColegiado) {
      return NextResponse.json({ error: "La columna colegiado no existe" }, { status: 400 });
    }

    const fechaColegiadoExpr = hasFechaColegiado
      ? "c.fecha_colegiado"
      : "c.updated_at";

    // 1. Obtener los pacientes colegiados con detalles de su consulta
    const querySQL = `
      SELECT
          c.id AS consulta_id,
          c.fecha_consulta,
          ${fechaColegiadoExpr} AS fecha_colegiado,
          c.puntaje_total_consulta,
          c.riesgo_25_plus,
          c.ta_sistolica, c.ta_diastolica, c.frecuencia_cardiaca, c.temperatura,
          c.fondo_uterino_acorde_sdg, c.ivu_repeticion, c.estado_conciencia, c.hemorragia, c.respiracion, c.color_piel,
          cp.region,
          cp.municipio,
          cp.unidad,
          cp.clues_id,
          cp.nombre_completo,
          cp.semanas_gestacion,
          cp.sdg_ingreso,
          plan.id AS plan_id
       FROM consultas_prenatales c
       INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
       LEFT JOIN colegiados_planes plan ON plan.consulta_id = c.id
       WHERE COALESCE(c.colegiado, 0) = 1
       ORDER BY fecha_colegiado DESC, c.id DESC
    `;

    const rows = await query<any[]>(querySQL);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No hay pacientes colegiados para exportar" }, { status: 404 });
    }

    // Obtener las acciones de los planes en un solo query si existen planes
    const planIds = rows.map((r) => r.plan_id).filter(Boolean);
    let accionesMap = new Map<number, string>();

    if (planIds.length > 0) {
      const accionesQuery = `
        SELECT plan_id, descripcion, cumplido, nivel_atencion
        FROM colegiados_acciones
        WHERE plan_id IN (${planIds.join(",")})
        ORDER BY plan_id, FIELD(nivel_atencion, 'primer_nivel', 'segundo_nivel', 'tercer_nivel'), orden ASC
      `;
      const acciones = await query<any[]>(accionesQuery);
      
      acciones.forEach((a) => {
        const text = `[${a.nivel_atencion.replace('_', ' ')}] ${a.descripcion} (${a.cumplido ? 'Cumplida' : 'Pendiente'})`;
        if (accionesMap.has(a.plan_id)) {
          accionesMap.set(a.plan_id, accionesMap.get(a.plan_id) + "\n" + text);
        } else {
          accionesMap.set(a.plan_id, text);
        }
      });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "MARO Hub";
    wb.created = new Date();

    const ws = wb.addWorksheet("Pacientes Colegiados", {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
      properties: { tabColor: { argb: "FF" + TEAL_DARK } },
    });

    ws.columns = [
      { key: "num",           width: 5  },
      { key: "fechaCol",      width: 15 },
      { key: "region",        width: 15 },
      { key: "municipio",     width: 18 },
      { key: "clues",         width: 14 },
      { key: "unidad",        width: 25 },
      { key: "paciente",      width: 30 },
      { key: "sdg",           width: 8  },
      { key: "puntaje",       width: 10 },
      { key: "focos",         width: 40 },
      { key: "acciones",      width: 50 },
    ];

    const totalCols = ws.columns.length;

    // Título
    const titleRow = ws.addRow(["MARO · Pacientes Colegiados"]);
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = titleRow.getCell(1);
    titleCell.fill = fill(TEAL_DARK);
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + WHITE } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 40;

    // Subtítulo
    const generadoText = `Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`;
    const subtitleRow = ws.addRow([generadoText]);
    ws.mergeCells(2, 1, 2, totalCols);
    const subCell = subtitleRow.getCell(1);
    subCell.fill = fill(GRAY_HEADER);
    subCell.font = { name: "Calibri", size: 9, color: { argb: "FFCBD5E1" } };
    subCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    subtitleRow.height = 18;

    // Resumen
    const total = rows.length;
    const altoRiesgo = rows.filter((r) => Number(r.puntaje_total_consulta) >= 25).length;
    const statsText = `Total de casos colegiados: ${total}   ·   En Alto Riesgo Obstétrico (≥ 25 pts): ${altoRiesgo}`;
    const statsRow = ws.addRow([statsText]);
    ws.mergeCells(3, 1, 3, totalCols);
    const statsCell = statsRow.getCell(1);
    statsCell.fill = fill(TEAL_MID);
    statsCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF" + WHITE } };
    statsCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    statsRow.height = 16;

    // Cabeceras
    const headers = [
      "#", "Fecha Colegiado", "Región", "Municipio", "CLUES", "Unidad", "Paciente", "SDG", "Puntaje Riesgo", "Focos de Alerta", "Acciones Solicitadas"
    ];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = fill(TEAL_DARK);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + WHITE } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyBorders(cell);
    });
    headerRow.height = 22;

    // Filas
    rows.forEach((r, idx) => {
      const scoreTotal = Number(r.puntaje_total_consulta) || 0;
      const esAltoRiesgo = scoreTotal >= 25;
      const accionesTexto = r.plan_id && accionesMap.has(r.plan_id) ? accionesMap.get(r.plan_id) : "Sin acciones registradas";
      
      const rowData = [
        idx + 1,
        formatDate(r.fecha_colegiado || r.fecha_consulta),
        r.region || "—",
        r.municipio || "—",
        r.clues_id || "—",
        r.unidad || "—",
        r.nombre_completo || "—",
        r.semanas_gestacion ?? r.sdg_ingreso ?? "—",
        scoreTotal,
        parseFocosDeAlerta(r),
        accionesTexto
      ];

      const dataRow = ws.addRow(rowData);
      
      // Auto-ajustar alto por los textos largos en "focos" y "acciones"
      dataRow.height = -1; // -1 en ExcelJS indica calcular auto-height, aunque la mejor forma es solo wrapText.

      const rowFill: ExcelJS.Fill = esAltoRiesgo
        ? fill(RED_BG)
        : idx % 2 === 0
          ? fill(WHITE)
          : fill(GRAY_ROW_ALT);

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = rowFill;
        cell.font = { name: "Calibri", size: 10 };
        cell.alignment = { vertical: "middle", wrapText: true };
        applyBorders(cell);

        if (colNum === 1) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          cell.font = { ...cell.font, color: { argb: "FF9CA3AF" }, size: 9 };
        }
        if ([2, 3, 5, 8, 9].includes(colNum)) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
        }
        
        if (colNum === 9) { // Puntaje
          if (typeof cell.value === "number") {
            if (esAltoRiesgo) {
              cell.font = { ...cell.font, bold: true, color: { argb: "FF" + RED_TEXT } };
            } else if (cell.value >= 15) {
              cell.font = { ...cell.font, color: { argb: "FF" + AMBER_TEXT } };
            }
          }
        }
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-pacientes-colegiados-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generando Excel de colegiados:", error);
    return NextResponse.json({ error: "No se pudo generar el archivo Excel" }, { status: 500 });
  }
}
