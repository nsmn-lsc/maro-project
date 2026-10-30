/**
 * Módulo de Lógica Clínica y Reglas de Negocio para el Seguimiento Regional
 * de Pacientes con Riesgo > 25 Puntos.
 */

export const PLAZO_SEGUIMIENTO_REGIONAL_DIAS = 7;
export const PLAZO_MAX_CONSULTA_EXTERNA_DIAS = 30;
export const MAX_ACCIONES_GENERALES_LENGTH = 500;

export type EstadoAlertaSeguimiento = "COMPLETADO" | "EN_PLAZO" | "VENCIDO";

export interface SeguimientoRegionalPayload {
  paciente_id: number;
  fecha_consulta_externa: string;
  fecha_laboratorios: string;
  acciones_generales: string;
}

export interface ResultadoEvaluacionSeguimiento {
  estado: EstadoAlertaSeguimiento;
  diasTranscurridos: number;
  diasRestantes: number;
  alertaEstatalActiva: boolean;
  motivo: string;
}

/**
 * Normaliza una fecha a YYYY-MM-DD local o string estándar
 */
export function normalizarFechaISO(fecha: string | Date | null | undefined): string | null {
  if (!fecha) return null;
  if (fecha instanceof Date) {
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().slice(0, 10);
  }
  const clean = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const d = new Date(clean);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Calcula los días naturales transcurridos entre la fecha de registro y la fecha actual (o de referencia).
 */
export function calcularDiasDesdeRegistro(
  fechaRegistro: string | Date | null | undefined,
  fechaActual: Date = new Date()
): number {
  const fRegStr = normalizarFechaISO(fechaRegistro);
  if (!fRegStr) return 0;

  const fReg = new Date(`${fRegStr}T00:00:00`);
  const fActualStr = fechaActual.toISOString().slice(0, 10);
  const fAct = new Date(`${fActualStr}T00:00:00`);

  const diffMs = fAct.getTime() - fReg.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, dias);
}

/**
 * Evalúa si un paciente es candidato al protocolo de seguimiento regional (> 25 pts o flag activa).
 */
export function esPacienteCandidatoSeguimiento(
  puntaje: number | null | undefined,
  riesgo25Plus?: boolean | number
): boolean {
  const p = typeof puntaje === "number" && Number.isFinite(puntaje) ? puntaje : 0;
  return p > 25 || p >= 25 || Number(riesgo25Plus) === 1;
}

/**
 * Determina el estado del seguimiento y si debe alertarse a nivel estatal:
 * - COMPLETADO: Ya cuenta con seguimiento registrado.
 * - EN_PLAZO: Sin seguimiento, pero dentro de los 7 días (alerta preventiva para región).
 * - VENCIDO: Sin seguimiento y han transcurrido más de 7 días (alerta crítica estatal automática).
 */
export function calcularEstadoSeguimiento(params: {
  tieneSeguimiento: boolean;
  fechaRegistro: string | Date | null | undefined;
  fechaActual?: Date;
}): ResultadoEvaluacionSeguimiento {
  const { tieneSeguimiento, fechaRegistro, fechaActual = new Date() } = params;

  if (tieneSeguimiento) {
    const diasTranscurridos = calcularDiasDesdeRegistro(fechaRegistro, fechaActual);
    return {
      estado: "COMPLETADO",
      diasTranscurridos,
      diasRestantes: 0,
      alertaEstatalActiva: false,
      motivo: "Plan de seguimiento regional registrado con éxito.",
    };
  }

  const diasTranscurridos = calcularDiasDesdeRegistro(fechaRegistro, fechaActual);
  const diasRestantes = Math.max(0, PLAZO_SEGUIMIENTO_REGIONAL_DIAS - diasTranscurridos);
  const estaVencido = diasTranscurridos > PLAZO_SEGUIMIENTO_REGIONAL_DIAS;

  if (estaVencido) {
    return {
      estado: "VENCIDO",
      diasTranscurridos,
      diasRestantes: 0,
      alertaEstatalActiva: true,
      motivo: `Plazo regional de 7 días vencido (${diasTranscurridos} días transcurridos sin registrar plan).`,
    };
  }

  return {
    estado: "EN_PLAZO",
    diasTranscurridos,
    diasRestantes,
    alertaEstatalActiva: false,
    motivo: `En plazo de seguimiento regional (restan ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}).`,
  };
}

/**
 * Valida los datos ingresados por el usuario regional:
 * 1. Fecha de Consulta Externa obligatoria y no mayor a 30 días de la fecha de registro.
 * 2. Fecha de Laboratorios obligatoria, no menor a la de registro y PREVIA o igual a la de Consulta Externa.
 * 3. Acciones Generales obligatorias y no mayores a 500 caracteres.
 */
export function validarSeguimientoRegional(
  payload: Partial<SeguimientoRegionalPayload>,
  fechaRegistro: string | Date | null | undefined
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  const fRegStr = normalizarFechaISO(fechaRegistro);
  if (!fRegStr) {
    errores.push("La paciente no cuenta con una fecha de registro válida para calcular los plazos.");
    return { valido: false, errores };
  }

  const fCitaStr = normalizarFechaISO(payload.fecha_consulta_externa);
  const fLabsStr = normalizarFechaISO(payload.fecha_laboratorios);
  const acciones = (payload.acciones_generales || "").trim();

  // 1. Validar Fecha Consulta Externa
  if (!fCitaStr) {
    errores.push("La fecha de cita para consulta externa es obligatoria.");
  } else {
    const fReg = new Date(`${fRegStr}T00:00:00`);
    const fCita = new Date(`${fCitaStr}T00:00:00`);

    if (fCita < fReg) {
      errores.push("La fecha de consulta externa no puede ser anterior a la fecha de registro de la paciente.");
    }

    const maxCita = new Date(fReg.getTime() + PLAZO_MAX_CONSULTA_EXTERNA_DIAS * 24 * 60 * 60 * 1000);
    if (fCita > maxCita) {
      errores.push(
        `La cita para consulta externa no puede ser mayor a 30 días posteriores al registro (fecha límite: ${maxCita
          .toISOString()
          .slice(0, 10)}).`
      );
    }
  }

  // 2. Validar Fecha de Laboratorios y Paraclínicos
  if (!fLabsStr) {
    errores.push("La fecha de cita a laboratorios y paraclínicos es obligatoria.");
  } else {
    const fReg = new Date(`${fRegStr}T00:00:00`);
    const fLabs = new Date(`${fLabsStr}T00:00:00`);

    if (fLabs < fReg) {
      errores.push("La fecha de laboratorios no puede ser anterior a la fecha de registro de la paciente.");
    }

    if (fCitaStr) {
      const fCita = new Date(`${fCitaStr}T00:00:00`);
      if (fLabs > fCita) {
        errores.push("La fecha de cita a laboratorios debe ser previa o simultánea a la cita de consulta externa.");
      }
    }
  }

  // 3. Validar Acciones Generales
  if (!acciones) {
    errores.push("El campo de acciones generales es obligatorio.");
  } else if (acciones.length > MAX_ACCIONES_GENERALES_LENGTH) {
    errores.push(
      `Las acciones generales no pueden exceder los ${MAX_ACCIONES_GENERALES_LENGTH} caracteres (actual: ${acciones.length}).`
    );
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}
