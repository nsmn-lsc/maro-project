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

/**
 * Funciones de evaluación para la subsección Interrogatorio del Triage Obstétrico
 */
export function evaluarSangradoTransvaginal(valor: string): AlertaSignoVital | null {
  if (valor === "abundante") {
    return {
      campo: "Sangrado transvaginal",
      valor: "Abundante",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    };
  }
  if (valor === "escaso_moderado") {
    return {
      campo: "Sangrado transvaginal",
      valor: "Escaso/Moderado",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarCrisisConvulsivas(valor: string): AlertaSignoVital | null {
  if (valor === "presente") {
    return {
      campo: "Crisis convulsivas",
      valor: "Presente",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    };
  }
  if (valor === "negadas") {
    return {
      campo: "Crisis convulsivas",
      valor: "Negadas",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarCefalea(valor: string): AlertaSignoVital | null {
  if (valor === "presente") {
    return {
      campo: "Cefalea",
      valor: "Presente",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    };
  }
  if (valor === "no_pulsatil") {
    return {
      campo: "Cefalea",
      valor: "Ausente/Presente No pulsátil",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarAcufenosFosfenos(valor: string): AlertaSignoVital | null {
  if (valor === "presente") {
    return {
      campo: "Acúfenos/Fosfenos",
      valor: "Presente",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    };
  }
  if (valor === "ausentes") {
    return {
      campo: "Acúfenos/Fosfenos",
      valor: "Ausentes",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarEpigastralgiaAmaurosis(valor: string): AlertaSignoVital | null {
  if (valor === "presente") {
    return {
      campo: "Epigastralgia/Amaurosis",
      valor: "Presente",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    };
  }
  if (valor === "ausente") {
    return {
      campo: "Epigastralgia/Amaurosis",
      valor: "Ausente",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarSindromeFebril(valor: string): AlertaSignoVital | null {
  if (valor === "presente") {
    return {
      campo: "Síndrome febril",
      valor: "Presente",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarLiquidoAmniotico(valor: string): AlertaSignoVital | null {
  if (valor === "claro_verdoso") {
    return {
      campo: "Salida de líquido amniótico",
      valor: "Claro/verdoso",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export function evaluarMovilidadFetal(valor: string): AlertaSignoVital | null {
  if (valor === "ausente") {
    return {
      campo: "Movilidad fetal",
      valor: "Ausente",
      nivel: "AMARILLO",
      descripcion: "Urgencia calificada",
    };
  }
  return null;
}

export interface InterrogatorioTriageInput {
  interrogatorio_sangrado_transvaginal?: string | null;
  interrogatorio_crisis_convulsivas?: string | null;
  interrogatorio_cefalea?: string | null;
  interrogatorio_acufenos_fosfenos?: string | null;
  interrogatorio_epigastralgia_amaurosis?: string | null;
  interrogatorio_sindrome_febril?: string | null;
  interrogatorio_liquido_amniotico?: string | null;
  interrogatorio_movilidad_fetal?: string | null;
}

export function evaluarInterrogatorioTriage(input: InterrogatorioTriageInput): AlertaSignoVital[] {
  const alertas = [
    evaluarSangradoTransvaginal(input.interrogatorio_sangrado_transvaginal || ""),
    evaluarCrisisConvulsivas(input.interrogatorio_crisis_convulsivas || ""),
    evaluarCefalea(input.interrogatorio_cefalea || ""),
    evaluarAcufenosFosfenos(input.interrogatorio_acufenos_fosfenos || ""),
    evaluarEpigastralgiaAmaurosis(input.interrogatorio_epigastralgia_amaurosis || ""),
    evaluarSindromeFebril(input.interrogatorio_sindrome_febril || ""),
    evaluarLiquidoAmniotico(input.interrogatorio_liquido_amniotico || ""),
    evaluarMovilidadFetal(input.interrogatorio_movilidad_fetal || ""),
  ];
  return alertas.filter((a): a is AlertaSignoVital => a !== null);
}
