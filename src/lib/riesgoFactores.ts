// src/lib/riesgoFactores.ts
/**
 * Sistema de evaluación de FACTORES DE RIESGO OBSTÉTRICO
 * Evalúa campos de la tabla pacientes
 * Proporciona contador en tiempo real
 */

export interface DatosFactoresPaciente {
  edad?: number;
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
  // Variables adicionales para sumatoria
  indigena?: boolean;
  migrante?: boolean;
  imc_inicial?: number;
}

export interface AlertaFactor {
  campo: string;
  valor: string | number | boolean;
  puntos: number;
  razon?: string;
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
  edad: [
    { rango: [0, 14], puntos: 8 },
    { rango: [15, 19], puntos: 4 },
    { rango: [36, 999], puntos: 4 },
  ],
  gestas: [
    { rango: [1, 2], puntos: 2 },
    { rango: [3, 999], puntos: 4 },
  ],
  cesareas: [
    { rango: [2, 999], puntos: 6 },
  ],
  abortos: [
    { rango: [2, 999], puntos: 4 },
  ],
  ant_preeclampsia: [
    { valor: true, puntos: 4 },
  ],
  ant_hemorragia: [
    { valor: true, puntos: 4 },
  ],
  ant_sepsis: [
    { valor: true, puntos: 4 },
  ],
  ant_bajo_peso_macrosomia: [
    { valor: true, puntos: 4 },
  ],
  ant_muerte_perinatal: [
    { valor: true, puntos: 4 },
  ],
  // FACTORES DE RIESGO: Comorbilidades y toxicomanías
  factor_diabetes: [
    { valor: true, puntos: 4 },
  ],
  factor_hipertension: [
    { valor: true, puntos: 4 },
  ],
  factor_obesidad: [
    { valor: true, puntos: 4 },
  ],
  factor_cardiopatia: [
    { valor: true, puntos: 4 },
  ],
  factor_hepatopatia: [
    { valor: true, puntos: 4 },
  ],
  factor_enf_autoinmune: [
    { valor: true, puntos: 4 },
  ],
  factor_nefropatia: [
    { valor: true, puntos: 4 },
  ],
  factor_coagulopatias: [
    { valor: true, puntos: 4 },
  ],
  factor_neuropatia: [
    { valor: true, puntos: 4 },
  ],
  factor_enf_psiquiatrica: [
    { valor: true, puntos: 4 },
  ],
  factor_alcoholismo: [
    { valor: true, puntos: 4 },
  ],
  factor_tabaquismo: [
    { valor: true, puntos: 2 },
  ],
  factor_drogas_ilicitas: [
    { valor: true, puntos: 4 },
  ],
  // FACTORES EPIDEMIOLÓGICOS
  factores_riesgo_epid: [
    { valor: 'es_contacto', puntos: 4 },
    { valor: 'es_portadora', puntos: 6 },
  ],
  // VARIABLES ADICIONALES PARA SUMATORIA
  indigena: [
    { valor: true, puntos: 2 },
  ],
  migrante: [
    { valor: true, puntos: 4 },
  ],
  imc_inicial: [
    { rango: [0, 18.499], puntos: 6 },
    { rango: [30, 34.999], puntos: 4 },
    { rango: [35, 39.999], puntos: 6 },
    { rango: [40, 999], puntos: 8 },
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
    (typeof valor === "number" && (valor === 0 || isNaN(valor)))
  ) {
    return null;
  }

  if (campo === "edad" && typeof valor === "number") {
    for (const criterio of CRITERIOS.edad) {
      if ("rango" in criterio) {
        const [min, max] = criterio.rango;
        if (valor >= min && valor <= max) {
          return {
            campo: "Edad de riesgo",
            valor: `${valor} años`,
            puntos: criterio.puntos,
            tipo: "ANTECEDENTE",
          };
        }
      }
    }
  }

  if (campo === "gestas" && typeof valor === "number") {
    for (const criterio of CRITERIOS.gestas) {
      if ("rango" in criterio) {
        const [min, max] = criterio.rango;
        if (valor >= min && valor <= max) {
          return {
            campo: "Gestaciones",
            valor,
            puntos: criterio.puntos,
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
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_hemorragia" && valor === true) {
    return {
      campo: "Antecedente de Hemorragia Posparto",
      valor: "Sí",
      puntos: 4,
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_sepsis" && valor === true) {
    return {
      campo: "Antecedente de Sepsis",
      valor: "Sí",
      puntos: 4,
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_bajo_peso_macrosomia" && valor === true) {
    return {
      campo: "Antecedente de Bajo Peso/Macrosomía",
      valor: "Sí",
      puntos: 4,
      tipo: "ANTECEDENTE",
    };
  }

  if (campo === "ant_muerte_perinatal" && valor === true) {
    return {
      campo: "Antecedente de Muerte Perinatal",
      valor: "Sí",
      puntos: 4,
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
    'indigena',
    'migrante',
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
        indigena: 'Población Indígena',
        migrante: 'Población Migrante',
      };
      return {
        campo: nombresCampos[campo] || campo,
        valor: "Sí",
        puntos: criterio.puntos,
        tipo: "ANTECEDENTE",
      };
    }
  }

  if (campo === "imc_inicial" && typeof valor === "number") {
    for (const criterio of CRITERIOS.imc_inicial) {
      if ("rango" in criterio) {
        const [min, max] = criterio.rango;
        if (valor >= min && valor <= max) {
          return {
            campo: "Índice de Masa Corporal (IMC)",
            valor: `${valor.toFixed(1)} kg/m²`,
            puntos: criterio.puntos,
            tipo: "ANTECEDENTE",
          };
        }
      }
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
