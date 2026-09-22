import { z } from "zod";

/**
 * Parsea una fecha en formato YYYY-MM-DD sin desfase horario de zona horaria local o UTC.
 */
export function parseDateOnly(dateValue?: string | Date | null): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return null;
    return new Date(Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate()));
  }
  const str = String(dateValue).trim().slice(0, 10);
  const parts = str.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;
  // Validar consistencia real del día del mes (evitar 2026-02-31 etc)
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null;
  }
  return parsed;
}

export function formatDateOnly(dateValue: Date): string {
  return dateValue.toISOString().slice(0, 10);
}

/**
 * Formatea una fecha de manera segura y consistente (DD-MM-YYYY),
 * tolerando Date, string, null o undefined sin lanzar excepciones ni desfases horarios.
 */
export function formatDate(
  value: string | Date | null | undefined,
  fallback: string = "—",
  includeTime: boolean = false
): string {
  if (!value) return fallback;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    const dd = String(value.getUTCDate()).padStart(2, "0");
    const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = value.getUTCFullYear();
    if (includeTime) {
      const hh = String(value.getUTCHours()).padStart(2, "0");
      const min = String(value.getUTCMinutes()).padStart(2, "0");
      return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
    }
    return `${dd}-${mm}-${yyyy}`;
  }

  const str = String(value).trim();
  if (!str) return fallback;

  // Si viene en formato YYYY-MM-DD
  const dateOnly = parseDateOnly(str);
  if (dateOnly) {
    const dd = String(dateOnly.getUTCDate()).padStart(2, "0");
    const mm = String(dateOnly.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = dateOnly.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  // Para formatos con hora / ISO timestamps
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return fallback;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (includeTime) {
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  }
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Formatea la FUM obstétrica proporcionando un fallback clínico explícito
 * si la fecha es nula, no confiable o dudosa.
 */
export function formatFum(
  fum: string | Date | null | undefined,
  fallback: string = "No confiable / Dudosa"
): string {
  return formatDate(fum, fallback);
}


export function getTodayLocalString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMinFumDateString(referenceDateStr?: string | null): string {
  const ref = parseDateOnly(referenceDateStr) || parseDateOnly(getTodayLocalString())!;
  const minDate = new Date(ref);
  minDate.setUTCDate(minDate.getUTCDate() - 294); // 42 semanas * 7 = 294 días
  return formatDateOnly(minDate);
}

export interface EvaluacionFechasObstetricas {
  fumValida: boolean;
  fechaIngresoValida: boolean;
  sdgAlIngresoDecimal: number | null; // Ej: 14.2
  sdgAlIngresoEntero: number | null;  // Ej: 14
  sdgActualDecimal: number | null;
  fpp: string | null;
  errorFum: string | null;
  errorFechaIngreso: string | null;
  advertenciaAnoAtipico: string | null;
  esFueraDeRangoClinico: boolean;
  bloquearSubmit: boolean;
}

/**
 * Evaluación clínica reactiva de fechas para UI y backend.
 */
export function evaluarFechasObstetricas(params: {
  fum?: string | null;
  fechaIngresoCpn?: string | null;
  fumDesconocida?: boolean;
  sdgManual?: string | number | null;
}): EvaluacionFechasObstetricas {
  const hoyStr = getTodayLocalString();
  const hoyDate = parseDateOnly(hoyStr)!;
  const fechaIngresoDate = parseDateOnly(params.fechaIngresoCpn);
  const fumDate = parseDateOnly(params.fum);

  let errorFechaIngreso: string | null = null;
  let errorFum: string | null = null;
  let advertenciaAnoAtipico: string | null = null;
  let sdgAlIngresoDecimal: number | null = null;
  let sdgAlIngresoEntero: number | null = null;
  let sdgActualDecimal: number | null = null;
  let fppStr: string | null = null;
  let esFueraDeRangoClinico = false;

  // 1. Validar fecha_ingreso_cpn
  if (params.fechaIngresoCpn && String(params.fechaIngresoCpn).trim()) {
    if (!fechaIngresoDate) {
      errorFechaIngreso = "La fecha de ingreso a CPN no es válida.";
    } else if (fechaIngresoDate.getTime() > hoyDate.getTime()) {
      errorFechaIngreso = "La fecha de ingreso a control prenatal no puede ser posterior a la fecha actual.";
    }
  }

  // 2. Si FUM es desconocida / dudosa
  if (params.fumDesconocida) {
    const manualNum = params.sdgManual !== undefined && params.sdgManual !== null && String(params.sdgManual).trim() !== ""
      ? Number(params.sdgManual)
      : null;

    if (manualNum !== null) {
      if (isNaN(manualNum) || manualNum < 1 || manualNum > 42.6) {
        errorFum = "Las semanas de gestación estimadas por USG deben estar entre 1.0 y 42.0 SDG.";
        esFueraDeRangoClinico = true;
      } else {
        sdgAlIngresoDecimal = Number(manualNum.toFixed(1));
        sdgAlIngresoEntero = Math.floor(manualNum);
        
        // Calcular FPP aproximada desde fechaIngreso o hoy: FPP = refDate + (280 - manualNum * 7) días
        const refDate = fechaIngresoDate || hoyDate;
        const diasRestantes = Math.round(280 - (manualNum * 7));
        const fppCalculada = new Date(refDate);
        fppCalculada.setUTCDate(fppCalculada.getUTCDate() + diasRestantes);
        fppStr = formatDateOnly(fppCalculada);
      }
    }

    return {
      fumValida: !errorFum,
      fechaIngresoValida: !errorFechaIngreso,
      sdgAlIngresoDecimal,
      sdgAlIngresoEntero,
      sdgActualDecimal: sdgAlIngresoDecimal,
      fpp: fppStr,
      errorFum,
      errorFechaIngreso,
      advertenciaAnoAtipico: null,
      esFueraDeRangoClinico,
      bloquearSubmit: Boolean(errorFechaIngreso || errorFum),
    };
  }

  // 3. Si FUM está presente
  if (fumDate) {
    const fumYear = fumDate.getUTCFullYear();
    const hoyYear = hoyDate.getUTCFullYear();
    if (fumYear !== hoyYear && fumYear !== hoyYear - 1) {
      advertenciaAnoAtipico = `⚠️ Año de FUM capturado (${fumYear}) es atípico. Verifique si corresponde al periodo gestacional en curso.`;
    }

    // FUM futura respecto a hoy
    if (fumDate.getTime() > hoyDate.getTime()) {
      errorFum = "La FUM no puede ser posterior a la fecha actual ni a la fecha de consulta.";
      esFueraDeRangoClinico = true;
    }

    // Fecha referencia para calcular SDG al ingreso:
    const refDate = fechaIngresoDate || hoyDate;

    // Cronología invertida
    if (fechaIngresoDate && fechaIngresoDate.getTime() < fumDate.getTime()) {
      errorFechaIngreso = "La fecha de ingreso a control prenatal no puede ser previa a la FUM.";
      if (!errorFum) {
        errorFum = "La FUM no puede ser posterior a la fecha de ingreso CPN.";
      }
      esFueraDeRangoClinico = true;
    }

    const diffMsIngreso = refDate.getTime() - fumDate.getTime();
    const diffDiasIngreso = Math.floor(diffMsIngreso / (1000 * 60 * 60 * 24));

    if (diffDiasIngreso < 0) {
      if (!errorFum) {
        errorFum = "La FUM no puede ser posterior a la fecha de consulta o ingreso.";
      }
      esFueraDeRangoClinico = true;
    } else {
      const weeks = Math.floor(diffDiasIngreso / 7);
      const days = diffDiasIngreso % 7;
      sdgAlIngresoDecimal = Number((weeks + days * 0.1).toFixed(1));
      sdgAlIngresoEntero = weeks;

      // FUM > 42 semanas (294 días)
      if (diffDiasIngreso > 294) {
        errorFum = "La FUM excede las 42 semanas biológicas de gestación al momento de la consulta. Verifique el año/mes capturado o marque FUM dudosa.";
        esFueraDeRangoClinico = true;
      } else if (diffDiasIngreso < 7) {
        // Menos de 1 semana
        esFueraDeRangoClinico = true;
      }
    }

    // FPP estándar (FUM + 280 días)
    const fppDate = new Date(fumDate);
    fppDate.setUTCDate(fppDate.getUTCDate() + 280);
    fppStr = formatDateOnly(fppDate);

    // SDG actuales respecto a hoy
    const diffMsHoy = hoyDate.getTime() - fumDate.getTime();
    if (diffMsHoy >= 0) {
      const wHoy = Math.floor(diffMsHoy / (1000 * 60 * 60 * 24 * 7));
      const dHoy = Math.floor((diffMsHoy / (1000 * 60 * 60 * 24)) % 7);
      sdgActualDecimal = Number((wHoy + dHoy * 0.1).toFixed(1));
    }
  }

  const bloquearSubmit = Boolean(
    errorFechaIngreso ||
    errorFum ||
    (esFueraDeRangoClinico && (sdgAlIngresoDecimal === null || sdgAlIngresoDecimal > 42.6 || sdgAlIngresoDecimal < 0))
  );

  return {
    fumValida: !errorFum,
    fechaIngresoValida: !errorFechaIngreso,
    sdgAlIngresoDecimal,
    sdgAlIngresoEntero,
    sdgActualDecimal,
    fpp: fppStr,
    errorFum,
    errorFechaIngreso,
    advertenciaAnoAtipico,
    esFueraDeRangoClinico,
    bloquearSubmit,
  };
}

/**
 * Esquema Zod con validaciones cruzadas y .superRefine() para creación/edición de paciente.
 */
export const pacienteFechasZodSchema = z
  .object({
    fecha_ingreso_cpn: z.string().min(1, "La fecha de ingreso a CPN es obligatoria"),
    fum: z.string().optional().nullable(),
    fum_desconocida: z.boolean().optional(),
    sdg_ingreso: z.union([z.number(), z.string()]).optional().nullable(),
    semanas_gestacion: z.union([z.number(), z.string()]).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hoyStr = getTodayLocalString();
    const hoyDate = parseDateOnly(hoyStr)!;
    const fechaIngresoDate = parseDateOnly(data.fecha_ingreso_cpn);

    if (!fechaIngresoDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de ingreso a CPN no es válida.",
        path: ["fecha_ingreso_cpn"],
      });
      return;
    }

    if (fechaIngresoDate.getTime() > hoyDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de ingreso a control prenatal no puede ser posterior a la fecha actual.",
        path: ["fecha_ingreso_cpn"],
      });
    }

    if (data.fum_desconocida) {
      const sdgVal = data.sdg_ingreso !== undefined && data.sdg_ingreso !== null && String(data.sdg_ingreso).trim() !== ""
        ? Number(data.sdg_ingreso)
        : data.semanas_gestacion !== undefined && data.semanas_gestacion !== null && String(data.semanas_gestacion).trim() !== ""
        ? Number(data.semanas_gestacion)
        : null;

      if (sdgVal === null || isNaN(sdgVal) || sdgVal < 1 || sdgVal > 42.6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Para FUM no confiable, debe ingresar las semanas de gestación estimadas (entre 1 y 42).",
          path: ["semanas_gestacion"],
        });
      }
      return;
    }

    // Si FUM no es desconocida, FUM es requerida
    if (!data.fum || !String(data.fum).trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La FUM es obligatoria si no se marca como desconocida.",
        path: ["fum"],
      });
      return;
    }

    const fumDate = parseDateOnly(data.fum);
    if (!fumDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La FUM tiene un formato inválido.",
        path: ["fum"],
      });
      return;
    }

    if (fumDate.getTime() > hoyDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La FUM no puede ser posterior a la fecha actual ni a la fecha de consulta.",
        path: ["fum"],
      });
    }

    if (fechaIngresoDate.getTime() < fumDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de ingreso a control prenatal no puede ser previa a la FUM.",
        path: ["fecha_ingreso_cpn"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La FUM no puede ser posterior a la fecha de ingreso CPN.",
        path: ["fum"],
      });
    }

    const diffDays = Math.floor((fechaIngresoDate.getTime() - fumDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 294) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La FUM excede las 42 semanas biológicas de gestación al momento de la consulta. Verifique el año/mes capturado o marque FUM dudosa.",
        path: ["fum"],
      });
    }
  });

/**
 * Esquema Zod para validación de consulta prenatal.
 */
export const consultaFechasZodSchema = z
  .object({
    fecha_consulta: z.string().min(1, "La fecha de consulta es obligatoria"),
    fum: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hoyStr = getTodayLocalString();
    const hoyDate = parseDateOnly(hoyStr)!;
    const fechaConsultaDate = parseDateOnly(data.fecha_consulta);

    if (!fechaConsultaDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de consulta es inválida.",
        path: ["fecha_consulta"],
      });
      return;
    }

    if (fechaConsultaDate.getTime() > hoyDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de consulta no puede ser posterior a la fecha actual.",
        path: ["fecha_consulta"],
      });
    }

    if (data.fum) {
      const fumDate = parseDateOnly(data.fum);
      if (fumDate) {
        if (fechaConsultaDate.getTime() < fumDate.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La fecha de consulta no puede ser previa a la FUM de la paciente.",
            path: ["fecha_consulta"],
          });
        }
      }
    }
  });
