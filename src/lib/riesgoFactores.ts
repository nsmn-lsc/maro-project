// src/lib/riesgoFactores.ts
/**
 * Sistema de evaluación de FACTORES DE RIESGO OBSTÉTRICO
 * Evalúa campos de la tabla pacientes
 * Proporciona contador en tiempo real
 */

export interface DatosFactoresPaciente {
  gestas?: number;
  partos?: number;
  cesareas?: number;
  abortos?: number;
  ant_preeclampsia?: boolean;
  ant_hemorragia?: boolean;
  ant_sepsis?: boolean;
  ant_bajo_peso_macrosomia?: boolean;
  ant_muerte_perinatal?: boolean;
  // Factores de riesgo (comorbilidades y toxicomanías)
  factor_diabetes?: boolean;
  factor_hipertension?: boolean;
  factor_obesidad?: boolean;
  factor_cardiopatia?: boolean;
  factor_hepatopatia?: boolean;
  factor_enf_autoinmune?: boolean;
  factor_nefropatia?: boolean;
  factor_coagulopatias?: boolean;
  factor_neuropatia?: boolean;
  factor_enf_psiquiatrica?: boolean;
  factor_alcoholismo?: boolean;
  factor_tabaquismo?: boolean;
  factor_drogas_ilicitas?: boolean;
  // Factores epidemiológicos
  factores_riesgo_epid?: 'ninguno' | 'es_contacto' | 'es_portadora';
}

export interface AlertaFactor {
  campo: string;
  valor: string | number | boolean;
  puntos: number;
  razon: string;
  tipo: "ANTECEDENTE"; // Aquí irán más tipos luego
}

export interface ResultadoFactores {
  puntajeTotal: number;
  factores: AlertaFactor[];
  nivel: "BAJO" | "ALTO" | "MUY_ALTO" | "CRITICO";
  descripcion: string;
}

/**
 * CRITERIOS DE PUNTUACIÓN - TABLA PACIENTES
 * ============================================
 * Estos son los campos específicos que evaluamos inicialmente
 */

const CRITERIOS = {
  gestas: [
    { rango: [2, 4], puntos: 1, razon: "recomendacion" },
    { rango: [5, 100], puntos: 4, razon: "recomendacion" },
  ],
  cesareas: [
    { rango: [2, 100], puntos: 4, razon: "recomendacion" },
  ],
  abortos: [
    { rango: [2, 2], puntos: 2, razon: "recomendacion" },
    { rango: [3, 100], puntos: 4, razon: "recomendacion" },
  ],
  ant_preeclampsia: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  ant_hemorragia: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  ant_sepsis: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  ant_bajo_peso_macrosomia: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  ant_muerte_perinatal: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  // FACTORES DE RIESGO: Comorbilidades y toxicomanías
  factor_diabetes: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_hipertension: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_obesidad: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_cardiopatia: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_hepatopatia: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_enf_autoinmune: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_nefropatia: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_coagulopatias: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_neuropatia: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_enf_psiquiatrica: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_alcoholismo: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  factor_tabaquismo: [
    { valor: true, puntos: 2, razon: "recomendacion" },
  ],
  factor_drogas_ilicitas: [
    { valor: true, puntos: 4, razon: "recomendacion" },
  ],
  // FACTORES EPIDEMIOLÓGICOS
  factores_riesgo_epid: [
    { valor: 'es_contacto', puntos: 4, razon: "recomendacion" },
    { valor: 'es_portadora', puntos: 6, razon: "recomendacion" },
  ],
};

/**
 * Evalúa un campo individual y retorna la alerta si aplica
 * @param campo Nombre del campo a evaluar
 * @param valor Valor actual del campo
 * @returns Alerta si el valor cumple criterio, null si no
 */
export function evaluarCampoIndividual(
  campo: keyof DatosFactoresPaciente,
  valor: any
): AlertaFactor | null {
  // Si el valor es vacío/falso, no evaluamos
  if (
    valor === undefined ||
    valor === null ||
    valor === "" ||
    (typeof valor === "number" && valor === 0)
  ) {
    return null;
  }

  // Campos numéricos con rango
  if (campo === "gestas" && typeof valor === "number") {
    for (const criterio of CRITERIOS.gestas) {
      if ("rango" in criterio) {
        const [min, max] = criterio.rango;
        if (valor >= min && valor <= max) {
          return {
            campo: "Gestaciones",
            valor,
            puntos: criterio.puntos,
            razon: criterio.razon,
            tipo: "ANTECEDENTE",
          };
        }
      }
    }
  }

  if (campo === "cesareas" && typeof valor === "number") {
    for (const criterio of CRITERIOS.cesareas) {
      if ("rango" in criterio) {
        const [min, max] = criterio.rango;
        if (valor >= min && valor <= max) {
          return {
            campo: "Cesáreas previas",
            valor,
            puntos: criterio.puntos,
            razon: criterio.razon,
            tipo: "ANTECEDENTE",
          };
        }
      }
    }
  }

  if (campo === "abortos" && typeof valor === "number") {
    for (const criterio of CRITERIOS.abortos) {
      if ("rango" in criterio) {
        const [min, max] = criterio.rango;
        if (valor >= min && valor <= max) {
          return {
            campo: "Abortos previos",
            valor,
            puntos: criterio.puntos,
            razon: criterio.razon,
            tipo: "ANTECEDENTE",
          };
        }
      }
    }
  }

  // Campos booleanos (antecedentes)
  if (campo === "ant_preeclampsia" && valor === true) {
    return {
      campo: "Antecedente de Preeclampsia",
      valor: "Sí",
      puntos: 4,
      razon: CRITERIOS.ant_preeclampsia[0].razon,
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_hemorragia" && valor === true) {
    return {
      campo: "Antecedente de Hemorragia Posparto",
      valor: "Sí",
      puntos: 4,
      razon: CRITERIOS.ant_hemorragia[0].razon,
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_sepsis" && valor === true) {
    return {
      campo: "Antecedente de Sepsis",
      valor: "Sí",
      puntos: 4,
      razon: CRITERIOS.ant_sepsis[0].razon,
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_bajo_peso_macrosomia" && valor === true) {
    return {
      campo: "Antecedente de Bajo Peso/Macrosomía",
      valor: "Sí",
      puntos: 4,
      razon: CRITERIOS.ant_bajo_peso_macrosomia[0].razon,
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_muerte_perinatal" && valor === true) {
    return {
      campo: "Antecedente de Muerte Perinatal",
      valor: "Sí",
      puntos: 4,
      razon: CRITERIOS.ant_muerte_perinatal[0].razon,
      tipo: "ANTECEDENTE",
    };
  }

  // Campos booleanos genéricos - Factores de riesgo
  const camposBooleanos: Array<keyof DatosFactoresPaciente> = [
    'factor_diabetes',
    'factor_hipertension',
    'factor_obesidad',
    'factor_cardiopatia',
    'factor_hepatopatia',
    'factor_enf_autoinmune',
    'factor_nefropatia',
    'factor_coagulopatias',
    'factor_neuropatia',
    'factor_enf_psiquiatrica',
    'factor_alcoholismo',
    'factor_tabaquismo',
    'factor_drogas_ilicitas',
  ];

  if (camposBooleanos.includes(campo) && valor === true) {
    const criterios = (CRITERIOS as any)[campo];
    if (criterios && criterios.length > 0) {
      const criterio = criterios[0];
      // Obtener nombre legible del campo
      const nombresCampos: Record<string, string> = {
        factor_diabetes: 'Diabetes',
        factor_hipertension: 'Hipertensión',
        factor_obesidad: 'Obesidad',
        factor_cardiopatia: 'Cardiopatía',
        factor_hepatopatia: 'Hepatopatía',
        factor_enf_autoinmune: 'Enfermedad autoinmune',
        factor_nefropatia: 'Nefropatía',
        factor_coagulopatias: 'Coagulopatías',
        factor_neuropatia: 'Neuropatía',
        factor_enf_psiquiatrica: 'Enfermedad psiquiátrica',
        factor_alcoholismo: 'Alcoholismo',
        factor_tabaquismo: 'Tabaquismo',
        factor_drogas_ilicitas: 'Drogas ilícitas',
      };
      return {
        campo: nombresCampos[campo] || campo,
        valor: "Sí",
        puntos: criterio.puntos,
        razon: criterio.razon,
        tipo: "ANTECEDENTE",
      };
    }
  }

  // Campo ENUM - Factores epidemiológicos
  if (campo === 'factores_riesgo_epid' && valor && valor !== 'ninguno') {
    const criterios = CRITERIOS.factores_riesgo_epid;
    const criterio = criterios.find(c => c.valor === valor);
    if (criterio) {
      const nombreValor = valor === 'es_contacto' ? 'Es contacto' : 'Es portadora';
      return {
        campo: 'Factor epidemiológico',
        valor: nombreValor,
        puntos: criterio.puntos,
        razon: criterio.razon,
        tipo: "ANTECEDENTE",
      };
    }
  }

  return null;
}

/**
 * FUNCIÓN PRINCIPAL: Calcula el factor de riesgo total
 * @param datos Objeto con valores de los campos a evaluar
 * @returns Resultado con puntaje, factores y nivel
 */
export function evaluarFactoresRiesgo(
  datos: DatosFactoresPaciente
): ResultadoFactores {
  const factores: AlertaFactor[] = [];
  let puntajeTotal = 0;

  // Evaluar cada campo
  for (const [clave, valor] of Object.entries(datos)) {
    const alerta = evaluarCampoIndividual(
      clave as keyof DatosFactoresPaciente,
      valor
    );
    if (alerta) {
      factores.push(alerta);
      puntajeTotal += alerta.puntos;
    }
  }

  // Determinar nivel según puntaje (nueva semaforización)
  let nivel: "BAJO" | "ALTO" | "MUY_ALTO" | "CRITICO";
  let descripcion: string;

  if (puntajeTotal <= 3) {
    nivel = "BAJO";
    descripcion = "Riesgo obstétrico bajo. Continuar con seguimiento prenatal normal.";
  } else if (puntajeTotal <= 9) {
    nivel = "ALTO";
    descripcion = "Riesgo obstétrico alto. Se recomienda vigilancia especial y control más frecuente.";
  } else if (puntajeTotal <= 25) {
    nivel = "MUY_ALTO";
    descripcion = "Riesgo obstétrico muy alto. Requiere evaluación especializada y coordinación con nivel de atención superior.";
  } else {
    nivel = "CRITICO";
    descripcion = "Riesgo obstétrico crítico. Requiere colegiación inmediata del caso y atención especializada urgente.";
  }

  return {
    puntajeTotal,
    factores,
    nivel,
    descripcion,
  };
}

/**
 * Utilidad: Obtener solo los campos que tienen valores
 */
export function obtenerCamposConValor(datos: DatosFactoresPaciente): DatosFactoresPaciente {
  return Object.fromEntries(
    Object.entries(datos).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== 0)
  ) as DatosFactoresPaciente;
}
