// src/app/components/ContadorFactorRiesgo.tsx
/**
 * Componente visual para mostrar el contador de factor de riesgo en tiempo real
 * Muestra puntuación, nivel, y detalles de factores
 */

'use client';

import { ResultadoFactores } from '@/lib/riesgoFactores';

interface Props {
  resultado: ResultadoFactores;
  compact?: boolean; // Si es true, mostrar versión compacta
}

export default function ContadorFactorRiesgo({ resultado, compact = false }: Props) {
  // Colores según nivel
  const colorMap = {
    BAJO: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-900',
      badge: 'bg-green-100 text-green-800',
      iconoBg: 'bg-green-100',
      iconoColor: 'text-green-600',
    },
    MODERADO: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
      badge: 'bg-yellow-100 text-yellow-800',
      iconoBg: 'bg-yellow-100',
      iconoColor: 'text-yellow-600',
    },
    ALTO: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-800',
      iconoBg: 'bg-red-100',
      iconoColor: 'text-red-600',
    },
  };

  const color = colorMap[resultado.nivel];
  const icono = {
    BAJO: '✅',
    MODERADO: '⚠️',
    ALTO: '🔴',
  }[resultado.nivel];

  // ============================================================
  // VERSIÓN COMPACTA (para mostrar en página principal)
  // ============================================================
  if (compact) {
    return (
      <div className={`rounded-lg border-2 ${color.border} ${color.bg} p-3`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold opacity-70">FACTOR DE RIESGO</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{resultado.puntajeTotal}</span>
              <span className="text-xs opacity-60">puntos</span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${color.badge}`}
            >
              {icono} {resultado.nivel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // VERSIÓN COMPLETA (para mostrar detalles)
  // ============================================================
  return (
    <div className={`rounded-lg border-2 ${color.border} ${color.bg} p-4`}>
      {/* ENCABEZADO */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold ${color.text}`}>
            {icono} Factor de Riesgo Obstétrico
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{resultado.puntajeTotal}</span>
            <span className="text-sm opacity-70">puntos</span>
          </div>
        </div>
        <p className={`text-sm mt-2 ${color.text} opacity-80`}>
          {resultado.descripcion}
        </p>
      </div>

      {/* CATEGORÍA */}
      <div className="mb-4 flex gap-2 items-center">
        <span
          className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${color.badge}`}
        >
          {icono} {resultado.nivel}
        </span>

        {resultado.nivel === 'BAJO' && (
          <span className="text-xs text-green-700">→ Seguimiento normal</span>
        )}
        {resultado.nivel === 'MODERADO' && (
          <span className="text-xs text-yellow-700">→ Vigilancia especial recomendada</span>
        )}
        {resultado.nivel === 'ALTO' && (
          <span className="text-xs text-red-700">→ Requiere evaluación especializada</span>
        )}
      </div>

      {/* FACTORES DETECTADOS */}
      {resultado.factores.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-70 mb-2">
            FACTORES IDENTIFICADOS ({resultado.factores.length}):
          </div>
          <div className="space-y-2">
            {resultado.factores.map((factor, idx) => (
              <div
                key={idx}
                className={`rounded px-3 py-2 text-sm border-l-4 ${color.border}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{factor.campo}</div>
                    <div className="text-xs opacity-80 mt-1">{factor.razon}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">+{factor.puntos}</div>
                    <div className="text-xs opacity-60">pts</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TOTAL */}
          <div className="mt-4 pt-4 border-t-2 opacity-60 flex justify-between">
            <span className="font-semibold">TOTAL:</span>
            <span className="font-bold text-lg">{resultado.puntajeTotal} puntos</span>
          </div>
        </div>
      ) : (
        <div className={`rounded px-3 py-2 text-sm ${color.badge}`}>
          ✅ Sin factores de riesgo detectados - Antecedentes normales
        </div>
      )}

      {/* RECOMENDACIÓN */}
      <div className="mt-4 pt-4 border-t opacity-70">
        <div className="text-xs font-semibold mb-1">RECOMENDACIÓN:</div>
        <div className="text-xs">
          {"recomendacion"}
        </div>
      </div>
    </div>
  );
}
