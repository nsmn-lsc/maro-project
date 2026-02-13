// src/app/ejemplo-factor-riesgo/page.tsx
/**
 * Página de ejemplo: Cómo integrar el factor de riesgo en una página
 * Muestra todas las opciones de uso y patrones recomendados
 */

'use client';

import { useFactorRiesgoAuto } from '@/lib/hooks/useFactorRiesgo';
import FactorRiesgoResultado from '@/app/components/FactorRiesgoResultado';
import { factorRiesgoAPI } from '@/lib/api-client';
import { useState } from 'react';

export default function EjemploFactorRiesgo() {
  const [casoIdSeleccionado, setCasoIdSeleccionado] = useState<number>(1);
  const [mostrarDetalles, setMostrarDetalles] = useState(true);

  // Hook que recalcula automáticamente cuando cambia el casoId
  const { resultado, cargando, error } = useFactorRiesgoAuto(
    casoIdSeleccionado,
    true // autoCalcular
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Ejemplo: Factor de Riesgo Obstétrico
          </h1>
          <p className="text-gray-600 mt-2">
            Demostración de integración del sistema de puntuación de riesgo
          </p>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Controles</h2>

          <div className="space-y-4">
            {/* Selector de caso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Caso ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={casoIdSeleccionado}
                  onChange={(e) => setCasoIdSeleccionado(parseInt(e.target.value) || 1)}
                  min="1"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => setCasoIdSeleccionado(casoIdSeleccionado)}
                >
                  Actualizar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                (Prueba con 1, 2, 3, etc.)
              </p>
            </div>

            {/* Toggle de detalles */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mostrarDetalles"
                checked={mostrarDetalles}
                onChange={(e) => setMostrarDetalles(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label
                htmlFor="mostrarDetalles"
                className="text-sm font-medium text-gray-700"
              >
                Mostrar tabla detallada de factores
              </label>
            </div>
          </div>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700 font-medium">
              ⏳ Calculando factor de riesgo para caso {casoIdSeleccionado}...
            </p>
          </div>
        )}

        {/* Mostrar error si existe */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">❌ Error:</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <p className="text-red-500 text-xs mt-2">
              Asegúrate de que el caso ID existe y tiene datos guardados
            </p>
          </div>
        )}

        {/* Resultado del cálculo */}
        {resultado && !cargando && (
          <div className="mb-6">
            <FactorRiesgoResultado
              resultado={resultado}
              cargando={false}
              mostrarDetalles={mostrarDetalles}
            />
          </div>
        )}

        {/* Documentación de integración */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4">Guía de Integración</h2>

          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                1️⃣ Hook Automático (Recomendado)
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                {`const { resultado, cargando, error } = 
  useFactorRiesgoAuto(casoId);

<FactorRiesgoResultado resultado={resultado} />`}
              </pre>
            </div>

            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                2️⃣ Hook Manual (Más Control)
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                {`const { resultado, calcular, cargando } = 
  useFactorRiesgo();

const handleCalcular = async () => {
  await calcular(casoId);
};`}
              </pre>
            </div>

            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                3️⃣ Cliente API Directo
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                {`const resp = await factorRiesgoAPI
  .calcular(casoId);
console.log(resp.resultado.puntajeTotal);`}
              </pre>
            </div>

            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                4️⃣ Endpoint REST Directo
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                {`POST /api/casos/calcular-factor-riesgo
Content-Type: application/json

{ "casoId": 1 }`}
              </pre>
            </div>
          </div>
        </div>

        {/* Información de categorías */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4">Categorías de Riesgo</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <h3 className="font-semibold text-green-900">BAJO</h3>
              <p className="text-green-700 text-sm mt-1">0-9 puntos</p>
              <p className="text-green-600 text-xs mt-2">
                ✓ Seguimiento de rutina
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h3 className="font-semibold text-yellow-900">MODERADO</h3>
              <p className="text-yellow-700 text-sm mt-1">10-19 puntos</p>
              <p className="text-yellow-600 text-xs mt-2">
                ⚠ Evaluación especializada
              </p>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <h3 className="font-semibold text-red-900">ALTO</h3>
              <p className="text-red-700 text-sm mt-1">≥ 20 puntos</p>
              <p className="text-red-600 text-xs mt-2">
                🔴 Urgencia/Referencia
              </p>
            </div>
          </div>
        </div>

        {/* Próximos pasos */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            📋 Próximos Pasos
          </h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              ✓ Integrar cálculo en páginas de evaluación clínica
            </li>
            <li>
              ✓ Mostrar puntuación en dashboard/tabla de casos
            </li>
            <li>
              ✓ Agregar alertas cuando categoría cambia
            </li>
            <li>
              ✓ Ejecutar migración de BD para guardar scores
            </li>
            <li>
              ✓ Crear reportes de tendencias de riesgo
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>
            Ver documentación completa en: <code>FACTOR_RIESGO_GUIDE.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
