// src/lib/hooks/useFactorRiesgo.ts
/**
 * Hook personalizado para calcular y gestionar el factor de riesgo
 * Simplifica el manejo de estado, carga y errores
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { factorRiesgoAPI } from '@/lib/api-client';
import { ResultadoFactorRiesgo } from '@/lib/factorRiesgo';

interface UseFactorRiesgoState {
  resultado: ResultadoFactorRiesgo | null;
  cargando: boolean;
  error: string | null;
  actualizado: Date | null;
}

/**
 * Hook para calcular factor de riesgo de un caso
 * 
 * @example
 * const { resultado, calcular, cargando, error } = useFactorRiesgo();
 * 
 * // Disparar cálculo
 * await calcular(casoId);
 * 
 * // Mostrar resultado
 * if (resultado) {
 *   console.log(`Puntuación: ${resultado.puntajeTotal}`);
 *   console.log(`Categoría: ${resultado.categoria}`);
 * }
 */
export function useFactorRiesgo() {
  const [estado, setEstado] = useState<UseFactorRiesgoState>({
    resultado: null,
    cargando: false,
    error: null,
    actualizado: null,
  });

  /**
   * Calcula el factor de riesgo para un caso específico
   */
  const calcular = useCallback(async (casoId: number) => {
    setEstado((prev) => ({
      ...prev,
      cargando: true,
      error: null,
    }));

    try {
      const respuesta = await factorRiesgoAPI.calcular(casoId);
      setEstado((prev) => ({
        ...prev,
        resultado: respuesta.resultado,
        cargando: false,
        actualizado: new Date(),
      }));
      return respuesta.resultado;
    } catch (err: any) {
      const mensaje = err.message || 'Error al calcular factor de riesgo';
      setEstado((prev) => ({
        ...prev,
        error: mensaje,
        cargando: false,
      }));
      console.error('Error en factor de riesgo:', err);
      throw err;
    }
  }, []);

  /**
   * Limpia el resultado y errores
   */
  const limpiar = useCallback(() => {
    setEstado({
      resultado: null,
      cargando: false,
      error: null,
      actualizado: null,
    });
  }, []);

  /**
   * Resetea el estado de error
   */
  const limpiarError = useCallback(() => {
    setEstado((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...estado,
    calcular,
    limpiar,
    limpiarError,
  };
}

/**
 * Hook avanzado que recalcula automáticamente cuando cambian los datos del caso
 */
export function useFactorRiesgoAuto(casoId: number | null, autoCalcular = true) {
  const { resultado, calcular, ...rest } = useFactorRiesgo();

  useEffect(() => {
    if (autoCalcular && casoId) {
      calcular(casoId).catch(console.error);
    }
  }, [casoId, autoCalcular, calcular]);

  return {
    resultado,
    calcular,
    ...rest,
  };
}
