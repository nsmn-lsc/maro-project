import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { requireApiAuth } from "@/lib/apiAuth";

// ─── Colour palette (MARO brand) ─────────────────────────────────────────────
const TEAL_DARK = "0F4737" as const;
const TEAL_MID = "1A6B56" as const;
const TEAL_LIGHT = "E6F2EE" as const;
const AMBER_BG = "FEF3C7" as const;
const AMBER_TEXT = "92400E" as const;
const RED_BG = "FEE2E2" as const;
const RED_TEXT = "991B1B" as const;
const GRAY_HEADER = "374151" as const;
const GRAY_ROW_ALT = "F9FAFB" as const;
const WHITE = "FFFFFF" as const;
const BORDER_COLOR = "D1D5DB" as const;

type PatientRow = {
  folio?: string;
  nombre_completo?: string;
  edad?: number | string;
  municipio?: string;
  localidad?: string;
  fecha_ingreso_cpn?: string;
  fpp?: string;
  imc_inicial?: number | string;
  sdg_ingreso?: number | string;
  factor_riesgo_antecedentes?: number | string;
  factor_riesgo_tamizajes?: number | string;
  puntaje_ultima_consulta?: number | string;
  puntaje_total_actual?: number | string;
};

type RequestBody = {
  rows: PatientRow[];
  clues?: string;
  unidad?: string;
  region?: string;
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
  const authResult = await requireApiAuth(request, 1);
  if (!authResult.ok) return authResult.response;

  try {
    const body: RequestBody = await request.json();
    const { rows, clues, unidad, region } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No hay datos para exportar" }, { status: 400 });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "MARO Hub";
    wb.created = new Date();

    const ws = wb.addWorksheet("Pacientes", {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      headerFooter: {
        oddHeader: "&L&\"Calibri,Bold\"&9MARO – Concentrado de Pacientes en la Unidad&R&9Página &P de &N",
        oddFooter: "&C&9Documento generado automáticamente. Uso interno del sistema MARO.",
      },
      views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
      properties: { tabColor: { argb: "FF" + TEAL_DARK } },
    });

    // ─── Column definitions ────────────────────────────────────────────────────
    ws.columns = [
      { key: "num",         width: 5  },
      { key: "folio",       width: 14 },
      { key: "nombre",      width: 30 },
      { key: "edad",        width: 8  },
      { key: "municipio",   width: 18 },
      { key: "localidad",   width: 18 },
      { key: "fechaIngreso", width: 15 },
      { key: "fpp",         width: 12 },
      { key: "imc",         width: 12 },
      { key: "sdg",         width: 8  },
      { key: "ant",         width: 22 },
      { key: "tam",         width: 18 },
      { key: "consulta",    width: 24 },
      { key: "total",       width: 20 },
    ];

    const totalCols = ws.columns.length;

    // ─── Embed logo_maro ───────────────────────────────────────────────────────
    let hasLogo = false;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_maro.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoId = wb.addImage({
          buffer: logoBuffer as any,
          extension: "png",
        });
        ws.addImage(logoId, {
          tl: { col: 0.12, row: 0.05 },
          ext: { width: 77, height: 42 }
        });
        hasLogo = true;
      }
    } catch (err) {
      console.error("Error loading logo_maro:", err);
    }

    // ─── Row 1: Title ──────────────────────────────────────────────────────────
    const titleRow = ws.addRow(["MARO · Panel de Unidad — Concentrado de Pacientes"]);
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = titleRow.getCell(1);
    titleCell.fill = fill(TEAL_DARK);
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + WHITE } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 48;

    // ─── Row 2: Subtitle / filter info ────────────────────────────────────────
    const infoMeta: string[] = [];
    if (clues) infoMeta.push(`CLUES: ${clues}`);
    if (unidad) infoMeta.push(`Unidad: ${unidad}`);
    if (region) infoMeta.push(`Región: ${region}`);

    const generadoText =
      `Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}` +
      (infoMeta.length ? `   ·   ${infoMeta.join("  |  ")}` : "");

    const subtitleRow = ws.addRow([generadoText]);
    ws.mergeCells(2, 1, 2, totalCols);
    const subCell = subtitleRow.getCell(1);
    subCell.fill = fill(GRAY_HEADER);
    subCell.font = { name: "Calibri", size: 9, color: { argb: "FFCBD5E1" } };
    subCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    subtitleRow.height = 18;

    // ─── Row 3: Stats bar ─────────────────────────────────────────────────────
    const total = rows.length;
    const altoRiesgo = rows.filter((r) => (Number(r.puntaje_total_actual) || 0) >= 25).length;
    const statsText = `Total de pacientes: ${total}   ·   En Alto Riesgo Obstétrico (≥ 25 pts): ${altoRiesgo}   ·   Bajo/Medio Riesgo: ${total - altoRiesgo}`;

    const statsRow = ws.addRow([statsText]);
    ws.mergeCells(3, 1, 3, totalCols);
    const statsCell = statsRow.getCell(1);
    statsCell.fill = fill(TEAL_MID);
    statsCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF" + WHITE } };
    statsCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    statsRow.height = 16;

    // ─── Row 4: Column headers ─────────────────────────────────────────────────
    const headers = [
      "#", "Folio", "Paciente", "Edad", "Municipio", "Localidad", "Fecha ingreso", "FPP", "IMC inicial",
      "SDG", "Puntaje antecedentes", "Puntaje tamizajes", "Última consulta", "Total actual"
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
      const scoreTotal = Number(r.puntaje_total_actual) || 0;
      const esAltoRiesgo = scoreTotal >= 25;

      const rowData = [
        idx + 1,
        r.folio || "—",
        r.nombre_completo || "Sin nombre",
        r.edad != null ? Number(r.edad) : "—",
        r.municipio || "—",
        r.localidad || "—",
        formatDate(r.fecha_ingreso_cpn),
        formatDate(r.fpp),
        r.imc_inicial != null ? Number(r.imc_inicial) : "—",
        r.sdg_ingreso ?? "—",
        r.factor_riesgo_antecedentes ?? "—",
        r.factor_riesgo_tamizajes ?? "—",
        r.puntaje_ultima_consulta ?? "—",
        scoreTotal,
      ];

      const dataRow = ws.addRow(rowData);
      dataRow.height = 18;

      const rowFill: ExcelJS.Fill = esAltoRiesgo
        ? fill(RED_BG)
        : idx % 2 === 0
          ? fill(WHITE)
          : fill(GRAY_ROW_ALT);

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = rowFill;
        cell.font = { name: "Calibri", size: 10 };
        cell.alignment = { vertical: "middle" };
        applyBorders(cell);

        // Column-specific formatting
        if (colNum === 1) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          cell.font = { ...cell.font, color: { argb: "FF9CA3AF" }, size: 9 };
        }
        if (colNum === 4 || colNum === 10) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
        }
        if (colNum === 7 || colNum === 8) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
        }
        if (colNum === 9) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          if (typeof cell.value === "number") {
            cell.numFmt = "0.0";
          }
        }
        if (colNum >= 11 && colNum <= 13) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          if (typeof cell.value === "number") {
            cell.numFmt = "0";
          } else {
            cell.font = { ...cell.font, color: { argb: "FF9CA3AF" } };
          }
        }
        if (colNum === 14) {
          cell.alignment = { ...cell.alignment, horizontal: "center" };
          if (typeof cell.value === "number") {
            cell.numFmt = "0";
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
        "Content-Disposition": `attachment; filename="reporte-unidad-pacientes-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generando Excel de unidad:", error);
    return NextResponse.json({ error: "No se pudo generar el archivo Excel" }, { status: 500 });
  }
}
