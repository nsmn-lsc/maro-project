import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireApiAuth } from "@/lib/apiAuth";

// ─── Colour palette (MARO brand) ─────────────────────────────────────────────
const TEAL_DARK = "0F4737" as const;
const TEAL_MID = "1A6B56" as const;
const TEAL_LIGHT = "E6F2EE" as const;
const AMBER_BG = "FEF3C7" as const;
const AMBER_TEXT = "92400E" as const;
const RED_BG = "FEE2E2" as const;
const RED_TEXT = "991B1B" as const;
const GREEN_TEXT = "065F46" as const;
const GRAY_HEADER = "374151" as const;
const GRAY_ROW_ALT = "F9FAFB" as const;
const WHITE = "FFFFFF" as const;
const BORDER_COLOR = "D1D5DB" as const;

type RegistroRow = {
  folio?: string;
  nombre_completo?: string;
  region?: string;
  municipio?: string;
  unidad?: string;
  clues_id?: string;
  fecha_consulta?: string;
  consulta_creada?: string;
  origen_alerta?: string;
  motivo_alerta?: string;
  puntaje_total_consulta?: number | string;
  puntaje_real_sin_forzar?: number | string;
  colegiado?: number | string;
  alerta_por_criterio_clinico?: number | string;
};

type RequestBody = {
  rows: RegistroRow[];
  fechaDesde?: string;
  fechaHasta?: string;
  region?: string;
  unidad?: string;
  colegiadoFilter?: string;
  origenFilter?: string;
};

function formatDate(value: string | null | undefined): string {
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

export async function POST(request: Request) {
  const authResult = await requireApiAuth(request, 3);
  if (!authResult.ok) return authResult.response;

  try {
    const body: RequestBody = await request.json();
    const { rows, fechaDesde, fechaHasta, region, unidad, colegiadoFilter, origenFilter } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No hay datos para exportar" }, { status: 400 });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "MARO Hub";
    wb.created = new Date();

    const ws = wb.addWorksheet("Casos MARO", {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      headerFooter: {
        oddHeader: "&L&\"Calibri,Bold\"&9MARO – Sistema de Monitoreo de Alto Riesgo Obstétrico&R&9Página &P de &N",
        oddFooter: "&C&9Documento generado automáticamente. Uso interno del sistema MARO.",
      },
      views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
      properties: { tabColor: { argb: "FF" + TEAL_DARK } },
    });

    // ─── Column definitions ────────────────────────────────────────────────────
    ws.columns = [
      { key: "num",     width: 5  },
      { key: "folio",   width: 14 },
      { key: "nombre",  width: 30 },
      { key: "region",  width: 14 },
      { key: "municipio", width: 18 },
      { key: "unidad",  width: 22 },
      { key: "clues",   width: 12 },
      { key: "fecha",   width: 12 },
      { key: "origen",  width: 16 },
      { key: "motivo",  width: 28 },
      { key: "puntajeTotal", width: 12 },
      { key: "puntajeReal",  width: 12 },
      { key: "colegiado",    width: 12 },
    ];

    const totalCols = ws.columns.length; // 13


    // ─── Row 1: Title ──────────────────────────────────────────────────────────
    const titleRow = ws.addRow(["MARO · Reporte Estatal — Pacientes en Alto Riesgo Obstétrico"]);
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = titleRow.getCell(1);
    titleCell.fill = fill(TEAL_DARK);
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + WHITE } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 28;

    // ─── Row 2: Subtitle / filter info ────────────────────────────────────────
    const filtros: string[] = [];
    if (region) filtros.push(`Región: ${region}`);
    if (unidad) filtros.push(`Unidad: ${unidad}`);
    if (colegiadoFilter && colegiadoFilter !== "todos")
      filtros.push(colegiadoFilter === "colegiados" ? "Solo colegiados" : "Sin colegiar");
    if (origenFilter && origenFilter !== "todos")
      filtros.push(origenFilter === "criterio" ? "Origen: Criterio clínico" : "Origen: Puntaje");
    if (fechaDesde) filtros.push(`Desde: ${fechaDesde}`);
    if (fechaHasta) filtros.push(`Hasta: ${fechaHasta}`);

    const generadoText =
      `Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}` +
      (filtros.length ? `   ·   Filtros: ${filtros.join(" | ")}` : "   ·   Sin filtros adicionales");

    const subtitleRow = ws.addRow([generadoText]);
    ws.mergeCells(2, 1, 2, totalCols);
    const subCell = subtitleRow.getCell(1);
    subCell.fill = fill(GRAY_HEADER);
    subCell.font = { name: "Calibri", size: 9, color: { argb: "FFCBD5E1" } };
    subCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    subtitleRow.height = 18;

    // ─── Row 3: Stats bar ─────────────────────────────────────────────────────
    const total = rows.length;
    const colegiados = rows.filter((r) => Number(r.colegiado) === 1).length;
    const criterio = rows.filter((r) => Number(r.alerta_por_criterio_clinico) === 1).length;
    const puntajeRows = rows.filter((r) => Number(r.alerta_por_criterio_clinico) !== 1);
    const avgPuntaje =
      puntajeRows.length > 0
        ? Math.round(
            puntajeRows.reduce((s, r) => s + (Number(r.puntaje_real_sin_forzar) || 0), 0) /
              puntajeRows.length
          )
        : 0;

    const statsText =
      `Total: ${total} casos   ·   Colegiados: ${colegiados}   ·   Sin colegiar: ${total - colegiados}` +
      `   ·   Por criterio clínico: ${criterio}   ·   Por puntaje: ${total - criterio}` +
      `   ·   Puntaje promedio (por puntaje): ${avgPuntaje} pts`;

    const statsRow = ws.addRow([statsText]);
    ws.mergeCells(3, 1, 3, totalCols);
    const statsCell = statsRow.getCell(1);
    statsCell.fill = fill(TEAL_MID);
    statsCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF" + WHITE } };
    statsCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    statsRow.height = 16;

    // ─── Row 4: Column headers ─────────────────────────────────────────────────
    const headers = [
      "#", "Folio", "Paciente", "Región", "Municipio", "Unidad", "CLUES",
      "Fecha consulta", "Origen alerta", "Motivo alerta",
      "Puntaje total", "Puntaje real", "Colegiado",
    ];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = fill(TEAL_DARK);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + WHITE } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyBorders(cell);
    });
    headerRow.height = 22;

    // ─── Data rows ─────────────────────────────────────────────────────────────
    rows.forEach((r, idx) => {
      const esCriterio = Number(r.alerta_por_criterio_clinico) === 1;
      const esColegiado = Number(r.colegiado) === 1;
      const puntajeTotal = esCriterio ? "—" : (Number(r.puntaje_total_consulta) || 0);
      const puntajeReal = Number(r.puntaje_real_sin_forzar) || 0;

      const rowData = [
        idx + 1,
        r.folio || "—",
        r.nombre_completo || "Sin nombre",
        r.region || "—",
        r.municipio || "—",
        r.unidad || "—",
        r.clues_id || "—",
        formatDate(r.fecha_consulta || r.consulta_creada),
        esCriterio ? "Criterio clínico" : "Puntaje",
        r.motivo_alerta || (esCriterio ? "Edad/Padecimiento" : "—"),
        puntajeTotal,
        puntajeReal,
        esColegiado ? "Sí" : "No",
      ];

      const dataRow = ws.addRow(rowData);
      dataRow.height = 18;

      // Row background
      const rowFill: ExcelJS.Fill = esCriterio
        ? fill(AMBER_BG)
        : idx % 2 === 0
          ? fill(WHITE)
          : fill(GRAY_ROW_ALT);

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = rowFill;
        cell.font = { name: "Calibri", size: 10 };
        cell.alignment = { vertical: "middle" };
        applyBorders(cell);

        // Column-specific formatting
        // Col 1 (#): center
        if (colNum === 1) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          cell.font = { ...cell.font, color: { argb: "FF9CA3AF" }, size: 9 };
        }
        // Col 9 (Origen): center + colour
        if (colNum === 9) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          if (esCriterio) {
            cell.font = { ...cell.font, bold: true, color: { argb: "FF" + AMBER_TEXT } };
          } else {
            cell.font = { ...cell.font, color: { argb: "FF" + RED_TEXT } };
          }
        }
        // Col 11-12 (puntajes): center + number format
        if (colNum === 11 || colNum === 12) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          if (typeof cell.value === "number") {
            cell.numFmt = "0";
            // Colour by severity
            if (cell.value >= 25) {
              cell.font = { ...cell.font, bold: true, color: { argb: "FF" + RED_TEXT } };
            } else if (cell.value >= 15) {
              cell.font = { ...cell.font, color: { argb: "FF" + AMBER_TEXT } };
            }
          } else {
            cell.alignment = { ...cell.alignment, horizontal: "center" };
            cell.font = { ...cell.font, color: { argb: "FF9CA3AF" } };
          }
        }
        // Col 13 (Colegiado): center + colour
        if (colNum === 13) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          if (esColegiado) {
            cell.font = { ...cell.font, bold: true, color: { argb: "FF" + GREEN_TEXT } };
          } else {
            cell.font = { ...cell.font, color: { argb: "FF6B7280" } };
          }
        }
      });
    });

    // ─── Empty separator row ───────────────────────────────────────────────────
    ws.addRow([]);

    // ─── Summary footer rows ───────────────────────────────────────────────────
    const summaryData: [string, string | number][] = [
      ["Total de casos en el reporte", total],
      ["Casos colegiados", colegiados],
      ["Casos sin colegiar", total - colegiados],
      ["Alertas por criterio clínico", criterio],
      ["Alertas por puntaje ≥ 25", total - criterio],
      ["Puntaje promedio (solo por puntaje)", avgPuntaje],
    ];

    summaryData.forEach(([label, value]) => {
      const sumRow = ws.addRow(["", "", label, "", "", "", "", "", "", "", "", value, ""]);
      sumRow.height = 16;
      const labelCell = sumRow.getCell(3);
      labelCell.fill = fill(TEAL_LIGHT);
      labelCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF" + TEAL_DARK } };
      labelCell.alignment = { horizontal: "right", vertical: "middle" };
      ws.mergeCells(sumRow.number, 3, sumRow.number, 11);

      const valCell = sumRow.getCell(12);
      valCell.fill = fill(TEAL_LIGHT);
      valCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + TEAL_DARK } };
      valCell.alignment = { horizontal: "center", vertical: "middle" };
      valCell.numFmt = "0";
    });

    // ─── Serialize & return ────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-estatal-casos-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generando Excel:", error);
    return NextResponse.json({ error: "No se pudo generar el archivo Excel" }, { status: 500 });
  }
}
