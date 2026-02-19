// src/app/evaluacion-clinica-con-riesgo/page.tsx
/**
 * EJEMPLO REAL: Página de evaluación clínica CON cálculo de factor de riesgo
 * 
 * Este archivo muestra cómo integrar el factor de riesgo en una página existente
 * Incluye: formulario -> envío -> cálculo -> mostrar resultado
 */

'use client';

import { useState } from 'react';
import { useFactorRiesgo } from '@/lib/hooks/useFactorRiesgo';
import FactorRiesgoResultado from '@/app/components/FactorRiesgoResultado';
import { evaluacionesAPI, factorRiesgoAPI } from '@/lib/api-client';

export default function EvaluacionClinicaConRiesgo() {
  // Estado del formulario
  const [casoId, setCasoId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    embarazoMultiple: false,
    antecedentePreeclampsia: false,
    diabetesPrevia: false,
    edad: '',
    sistolica: '',
    diastolica: '',
    frecuenciaCardiaca: '',
    temperatura: '',
    plaquetas: '',
    sangradoVaginal: false,
    disnea: false,
  });

  const [enviando, setEnviando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState('');

  // Hook de factor de riesgo
  const {
    resultado,
    calcular: calcularRiesgo,
    cargando: cargandoRiesgo,
    error: errorRiesgo,
  } = useFactorRiesgo();

  // Cambio en inputs del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!casoId) {
      alert('Por favor ingresa un ID de caso');
      return;
    }

    setEnviando(true);
    setMensajeGuardado('');

    try {
      // 1. Guardar datos de evaluación
      const evaluacionData = {
        casoId,
        embarazoMultiple: formData.embarazoMultiple,
        antecedentePreeclampsia: formData.antecedentePreeclampsia,
        diabetesPrevia: formData.diabetesPrevia,
        sangradoVaginal: formData.sangradoVaginal,
        disnea: formData.disnea,
        sistolica: formData.sistolica ? parseInt(formData.sistolica) : null,
        diastolica: formData.diastolica ? parseInt(formData.diastolica) : null,
        frecuenciaCardiaca: formData.frecuenciaCardiaca
          ? parseInt(formData.frecuenciaCardiaca)
          : null,
        temperatura: formData.temperatura
          ? parseFloat(formData.temperatura)
          : null,
        plaquetas: formData.plaquetas
          ? parseInt(formData.plaquetas) * 1000
          : null,
      };

      await evaluacionesAPI.crear(evaluacionData);
      setMensajeGuardado('✓ Evaluación clínica guardada correctamente');

      // 2. Calcular factor de riesgo
      await calcularRiesgo(casoId);
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Evaluación Clínica con Factor de Riesgo
          </h1>
          <p className="text-gray-600 mt-2">
            Ejemplo de integración: formulario + cálculo automático de riesgo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LADO IZQUIERDO: Formulario */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              📋 Formulario de Evaluación
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ID de caso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID del Caso (requerido)
                </label>
                <input
                  type="number"
                  value={casoId || ''}
                  onChange={(e) => setCasoId(e.target.value ? parseInt(e.target.value) : null)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 1, 2, 3..."
                  required
                />
              </div>

              {/* Antecedentes (checkboxes) */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Antecedentes:</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="embarazoMultiple"
                      checked={formData.embarazoMultiple}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Embarazo múltiple (4 pts)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="antecedentePreeclampsia"
                      checked={formData.antecedentePreeclampsia}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Antecedente de preeclampsia (4 pts)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="diabetesPrevia"
                      checked={formData.diabetesPrevia}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Diabetes previa (3 pts)
                    </span>
                  </label>
                </div>
              </div>

              {/* Signos de alarma (checkboxes) */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Signos de Alarma:</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="sangradoVaginal"
                      checked={formData.sangradoVaginal}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sangrado vaginal (3 pts)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="disnea"
                      checked={formData.disnea}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Disnea (3 pts)
                    </span>
                  </label>
                </div>
              </div>

              {/* Signos vitales (números) */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Signos Vitales:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Edad (años)
                    </label>
                    <input
                      type="number"
                      name="edad"
                      value={formData.edad}
                      onChange={handleInputChange}
                      placeholder="Ej: 35"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      TA Sistólica (mmHg)
                    </label>
                    <input
                      type="number"
                      name="sistolica"
                      value={formData.sistolica}
                      onChange={handleInputChange}
                      placeholder="Ej: 140"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      TA Diastólica (mmHg)
                    </label>
                    <input
                      type="number"
                      name="diastolica"
                      value={formData.diastolica}
                      onChange={handleInputChange}
                      placeholder="Ej: 90"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      FC (bpm)
                    </label>
                    <input
                      type="number"
                      name="frecuenciaCardiaca"
                      value={formData.frecuenciaCardiaca}
                      onChange={handleInputChange}
                      placeholder="Ej: 85"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Temp (°C)
                    </label>
                    <input
                      type="number"
                      name="temperatura"
                      value={formData.temperatura}
                      onChange={handleInputChange}
                      placeholder="Ej: 37.2"
                      step="0.1"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Plaquetas (x10³)
                    </label>
                    <input
                      type="number"
                      name="plaquetas"
                      value={formData.plaquetas}
                      onChange={handleInputChange}
                      placeholder="Ej: 150"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="border-t pt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={enviando || !casoId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {enviando ? '⏳ Guardando...' : '💾 Guardar y Calcular Riesgo'}
                </button>
              </div>

              {/* Mensaje de éxito */}
              {mensajeGuardado && (
                <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm">
                  {mensajeGuardado}
                </div>
              )}
            </form>
          </div>

          {/* LADO DERECHO: Resultado de Riesgo */}
          <div>
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              📊 Factor de Riesgo Calculado
            </h2>

            {!casoId ? (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 text-center text-gray-600">
                <p>👈 Ingresa un ID de caso y haz clic en "Guardar y Calcular"</p>
              </div>
            ) : cargandoRiesgo ? (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 text-center text-blue-600">
                <p>⏳ Calculando factor de riesgo...</p>
              </div>
            ) : errorRiesgo ? (
              <div className="bg-red-50 border border-red-300 rounded-lg p-6">
                <p className="text-red-700 font-semibold">❌ Error:</p>
                <p className="text-red-600 text-sm mt-2">{errorRiesgo}</p>
                <p className="text-red-500 text-xs mt-2">
                  Nota: Asegúrate de que el caso existe en la BD con datos guardados.
                </p>
              </div>
            ) : resultado ? (
              <>
                <FactorRiesgoResultado
                  resultado={resultado}
                  mostrarDetalles={true}
                />

                {/* Recomendaciones expandidas según categoría */}
                {resultado.categoria === 'ALTO' && (
                  <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2">
                      ⚠️ ACCIÓN REQUERIDA
                    </h3>
                    <ul className="text-red-800 text-sm space-y-1">
                      <li>• recomendacion</li>
                      <li>• recomendacion</li>
                      <li>• recomendacion</li>
                      <li>• recomendacion</li>
                    </ul>
                  </div>
                )}

                {resultado.categoria === 'MODERADO' && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                      ⚠️ SEGUIMIENTO ESPECIALIZADO
                    </h3>
                    <ul className="text-yellow-800 text-sm space-y-1">
                      <li>• recomendacion</li>
                      <li>• recomendacion</li>
                      <li>• recomendacion</li>
                      <li>• recomendacion</li>
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Info footer */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p>
            <strong>💡 Nota:</strong> Este es un ejemplo completo de cómo integrar el factor de riesgo.
            Puedes adaptar este patrón en tus páginas existentes.
          </p>
        </div>
      </div>
    </div>
  );
}
