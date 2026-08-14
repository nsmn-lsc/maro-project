import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/apiAuth";
import { sanitizePdfText } from "@/lib/pdfSanitizer";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string | Date | null, includeTime = false): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return sanitizePdfText(String(value));

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  if (!includeTime) return `${dd}/${mm}/${yyyy}`;

  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;

    const params = await context.params;
    const consultaId = Number(params.id);

    if (!Number.isFinite(consultaId) || consultaId <= 0) {
      return NextResponse.json({ message: "ID de consulta inválido" }, { status: 400 });
    }

    // 1. Obtener datos completos de la consulta y paciente
    const consultaRows = await query<any[]>(
      `SELECT
        c.id AS consulta_id,
        c.paciente_id,
        c.fecha_consulta,
        c.sdg,
        c.ta_sistolica,
        c.ta_diastolica,
        c.frecuencia_cardiaca,
        c.frecuencia_respiratoria,
        c.indice_choque,
        c.temperatura,
        c.glucosa_capilar,
        c.fondo_uterino_acorde_sdg,
        c.ivu_repeticion,
        c.estado_conciencia,
        c.hemorragia,
        c.respiracion,
        c.color_piel,
        c.puntaje_consulta_parametros,
        c.puntaje_total_consulta,
        c.riesgo_25_plus,
        c.colegiado,
        c.fecha_colegiado,
        c.diagnostico,
        c.plan AS plan_consulta,
        c.notas,
        p.folio,
        p.nombre_completo,
        p.curp,
        p.edad,
        p.clues_id,
        p.unidad,
        p.region,
        p.municipio,
        p.localidad,
        p.telefono,
        p.fum,
        p.fpp,
        p.semanas_gestacion,
        p.sdg_ingreso,
        p.imc_inicial,
        p.ganancia_ponderal_max,
        p.gestas,
        p.partos,
        p.cesareas,
        p.abortos,
        p.ant_preeclampsia,
        p.ant_hemorragia,
        p.ant_sepsis,
        p.factor_diabetes,
        p.factor_hipertension,
        p.factor_obesidad,
        p.factor_cardiopatia,
        p.factor_nefropatia,
        p.factor_riesgo_antecedentes,
        p.factor_riesgo_tamizajes
      FROM consultas_prenatales c
      INNER JOIN cat_pacientes p ON p.id = c.paciente_id
      WHERE c.id = ?
      LIMIT 1`,
      [consultaId]
    );

    if (!consultaRows || consultaRows.length === 0) {
      return NextResponse.json({ message: "Consulta o paciente no encontrado" }, { status: 404 });
    }

    const data = consultaRows[0];

    // 2. Obtener plan colegiado y acciones
    const planRows = await query<any[]>(
      `SELECT id, estatus, observaciones, updated_at
       FROM colegiados_planes
       WHERE consulta_id = ?
       LIMIT 1`,
      [consultaId]
    );

    const plan = planRows?.[0] || null;
    let acciones: any[] = [];

    if (plan?.id) {
      acciones = await query<any[]>(
        `SELECT id, nivel_atencion, orden, descripcion, cumplido, fecha_cumplimiento
         FROM colegiados_acciones
         WHERE plan_id = ?
         ORDER BY FIELD(nivel_atencion, 'primer_nivel', 'segundo_nivel', 'tercer_nivel'), orden ASC`,
        [plan.id]
      );
    }

    // 3. Crear documento PDF con pdf-lib
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4 Width
    const pageHeight = 841.89; // A4 Height
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Paleta cromática médica
    const primaryDark = rgb(0.04, 0.22, 0.18); // Verde quirúrgico oscuro
    const primaryLight = rgb(0.91, 0.96, 0.94); // Verde menta suave
    const accentRed = rgb(0.78, 0.11, 0.15); // Rojo alerta
    const accentRedLight = rgb(0.99, 0.91, 0.92);
    const textDark = rgb(0.12, 0.15, 0.18);
    const textMuted = rgb(0.38, 0.42, 0.47);
    const borderGray = rgb(0.80, 0.83, 0.86);
    const bgGray = rgb(0.96, 0.97, 0.98);

    const wrapText = (text: string, maxWidth: number, size: number, font = fontRegular): string[] => {
      const sanitized = sanitizePdfText(text);
      const words = sanitized.split(/\s+/).filter(Boolean);
      if (!words.length) return ["-"];
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ENCABEZADO INSTITUCIONAL
    // ═══════════════════════════════════════════════════════════════════════════
    page.drawRectangle({
      x: margin,
      y: y - 56,
      width: contentWidth,
      height: 56,
      color: primaryDark,
    });

    page.drawText(sanitizePdfText("MARO HUB - CÉDULA DE CASO COLEGIADO Y EVALUACIÓN OBSTÉTRICA"), {
      x: margin + 12,
      y: y - 20,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(
      sanitizePdfText(`CLUES: ${data.clues_id || "-"}  |  Unidad: ${data.unidad || "-"}  |  Región: ${data.region || "-"}`),
      {
        x: margin + 12,
        y: y - 36,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.85, 0.95, 0.91),
      }
    );

    page.drawText(
      sanitizePdfText(`Folio: ${data.folio || "SIN FOLIO"}   |   Emisión: ${formatDate(new Date(), true)}`),
      {
        x: margin + 12,
        y: y - 48,
        size: 8,
        font: fontRegular,
        color: rgb(0.85, 0.95, 0.91),
      }
    );

    y -= 68;

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 1: DATOS DE LA PACIENTE Y ANTECEDENTES
    // ═══════════════════════════════════════════════════════════════════════════
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: primaryLight,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    page.drawText(sanitizePdfText("1. DATOS DE IDENTIFICACIÓN Y ANTECEDENTES MATERNOS"), {
      x: margin + 8,
      y: y - 13,
      size: 8.5,
      font: fontBold,
      color: primaryDark,
    });

    y -= 22;

    const patientBoxHeight = 56;
    page.drawRectangle({
      x: margin,
      y: y - patientBoxHeight,
      width: contentWidth,
      height: patientBoxHeight,
      color: bgGray,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    // Fila 1
    page.drawText(sanitizePdfText("Paciente: "), { x: margin + 8, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(data.nombre_completo || "-"), { x: margin + 52, y: y - 14, size: 8, font: fontRegular, color: textDark });

    page.drawText(sanitizePdfText("CURP: "), { x: margin + 270, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(data.curp || "-"), { x: margin + 302, y: y - 14, size: 8, font: fontRegular, color: textDark });

    page.drawText(sanitizePdfText("Edad: "), { x: margin + 440, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(data.edad ? `${data.edad} años` : "-"), { x: margin + 468, y: y - 14, size: 8, font: fontRegular, color: textDark });

    // Fila 2
    page.drawText(sanitizePdfText("FUM: "), { x: margin + 8, y: y - 28, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(formatDate(data.fum)), { x: margin + 34, y: y - 28, size: 8, font: fontRegular, color: textDark });

    page.drawText(sanitizePdfText("FPP: "), { x: margin + 115, y: y - 28, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(formatDate(data.fpp)), { x: margin + 140, y: y - 28, size: 8, font: fontRegular, color: textDark });

    page.drawText(sanitizePdfText("SDG Consulta: "), { x: margin + 230, y: y - 28, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(`${data.sdg ?? data.semanas_gestacion ?? "-"} sem`), { x: margin + 295, y: y - 28, size: 8, font: fontRegular, color: textDark });

    page.drawText(sanitizePdfText("IMC Inicial: "), { x: margin + 380, y: y - 28, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(data.imc_inicial ? `${data.imc_inicial} kg/m2` : "-"), { x: margin + 432, y: y - 28, size: 8, font: fontRegular, color: textDark });

    // Fila 3
    page.drawText(sanitizePdfText("Paridad: "), { x: margin + 8, y: y - 42, size: 8, font: fontBold, color: textDark });
    page.drawText(
      sanitizePdfText(`G:${data.gestas ?? 0}  P:${data.partos ?? 0}  C:${data.cesareas ?? 0}  A:${data.abortos ?? 0}`),
      {
        x: margin + 48,
        y: y - 42,
        size: 8,
        font: fontRegular,
        color: textDark,
      }
    );

    const antClaves = [
      data.ant_preeclampsia ? "Preeclampsia previa" : null,
      data.ant_hemorragia ? "Hemorragia previa" : null,
      data.factor_diabetes ? "Diabetes" : null,
      data.factor_hipertension ? "Hipertensión" : null,
      data.factor_cardiopatia ? "Cardiopatía" : null,
      data.factor_nefropatia ? "Nefropatía" : null,
    ].filter(Boolean).join(", ") || "Sin comorbilidades registradas";

    page.drawText(sanitizePdfText("Antecedentes: "), { x: margin + 200, y: y - 42, size: 8, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText(antClaves), { x: margin + 268, y: y - 42, size: 7.5, font: fontRegular, color: textDark });

    y -= (patientBoxHeight + 12);

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 2: TRIAGE, SIGNOS VITALES Y SEMÁFORO DE RIESGO
    // ═══════════════════════════════════════════════════════════════════════════
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: primaryLight,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    page.drawText(sanitizePdfText("2. TRIAGE CLÍNICO Y ESTRATIFICACIÓN DE RIESGO OBSTÉTRICO"), {
      x: margin + 8,
      y: y - 13,
      size: 8.5,
      font: fontBold,
      color: primaryDark,
    });

    y -= 22;

    const triageBoxHeight = 54;
    const isAltoRiesgo = Number(data.puntaje_total_consulta) >= 25 || Number(data.riesgo_25_plus) === 1;

    page.drawRectangle({
      x: margin,
      y: y - triageBoxHeight,
      width: contentWidth,
      height: triageBoxHeight,
      color: isAltoRiesgo ? accentRedLight : bgGray,
      borderColor: isAltoRiesgo ? accentRed : borderGray,
      borderWidth: 0.8,
    });

    // Signos Vitales
    page.drawText(sanitizePdfText("T.A.: "), { x: margin + 8, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(
      sanitizePdfText(data.ta_sistolica && data.ta_diastolica ? `${data.ta_sistolica}/${data.ta_diastolica} mmHg` : "-"),
      { x: margin + 32, y: y - 14, size: 8, font: fontRegular, color: textDark }
    );

    page.drawText(sanitizePdfText("F.C.: "), { x: margin + 115, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(
      sanitizePdfText(data.frecuencia_cardiaca ? `${data.frecuencia_cardiaca} lpm` : "-"),
      { x: margin + 138, y: y - 14, size: 8, font: fontRegular, color: textDark }
    );

    page.drawText(sanitizePdfText("F.R.: "), { x: margin + 200, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(
      sanitizePdfText(data.frecuencia_respiratoria ? `${data.frecuencia_respiratoria} rpm` : "-"),
      { x: margin + 224, y: y - 14, size: 8, font: fontRegular, color: textDark }
    );

    page.drawText(sanitizePdfText("Temp: "), { x: margin + 280, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(
      sanitizePdfText(data.temperatura ? `${data.temperatura} oC` : "-"),
      { x: margin + 308, y: y - 14, size: 8, font: fontRegular, color: textDark }
    );

    page.drawText(sanitizePdfText("Índice Choque: "), { x: margin + 370, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(
      sanitizePdfText(String(data.indice_choque ?? "-")),
      { x: margin + 435, y: y - 14, size: 8, font: fontRegular, color: textDark }
    );

    // Fila 2: Puntajes y Semáforo
    page.drawText(
      sanitizePdfText(`Puntos Parámetros: ${Number(data.puntaje_consulta_parametros) || 0} pts`),
      { x: margin + 8, y: y - 30, size: 8, font: fontRegular, color: textDark }
    );

    page.drawText(
      sanitizePdfText(`Puntos Antecedentes: ${Number(data.factor_riesgo_antecedentes) || 0} pts`),
      { x: margin + 140, y: y - 30, size: 8, font: fontRegular, color: textDark }
    );

    page.drawText(
      sanitizePdfText(`Puntos Tamizajes: ${Number(data.factor_riesgo_tamizajes) || 0} pts`),
      { x: margin + 285, y: y - 30, size: 8, font: fontRegular, color: textDark }
    );

    // Badge de Riesgo Total (con >= compatible WinAnsi)
    const badgeText = isAltoRiesgo
      ? sanitizePdfText(`TOTAL: ${Number(data.puntaje_total_consulta) || 0} PTS (ALTO RIESGO / CRÍTICO >= 25)`)
      : sanitizePdfText(`TOTAL: ${Number(data.puntaje_total_consulta) || 0} PTS (RIESGO MODERADO / BAJO)`);

    page.drawRectangle({
      x: margin + 8,
      y: y - 48,
      width: contentWidth - 16,
      height: 14,
      color: isAltoRiesgo ? accentRed : rgb(0.12, 0.58, 0.42),
    });

    page.drawText(badgeText, {
      x: margin + 14,
      y: y - 44,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    y -= (triageBoxHeight + 12);

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 3: PLAN ESCALONADO DE ACCIONES COLEGIADAS
    // ═══════════════════════════════════════════════════════════════════════════
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: primaryLight,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    page.drawText(sanitizePdfText("3. PLAN DE ACCIONES COLEGIADAS POR NIVEL DE ATENCIÓN"), {
      x: margin + 8,
      y: y - 13,
      size: 8.5,
      font: fontBold,
      color: primaryDark,
    });

    y -= 24;

    const nivelesInfo = [
      { key: "primer_nivel", title: "Primer Nivel (Centro de Salud / CLUES)", color: rgb(0.06, 0.45, 0.35) },
      { key: "segundo_nivel", title: "Segundo Nivel (Hospital Comunitario / General)", color: rgb(0.08, 0.40, 0.65) },
      { key: "tercer_nivel", title: "Tercer Nivel (Alta Especialidad / Materno)", color: rgb(0.55, 0.15, 0.55) },
    ];

    for (const nivel of nivelesInfo) {
      const itemsNivel = acciones.filter((a) => a.nivel_atencion === nivel.key);

      page.drawText(sanitizePdfText(nivel.title), {
        x: margin + 4,
        y: y,
        size: 8,
        font: fontBold,
        color: nivel.color,
      });
      y -= 10;

      if (itemsNivel.length === 0) {
        page.drawText(sanitizePdfText("* Sin acciones adicionales prescritas para este nivel."), {
          x: margin + 12,
          y,
          size: 7.5,
          font: fontRegular,
          color: textMuted,
        });
        y -= 12;
      } else {
        for (const item of itemsNivel) {
          const statusText = Number(item.cumplido) === 1 ? `[CUMPLIDA - ${formatDate(item.fecha_cumplimiento)}]` : "[PENDIENTE]";
          const lines = wrapText(`${item.orden}. ${item.descripcion} ${statusText}`, contentWidth - 20, 7.5, fontRegular);

          for (const line of lines) {
            page.drawText(sanitizePdfText(line), {
              x: margin + 12,
              y,
              size: 7.5,
              font: fontRegular,
              color: textDark,
            });
            y -= 9.5;
          }
        }
        y -= 3;
      }
    }

    y -= 4;

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 4: OBSERVACIONES Y ACUERDOS
    // ═══════════════════════════════════════════════════════════════════════════
    page.drawRectangle({
      x: margin,
      y: y - 16,
      width: contentWidth,
      height: 16,
      color: primaryLight,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    page.drawText(sanitizePdfText("4. OBSERVACIONES GENERALES Y ACUERDOS DEL COLEGIADO"), {
      x: margin + 8,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: primaryDark,
    });

    y -= 20;

    const obsText = plan?.observaciones || data.plan_consulta || data.notas || "Sin observaciones registradas.";
    const obsLines = wrapText(obsText, contentWidth - 16, 7.5, fontRegular).slice(0, 4);

    page.drawRectangle({
      x: margin,
      y: y - 36,
      width: contentWidth,
      height: 36,
      color: bgGray,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    let obsY = y - 10;
    for (const l of obsLines) {
      page.drawText(sanitizePdfText(l), {
        x: margin + 8,
        y: obsY,
        size: 7.5,
        font: fontRegular,
        color: textDark,
      });
      obsY -= 9;
    }

    y -= 46;

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 5: FIRMAS DE RESPONSABILIDAD Y SELLO
    // ═══════════════════════════════════════════════════════════════════════════
    y = Math.min(y, 110); // Asegurar posición fija al pie de página

    const colWidth = (contentWidth - 24) / 3;

    // Firma 1: Médico Tratante
    page.drawLine({
      start: { x: margin, y: y + 25 },
      end: { x: margin + colWidth, y: y + 25 },
      thickness: 0.7,
      color: textMuted,
    });
    page.drawText(sanitizePdfText("Médico Tratante / Unidad"), { x: margin + 8, y: y + 14, size: 7, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText("Nombre y Cédula Profesional"), { x: margin + 8, y: y + 4, size: 6.5, font: fontRegular, color: textMuted });

    // Firma 2: Colegiador / Coordinador
    page.drawLine({
      start: { x: margin + colWidth + 12, y: y + 25 },
      end: { x: margin + colWidth * 2 + 12, y: y + 25 },
      thickness: 0.7,
      color: textMuted,
    });
    page.drawText(sanitizePdfText("Especialista Colegiador"), { x: margin + colWidth + 20, y: y + 14, size: 7, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText("Coordinación Estatal MARO"), { x: margin + colWidth + 20, y: y + 4, size: 6.5, font: fontRegular, color: textMuted });

    // Firma 3: Sello
    page.drawLine({
      start: { x: margin + colWidth * 2 + 24, y: y + 25 },
      end: { x: margin + contentWidth, y: y + 25 },
      thickness: 0.7,
      color: textMuted,
    });
    page.drawText(sanitizePdfText("Sello de la Unidad / Hospital"), { x: margin + colWidth * 2 + 30, y: y + 14, size: 7, font: fontBold, color: textDark });
    page.drawText(sanitizePdfText("Fecha y Firma de Recepción"), { x: margin + colWidth * 2 + 30, y: y + 4, size: 6.5, font: fontRegular, color: textMuted });

    // Generar Buffer del PDF
    const pdfBytes = await pdfDoc.save();
    const safeFolio = String(data.folio || `consulta-${consultaId}`).replace(/[^a-zA-Z0-9-_]/g, "_");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cedula-caso-${safeFolio}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("[api/colegiados/pdf] Error generando cédula PDF:", error);
    return NextResponse.json(
      {
        message: "Error al generar la cédula en formato PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
