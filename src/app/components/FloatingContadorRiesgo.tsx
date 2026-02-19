// src/app/components/FloatingContadorRiesgo.tsx
/**
 * Panel flotante minimizable para el contador de factor de riesgo
 * Muestra tanto antecedentes como tamizajes
 */

'use client';

import { useState } from 'react';
import { ResultadoFactores } from '@/lib/riesgoFactores';
import { ResultadoTamizajes } from '@/lib/riesgoTamizajes';

interface Props {
  resultadoAntecedentes: ResultadoFactores;
  resultadoTamizajes: ResultadoTamizajes;
  semanasGestacion?: number;
}

export default function FloatingContadorRiesgo({ resultadoAntecedentes, resultadoTamizajes, semanasGestacion = 0 }: Props) {
  const [minimizado, setMinimizado] = useState(true);

  // Colores según nivel
  const colorMap = {
    BAJO: {
      bg: 'bg-green-50',
      border: 'border-green-400',
      text: 'text-green-900',
      badge: 'bg-green-500',
      badgeTranslucent: 'bg-green-500/80',
      bgTranslucent: 'bg-green-500/30',
      borderTranslucent: 'border-green-400/60',
      textTranslucent: 'text-white drop-shadow-sm',
      icon: '✅',
    },
    ALTO: {
      bg: 'bg-amber-50',
      border: 'border-amber-400',
      text: 'text-amber-900',
      badge: 'bg-amber-500',
      badgeTranslucent: 'bg-amber-500/80',
      bgTranslucent: 'bg-amber-500/30',
      borderTranslucent: 'border-amber-400/60',
      textTranslucent: 'text-white drop-shadow-sm',
      icon: '⚠️',
    },
    MUY_ALTO: {
      bg: 'bg-orange-50',
      border: 'border-orange-400',
      text: 'text-orange-900',
      badge: 'bg-orange-600',
      badgeTranslucent: 'bg-orange-500/80',
      bgTranslucent: 'bg-orange-500/30',
      borderTranslucent: 'border-orange-400/60',
      textTranslucent: 'text-white drop-shadow-sm',
      icon: '🔴',
    },
    CRITICO: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      badge: 'bg-red-700',
      badgeTranslucent: 'bg-red-500/80',
      bgTranslucent: 'bg-red-500/30',
      borderTranslucent: 'border-red-500/60',
      textTranslucent: 'text-white drop-shadow-sm',
      icon: '🚨',
    },
    SIN_HALLAZGOS: {
      bg: 'bg-green-50',
      border: 'border-green-400',
      text: 'text-green-900',
      badge: 'bg-green-500',
      badgeTranslucent: 'bg-green-500/80',
      bgTranslucent: 'bg-green-500/30',
      borderTranslucent: 'border-green-400/60',
      textTranslucent: 'text-white drop-shadow-sm',
      icon: '✅',
    },
    ALERTA: {
      bg: 'bg-amber-50',
      border: 'border-amber-400',
      text: 'text-amber-900',
      badge: 'bg-amber-500',
      badgeTranslucent: 'bg-amber-500/80',
      bgTranslucent: 'bg-amber-500/30',
      borderTranslucent: 'border-amber-400/60',
      textTranslucent: 'text-white drop-shadow-sm',
      icon: '⚠️',
    },
  };

  const colorAntecedentes = colorMap[resultadoAntecedentes.nivel];
  const colorTamizajes = colorMap[resultadoTamizajes.nivel];

  // ============================================================
  // VERSIÓN MINIMIZADA (badges flotantes)
  // ============================================================
  if (minimizado) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 animate-in slide-in-from-bottom-4">
        {/* Badge Antecedentes */}
        <button
          onClick={() => setMinimizado(false)}
          className={`flex items-center gap-2 rounded-full shadow-2xl px-4 py-2.5 backdrop-blur-sm ${colorAntecedentes.bgTranslucent} border-2 ${colorAntecedentes.borderTranslucent} hover:scale-105 transition-transform cursor-pointer`}
        >
          <span className="text-xl">{colorAntecedentes.icon}</span>
          <div className="text-left">
            <div className={`text-[10px] font-semibold ${colorAntecedentes.textTranslucent} opacity-80`}>ANTECEDENTES</div>
            <div className={`text-xl font-bold ${colorAntecedentes.textTranslucent}`}>{resultadoAntecedentes.puntajeTotal}</div>
          </div>
          <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${colorAntecedentes.badgeTranslucent}`}>
            {resultadoAntecedentes.nivel}
          </div>
        </button>

        {/* Badge Tamizajes */}
        <button
          onClick={() => setMinimizado(false)}
          className={`flex items-center gap-2 rounded-full shadow-2xl px-4 py-2.5 backdrop-blur-sm ${colorTamizajes.bgTranslucent} border-2 ${colorTamizajes.borderTranslucent} hover:scale-105 transition-transform cursor-pointer`}
        >
          <span className="text-xl">{colorTamizajes.icon}</span>
          <div className="text-left">
            <div className={`text-[10px] font-semibold ${colorTamizajes.textTranslucent} opacity-80`}>TAMIZAJES</div>
            <div className={`text-xl font-bold ${colorTamizajes.textTranslucent}`}>{resultadoTamizajes.puntajeTotal}</div>
          </div>
          <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${colorTamizajes.badgeTranslucent}`}>
            {resultadoTamizajes.nivel}
          </div>
        </button>
      </div>
    );
  }

  // ============================================================
  // VERSIÓN EXPANDIDA (panel flotante con tabs o secciones)
  // ============================================================
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 w-96 max-h-[80vh] overflow-y-auto">
      <div className="space-y-3">
        {/* PANEL ANTECEDENTES */}
        <div className={`rounded-xl shadow-2xl bg-white/95 border-2 ${colorAntecedentes.border} overflow-hidden`}> 
          {/* HEADER CON CONTROLES */}
          <div className={`${colorAntecedentes.bg} px-4 py-3 flex items-center justify-between border-b-2 ${colorAntecedentes.border}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{colorAntecedentes.icon}</span>
              <h3 className={`font-bold text-sm ${colorAntecedentes.text}`}>Antecedentes</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-2xl font-bold ${colorAntecedentes.text}`}>{resultadoAntecedentes.puntajeTotal}</div>
              </div>
              <button
                onClick={() => setMinimizado(true)}
                className={`text-xs px-2 py-1 rounded hover:bg-black/10 ${colorAntecedentes.text}`}
                title="Minimizar"
              >
                ▼
              </button>
            </div>
          </div>

          {/* CONTENIDO */}
          <div className="p-4 max-h-[35vh] overflow-y-auto">
            {/* NIVEL */}
            <div className="mb-3 text-center">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold text-white ${colorAntecedentes.badge}`}>
                {colorAntecedentes.icon} {resultadoAntecedentes.nivel}
              </span>
            </div>

            {/* DESCRIPCIÓN */}
            <p className={`text-xs text-center mb-3 ${colorAntecedentes.text} opacity-80`}>
              {resultadoAntecedentes.descripcion}
            </p>

            {/* FACTORES DETECTADOS */}
            {resultadoAntecedentes.factores.length > 0 ? (
              <div className="space-y-2">
                <div className={`text-xs font-semibold mb-2 ${colorAntecedentes.text} opacity-70`}>
                  FACTORES ({resultadoAntecedentes.factores.length}):
                </div>
                <div className="space-y-2">
                  {resultadoAntecedentes.factores.map((factor, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg px-3 py-2 text-xs border-l-4 ${colorAntecedentes.border} bg-white/80`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className={`font-semibold ${colorAntecedentes.text}`}>{factor.campo}</div>
                          <div className={`mt-1 text-[10px] ${colorAntecedentes.text} opacity-70`}>{factor.razon}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${colorAntecedentes.text}`}>+{factor.puntos}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`rounded-lg px-3 py-2 text-xs text-center bg-white/80 ${colorAntecedentes.text}`}>
                ✅ Sin factores de riesgo detectados
              </div>
            )}
          </div>
        </div>

        {/* PANEL TAMIZAJES */}
        <div className={`rounded-xl shadow-2xl bg-white/95 border-2 ${colorTamizajes.border} overflow-hidden`}> 
          {/* HEADER */}
          <div className={`${colorTamizajes.bg} px-4 py-3 flex items-center justify-between border-b-2 ${colorTamizajes.border}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{colorTamizajes.icon}</span>
              <h3 className={`font-bold text-sm ${colorTamizajes.text}`}>Tamizajes Iniciales</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-2xl font-bold ${colorTamizajes.text}`}>{resultadoTamizajes.puntajeTotal}</div>
              </div>
              <button
                onClick={() => setMinimizado(true)}
                className={`text-xs px-2 py-1 rounded hover:bg-black/10 ${colorTamizajes.text}`}
                title="Minimizar"
              >
                ▼
              </button>
            </div>
          </div>

          {/* CONTENIDO */}
          <div className="p-4 max-h-[35vh] overflow-y-auto">
            {/* NIVEL */}
            <div className="mb-3 text-center">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold text-white ${colorTamizajes.badge}`}>
                {colorTamizajes.icon} {resultadoTamizajes.nivel}
              </span>
            </div>

            {/* DESCRIPCIÓN */}
            <p className={`text-xs text-center mb-3 ${colorTamizajes.text} opacity-80`}>
              {resultadoTamizajes.descripcion}
            </p>

            {/* TAMIZAJES DETECTADOS */}
            {resultadoTamizajes.tamizajes.length > 0 ? (
              <div className="space-y-2">
                <div className={`text-xs font-semibold mb-2 ${colorTamizajes.text} opacity-70`}>
                  HALLAZGOS ({resultadoTamizajes.tamizajes.length}):
                </div>
                <div className="space-y-2">
                  {resultadoTamizajes.tamizajes.map((tamizaje, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg px-3 py-2 text-xs border-l-4 ${colorTamizajes.border} bg-white/80`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className={`font-semibold ${colorTamizajes.text}`}>{tamizaje.campo}</div>
                          <div className={`mt-1 text-[10px] ${colorTamizajes.text} opacity-70`}>{tamizaje.razon}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${colorTamizajes.text}`}>+{tamizaje.puntos}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`rounded-lg px-3 py-2 text-xs text-center bg-white/80 ${colorTamizajes.text}`}>
                ✅ Sin hallazgos de riesgo en tamizajes
              </div>
            )}

            {/* RECOMENDACIÓN (solo si hay hallazgos) */}
            {resultadoTamizajes.tamizajes.length > 0 && (
              <div className={`mt-4 pt-4 border-t ${colorTamizajes.text} opacity-70`}>
                <div className="text-[10px] font-semibold mb-1">RECOMENDACIÓN:</div>
                <div className="text-[10px]">
                  {"recomendacion"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RECOMENDACIÓN GENERAL PARA ANTECEDENTES */}
        {resultadoAntecedentes.factores.length > 0 && (
          <div className={`rounded-xl shadow-xl bg-white/95 border ${colorAntecedentes.border} px-4 py-3`}>
            <div className={`text-[10px] font-semibold mb-1 ${colorAntecedentes.text}`}>📋 RECOMENDACIÓN:</div>
            <div className={`text-[10px] ${colorAntecedentes.text}`}>
              {"recomendacion"}r
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
