export interface AlertaSignoVital {
  campo: string;
  valor: string;
  nivel: "ROJO" | "AMARILLO";
  descripcion: string;
}

export type TipoProtocoloTriage = "EMERGENCIA_OBSTETRICA" | "URGENCIA_CALIFICADA" | "NORMAL";

export interface ProtocoloResultado {
  tipo: TipoProtocoloTriage;
  mensaje: string | null;
  tieneEmergenciaObstetrica: boolean;
  tieneUrgenciaCalificada: boolean;
}

export const MENSAJE_EMERGENCIA_OBSTETRICA =
  "EMERGENCIA OBSTÉTRICA: Alerta de manejo inicial, notificación inmediata a enlace zonal y referencia segura";

export const MENSAJE_URGENCIA_CALIFICADA =
  "URGENCIA CALIFICADA: iniciar manejo, notificación inmediata a enlace zonal y referencia segura";

/**
 * Determina el protocolo de actuación inmediata según las alertas de signos vitales y triage.
 * Reglas clínicas:
 * 1. Si existe al menos un elemento en ROJO -> EMERGENCIA OBSTÉTRICA.
 * 2. Si existe al menos un elemento en AMARILLO y NINGUNO en ROJO -> URGENCIA CALIFICADA.
 * 3. Si no hay alertas -> NORMAL (sin tarjeta de protocolo activo).
 */
export function determinarProtocoloTriage(alertas: AlertaSignoVital[]): ProtocoloResultado {
  const tieneEmergenciaObstetrica = alertas.some((a) => a.nivel === "ROJO");
  const tieneUrgenciaCalificada = !tieneEmergenciaObstetrica && alertas.some((a) => a.nivel === "AMARILLO");

  if (tieneEmergenciaObstetrica) {
    return {
      tipo: "EMERGENCIA_OBSTETRICA",
      mensaje: MENSAJE_EMERGENCIA_OBSTETRICA,
      tieneEmergenciaObstetrica: true,
      tieneUrgenciaCalificada: false,
    };
  }

  if (tieneUrgenciaCalificada) {
    return {
      tipo: "URGENCIA_CALIFICADA",
      mensaje: MENSAJE_URGENCIA_CALIFICADA,
      tieneEmergenciaObstetrica: false,
      tieneUrgenciaCalificada: true,
    };
  }

  return {
    tipo: "NORMAL",
    mensaje: null,
    tieneEmergenciaObstetrica: false,
    tieneUrgenciaCalificada: false,
  };
}

/**
 * Funciones de evaluación para los signos de alarma del Triage Obstétrico
 */
export function evaluarEstadoConciencia(valor: string): AlertaSignoVital | null {
  if (valor === "alteraciones") {
    return {
      campo: "Estado de Conciencia",
      valor: "Alteraciones",
      nivel: "ROJO",
      descripcion: "Alteración neurológica / Estado mental",
    };
  }
  if (valor === "conciente") {
    return {
      campo: "Estado de Conciencia",
      valor: "Consciente",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarHemorragia(valor: string): AlertaSignoVital | null {
  if (valor === "visible o abundante") {
    return {
      campo: "Hemorragia",
      valor: "Visible o abundante",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    };
  }
  if (valor === "no visible o moderada") {
    return {
      campo: "Hemorragia",
      valor: "No visible o moderada",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  if (valor === "no visible o escasa") {
    return {
      campo: "Hemorragia",
      valor: "No visible o escasa",
      nivel: "AMARILLO",
      descripcion: "Hemorragia detectada",
    };
  }
  return null;
}

export function evaluarRespiracion(valor: string): AlertaSignoVital | null {
  if (valor === "alterada") {
    return {
      campo: "Respiración",
      valor: "Alterada",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    };
  }
  if (valor === "normal") {
    return {
      campo: "Respiración",
      valor: "Normal",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarColorPiel(valor: string): AlertaSignoVital | null {
  if (valor === "cianotica") {
    return {
      campo: "Color de Piel",
      valor: "Cianótica",
      nivel: "ROJO",
      descripcion: "Hipoxia / Emergencia Obstétrica",
    };
  }
  if (valor === "palida") {
    return {
      campo: "Color de Piel",
      valor: "Pálida",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}
