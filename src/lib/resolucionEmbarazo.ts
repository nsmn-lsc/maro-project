// src/lib/resolucionEmbarazo.ts
/**
 * Lógica clínica para el ciclo de vida obstétrico:
 * - Cálculo dinámico de SDG en embarazo activo
 * - Congelamiento de SDG al registrar resolución (parto / cesárea)
 * - Cálculo automático de días y etapas del puerperio (Día 1 a 42)
 * - Detección de FPP vencida (> 40.0 SDG) sin resolución
 */

export type EstadoEmbarazo = 'activo' | 'puerperio' | 'concluido';
export type TipoResolucion = 'sin_complicaciones' | 'con_complicaciones' | 'interrupcion';
export type TipoEventoConsulta = 'embarazo' | 'resolucion_sin_complicaciones' | 'resolucion_con_complicaciones';
export type EtapaPuerperio = 'inmediato' | 'mediato' | 'tardio' | 'concluido';

export interface DatosCicloObstetrico {
  fum?: string | Date | null;
  fechaIngreso?: string | Date | null;
  estadoEmbarazo?: EstadoEmbarazo | null;
  fechaResolucion?: string | Date | null;
  tipoResolucion?: TipoResolucion | null;
  fechaReferencia?: string | Date | null; // Fecha de consulta o cálculo (default: hoy)
}

export interface ResultadoCicloObstetrico {
  estadoEmbarazo: EstadoEmbarazo;
  semanasGestacion: number | null;
  sdgTexto: string;
  fpp: string | null;
  esFppVencida: boolean;
  diasVencido: number;
  diasPuerperio: number | null;
  etapaPuerperio: EtapaPuerperio | null;
  descripcionClinica: string;
}

function parseDateUtc(dateVal?: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    return new Date(Date.UTC(dateVal.getUTCFullYear(), dateVal.getUTCMonth(), dateVal.getUTCDate()));
  }
  const str = String(dateVal).trim().slice(0, 10);
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Convierte días totales a notación médica SDG: semanas.días (0-6)
 * Ej: 73 días → 10 semanas + 3 días → 10.3
 */
export function computeSdgNotation(totalDays: number): number {
  if (totalDays <= 0) return 0;
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return Number((weeks + days * 0.1).toFixed(1));
}

/**
 * Evalúa el ciclo obstétrico de la paciente
 */
export function evaluarCicloObstetrico(datos: DatosCicloObstetrico): ResultadoCicloObstetrico {
  const hoyUtc = parseDateUtc(datos.fechaReferencia) || (() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  })();

  const fumDate = parseDateUtc(datos.fum);
  const resolucionDate = parseDateUtc(datos.fechaResolucion);
  const estado: EstadoEmbarazo = datos.estadoEmbarazo || (resolucionDate ? 'puerperio' : 'activo');

  // 1. Cálculo de FPP (FUM + 280 días)
  let fppStr: string | null = null;
  let fppDate: Date | null = null;
  if (fumDate) {
    fppDate = new Date(fumDate);
    fppDate.setUTCDate(fppDate.getUTCDate() + 280);
    fppStr = formatDateIso(fppDate);
  }

  // 2. Cálculo de Semanas de Gestación (SDG)
  let totalDiasGestacion = 0;
  let semanasGestacion: number | null = null;

  if (fumDate) {
    // Si la paciente ya resolvió el embarazo, la SDG se congela a la fecha de resolución
    const fechaCorteGestacion = (estado === 'puerperio' || estado === 'concluido') && resolucionDate
      ? resolucionDate
      : hoyUtc;

    const diffMs = fechaCorteGestacion.getTime() - fumDate.getTime();
    totalDiasGestacion = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    semanasGestacion = computeSdgNotation(totalDiasGestacion);
  }

  // 3. FPP vencida (Solo aplica si el embarazo sigue ACTIVO y supera 40.0 SDG o FPP rebasada)
  let esFppVencida = false;
  let diasVencido = 0;

  if (estado === 'activo' && fppDate) {
    const diffFppMs = hoyUtc.getTime() - fppDate.getTime();
    const diasPasadosFpp = Math.floor(diffFppMs / (1000 * 60 * 60 * 24));
    if (diasPasadosFpp > 0 || (semanasGestacion !== null && semanasGestacion >= 40.0)) {
      esFppVencida = true;
      diasVencido = Math.max(diasPasadosFpp, 0);
    }
  }

  // 4. Cálculo de Días y Etapa de Puerperio
  let diasPuerperio: number | null = null;
  let etapaPuerperio: EtapaPuerperio | null = null;

  if (estado === 'puerperio' || estado === 'concluido' || resolucionDate) {
    const fechaInicioPuerperio = resolucionDate || hoyUtc;
    const diffPuerperioMs = hoyUtc.getTime() - fechaInicioPuerperio.getTime();
    diasPuerperio = Math.max(0, Math.floor(diffPuerperioMs / (1000 * 60 * 60 * 24)));

    if (diasPuerperio <= 1) {
      etapaPuerperio = 'inmediato'; // Primeras 24 - 48h
    } else if (diasPuerperio <= 7) {
      etapaPuerperio = 'mediato';   // Días 2 a 7
    } else if (diasPuerperio <= 42) {
      etapaPuerperio = 'tardio';    // Días 8 a 42
    } else {
      etapaPuerperio = 'concluido'; // > 42 días
    }
  }

  // 5. Generar descripción y texto
  let sdgTexto = semanasGestacion !== null ? `${semanasGestacion} SDG` : 'Sin FUM';
  let descripcionClinica = '';

  if (estado === 'puerperio') {
    descripcionClinica = `Puerperio ${etapaPuerperio ? etapaPuerperio.toUpperCase() : ''} (Día ${diasPuerperio ?? 0}/42)`;
  } else if (estado === 'concluido') {
    descripcionClinica = 'Seguimiento obstétrico concluido (Alta de puerperio)';
  } else if (esFppVencida) {
    descripcionClinica = `Embarazo a término con FPP vencida (+${diasVencido} días) - Requiere registro de resolución`;
  } else {
    descripcionClinica = `Embarazo en curso activo (${sdgTexto})`;
  }

  return {
    estadoEmbarazo: estado,
    semanasGestacion,
    sdgTexto,
    fpp: fppStr,
    esFppVencida,
    diasVencido,
    diasPuerperio,
    etapaPuerperio,
    descripcionClinica,
  };
}
