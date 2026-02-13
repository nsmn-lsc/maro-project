// src/app/components/ContadorRiesgo.tsx
/**
 * Contenedor que calcula y muestra el contador de factor de riesgo
 * para una nueva paciente durante la captura
 */

'use client';

import { useMemo, useEffect } from 'react';
import { evaluarFactoresRiesgo, DatosFactoresPaciente } from '@/lib/riesgoFactores';
import { evaluarTamizajes, DatosTamizajes } from '@/lib/riesgoTamizajes';
import FloatingContadorRiesgo from './FloatingContadorRiesgo';

interface ContadorRiesgoProps {
  formData: any;
  onPuntajeChange?: (puntosAntecedentes: number, puntosTamizajes: number) => void;
}

export default function ContadorRiesgo({ formData, onPuntajeChange }: ContadorRiesgoProps) {
  // Convertir datos del formulario al formato esperado por evaluarFactoresRiesgo
  const datosFactores: DatosFactoresPaciente = useMemo(() => ({
    gestas: formData.gestas ? parseInt(formData.gestas) : 0,
    cesareas: formData.cesareas ? parseInt(formData.cesareas) : 0,
    abortos: formData.abortos ? parseInt(formData.abortos) : 0,
    ant_preeclampsia: formData.ant_preeclampsia === true,
    ant_hemorragia: formData.ant_hemorragia === true,
    ant_sepsis: formData.ant_sepsis === true,
    ant_bajo_peso_macrosomia: formData.ant_bajo_peso_macrosomia === true,
    ant_muerte_perinatal: formData.ant_muerte_perinatal === true,
    // Factores de riesgo
    factor_diabetes: formData.factor_diabetes === true,
    factor_hipertension: formData.factor_hipertension === true,
    factor_obesidad: formData.factor_obesidad === true,
    factor_cardiopatia: formData.factor_cardiopatia === true,
    factor_hepatopatia: formData.factor_hepatopatia === true,
    factor_enf_autoinmune: formData.factor_enf_autoinmune === true,
    factor_nefropatia: formData.factor_nefropatia === true,
    factor_coagulopatias: formData.factor_coagulopatias === true,
    factor_neuropatia: formData.factor_neuropatia === true,
    factor_enf_psiquiatrica: formData.factor_enf_psiquiatrica === true,
    factor_alcoholismo: formData.factor_alcoholismo === true,
    factor_tabaquismo: formData.factor_tabaquismo === true,
    factor_drogas_ilicitas: formData.factor_drogas_ilicitas === true,
    factores_riesgo_epid: formData.factores_riesgo_epid || 'ninguno',
  }), [
    formData.gestas,
    formData.cesareas,
    formData.abortos,
    formData.ant_preeclampsia,
    formData.ant_hemorragia,
    formData.ant_sepsis,
    formData.ant_bajo_peso_macrosomia,
    formData.ant_muerte_perinatal,
    formData.factor_diabetes,
    formData.factor_hipertension,
    formData.factor_obesidad,
    formData.factor_cardiopatia,
    formData.factor_hepatopatia,
    formData.factor_enf_autoinmune,
    formData.factor_nefropatia,
    formData.factor_coagulopatias,
    formData.factor_neuropatia,
    formData.factor_enf_psiquiatrica,
    formData.factor_alcoholismo,
    formData.factor_tabaquismo,
    formData.factor_drogas_ilicitas,
    formData.factores_riesgo_epid,
  ]);

  // Calcular resultado de antecedentes
  const resultadoAntecedentes = useMemo(() => {
    return evaluarFactoresRiesgo(datosFactores);
  }, [datosFactores]);

  // Convertir datos de tamizajes
  const datosTamizajes: DatosTamizajes = useMemo(() => ({
    prueba_vih: formData.prueba_vih || null,
    prueba_vdrl: formData.prueba_vdrl || null,
    prueba_hepatitis_c: formData.prueba_hepatitis_c || null,
    diabetes_glicemia: formData.diabetes_glicemia || null,
    violencia: formData.violencia || null,
  }), [
    formData.prueba_vih,
    formData.prueba_vdrl,
    formData.prueba_hepatitis_c,
    formData.diabetes_glicemia,
    formData.violencia,
  ]);

  // Calcular resultado de tamizajes
  const resultadoTamizajes = useMemo(() => {
    return evaluarTamizajes(datosTamizajes);
  }, [datosTamizajes]);

  // Notificar cambios en los puntajes al componente padre
  useEffect(() => {
    if (onPuntajeChange) {
      onPuntajeChange(resultadoAntecedentes.puntajeTotal, resultadoTamizajes.puntajeTotal);
    }
  }, [resultadoAntecedentes.puntajeTotal, resultadoTamizajes.puntajeTotal, onPuntajeChange]);

  // Extraer semanas de gestación
  const semanasGestacion = formData.semanas_gestacion ? parseFloat(formData.semanas_gestacion) : 0;

  return (
    <FloatingContadorRiesgo 
      resultadoAntecedentes={resultadoAntecedentes} 
      resultadoTamizajes={resultadoTamizajes}
      semanasGestacion={semanasGestacion} 
    />
  );
}
