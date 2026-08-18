import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { requireApiAuth } from "@/lib/apiAuth";
import { query } from "@/lib/db";

// Colores de la marca MARO
const TEAL_DARK = "0F4737" as const;
const TEAL_MID = "1A6B56" as const;
const TEAL_LIGHT = "E6F2EE" as const;
const GRAY_HEADER = "374151" as const;
const GRAY_ROW_ALT = "F9FAFB" as const;
const WHITE = "FFFFFF" as const;
const BORDER_COLOR = "D1D5DB" as const;
const RED_BG = "FEE2E2" as const;
const RED_TEXT = "991B1B" as const;
const AMBER_BG = "FEF3C7" as const;
const AMBER_TEXT = "92400E" as const;
const GREEN_TEXT = "065F46" as const;

interface ConsultaFocosRow {
  edad?: number | string | null;
  gestas?: number | string | null;
  partos?: number | string | null;
  cesareas?: number | string | null;
  abortos?: number | string | null;
  ant_preeclampsia?: number | boolean | null;
  ant_hemorragia?: number | boolean | null;
  ant_sepsis?: number | boolean | null;
  ant_bajo_peso_macrosomia?: number | boolean | null;
  ant_muerte_perinatal?: number | boolean | null;
  ant_embarazo_ectopico?: number | boolean | null;
  factor_diabetes?: number | boolean | null;
  factor_hipertension?: number | boolean | null;
  factor_obesidad?: number | boolean | null;
  factor_cardiopatia?: number | boolean | null;
  factor_hepatopatia?: number | boolean | null;
  factor_enf_autoinmune?: number | boolean | null;
  factor_nefropatia?: number | boolean | null;
  factor_coagulopatias?: number | boolean | null;
  factor_neuropatia?: number | boolean | null;
  factor_enf_psiquiatrica?: number | boolean | null;
  factor_alcoholismo?: number | boolean | null;
  factor_tabaquismo?: number | boolean | null;
  factor_drogas_ilicitas?: number | boolean | null;
  factor_endocrinopatia?: number | boolean | null;
  factor_neumopatia?: number | boolean | null;
  factor_its?: number | boolean | null;
  factor_cirugias_pelvico_uterinas?: number | boolean | null;
  factor_discapacidad?: number | boolean | null;
  factores_riesgo_epid?: string | null;
  ta_sistolica?: number | string | null;
  ta_diastolica?: number | string | null;
  frecuencia_cardiaca?: number | string | null;
  indice_choque?: number | string | null;
  temperatura?: number | string | null;
  fondo_uterino_acorde_sdg?: number | boolean | null;
  ivu_repeticion?: number | boolean | null;
  proteinuria?: string | null;
  edema?: string | null;
  glucosa_capilar?: number | string | null;
  imc_inicial?: number | string | null;
}

interface ReporteClinicoRow extends ConsultaFocosRow {
  consulta_id: number;
  fecha_consulta: string | Date | null;
  region: string | null;
  municipio: string | null;
  clues: string | null;
  nombre_unidad: string | null;
  nombre_paciente: string | null;
  sdg: number | null;
  puntaje_total_consulta: number | null;
  fum?: string | Date | null;
}

interface AccionColegiadaRow {
  consulta_id: number;
  nivel_atencion: string;
  descripcion: string;
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

function calculateSdgAtConsulta(fumVal: string | Date | null | undefined, fechaVal: string | Date | null | undefined): number | null {
  if (!fumVal || !fechaVal) return null;
  try {
    const fumDate = new Date(fumVal);
    const fechaDate = new Date(fechaVal);
    if (isNaN(fumDate.getTime()) || isNaN(fechaDate.getTime())) return null;
    
    // Normalizar a UTC para evitar desfases de zona horaria
    const fumUtc = Date.UTC(fumDate.getUTCFullYear(), fumDate.getUTCMonth(), fumDate.getUTCDate());
    const fechaUtc = Date.UTC(fechaDate.getUTCFullYear(), fechaDate.getUTCMonth(), fechaDate.getUTCDate());
    
    const diffInMs = fechaUtc - fumUtc;
    if (diffInMs < 0) return 0;
    
    const diffInWeeks = diffInMs / (1000 * 60 * 60 * 24 * 7);
    return Math.round(diffInWeeks * 10) / 10;
  } catch {
    return null;
  }
}

// Helper para analizar y enlistar los focos de alerta (apartados que sumaron puntos)
function getFocosDeAlerta(row: ConsultaFocosRow): string {
  const focos: string[] = [];

  // --- 1. Edad y Obstétricos ---
  const edad = Number(row.edad);
  if (Number.isFinite(edad)) {
    if (edad <= 19 || edad >= 36) {
      focos.push(`• Edad de riesgo (${edad} años)`);
    }
  }

  const gestas = Number(row.gestas);
  if (Number.isFinite(gestas)) {
    if (gestas >= 5) {
      focos.push(`• Multípara (≥ 5 gestaciones: ${gestas})`);
    } else if (gestas >= 2 && gestas <= 4) {
      focos.push(`• Gestación previa (2-4 gestaciones: ${gestas})`);
    }
  }

  const cesareas = Number(row.cesareas);
  if (Number.isFinite(cesareas) && cesareas >= 2) {
    focos.push(`• Cesáreas previas ≥ 2 (${cesareas})`);
  }

  const abortos = Number(row.abortos);
  if (Number.isFinite(abortos)) {
    if (abortos >= 3) {
      focos.push(`• Abortos previos ≥ 3 (${abortos})`);
    } else if (abortos === 2) {
      focos.push(`• Abortos previos (2)`);
    }
  }

  // --- 2. Antecedentes Patológicos ---
  if (Number(row.ant_preeclampsia) === 1) focos.push("• Antecedente de preeclampsia");
  if (Number(row.ant_hemorragia) === 1) focos.push("• Antecedente de hemorragia posparto");
  if (Number(row.ant_sepsis) === 1) focos.push("• Antecedente de sepsis");
  if (Number(row.ant_bajo_peso_macrosomia) === 1) focos.push("• Antecedente de bajo peso o macrosomía");
  if (Number(row.ant_muerte_perinatal) === 1) focos.push("• Antecedente de muerte perinatal");
  if (Number(row.ant_embarazo_ectopico) === 1) focos.push("• Antecedente de embarazo ectópico");

  // --- 3. Comorbilidades y Toxicomanías ---
  if (Number(row.factor_diabetes) === 1) focos.push("• Comorbilidad: Diabetes");
  if (Number(row.factor_hipertension) === 1) focos.push("• Comorbilidad: Hipertensión crónica");
  if (Number(row.factor_obesidad) === 1) focos.push("• Comorbilidad: Obesidad");
  if (Number(row.factor_cardiopatia) === 1) focos.push("• Comorbilidad: Cardiopatía (Criterio Clínico Mayor)");
  if (Number(row.factor_hepatopatia) === 1) focos.push("• Comorbilidad: Hepatopatía (Criterio Clínico Mayor)");
  if (Number(row.factor_enf_autoinmune) === 1) focos.push("• Comorbilidad: Enfermedad autoinmune");
  if (Number(row.factor_nefropatia) === 1) focos.push("• Comorbilidad: Nefropatía (Criterio Clínico Mayor)");
  if (Number(row.factor_coagulopatias) === 1) focos.push("• Comorbilidad: Coagulopatías (Criterio Clínico Mayor)");
  if (Number(row.factor_neuropatia) === 1) focos.push("• Comorbilidad: Neuropatía");
  if (Number(row.factor_enf_psiquiatrica) === 1) focos.push("• Comorbilidad: Enfermedad psiquiátrica");
  if (Number(row.factor_alcoholismo) === 1) focos.push("• Toxicomanía: Alcoholismo");
  if (Number(row.factor_tabaquismo) === 1) focos.push("• Toxicomanía: Tabaquismo");
  if (Number(row.factor_drogas_ilicitas) === 1) focos.push("• Toxicomanía: Otras drogas");
  if (Number(row.factor_endocrinopatia) === 1) focos.push("• Comorbilidad: Endocrinopatía (12 pts - Referencia a 2do nivel)");
  if (Number(row.factor_neumopatia) === 1) focos.push("• Comorbilidad: Neumopatía (12 pts - Referencia a 2do nivel)");
  if (Number(row.factor_its) === 1) focos.push("• Antecedente: Infección de Transmisión Sexual (ITS)");
  if (Number(row.factor_cirugias_pelvico_uterinas) === 1) focos.push("• Antecedente: Cirugías Pélvico Uterinas");
  if (Number(row.factor_discapacidad) === 1) focos.push("• Condición: Discapacidad (12 pts - Manejo conjunto 2do nivel)");

  // --- 4. Riesgo Epidemiológico ---
  if (row.factores_riesgo_epid === "es_contacto") focos.push("• Riesgo epidemiológico: Contacto");
  if (row.factores_riesgo_epid === "es_portadora") focos.push("• Riesgo epidemiológico: Portadora");

  // --- 5. Signos Vitales y Parámetros Clínicos ---
  const sys = Number(row.ta_sistolica);
  if (Number.isFinite(sys)) {
    if (sys <= 89 || sys >= 160) {
      focos.push(`• T/A Sistólica alterada (${sys} mmHg)`);
    } else if (sys >= 140 && sys <= 159) {
      focos.push(`• T/A Sistólica elevada (${sys} mmHg)`);
    }
  }

  const dia = Number(row.ta_diastolica);
  if (Number.isFinite(dia)) {
    if (dia <= 50 || dia >= 110) {
      focos.push(`• T/A Diastólica alterada (${dia} mmHg)`);
    } else if (dia >= 90 && dia <= 109) {
      focos.push(`• T/A Diastólica elevada (${dia} mmHg)`);
    }
  }

  const fc = Number(row.frecuencia_cardiaca);
  if (Number.isFinite(fc) && (fc < 60 || fc > 100)) {
    focos.push(`• Frecuencia cardíaca alterada (${fc} lpm)`);
  }

  const ic = Number(row.indice_choque);
  if (Number.isFinite(ic)) {
    if (ic > 0.8) {
      focos.push(`• Índice de choque elevado (${ic})`);
    } else if (ic >= 0.7 && ic <= 0.8) {
      focos.push(`• Índice de choque en rango de riesgo (${ic})`);
    }
  }

  const temp = Number(row.temperatura);
  if (Number.isFinite(temp)) {
    if (temp < 36 || temp > 39) {
      focos.push(`• Temperatura alterada (${temp} °C)`);
    } else if (temp >= 37.5 && temp <= 38.9) {
      focos.push(`• Temperatura febrícula/elevada (${temp} °C)`);
    }
  }

  if (Number(row.fondo_uterino_acorde_sdg) === 1) {
    focos.push("• Fondo uterino no acorde a SDG");
  }

  if (Number(row.ivu_repeticion) === 1) {
    focos.push("• IVU de repetición");
  }

  if (row.proteinuria && row.proteinuria !== "Neg" && row.proteinuria !== "Tr") {
    focos.push(`• Proteinuria positiva (${row.proteinuria})`);
  }

  if (row.edema && row.edema !== "No") {
    focos.push(`• Edema periférico (${row.edema})`);
  }

  const glucosa = Number(row.glucosa_capilar);
  if (Number.isFinite(glucosa) && glucosa >= 95) {
    focos.push(`• Glucosa capilar elevada (${glucosa} mg/dL)`);
  }

  // --- 6. Criterios Clínicos de Forzado Mayores ---
  const edadPaciente = Number(row.edad);
  const tieneEdadCritica = Number.isFinite(edadPaciente) && edadPaciente >= 10 && edadPaciente <= 14;
  const imcPaciente = Number(row.imc_inicial);
  const tieneImcCritico = Number.isFinite(imcPaciente) && imcPaciente >= 31;
  const tieneAntecedenteRiesgoMayor = [
    row.factor_cardiopatia,
    row.factor_nefropatia,
    row.factor_hepatopatia,
    row.factor_coagulopatias,
  ].some((value) => Number(value) === 1);

  if (tieneEdadCritica) focos.push("• Criterio Clínico Mayor: Edad 10-14 años (alerta inmediata)");
  if (tieneImcCritico) focos.push(`• Criterio Clínico Mayor: IMC ≥ 31 (${imcPaciente.toFixed(1)})`);
  if (tieneAntecedenteRiesgoMayor) {
    const comorb: string[] = [];
    if (Number(row.factor_cardiopatia) === 1) comorb.push("Cardiopatía");
    if (Number(row.factor_nefropatia) === 1) comorb.push("Nefropatía");
    if (Number(row.factor_hepatopatia) === 1) comorb.push("Hepatopatía");
    if (Number(row.factor_coagulopatias) === 1) comorb.push("Coagulopatías");
    focos.push(`• Criterio Clínico Mayor: Comorbilidad mayor (${comorb.join(", ")})`);
  }

  return focos.length > 0 ? focos.join("\n") : "Ninguno";
}

export async function GET(request: Request) {
  // Exige nivel de acceso mínimo 2 (Región)
  const authResult = await requireApiAuth(request, 2);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  try {
    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    let regionFilter = searchParams.get("region");

    // Si el usuario es de nivel Región (2), forzamos su propia región y no dejamos seleccionar otra
    if (auth.nivel === 2) {
      regionFilter = auth.region;
    }

    // Construcción de condiciones de consulta
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (regionFilter) {
      conditions.push("cp.region = ?");
      params.push(regionFilter);
    }
    if (fechaDesde) {
      conditions.push("c.fecha_consulta >= ?");
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      conditions.push("c.fecha_consulta <= ?");
      params.push(fechaHasta);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // 1. Obtener todas las consultas prenatales con datos de pacientes y unidades
    const querySql = `
      SELECT 
        c.id AS consulta_id,
        c.fecha_consulta,
        cp.region,
        cp.municipio,
        cp.clues_id AS clues,
        cp.unidad AS nombre_unidad,
        cp.nombre_completo AS nombre_paciente,
        cp.edad,
        c.sdg,
        cp.fum,
        c.puntaje_total_consulta,
        -- Datos clínicos para focos de alerta
        cp.factor_riesgo_antecedentes,
        cp.factor_riesgo_tamizajes,
        c.puntaje_consulta_parametros,
        cp.ant_preeclampsia,
        cp.ant_hemorragia,
        cp.ant_sepsis,
        cp.ant_bajo_peso_macrosomia,
        cp.ant_muerte_perinatal,
        cp.ant_embarazo_ectopico,
        cp.factor_diabetes,
        cp.factor_hipertension,
        cp.factor_obesidad,
        cp.factor_cardiopatia,
        cp.factor_hepatopatia,
        cp.factor_enf_autoinmune,
        cp.factor_nefropatia,
        cp.factor_coagulopatias,
        cp.factor_neuropatia,
        cp.factor_enf_psiquiatrica,
        cp.factor_alcoholismo,
        cp.factor_tabaquismo,
        cp.factor_drogas_ilicitas,
        cp.factor_endocrinopatia,
        cp.factor_neumopatia,
        cp.factor_its,
        cp.factor_cirugias_pelvico_uterinas,
        cp.factor_discapacidad,
        cp.factores_riesgo_epid,
        cp.gestas,
        cp.partos,
        cp.cesareas,
        cp.abortos,
        c.ta_sistolica,
        c.ta_diastolica,
        c.frecuencia_cardiaca,
        c.indice_choque,
        c.temperatura,
        c.fondo_uterino_acorde_sdg,
        c.ivu_repeticion,
        c.proteinuria,
        c.edema,
        c.glucosa_capilar,
        cp.imc_inicial
      FROM consultas_prenatales c
      INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
      ${whereClause}
      ORDER BY c.fecha_consulta DESC, c.id DESC
    `;

    const rawRows = await query<ReporteClinicoRow[]>(querySql, params);

    // 2. Obtener todas las acciones colegiadas
    const actionsSql = `
      SELECT cpl.consulta_id, ca.nivel_atencion, ca.descripcion
      FROM colegiados_acciones ca
      INNER JOIN colegiados_planes cpl ON cpl.id = ca.plan_id
      ORDER BY cpl.consulta_id, FIELD(ca.nivel_atencion, 'primer_nivel', 'segundo_nivel', 'tercer_nivel'), ca.orden ASC
    `;
    const rawActions = await query<AccionColegiadaRow[]>(actionsSql);

    // Mapear acciones por consulta_id
    const actionsMap: Record<number, string[]> = {};
    for (const act of rawActions) {
      const cId = act.consulta_id;
      if (!actionsMap[cId]) actionsMap[cId] = [];
      const levelLabel = 
        act.nivel_atencion === "primer_nivel" ? "1er Nivel" : 
        act.nivel_atencion === "segundo_nivel" ? "2do Nivel" : "3er Nivel";
      actionsMap[cId].push(`• [${levelLabel}] ${act.descripcion}`);
    }

    // 3. Crear libro de Excel
    const wb = new ExcelJS.Workbook();
    wb.creator = "MARO Hub";
    wb.created = new Date();

    const ws = wb.addWorksheet("Reporte Clínico MARO", {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      headerFooter: {
        oddHeader: "&L&\"Calibri,Bold\"&9MARO – Reporte Clínico y Acciones de Seguimiento&R&9Página &P de &N",
        oddFooter: "&C&9Documento confidencial. Uso interno del sistema MARO.",
      },
      views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
      properties: { tabColor: { argb: "FF" + TEAL_DARK } },
    });

    // Definición de columnas
    ws.columns = [
      { key: "num",                 header: "#",                               width: 5 },
      { key: "fecha",               header: "Fecha Consulta",                  width: 14 },
      { key: "region",              header: "Región",                          width: 15 },
      { key: "municipio",           header: "Municipio",                       width: 18 },
      { key: "clues",               header: "CLUES",                           width: 15 },
      { key: "nombre_unidad",       header: "Nombre de la Unidad",             width: 25 },
      { key: "nombre_paciente",     header: "Nombre de la Paciente",           width: 28 },
      { key: "edad",                header: "Edad",                            width: 8 },
      { key: "sdg",                 header: "SDG",                             width: 8 },
      { key: "puntaje_riesgo",      header: "Puntaje Riesgo",                  width: 13 },
      { key: "focos_alerta",        header: "Focos de Alerta",                 width: 42 },
      { key: "acciones_solicitadas", header: "Acciones Solicitadas (Colegiado)", width: 45 },
    ];

    const totalCols = ws.columns.length;

    // Agregar logo si existe
    try {
      const logoPath = path.join(process.cwd(), "public", "logo_maro.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoId = wb.addImage({
          buffer: logoBuffer as unknown as ArrayBuffer,
          extension: "png",
        });
        ws.addImage(logoId, {
          tl: { col: 0.1, row: 0.05 },
          ext: { width: 75, height: 40 }
        });
      }
    } catch (err) {
      console.error("Error al cargar logo:", err);
    }

    // Fila 1: Título
    const titleRow = ws.addRow(["MARO · Reporte de Seguimiento Clínico y Acciones Colegiadas"]);
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = titleRow.getCell(1);
    titleCell.fill = fill(TEAL_DARK);
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + WHITE } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 48;

    // Fila 2: Subtítulo con filtros aplicados
    const filtros: string[] = [];
    if (regionFilter) filtros.push(`Región: ${regionFilter}`);
    if (fechaDesde) filtros.push(`Desde: ${fechaDesde}`);
    if (fechaHasta) filtros.push(`Hasta: ${fechaHasta}`);

    const subText =
      `Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}` +
      (filtros.length ? `   ·   Filtros: ${filtros.join(" | ")}` : "   ·   Ámbito Completo");

    const subtitleRow = ws.addRow([subText]);
    ws.mergeCells(2, 1, 2, totalCols);
    const subCell = subtitleRow.getCell(1);
    subCell.fill = fill(GRAY_HEADER);
    subCell.font = { name: "Calibri", size: 9, color: { argb: "FFCBD5E1" } };
    subCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    subtitleRow.height = 18;

    // Fila 3: Barra de Estadísticas
    const totalConsultas = rawRows.length;
    const criticas = rawRows.filter((r) => (Number(r.puntaje_total_consulta) || 0) >= 25).length;
    const conColegiado = rawRows.filter((r) => actionsMap[r.consulta_id]?.length > 0).length;

    const statsText =
      `Consultas en Reporte: ${totalConsultas}   ·   ` +
      `Casos en Riesgo Crítico/Muy Alto (Puntaje ≥ 25): ${criticas}   ·   ` +
      `Casos con Acciones de Colegiado: ${conColegiado}`;

    const statsRow = ws.addRow([statsText]);
    ws.mergeCells(3, 1, 3, totalCols);
    const statsCell = statsRow.getCell(1);
    statsCell.fill = fill(TEAL_MID);
    statsCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF" + WHITE } };
    statsCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    statsRow.height = 18;

    // Fila 4: Cabecera de la tabla
    const headerRow = ws.addRow([
      "#", "Fecha Consulta", "Región", "Municipio", "CLUES", "Nombre de la Unidad",
      "Nombre de la Paciente", "Edad", "SDG", "Puntaje Riesgo", "Focos de Alerta", "Acciones Solicitadas (Colegiado)"
    ]);
    headerRow.eachCell((cell) => {
      cell.fill = fill(TEAL_DARK);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + WHITE } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyBorders(cell);
    });
    headerRow.height = 24;

    // Agregar filas de datos
    rawRows.forEach((r, idx) => {
      const cId = r.consulta_id;
      const score = Number(r.puntaje_total_consulta) || 0;
      const focos = getFocosDeAlerta(r);
      const acciones = actionsMap[cId]?.join("\n") || "Sin acciones registradas";

      // Determinar semanas de gestación (sdg) al momento de la consulta
      let sdgValor: number | string = "—";
      if (r.sdg != null) {
        sdgValor = Number(r.sdg);
      } else if (r.fum && r.fecha_consulta) {
        const sdgCalculado = calculateSdgAtConsulta(r.fum, r.fecha_consulta);
        if (sdgCalculado !== null) {
          sdgValor = sdgCalculado;
        }
      }

      const rowData = [
        idx + 1,
        formatDate(r.fecha_consulta),
        r.region || "—",
        r.municipio || "—",
        r.clues || "—",
        r.nombre_unidad || "—",
        r.nombre_paciente || "Sin nombre",
        r.edad != null ? Number(r.edad) : "—",
        sdgValor,
        score,
        focos,
        acciones,
      ];

      const dataRow = ws.addRow(rowData);

      // Calcular altura aproximada según longitud del texto en focos o acciones para evitar que se corte
      const lineasFocos = focos.split("\n").length;
      const lineasAcciones = acciones.split("\n").length;
      const maxLineas = Math.max(lineasFocos, lineasAcciones, 1);
      dataRow.height = Math.max(18, maxLineas * 14.5 + 8);

      const rowFill = idx % 2 === 0 ? fill(WHITE) : fill(GRAY_ROW_ALT);

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = rowFill;
        cell.font = { name: "Calibri", size: 10 };
        cell.alignment = { vertical: "middle", wrapText: true };
        applyBorders(cell);

        // Alineación específica
        if (colNum === 1) { // #
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { ...cell.font, color: { argb: "FF9CA3AF" }, size: 9 };
        } else if (colNum === 2) { // Fecha
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNum === 8 || colNum === 9) { // Edad y SDG
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNum === 10) { // Puntaje
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (score >= 25) {
            cell.fill = fill(RED_BG);
            cell.font = { ...cell.font, bold: true, color: { argb: "FF" + RED_TEXT } };
          } else if (score >= 10) {
            cell.fill = fill(AMBER_BG);
            cell.font = { ...cell.font, bold: true, color: { argb: "FF" + AMBER_TEXT } };
          }
        } else if (colNum === 11) { // Focos de Alerta
          cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
          if (focos !== "Ninguno") {
            cell.font = { ...cell.font, size: 9, color: { argb: "FF4B5563" } };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { ...cell.font, color: { argb: "FF9CA3AF" } };
          }
        } else if (colNum === 12) { // Acciones
          cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
          if (actionsMap[cId]?.length > 0) {
            cell.font = { ...cell.font, size: 9.5, color: { argb: "FF" + GREEN_TEXT }, bold: true };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { ...cell.font, color: { argb: "FF9CA3AF" } };
          }
        }
      });
    });

    // Separador
    ws.addRow([]);

    // Resumen en pie de página del reporte
    const summaryData: [string, string | number][] = [
      ["Total de Consultas Registradas", totalConsultas],
      ["Consultas en Riesgo Crítico (Puntaje ≥ 25)", criticas],
      ["Consultas con Acciones de Colegiado", conColegiado],
    ];

    summaryData.forEach(([label, value]) => {
      const sumRow = ws.addRow(["", "", label, "", "", "", "", "", "", value, "", ""]);
      sumRow.height = 18;
      const labelCell = sumRow.getCell(3);
      labelCell.fill = fill(TEAL_LIGHT);
      labelCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF" + TEAL_DARK } };
      labelCell.alignment = { horizontal: "right", vertical: "middle" };
      ws.mergeCells(sumRow.number, 3, sumRow.number, 9);

      const valCell = sumRow.getCell(10);
      valCell.fill = fill(TEAL_LIGHT);
      valCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + TEAL_DARK } };
      valCell.alignment = { horizontal: "center", vertical: "middle" };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    const scopeLabel = regionFilter ? `region-${regionFilter.toLowerCase()}` : "estatal";

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-clinico-maro-${scopeLabel}-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });

  } catch (error: unknown) {
    console.error("Error generating clinical excel report:", error);
    return NextResponse.json({ error: "Error al generar el reporte Excel clínico" }, { status: 500 });
  }
}
