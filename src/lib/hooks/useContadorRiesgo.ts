// src/lib/hooks/useContadorRiesgo.ts
'use client';

import { useMemo } from 'react';
import { evaluarFactoresRiesgo, DatosFactoresPaciente, ResultadoFactores } from '@/lib/riesgoFactores';

/**
 * Hook personalizado para calcular el contador de riesgo en tiempo real
 * Se actualiza automáticamente cuando cambian los datos
 * 
 * @example
 * const datos = { gestas: 5, cesareas: 2, ant_preeclampsia: true };
 * const resultado = useContadorRiesgo(datos);
 * 
 * console.log(resultado.puntajeTotal);  // 12
 * console.log(resultado.nivel);         // "ALTO"
 * console.log(resultado.factores);      // Array de factores alertas
 */
export function useContadorRiesgo(datos: DatosFactoresPaciente): ResultadoFactores {
  // useMemo asegura que solo recalcula cuando cambian los datos
  const resultado = useMemo(() => {
    return evaluarFactoresRiesgo(datos);
  }, [datos]);

  return resultado;
}
