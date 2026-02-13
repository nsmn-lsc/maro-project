// src/lib/factorRiesgo.ts
/**
 * Sistema de puntuación de factores de riesgo obstétrico
 * Valida campos específicos según criterios clínicos y suma puntos
 * Soporta datos distribuidos entre múltiples páginas y la BD
 */

export interface DatosFactorRiesgo {
  // Antecedentes obstétricos
  gesta?: number;
  partos?: number;
  cesareasPrevias?: number;
  abortos?: number;

  // Demográficos
  edad?: number;
  semanasGestacion?: number;
  imc?: number;

  // Condiciones médicas previas
  embarazoMultiple?: boolean;
  antecedentePreeclampsia?: boolean;
  antecedenteHemorragiaPosparto?: boolean;
  diabetesPrevia?: boolean;
  diabetesGestacional?: boolean;
  hipertensionCronica?: boolean;
  cardiopatia?: boolean;
  nefropatia?: boolean;
  epilepsia?: boolean;
  VIH?: boolean;

  // Signos/síntomas actuales
  sangradoVaginal?: boolean;
  salidaLiquido?: boolean;
  dolorAbdominalIntenso?: boolean;
  cefaleaSevera?: boolean;
  fosfenos?: boolean;
  epigastralgia?: boolean;
  fiebre?: boolean;
  disnea?: boolean;
  disminucionMovimientosFetales?: boolean;

  // Signos vitales
  sistolica?: number;
  diastolica?: number;
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  saturacionO2?: number;
  temperatura?: number;

  // Laboratorios
  plaquetas?: number;
  creatinina?: number;
  ast?: number;
  alt?: number;
  proteinuriaTira?: "NEG" | "TRAZA" | "1+" | "2+" | "3+" | "4+";
}

export interface DetalleFactorRiesgo {
  campo: string;
  valor: string;
  puntos: number;
  criterio: string;
}

export interface ResultadoFactorRiesgo {
  puntajeTotal: number;
  detalles: DetalleFactorRiesgo[];
  categoria: "BAJO" | "MODERADO" | "ALTO";
  sugerencias: string[];
}

/**
 * Calcula la puntuación de factores de riesgo obstétrico
 * @param datos Objeto con los valores de los campos a evaluar
 * @returns Puntuación total, detalles y categoría de riesgo
 */
export function calcularFactorRiesgo(datos: DatosFactorRiesgo): ResultadoFactorRiesgo {
  const detalles: DetalleFactorRiesgo[] = [];
  let puntajeTotal = 0;

  // =====================================================================
  // ANTECEDENTES OBSTÉTRICOS
  // =====================================================================

  // Gestaciones previas
  if (datos.gesta !== undefined && datos.gesta !== null) {
    if (datos.gesta >= 5) {
      const puntos = 4;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Gestaciones previas",
        valor: datos.gesta.toString(),
        puntos,
        criterio: "≥ 5 gestaciones",
      });
    } else if (datos.gesta >= 2 && datos.gesta <= 4) {
      const puntos = 1;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Gestaciones previas",
        valor: datos.gesta.toString(),
        puntos,
        criterio: "2-4 gestaciones",
      });
    }
  }

  // Cesáreas previas
  if (datos.cesareasPrevias !== undefined && datos.cesareasPrevias !== null) {
    if (datos.cesareasPrevias >= 2) {
      const puntos = 4;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Cesáreas previas",
        valor: datos.cesareasPrevias.toString(),
        puntos,
        criterio: "≥ 2 cesáreas",
      });
    } else if (datos.cesareasPrevias === 1) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Cesáreas previas",
        valor: datos.cesareasPrevias.toString(),
        puntos,
        criterio: "1 cesárea previa",
      });
    }
  }

  // Abortos previos
  if (datos.abortos !== undefined && datos.abortos !== null) {
    if (datos.abortos >= 3) {
      const puntos = 3;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Abortos previos",
        valor: datos.abortos.toString(),
        puntos,
        criterio: "≥ 3 abortos",
      });
    } else if (datos.abortos >= 2) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Abortos previos",
        valor: datos.abortos.toString(),
        puntos,
        criterio: "2 abortos",
      });
    }
  }

  // =====================================================================
  // FACTORES DEMOGRÁFICOS
  // =====================================================================

  // Edad materna
  if (datos.edad !== undefined && datos.edad !== null) {
    if (datos.edad >= 35) {
      const puntos = 3;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Edad materna",
        valor: datos.edad.toString(),
        puntos,
        criterio: "≥ 35 años",
      });
    } else if (datos.edad <= 19) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Edad materna",
        valor: datos.edad.toString(),
        puntos,
        criterio: "≤ 19 años (adolescencia)",
      });
    }
  }

  // Índice de Masa Corporal
  if (datos.imc !== undefined && datos.imc !== null) {
    if (datos.imc >= 40) {
      const puntos = 4;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Índice de Masa Corporal (IMC)",
        valor: datos.imc.toFixed(1),
        puntos,
        criterio: "≥ 40 (obesidad severa)",
      });
    } else if (datos.imc >= 30) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Índice de Masa Corporal (IMC)",
        valor: datos.imc.toFixed(1),
        puntos,
        criterio: "30-39.9 (obesidad)",
      });
    } else if (datos.imc < 18.5) {
      const puntos = 1;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Índice de Masa Corporal (IMC)",
        valor: datos.imc.toFixed(1),
        puntos,
        criterio: "< 18.5 (bajo peso)",
      });
    }
  }

  // =====================================================================
  // CONDICIONES MÉDICAS PREVIAS
  // =====================================================================

  const condicionesMedicas = [
    {
      campo: "Embarazo múltiple",
      valor: datos.embarazoMultiple,
      puntos: 4,
      criterio: "Confirmado",
    },
    {
      campo: "Antecedente de preeclampsia",
      valor: datos.antecedentePreeclampsia,
      puntos: 4,
      criterio: "Sí",
    },
    {
      campo: "Antecedente de hemorragia posparto",
      valor: datos.antecedenteHemorragiaPosparto,
      puntos: 3,
      criterio: "Sí",
    },
    {
      campo: "Diabetes previa",
      valor: datos.diabetesPrevia,
      puntos: 3,
      criterio: "Sí",
    },
    {
      campo: "Diabetes gestacional",
      valor: datos.diabetesGestacional,
      puntos: 2,
      criterio: "Sí",
    },
    {
      campo: "Hipertensión crónica",
      valor: datos.hipertensionCronica,
      puntos: 3,
      criterio: "Sí",
    },
    {
      campo: "Cardiopatía",
      valor: datos.cardiopatia,
      puntos: 4,
      criterio: "Sí",
    },
    {
      campo: "Nefropatía",
      valor: datos.nefropatia,
      puntos: 3,
      criterio: "Sí",
    },
    {
      campo: "Epilepsia",
      valor: datos.epilepsia,
      puntos: 2,
      criterio: "Sí",
    },
    {
      campo: "VIH positivo",
      valor: datos.VIH,
      puntos: 3,
      criterio: "Sí",
    },
  ];

  condicionesMedicas.forEach((condicion) => {
    if (condicion.valor === true) {
      puntajeTotal += condicion.puntos;
      detalles.push({
        campo: condicion.campo,
        valor: "Sí",
        puntos: condicion.puntos,
        criterio: condicion.criterio,
      });
    }
  });

  // =====================================================================
  // SIGNOS Y SÍNTOMAS ACTUALES (ALARMA)
  // =====================================================================

  const signosAlarma = [
    {
      campo: "Sangrado vaginal",
      valor: datos.sangradoVaginal,
      puntos: 3,
      criterio: "Presente",
    },
    {
      campo: "Salida de líquido amniótico",
      valor: datos.salidaLiquido,
      puntos: 2,
      criterio: "Presente",
    },
    {
      campo: "Dolor abdominal intenso",
      valor: datos.dolorAbdominalIntenso,
      puntos: 3,
      criterio: "Presente",
    },
    {
      campo: "Cefalea severa",
      valor: datos.cefaleaSevera,
      puntos: 3,
      criterio: "Presente",
    },
    {
      campo: "Fosfenos/Alucinaciones visuales",
      valor: datos.fosfenos,
      puntos: 4,
      criterio: "Presente",
    },
    {
      campo: "Epigastralgia",
      valor: datos.epigastralgia,
      puntos: 2,
      criterio: "Presente",
    },
    {
      campo: "Fiebre",
      valor: datos.fiebre,
      puntos: 2,
      criterio: "Presente",
    },
    {
      campo: "Disnea",
      valor: datos.disnea,
      puntos: 3,
      criterio: "Presente",
    },
    {
      campo: "Disminución de movimientos fetales",
      valor: datos.disminucionMovimientosFetales,
      puntos: 3,
      criterio: "Presente",
    },
  ];

  signosAlarma.forEach((signo) => {
    if (signo.valor === true) {
      puntajeTotal += signo.puntos;
      detalles.push({
        campo: signo.campo,
        valor: "Sí",
        puntos: signo.puntos,
        criterio: signo.criterio,
      });
    }
  });

  // =====================================================================
  // SIGNOS VITALES ANORMALES
  // =====================================================================

  // Presión arterial sistólica
  if (datos.sistolica !== undefined && datos.sistolica !== null) {
    if (datos.sistolica >= 150) {
      const puntos = 3;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Presión sistólica",
        valor: datos.sistolica.toString() + " mmHg",
        puntos,
        criterio: "≥ 150 mmHg",
      });
    } else if (datos.sistolica >= 140) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Presión sistólica",
        valor: datos.sistolica.toString() + " mmHg",
        puntos,
        criterio: "140-149 mmHg",
      });
    }
  }

  // Presión arterial diastólica
  if (datos.diastolica !== undefined && datos.diastolica !== null) {
    if (datos.diastolica >= 100) {
      const puntos = 3;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Presión diastólica",
        valor: datos.diastolica.toString() + " mmHg",
        puntos,
        criterio: "≥ 100 mmHg",
      });
    } else if (datos.diastolica >= 90) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Presión diastólica",
        valor: datos.diastolica.toString() + " mmHg",
        puntos,
        criterio: "90-99 mmHg",
      });
    }
  }

  // Frecuencia cardíaca
  if (datos.frecuenciaCardiaca !== undefined && datos.frecuenciaCardiaca !== null) {
    if (datos.frecuenciaCardiaca > 110 || datos.frecuenciaCardiaca < 60) {
      const puntos = 1;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Frecuencia cardíaca materna",
        valor: datos.frecuenciaCardiaca.toString() + " bpm",
        puntos,
        criterio: "< 60 o > 110 bpm",
      });
    }
  }

  // Frecuencia respiratoria
  if (datos.frecuenciaRespiratoria !== undefined && datos.frecuenciaRespiratoria !== null) {
    if (datos.frecuenciaRespiratoria >= 25) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Frecuencia respiratoria",
        valor: datos.frecuenciaRespiratoria.toString() + " resp/min",
        puntos,
        criterio: "≥ 25 resp/min",
      });
    }
  }

  // Saturación de oxígeno
  if (datos.saturacionO2 !== undefined && datos.saturacionO2 !== null) {
    if (datos.saturacionO2 < 95) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Saturación O₂",
        valor: datos.saturacionO2.toFixed(1) + "%",
        puntos,
        criterio: "< 95%",
      });
    }
  }

  // Temperatura
  if (datos.temperatura !== undefined && datos.temperatura !== null) {
    if (datos.temperatura >= 38.5) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Temperatura corporal",
        valor: datos.temperatura.toFixed(1) + "°C",
        puntos,
        criterio: "≥ 38.5°C",
      });
    } else if (datos.temperatura >= 38) {
      const puntos = 1;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Temperatura corporal",
        valor: datos.temperatura.toFixed(1) + "°C",
        puntos,
        criterio: "38.0-38.4°C",
      });
    }
  }

  // =====================================================================
  // LABORATORIOS
  // =====================================================================

  // Plaquetas
  if (datos.plaquetas !== undefined && datos.plaquetas !== null) {
    if (datos.plaquetas < 100000) {
      const puntos = 3;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Recuento de plaquetas",
        valor: (datos.plaquetas / 1000).toFixed(0) + " x10³/µL",
        puntos,
        criterio: "< 100 x10³/µL",
      });
    } else if (datos.plaquetas < 150000) {
      const puntos = 1;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Recuento de plaquetas",
        valor: (datos.plaquetas / 1000).toFixed(0) + " x10³/µL",
        puntos,
        criterio: "100-149 x10³/µL",
      });
    }
  }

  // Creatinina
  if (datos.creatinina !== undefined && datos.creatinina !== null) {
    if (datos.creatinina > 1.2) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "Creatinina",
        valor: datos.creatinina.toFixed(2) + " mg/dL",
        puntos,
        criterio: "> 1.2 mg/dL (deterioro renal)",
      });
    }
  }

  // AST (enzimas hepáticas)
  if (datos.ast !== undefined && datos.ast !== null) {
    if (datos.ast > 70) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "AST (enzima hepática)",
        valor: datos.ast.toString() + " U/L",
        puntos,
        criterio: "> 70 U/L",
      });
    }
  }

  // ALT (enzimas hepáticas)
  if (datos.alt !== undefined && datos.alt !== null) {
    if (datos.alt > 70) {
      const puntos = 2;
      puntajeTotal += puntos;
      detalles.push({
        campo: "ALT (enzima hepática)",
        valor: datos.alt.toString() + " U/L",
        puntos,
        criterio: "> 70 U/L",
      });
    }
  }

  // Proteinuria
  if (datos.proteinuriaTira !== undefined) {
    const proteinuriaPuntos: Record<string, number> = {
      "1+": 1,
      "2+": 2,
      "3+": 3,
      "4+": 4,
    };

    if (proteinuriaPuntos[datos.proteinuriaTira]) {
      const puntos = proteinuriaPuntos[datos.proteinuriaTira];
      puntajeTotal += puntos;
      detalles.push({
        campo: "Proteinuria (tira reactiva)",
        valor: datos.proteinuriaTira,
        puntos,
        criterio: `Positiva ${datos.proteinuriaTira}`,
      });
    }
  }

  // =====================================================================
  // DETERMINAR CATEGORÍA Y SUGERENCIAS
  // =====================================================================

  let categoria: "BAJO" | "MODERADO" | "ALTO";
  const sugerencias: string[] = [];

  if (puntajeTotal >= 20) {
    categoria = "ALTO";
    sugerencias.push("Requiere evaluación urgente por especialista");
    sugerencias.push("Considerar referencia a nivel de atención superior");
    sugerencias.push("Implementar monitoreo más frecuente");
  } else if (puntajeTotal >= 10) {
    categoria = "MODERADO";
    sugerencias.push("Seguimiento clínico regular");
    sugerencias.push("Completar estudios faltantes según protocolo");
    sugerencias.push("Valorar necesidad de interconsulta especializada");
  } else {
    categoria = "BAJO";
    sugerencias.push("Continuar con control prenatal de rutina");
    sugerencias.push("Mantener vigilancia periódica");
  }

  return {
    puntajeTotal,
    detalles,
    categoria,
    sugerencias,
  };
}

/**
 * Obtiene solo los campos que tienen valores (para debugging)
 */
export function obtenerCamposActivos(datos: DatosFactorRiesgo): Partial<DatosFactorRiesgo> {
  return Object.fromEntries(
    Object.entries(datos).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<DatosFactorRiesgo>;
}
