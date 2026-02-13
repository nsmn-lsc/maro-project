// src/app/components/FactorRiesgoResultado.tsx
/**
 * Componente para mostrar el resultado del cálculo de factor de riesgo
 * Muestra puntuación, categoría, detalles y sugerencias
 */

'use client';

import { ResultadoFactorRiesgo } from '@/lib/factorRiesgo';

interface Props {
  resultado: ResultadoFactorRiesgo;
  cargando?: boolean;
  error?: string;
  mostrarDetalles?: boolean;
}

export default function FactorRiesgoResultado({
  resultado,
  cargando = false,
  error,
  mostrarDetalles = true,
}: Props) {
  if (cargando) {
    return (
      <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
        <p className="text-center text-gray-600">Calculando factor de riesgo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-red-300 bg-red-50">
        <p className="text-red-600 font-semibold">Error:</p>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Colorear según categoría
  const colorClases = {
    BAJO: 'bg-green-50 border-green-300 text-green-900',
    MODERADO: 'bg-yellow-50 border-yellow-300 text-yellow-900',
    ALTO: 'bg-red-50 border-red-300 text-red-900',
  };

  const badgeClases = {
    BAJO: 'bg-green-100 text-green-800',
    MODERADO: 'bg-yellow-100 text-yellow-800',
    ALTO: 'bg-red-100 text-red-800',
  };

  const iconoCategoria = {
    BAJO: '✓',
    MODERADO: '⚠',
    ALTO: '🔴',
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${colorClases[resultado.categoria]}`}>
      {/* Encabezado con puntuación */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Factor de Riesgo Obstétrico</h3>
          <p className="text-sm opacity-75 mt-1">
            Puntuación de riesgo basada en múltiples factores clínicos
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold">{resultado.puntajeTotal}</div>
          <p className="text-xs opacity-75">puntos</p>
        </div>
      </div>

      {/* Categoría y ícono */}
      <div className="mb-4">
        <span className={`inline-block px-4 py-2 rounded-full font-semibold ${badgeClases[resultado.categoria]}`}>
          {iconoCategoria[resultado.categoria]} {resultado.categoria}
        </span>
      </div>

      {/* Sugerencias */}
      {resultado.sugerencias.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Recomendaciones:</h4>
          <ul className="space-y-1">
            {resultado.sugerencias.map((sugerencia, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="mt-1">→</span>
                <span>{sugerencia}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detalles de factores */}
      {mostrarDetalles && resultado.detalles.length > 0 && (
        <div className="mt-6 pt-6 border-t border-current border-opacity-20">
          <h4 className="font-semibold mb-3">Factores que aportan puntuación:</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="opacity-75 text-xs font-semibold uppercase tracking-wide border-b border-current border-opacity-20">
                  <th className="text-left px-2 py-2">Campo</th>
                  <th className="text-left px-2 py-2">Valor</th>
                  <th className="text-left px-2 py-2">Criterio</th>
                  <th className="text-right px-2 py-2">Pts.</th>
                </tr>
              </thead>
              <tbody>
                {resultado.detalles.map((detalle, idx) => (
                  <tr key={idx} className="border-b border-current border-opacity-10 hover:opacity-75 transition-opacity">
                    <td className="px-2 py-2 font-medium">{detalle.campo}</td>
                    <td className="px-2 py-2">{detalle.valor}</td>
                    <td className="px-2 py-2 text-xs opacity-75">{detalle.criterio}</td>
                    <td className="px-2 py-2 text-right font-bold">+{detalle.puntos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 pt-3 border-t border-current border-opacity-20 flex justify-end">
            <div className="font-bold">
              Total: <span className="text-xl">{resultado.puntajeTotal} puntos</span>
            </div>
          </div>
        </div>
      )}

      {/* Referencias (opcional) */}
      <div className="mt-4 text-xs opacity-60">
        <p>
          <strong>Nota:</strong> Este cálculo se basa en criterios clínicos validados.
          Requiere interpretación profesional junto con evaluación clínica completa.
        </p>
      </div>
    </div>
  );
}
