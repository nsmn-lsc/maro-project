// src/lib/riesgoTamizajes.ts
/**
 * Sistema de evaluación de FACTORES DE RIESGO POR TAMIZAJES INICIALES
 * Evalúa los resultados de las pruebas del primer contacto
 */

export interface DatosTamizajes {
  prueba_vih?: string | null;
  prueba_vdrl?: string | null;
  prueba_hepatitis_c?: string | null;
  diabetes_glicemia?: string | null;
  violencia?: string | null;
}

export interface AlertaTamizaje {
  campo: string;
  valor: string;
  puntos: number;
  razon: string;
  tipo: "TAMIZAJE";
}

export interface ResultadoTamizajes {
  puntajeTotal: number;
  tamizajes: AlertaTamizaje[];
  nivel: "SIN_HALLAZGOS" | "ALERTA";
  descripcion: string;
}

/**
 * CRITERIOS DE PUNTUACIÓN - TAMIZAJES INICIALES
 * ============================================
 * Basados en los valores de las pruebas del primer contacto
 */

const CRITERIOS_TAMIZAJES = {
  prueba_vih: {
    valor: 'Reactiva',
    puntos: 4,
    razon: 'recomendacion',
  },
  prueba_vdrl: {
    valor: 'Reactiva',
    puntos: 4,
    razon: 'recomendacion',
  },
  prueba_hepatitis_c: {
    valor: 'Reactiva',
    puntos: 4,
    razon: 'recomendacion',
  },
  diabetes_glicemia: {
    valores_riesgo: ['Resistencia a la insulina', 'Diabetes'],
    puntos: 4,
    razon: 'recomendacion',
  },
  violencia: {
    valor: 'Positiva',
    puntos: 4,
    razon: 'recomendacion',
  },
};

/**
 * Evalúa los tamizajes iniciales y calcula el puntaje de riesgo
 * @param datos Objeto con valores de los tamizajes
 * @returns Resultado con puntaje, tamizajes detectados y nivel
 */
export function evaluarTamizajes(datos: DatosTamizajes): ResultadoTamizajes {
  const tamizajes: AlertaTamizaje[] = [];
  let puntajeTotal = 0;

  // Evaluar VIH
  if (datos.prueba_vih === CRITERIOS_TAMIZAJES.prueba_vih.valor) {
    tamizajes.push({
      campo: 'VIH',
      valor: datos.prueba_vih,
      puntos: CRITERIOS_TAMIZAJES.prueba_vih.puntos,
      razon: CRITERIOS_TAMIZAJES.prueba_vih.razon,
      tipo: 'TAMIZAJE',
    });
    puntajeTotal += CRITERIOS_TAMIZAJES.prueba_vih.puntos;
  }

  // Evaluar VDRL
  if (datos.prueba_vdrl === CRITERIOS_TAMIZAJES.prueba_vdrl.valor) {
    tamizajes.push({
      campo: 'VDRL',
      valor: datos.prueba_vdrl,
      puntos: CRITERIOS_TAMIZAJES.prueba_vdrl.puntos,
      razon: CRITERIOS_TAMIZAJES.prueba_vdrl.razon,
      tipo: 'TAMIZAJE',
    });
    puntajeTotal += CRITERIOS_TAMIZAJES.prueba_vdrl.puntos;
  }

  // Evaluar Hepatitis C
  if (datos.prueba_hepatitis_c === CRITERIOS_TAMIZAJES.prueba_hepatitis_c.valor) {
    tamizajes.push({
      campo: 'Hepatitis C',
      valor: datos.prueba_hepatitis_c,
      puntos: CRITERIOS_TAMIZAJES.prueba_hepatitis_c.puntos,
      razon: CRITERIOS_TAMIZAJES.prueba_hepatitis_c.razon,
      tipo: 'TAMIZAJE',
    });
    puntajeTotal += CRITERIOS_TAMIZAJES.prueba_hepatitis_c.puntos;
  }

  // Evaluar Diabetes/Glicemia
  if (
    datos.diabetes_glicemia &&
    datos.diabetes_glicemia !== 'Normal' &&
    datos.diabetes_glicemia !== ''
  ) {
    tamizajes.push({
      campo: 'Diabetes/Glicemia',
      valor: datos.diabetes_glicemia,
      puntos: CRITERIOS_TAMIZAJES.diabetes_glicemia.puntos,
      razon: CRITERIOS_TAMIZAJES.diabetes_glicemia.razon,
      tipo: 'TAMIZAJE',
    });
    puntajeTotal += CRITERIOS_TAMIZAJES.diabetes_glicemia.puntos;
  }

  // Evaluar Violencia
  if (datos.violencia === CRITERIOS_TAMIZAJES.violencia.valor) {
    tamizajes.push({
      campo: 'Violencia',
      valor: datos.violencia,
      puntos: CRITERIOS_TAMIZAJES.violencia.puntos,
      razon: CRITERIOS_TAMIZAJES.violencia.razon,
      tipo: 'TAMIZAJE',
    });
    puntajeTotal += CRITERIOS_TAMIZAJES.violencia.puntos;
  }

  // Determinar nivel según puntaje
  let nivel: "SIN_HALLAZGOS" | "ALERTA";
  let descripcion: string;

  if (puntajeTotal === 0) {
    nivel = "SIN_HALLAZGOS";
    descripcion = "recomendacion";
  } else {
    nivel = "ALERTA";
    descripcion = "recomendacion";
  }

  return {
    puntajeTotal,
    tamizajes,
    nivel,
    descripcion,
  };
}
