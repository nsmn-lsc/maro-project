/**
 * Hook para guardar los factores de riesgo (antecedentes y tamizajes) en la tabla cat_pacientes
 */

import { useCallback } from 'react';

export function useSaveFactorRiesgoPaciente() {
  const guardar = useCallback(async (pacienteId: number, puntosAntecedentes: number, puntosTamizajes: number) => {
    try {
      const response = await fetch('/api/pacientes/guardar-factor-riesgo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          factorRiesgoAntecedentes: puntosAntecedentes,
          factorRiesgoTamizajes: puntosTamizajes,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      const data = await response.json();
      console.log('✅ Factores de riesgo guardados:', data);
      return data;
    } catch (error) {
      console.error('❌ Error al guardar factores de riesgo:', error);
      throw error;
    }
  }, []);

  return { guardar };
}
