"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { sanitizePdfText } from "@/lib/pdfSanitizer";

type SessionInfo = {
  nivel?: number;
};

type NivelAtencion = "primer_nivel" | "segundo_nivel" | "tercer_nivel";

type ApiResponse = {
  consulta: {
    consulta_id: number;
    paciente_id: number;
    region: string | null;
    municipio: string | null;
    unidad: string | null;
    clues_id: string | null;
    fecha_ingreso_cpn: string | null;
    sdg_ingreso: number | null;
    semanas_gestacion: number | null;
    factor_riesgo_antecedentes: number | null;
    factor_riesgo_tamizajes: number | null;
    fecha_consulta: string | null;
    puntaje_total_consulta: number | null;
    puntaje_consulta_parametros: number | null;
    riesgo_25_plus: number;
    colegiado: number;
    fecha_colegiado: string | null;
    diagnostico: string | null;
    plan: string | null;
    notas: string | null;
  };
  plan: {
    estatus: "borrador" | "completo";
    observaciones: string | null;
    updated_at: string | null;
  };
  acciones: Array<{
    id: number;
    nivel_atencion: NivelAtencion;
    orden: number;
    descripcion: string;
    cumplido: 0 | 1;
    fecha_cumplimiento: string | null;
    fecha_accion?: string | null;
    fecha_respuesta?: string | null;
    respuesta_accion?: string | null;
    estatus?: "pendiente" | "completada" | "incompleta" | "no_realizada";
  }>;
  observaciones_nivel?: Record<
    NivelAtencion,
    {
      obs_zonales: string;
      obs_regionales: string;
      obs_estatal_salud_mujeres: string;
      obs_atencion_medica: string;
    }
  >;
};

const NIVELES: Array<{ key: NivelAtencion; title: string }> = [
  { key: "primer_nivel", title: "Acciones por primer nivel" },
  { key: "segundo_nivel", title: "Acciones por segundo nivel" },
  { key: "tercer_nivel", title: "Acciones por tercer nivel" },
];

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  if (!includeTime) return `${dd}-${mm}-${yyyy}`;
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

export default function FormatoColegiadoPage() {
  const router = useRouter();
  const params = useParams();
  const consultaId = String(params?.id || "");

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const session = JSON.parse(stored) as SessionInfo;
      if ((session.nivel ?? 0) < 3) {
        router.replace((session.nivel ?? 0) >= 2 ? "/region" : "/dashboard");
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked || !consultaId) return;

    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/colegiados/${consultaId}`, { cache: "no-store" });
        const payload = (await res.json()) as ApiResponse | { message?: string; details?: string };
        if (!res.ok) {
          throw new Error((payload as any)?.details || (payload as any)?.message || "No se pudo cargar el formato colegiado");
        }
        if (!cancelled) {
          setData(payload as ApiResponse);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [authChecked, consultaId]);

  const accionesPorNivel = useMemo(() => {
    const grouped: Record<NivelAtencion, ApiResponse["acciones"]> = {
      primer_nivel: [],
      segundo_nivel: [],
      tercer_nivel: [],
    };
    for (const action of data?.acciones || []) {
      grouped[action.nivel_atencion].push(action);
    }
    return grouped;
  }, [data]);

  const generarPdfPersonalizado = async () => {
    if (!data) return;
    setGeneratingPdf(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      const logoRes = await fetch("/logo_maro_re.png");
      const logoArrayBuffer = await logoRes.arrayBuffer();
      const logoImage = await pdfDoc.embedPng(logoArrayBuffer);

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      // ── Paleta ──────────────────────────────────────────────────────────────
      const teal      = rgb(0.06, 0.28, 0.22);
      const tealLight = rgb(0.83, 0.92, 0.88);
      const amber     = rgb(0.72, 0.48, 0.04);
      const amberBg   = rgb(0.99, 0.93, 0.76);
      const textDark  = rgb(0.10, 0.12, 0.16);
      const textMid   = rgb(0.40, 0.43, 0.49);
      const white     = rgb(1, 1, 1);
      const border    = rgb(0.30, 0.42, 0.38);
      const rowAlt    = rgb(0.96, 0.97, 0.96);
      // ────────────────────────────────────────────────────────────────────────

      const ensureSpace = (needed: number) => {
        if (y - needed < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
      };

      const wrapText = (text: string, maxWidth: number, size: number, font = regularFont): string[] => {
        const sanitized = sanitizePdfText(text);
        const words = sanitized.split(/\s+/).filter(Boolean);
        if (!words.length) return ["-"];
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          const cand = cur ? `${cur} ${w}` : w;
          if (font.widthOfTextAtSize(cand, size) <= maxWidth) { cur = cand; }
          else { if (cur) lines.push(cur); cur = w; }
        }
        if (cur) lines.push(cur);
        return lines;
      };

      const consulta = data.consulta;

      // ═══════════════════════════════════════════════════════════════════════
      // 1. ENCABEZADO: Logo izquierda | Título+Subtítulo+Aviso derecha
      // ═══════════════════════════════════════════════════════════════════════
      const logoH = 76;
      const logoW = Math.round(logoH * (logoImage.width / logoImage.height));
      const titleX = margin + logoW + 20;
      const titleW = contentWidth - logoW - 20;

      ensureSpace(logoH + 14);

      page.drawImage(logoImage, { x: margin, y: y - logoH, width: logoW, height: logoH });

      // "FORMATO COLEGIADO" en dorado grande, alineado a la derecha
      const fmtTitle = "FORMATO COLEGIADO";
      const fmtSize = 20;
      const fmtW = boldFont.widthOfTextAtSize(fmtTitle, fmtSize);
      page.drawText(fmtTitle, { x: pageWidth - margin - fmtW, y: y - 16, size: fmtSize, font: boldFont, color: amber });

      // "PLAN DE ACCIONES POR NIVELES DE ATENCION" en negro bold
      const planTitle = "PLAN DE ACCIONES POR NIVELES DE ATENCION";
      const planSize = 11;
      const planW = boldFont.widthOfTextAtSize(planTitle, planSize);
      page.drawText(planTitle, { x: pageWidth - margin - planW, y: y - 34, size: planSize, font: boldFont, color: textDark });

      // "Aviso regional:" en teal bold + texto de aviso en regular
      const avisoLabel = "Aviso regional: ";
      const avisoLabelW = boldFont.widthOfTextAtSize(avisoLabel, 8);
      const avisoBody = `Notificacion al responsable regional de ${consulta.region || "—"} -- ${consulta.unidad || "—"}${consulta.clues_id ? ` (${consulta.clues_id})` : ""}`;
      const avisoBodyLines = wrapText(avisoBody, titleW - avisoLabelW, 8);

      page.drawText(avisoLabel, { x: titleX, y: y - 50, size: 8, font: boldFont, color: teal });
      page.drawText(avisoBodyLines[0] || "", { x: titleX + avisoLabelW, y: y - 50, size: 8, font: regularFont, color: textDark });
      if (avisoBodyLines[1]) {
        page.drawText(avisoBodyLines[1], { x: titleX, y: y - 61, size: 8, font: regularFont, color: textDark });
      }

      // Línea separadora debajo del encabezado
      const hdrBotY = y - logoH - 10;
      page.drawLine({ start: { x: margin, y: hdrBotY }, end: { x: pageWidth - margin, y: hdrBotY }, thickness: 0.8, color: border });
      y = hdrBotY - 12;

      // ═══════════════════════════════════════════════════════════════════════
      // 2. DOS COLUMNAS: DATOS GENERALES (izq) | RESUMEN DE PUNTAJES (der)
      // ═══════════════════════════════════════════════════════════════════════
      const leftColW  = Math.round(contentWidth * 0.60);
      const colGap    = 12;
      const rightColW = contentWidth - leftColW - colGap;
      const leftColX  = margin;
      const rightColX = margin + leftColW + colGap;

      const datoRows: [string, string][] = [
        ["Region",           String(consulta.region           ?? "—")],
        ["Unidad",           String(consulta.unidad           ?? "—")],
        ["Municipio",        String(consulta.municipio        ?? "—")],
        ["CLUES",            String(consulta.clues_id         ?? "—")],
        ["Fecha ingreso CPN", formatDate(consulta.fecha_ingreso_cpn)],
        ["Fecha consulta",   formatDate(consulta.fecha_consulta)],
        ["SDG",              String(consulta.sdg_ingreso      ?? "—")],
        ["Diagnostico",      String(consulta.diagnostico      ?? "—")],
        ["Fecha colegiado",  formatDate(consulta.fecha_colegiado, true)],
        ["Estatus",          data.plan.estatus === "completo" ? "Completo" : "Borrador"],
      ];

      const dHdr = 26;
      const dRow = 16;
      const dPad = 10;
      const leftH = dHdr + datoRows.length * dRow + dPad * 2;

      // Altura del bloque de puntajes: header + col-header + 3 filas + total + riesgo
      const pHdr    = 26;
      const pColHdr = 20;
      const pRow    = 20;
      const pTotal  = 32;
      const pRisk   = 24;
      const rightH  = pHdr + pColHdr + pRow * 3 + pTotal + pRisk + 8;

      const sectionH = Math.max(leftH, rightH);
      ensureSpace(sectionH + 14);
      const secTopY = y;

      // ── Tarjeta izquierda — Datos generales ───────────────────────────────
      page.drawRectangle({
        x: leftColX,
        y: secTopY - sectionH,
        width: leftColW,
        height: sectionH,
        color: white,
        borderColor: border,
        borderWidth: 1.2,
      });
      page.drawRectangle({
        x: leftColX,
        y: secTopY - dHdr,
        width: leftColW,
        height: dHdr,
        color: teal,
        borderColor: border,
        borderWidth: 1.2,
      });
      page.drawText("DATOS GENERALES DEL CASO", { x: leftColX + 10, y: secTopY - 17, size: 10, font: boldFont, color: white });

      let rowY = secTopY - dHdr - dPad;
      for (const [lbl, val] of datoRows) {
        const lblStr = `${lbl}: `;
        const lblW = boldFont.widthOfTextAtSize(lblStr, 9);
        page.drawText(lblStr, { x: leftColX + 10, y: rowY, size: 9, font: boldFont, color: textDark });
        const valLines = wrapText(val, leftColW - 22 - lblW, 9);
        page.drawText(valLines[0] || val, { x: leftColX + 10 + lblW, y: rowY, size: 9, font: regularFont, color: textDark });
        rowY -= dRow;
      }

      // ── Tarjeta derecha — Resumen de puntajes ─────────────────────────────
      page.drawRectangle({
        x: rightColX,
        y: secTopY - sectionH,
        width: rightColW,
        height: sectionH,
        color: white,
        borderColor: border,
        borderWidth: 1.2,
      });
      page.drawRectangle({
        x: rightColX,
        y: secTopY - pHdr,
        width: rightColW,
        height: pHdr,
        color: teal,
        borderColor: border,
        borderWidth: 1.2,
      });
      const pHdrTxt = "RESUMEN DE PUNTAJES";
      const pHdrW = boldFont.widthOfTextAtSize(pHdrTxt, 9);
      page.drawText(pHdrTxt, { x: rightColX + (rightColW - pHdrW) / 2, y: secTopY - 17, size: 9, font: boldFont, color: white });

      // Cabecera columnas Categoría / Puntaje
      let tblY = secTopY - pHdr;
      page.drawRectangle({ x: rightColX, y: tblY - pColHdr, width: rightColW, height: pColHdr, color: tealLight });
      page.drawText("Categoria", { x: rightColX + 8, y: tblY - 13, size: 8, font: boldFont, color: teal });
      const punHdrTxt = "Puntaje";
      page.drawText(punHdrTxt, { x: rightColX + rightColW - 8 - boldFont.widthOfTextAtSize(punHdrTxt, 8), y: tblY - 13, size: 8, font: boldFont, color: teal });
      tblY -= pColHdr;

      // Filas de datos: Tamizajes, Antecedentes, Consulta
      const puntajeRows: [string, string][] = [
        ["Tamizajes",    String(consulta.factor_riesgo_tamizajes       ?? "—")],
        ["Antecedentes", String(consulta.factor_riesgo_antecedentes    ?? "—")],
        ["Consulta",     String(consulta.puntaje_consulta_parametros   ?? "—")],
      ];
      for (let i = 0; i < puntajeRows.length; i++) {
        const [cat, val] = puntajeRows[i];
        if (i % 2 === 1) page.drawRectangle({ x: rightColX, y: tblY - pRow, width: rightColW, height: pRow, color: rowAlt });
        page.drawLine({ start: { x: rightColX, y: tblY }, end: { x: rightColX + rightColW, y: tblY }, thickness: 0.4, color: border });
        page.drawText(cat, { x: rightColX + 8, y: tblY - 13, size: 9, font: regularFont, color: textDark });
        const vW = boldFont.widthOfTextAtSize(val, 10);
        page.drawText(val, { x: rightColX + rightColW - 8 - vW, y: tblY - 14, size: 10, font: boldFont, color: textDark });
        tblY -= pRow;
      }

      // Fila TOTAL (fondo ámbar)
      page.drawRectangle({ x: rightColX, y: tblY - pTotal, width: rightColW, height: pTotal, color: amberBg });
      page.drawText("TOTAL", { x: rightColX + 8, y: tblY - 20, size: 11, font: boldFont, color: amber });
      const totalVal = String(consulta.puntaje_total_consulta ?? "—");
      const tvW = boldFont.widthOfTextAtSize(totalVal, 17);
      page.drawText(totalVal, { x: rightColX + rightColW - 8 - tvW, y: tblY - 22, size: 17, font: boldFont, color: amber });
      tblY -= pTotal;

      // Fila RIESGO
      const riesgoTxt = `RIESGO (>=25): ${Number(consulta.riesgo_25_plus) === 1 ? "SI" : "NO"}`;
      const rtW = boldFont.widthOfTextAtSize(riesgoTxt, 8);
      page.drawText(riesgoTxt, { x: rightColX + (rightColW - rtW) / 2, y: tblY - 15, size: 8, font: boldFont, color: teal });

      y = secTopY - sectionH - 14;

      // ═══════════════════════════════════════════════════════════════════════
      // 3. SECCIONES CLÍNICAS
      // ═══════════════════════════════════════════════════════════════════════
      const clinSections: { label: string; text: string | null }[] = [
        { label: "RESUMEN CLINICO",          text: consulta.plan },
        { label: "NOTAS CLINICAS",           text: consulta.notas },
        { label: "OBSERVACIONES COLEGIADAS", text: data.plan.observaciones },
      ];

      for (const { label, text } of clinSections) {
        const bodyLines = wrapText(text || "—", contentWidth - 20, 9);
        const sectionH = 12 + 14 + (bodyLines.length * 13) + 10;
        ensureSpace(sectionH + 8);

        const sectionTopY = y;
        page.drawRectangle({
          x: margin,
          y: sectionTopY - sectionH,
          width: contentWidth,
          height: sectionH,
          color: white,
          borderColor: border,
          borderWidth: 1.2,
        });

        page.drawText(label, { x: margin + 10, y: sectionTopY - 16, size: 11, font: boldFont, color: teal });
        let bodyY = sectionTopY - 31;
        for (const line of bodyLines) {
          page.drawText(line, { x: margin + 10, y: bodyY, size: 9, font: regularFont, color: textDark });
          bodyY -= 13;
        }

        y = sectionTopY - sectionH - 8;
      }

      y -= 4;

      // ═══════════════════════════════════════════════════════════════════════
      // 4. TARJETAS DE NIVELES DE ATENCIÓN — disposición horizontal por fila
      // ═══════════════════════════════════════════════════════════════════════
      const cardW = contentWidth;
      const cardHdrH = 26;
      const cardPad = 8;
      const bulletLH = 11;
      const cardFtrH = 20;

      const nivelesConfig: { key: NivelAtencion; title: string }[] = [
        { key: "primer_nivel", title: "PRIMER NIVEL DE ATENCION" },
        { key: "segundo_nivel", title: "SEGUNDO NIVEL DE ATENCION" },
        { key: "tercer_nivel", title: "TERCER NIVEL DE ATENCION" },
      ];

      for (const { key, title } of nivelesConfig) {
        const items = accionesPorNivel[key];
        const obs = data.observaciones_nivel?.[key];

        // Calcular altura dinámica
        let contentH = 0;
        if (!items.length) {
          contentH += bulletLH + 8;
        } else {
          for (const item of items) {
            const stStr = (item.estatus || (item.cumplido ? "completada" : "pendiente")).toUpperCase();
            const fAccStr = item.fecha_accion ? ` [F. Acción: ${formatDate(item.fecha_accion)}]` : "";
            const hLine = `${item.orden}. [${stStr}]${fAccStr}: ${item.descripcion || "—"}`;
            const lines = wrapText(hLine, cardW - 20, 8);
            contentH += lines.length * bulletLH + 2;

            if (item.respuesta_accion || item.fecha_respuesta) {
              const rHeader = `↳ Respuesta${item.fecha_respuesta ? ` (${formatDate(item.fecha_respuesta)})` : ""}: ${item.respuesta_accion || "—"}`;
              const rLines = wrapText(rHeader, cardW - 30, 7.5);
              contentH += rLines.length * bulletLH + 2;
            }
          }
        }

        // Si hay observaciones para este nivel, calcular espacio
        const hasObs =
          Boolean(obs?.obs_zonales?.trim()) ||
          Boolean(obs?.obs_regionales?.trim()) ||
          Boolean(obs?.obs_estatal_salud_mujeres?.trim()) ||
          Boolean(obs?.obs_atencion_medica?.trim());

        if (hasObs) {
          contentH += 18; // Cabecera de observaciones
          if (obs?.obs_zonales?.trim()) {
            const l = wrapText(`• Obs. Zonales: ${obs.obs_zonales}`, cardW - 24, 7);
            contentH += l.length * 10 + 2;
          }
          if (obs?.obs_regionales?.trim()) {
            const l = wrapText(`• Obs. Regionales: ${obs.obs_regionales}`, cardW - 24, 7);
            contentH += l.length * 10 + 2;
          }
          if (obs?.obs_estatal_salud_mujeres?.trim()) {
            const l = wrapText(`• Obs. Estatal Salud Mujeres: ${obs.obs_estatal_salud_mujeres}`, cardW - 24, 7);
            contentH += l.length * 10 + 2;
          }
          if (obs?.obs_atencion_medica?.trim()) {
            const l = wrapText(`• Obs. Atencion Medica: ${obs.obs_atencion_medica}`, cardW - 24, 7);
            contentH += l.length * 10 + 2;
          }
        }

        const cardH = cardHdrH + cardPad + contentH + cardFtrH;
        ensureSpace(cardH + 10);
        const cardTopY = y;
        const cardX = margin;

        page.drawRectangle({
          x: cardX,
          y: cardTopY - cardH,
          width: cardW,
          height: cardH,
          color: white,
          borderColor: border,
          borderWidth: 1.4,
        });
        page.drawRectangle({
          x: cardX,
          y: cardTopY - cardHdrH,
          width: cardW,
          height: cardHdrH,
          color: teal,
          borderColor: border,
          borderWidth: 1.2,
        });
        page.drawText(title, { x: cardX + 10, y: cardTopY - 17, size: 9, font: boldFont, color: white });

        let bY = cardTopY - cardHdrH - cardPad;
        if (!items.length) {
          page.drawText("Sin acciones definidas.", { x: cardX + 10, y: bY - 8, size: 8, font: regularFont, color: textMid });
          bY -= (bulletLH + 8);
        } else {
          for (const item of items) {
            const stStr = (item.estatus || (item.cumplido ? "completada" : "pendiente")).toUpperCase();
            const fAccStr = item.fecha_accion ? ` [F. Acción: ${formatDate(item.fecha_accion)}]` : "";
            const hLine = `${item.orden}. [${stStr}]${fAccStr}: ${item.descripcion || "—"}`;
            const lines = wrapText(hLine, cardW - 20, 8);
            for (const line of lines) {
              page.drawText(line, { x: cardX + 10, y: bY - 8, size: 8, font: regularFont, color: textDark });
              bY -= bulletLH;
            }
            bY -= 2;

            if (item.respuesta_accion || item.fecha_respuesta) {
              const rHeader = `↳ Respuesta${item.fecha_respuesta ? ` (${formatDate(item.fecha_respuesta)})` : ""}: ${item.respuesta_accion || "—"}`;
              const rLines = wrapText(rHeader, cardW - 30, 7.5);
              for (const rl of rLines) {
                page.drawText(rl, { x: cardX + 20, y: bY - 7.5, size: 7.5, font: regularFont, color: teal });
                bY -= bulletLH;
              }
              bY -= 2;
            }
          }
        }

        if (hasObs) {
          bY -= 4;
          page.drawText("Observaciones y Acuerdos del Nivel:", { x: cardX + 10, y: bY - 7, size: 7.5, font: boldFont, color: textDark });
          bY -= 12;

          const obsItems = [
            { label: "Obs. Zonales", val: obs?.obs_zonales },
            { label: "Obs. Regionales", val: obs?.obs_regionales },
            { label: "Obs. Estatal Salud Mujeres", val: obs?.obs_estatal_salud_mujeres },
            { label: "Obs. Atencion Medica", val: obs?.obs_atencion_medica },
          ];

          for (const o of obsItems) {
            if (!o.val?.trim()) continue;
            const lines = wrapText(`• ${o.label}: ${o.val}`, cardW - 24, 7);
            for (const ol of lines) {
              page.drawText(ol, { x: cardX + 14, y: bY - 7, size: 7, font: regularFont, color: textDark });
              bY -= 10;
            }
            bY -= 2;
          }
        }

        const ftrTopY = cardTopY - cardH + cardFtrH;
        page.drawLine({ start: { x: cardX, y: ftrTopY }, end: { x: cardX + cardW, y: ftrTopY }, thickness: 0.5, color: border });
        const realizados = items.filter((i) => (i.estatus === "completada" || Number(i.cumplido) === 1)).length;
        const ftrTxt = items.length === 0 ? "Estado: Sin acciones" : `Estado: ${realizados}/${items.length} realizadas`;
        page.drawText(ftrTxt, { x: cardX + 8, y: ftrTopY - 13, size: 7.5, font: regularFont, color: textMid });

        y = cardTopY - cardH - 10;
      }

      // ── Guardar y descargar ──────────────────────────────────────────────
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `reporte-maro-${String(consulta.consulta_id).padStart(6, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
    } catch (err: any) {
      setError(err?.message || "No se pudo generar el PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!authChecked) {
    return <main className="min-h-screen flex items-center justify-center bg-white text-slate-900">Validando acceso estatal...</main>;
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-white text-slate-900">Cargando formato...</main>;
  }

  if (error || !data) {
    return <main className="min-h-screen flex items-center justify-center bg-white text-red-700">{error || "No se pudo cargar el formato"}</main>;
  }

  const consulta = data.consulta;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-5xl p-4 print:p-0">
        <div className="mb-4 flex flex-wrap justify-between gap-2 print:hidden">
          <div className="flex gap-2">
            <Link href={`/colegiados/${consulta.consulta_id}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-400">
              Volver al plan
            </Link>
            <Link href="/colegiados/planes" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-400">
              Casos con acciones
            </Link>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/colegiados/${consulta.consulta_id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition inline-flex items-center gap-1.5"
            >
              <span>📄</span>
              <span>Descargar Cédula Oficial (PDF)</span>
            </a>
            <button
              type="button"
              onClick={generarPdfPersonalizado}
              disabled={generatingPdf}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              {generatingPdf ? "Generando..." : "Descarga Alternativa"}
            </button>
          </div>
        </div>

        <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-8 print:shadow-none">
          <header className="border-b border-slate-200 pb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">MARO · Formato colegiado</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Plan de Acciones por Niveles de Atención</h1>
            <p className="mt-2 text-sm text-slate-600">
              Formato interno operativo.
            </p>
          </header>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Región" value={consulta.region} />
            <Info label="Municipio" value={consulta.municipio} />
            <Info label="Unidad" value={consulta.unidad} />
            <Info label="CLUES" value={consulta.clues_id} />
            <Info label="Fecha ingreso CPN" value={formatDate(consulta.fecha_ingreso_cpn)} />
            <Info label="Fecha consulta" value={formatDate(consulta.fecha_consulta)} />
            <Info label="SDG ingreso" value={consulta.sdg_ingreso} />
            <Info label="Semanas de gestación" value={consulta.semanas_gestacion} />
            <Info label="Diagnóstico" value={consulta.diagnostico} />
            <Info label="Puntaje antecedentes" value={consulta.factor_riesgo_antecedentes} />
            <Info label="Puntaje tamizajes" value={consulta.factor_riesgo_tamizajes} />
            <Info label="Puntaje consulta" value={consulta.puntaje_consulta_parametros} />
            <Info label="Puntaje total" value={consulta.puntaje_total_consulta} />
            <Info label="Riesgo ≥ 25" value={Number(consulta.riesgo_25_plus) === 1 ? "Sí" : "No"} />
            <Info label="Fecha colegiado" value={formatDate(consulta.fecha_colegiado, true)} />
            <Info label="Estatus plan" value={data.plan.estatus === "completo" ? "Completo" : "Borrador"} />
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Generalidades clínicas del caso</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <p><strong>Plan clínico reportado:</strong> {consulta.plan || "—"}</p>
              <p><strong>Notas clínicas:</strong> {consulta.notas || "—"}</p>
              <p><strong>Observaciones colegiadas:</strong> {data.plan.observaciones || "—"}</p>
            </div>
          </section>

          <section className="mt-8 space-y-6">
            {NIVELES.map((nivel) => {
              const items = accionesPorNivel[nivel.key];
              const obs = data.observaciones_nivel?.[nivel.key];

              return (
                <div key={nivel.key} className="rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">{nivel.title}</h2>
                    <span className="text-xs font-semibold text-slate-500">
                      {items.length} {items.length === 1 ? "acción" : "acciones"}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Sin acciones definidas en este nivel.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2.5 text-left w-12">#</th>
                            <th className="px-3 py-2.5 text-left w-28">Fecha Acción</th>
                            <th className="px-3 py-2.5 text-left">Descripción de la Acción</th>
                            <th className="px-3 py-2.5 text-left w-28">Fecha Resp.</th>
                            <th className="px-3 py-2.5 text-left">Respuesta</th>
                            <th className="px-3 py-2.5 text-left w-28">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3 py-2.5 align-top font-bold text-slate-700">{item.orden}</td>
                              <td className="px-3 py-2.5 align-top text-slate-600 whitespace-nowrap">
                                {formatDate(item.fecha_accion || null)}
                              </td>
                              <td className="px-3 py-2.5 align-top whitespace-pre-wrap text-slate-900 font-medium max-w-xs sm:max-w-md">
                                {item.descripcion}
                              </td>
                              <td className="px-3 py-2.5 align-top text-slate-600 whitespace-nowrap">
                                {formatDate(item.fecha_respuesta || null)}
                              </td>
                              <td className="px-3 py-2.5 align-top whitespace-pre-wrap text-slate-800 max-w-xs sm:max-w-md">
                                {item.respuesta_accion || "—"}
                              </td>
                              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    item.estatus === "completada"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : item.estatus === "incompleta"
                                      ? "bg-amber-100 text-amber-800"
                                      : item.estatus === "no_realizada"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {item.estatus === "completada"
                                    ? "Completada"
                                    : item.estatus === "incompleta"
                                    ? "Incompleta"
                                    : item.estatus === "no_realizada"
                                    ? "No realizada"
                                    : "Pendiente"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 4 Observaciones del nivel */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Observaciones y Acuerdos por Nivel
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 space-y-1">
                        <span className="font-bold text-sky-900 block">Observaciones Zonales:</span>
                        <p className="text-slate-700 whitespace-pre-wrap">{obs?.obs_zonales || "—"}</p>
                      </div>
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-1">
                        <span className="font-bold text-indigo-900 block">Observaciones Regionales:</span>
                        <p className="text-slate-700 whitespace-pre-wrap">{obs?.obs_regionales || "—"}</p>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1">
                        <span className="font-bold text-rose-900 block">Observaciones Equipo Estatal Salud de las Mujeres:</span>
                        <p className="text-slate-700 whitespace-pre-wrap">{obs?.obs_estatal_salud_mujeres || "—"}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1">
                        <span className="font-bold text-emerald-900 block">Observaciones Equipo Atención Médica:</span>
                        <p className="text-slate-700 whitespace-pre-wrap">{obs?.obs_atencion_medica || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </article>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value === null || value === undefined || value === "" ? "—" : String(value)}</p>
    </div>
  );
}