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
  isInline?: boolean;
}

export default function FloatingContadorRiesgo({ resultadoAntecedentes, resultadoTamizajes, semanasGestacion = 0, isInline = false }: Props) {
  const [minimizado, setMinimizado] = useState(true);

  // Colores según nivel adaptados con alto contraste para Claro y Oscuro
  const colorMap = {
    BAJO: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-400 dark:border-emerald-500/50',
      text: 'text-emerald-950 dark:text-emerald-200',
      labelColor: 'text-emerald-800 dark:text-emerald-400',
      valueColor: 'text-emerald-950 dark:text-white',
      badge: 'bg-emerald-600 text-white',
      badgeTranslucent: 'bg-emerald-600 text-white',
      bgTranslucent: 'bg-emerald-50/90 dark:bg-emerald-950/60',
      borderTranslucent: 'border-emerald-500/40 dark:border-emerald-500/40',
      icon: '✅',
    },
    ALTO: {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-400 dark:border-amber-500/50',
      text: 'text-amber-950 dark:text-amber-200',
      labelColor: 'text-amber-800 dark:text-amber-400',
      valueColor: 'text-amber-950 dark:text-white',
      badge: 'bg-amber-600 text-white',
      badgeTranslucent: 'bg-amber-600 text-white',
      bgTranslucent: 'bg-amber-50/90 dark:bg-amber-950/60',
      borderTranslucent: 'border-amber-500/40 dark:border-amber-500/40',
      icon: '⚠️',
    },
    MUY_ALTO: {
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      border: 'border-orange-400 dark:border-orange-500/50',
      text: 'text-orange-950 dark:text-orange-200',
      labelColor: 'text-orange-800 dark:text-orange-400',
      valueColor: 'text-orange-950 dark:text-white',
      badge: 'bg-orange-600 text-white',
      badgeTranslucent: 'bg-orange-600 text-white',
      bgTranslucent: 'bg-orange-50/90 dark:bg-orange-950/60',
      borderTranslucent: 'border-orange-500/40 dark:border-orange-500/40',
      icon: '🔴',
    },
    CRITICO: {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      border: 'border-rose-500 dark:border-rose-500/50',
      text: 'text-rose-950 dark:text-rose-200',
      labelColor: 'text-rose-800 dark:text-rose-400',
      valueColor: 'text-rose-950 dark:text-white',
      badge: 'bg-rose-600 text-white',
      badgeTranslucent: 'bg-rose-600 text-white',
      bgTranslucent: 'bg-rose-50/90 dark:bg-rose-950/60',
      borderTranslucent: 'border-rose-500/40 dark:border-rose-500/40',
      icon: '🚨',
    },
    SIN_HALLAZGOS: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-400 dark:border-emerald-500/50',
      text: 'text-emerald-950 dark:text-emerald-200',
      labelColor: 'text-emerald-800 dark:text-emerald-400',
      valueColor: 'text-emerald-950 dark:text-white',
      badge: 'bg-emerald-600 text-white',
      badgeTranslucent: 'bg-emerald-600 text-white',
      bgTranslucent: 'bg-emerald-50/90 dark:bg-emerald-950/60',
      borderTranslucent: 'border-emerald-500/40 dark:border-emerald-500/40',
      icon: '✅',
    },
    ALERTA: {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-400 dark:border-amber-500/50',
      text: 'text-amber-950 dark:text-amber-200',
      labelColor: 'text-amber-800 dark:text-amber-400',
      valueColor: 'text-amber-950 dark:text-white',
      badge: 'bg-amber-600 text-white',
      badgeTranslucent: 'bg-amber-600 text-white',
      bgTranslucent: 'bg-amber-50/90 dark:bg-amber-950/60',
      borderTranslucent: 'border-amber-500/40 dark:border-amber-500/40',
      icon: '⚠️',
    },
  };

  const colorAntecedentes = colorMap[resultadoAntecedentes.nivel];
  const colorTamizajes = colorMap[resultadoTamizajes.nivel];

  // ============================================================
  // VERSIÓN MINIMIZADA (badges)
  // ============================================================
  if (minimizado) {
    return (
      <div className={isInline ? "flex flex-col gap-2 w-full animate-in fade-in duration-200" : "fixed bottom-6 right-6 z-50 flex flex-col gap-2 animate-in slide-in-from-bottom-4"}>
        {/* Badge Antecedentes */}
        <button
          onClick={() => setMinimizado(false)}
          className={`flex items-center gap-2 px-4 py-2.5 backdrop-blur-sm ${colorAntecedentes.bgTranslucent} border-2 ${colorAntecedentes.borderTranslucent} hover:scale-[1.01] transition-all cursor-pointer justify-between ${isInline ? "rounded-xl w-full" : "rounded-full shadow-2xl"}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{colorAntecedentes.icon}</span>
            <div className="text-left">
              <div className={`text-[10px] font-bold uppercase tracking-wider ${colorAntecedentes.labelColor}`}>ANTECEDENTES</div>
              <div className={`text-xl font-black ${colorAntecedentes.valueColor}`}>{resultadoAntecedentes.puntajeTotal} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">pts</span></div>
            </div>
          </div>
          <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colorAntecedentes.badgeTranslucent}`}>
            {resultadoAntecedentes.nivel}
          </div>
        </button>

        {/* Badge Tamizajes */}
        <button
          onClick={() => setMinimizado(false)}
          className={`flex items-center gap-2 px-4 py-2.5 backdrop-blur-sm ${colorTamizajes.bgTranslucent} border-2 ${colorTamizajes.borderTranslucent} hover:scale-[1.01] transition-all cursor-pointer justify-between ${isInline ? "rounded-xl w-full" : "rounded-full shadow-2xl"}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{colorTamizajes.icon}</span>
            <div className="text-left">
              <div className={`text-[10px] font-bold uppercase tracking-wider ${colorTamizajes.labelColor}`}>TAMIZAJES</div>
              <div className={`text-xl font-black ${colorTamizajes.valueColor}`}>{resultadoTamizajes.puntajeTotal} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">pts</span></div>
            </div>
          </div>
          <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colorTamizajes.badgeTranslucent}`}>
            {resultadoTamizajes.nivel}
          </div>
        </button>
      </div>
    );
  }

  // ============================================================
  // VERSIÓN EXPANDIDA (panel con detalles)
  // ============================================================
  return (
    <div className={isInline ? "w-full animate-in fade-in duration-200" : "fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 w-96 max-h-[80vh] overflow-y-auto"}>
      <div className="space-y-3">
        {/* PANEL ANTECEDENTES */}
        <div className={`rounded-xl shadow-2xl bg-white dark:bg-slate-900 border-2 ${colorAntecedentes.border} overflow-hidden transition-colors`}> 
          {/* HEADER CON CONTROLES */}
          <div className={`${colorAntecedentes.bg} px-4 py-3 flex items-center justify-between border-b-2 ${colorAntecedentes.border}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{colorAntecedentes.icon}</span>
              <h3 className={`font-bold text-sm ${colorAntecedentes.text}`}>Antecedentes</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-2xl font-black ${colorAntecedentes.valueColor}`}>{resultadoAntecedentes.puntajeTotal} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">pts</span></div>
              </div>
              <button
                onClick={() => setMinimizado(true)}
                className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
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
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${colorAntecedentes.badge}`}>
                {colorAntecedentes.icon} {resultadoAntecedentes.nivel}
              </span>
            </div>

            {/* FACTORES DETECTADOS */}
            {resultadoAntecedentes.factores.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Factores detectados ({resultadoAntecedentes.factores.length}):
                </div>
                <div className="space-y-2">
                  {resultadoAntecedentes.factores.map((factor, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg px-3 py-2 text-xs border-l-4 ${colorAntecedentes.border} bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">{factor.campo}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-slate-900 dark:text-white">+{factor.puntos}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg px-3 py-2.5 text-xs text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 font-medium">
                ✅ Sin factores de riesgo en antecedentes
              </div>
            )}
          </div>
        </div>

        {/* PANEL TAMIZAJES */}
        <div className={`rounded-xl shadow-2xl bg-white dark:bg-slate-900 border-2 ${colorTamizajes.border} overflow-hidden transition-colors`}> 
          {/* HEADER */}
          <div className={`${colorTamizajes.bg} px-4 py-3 flex items-center justify-between border-b-2 ${colorTamizajes.border}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{colorTamizajes.icon}</span>
              <h3 className={`font-bold text-sm ${colorTamizajes.text}`}>Tamizajes Iniciales</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-2xl font-black ${colorTamizajes.valueColor}`}>{resultadoTamizajes.puntajeTotal} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">pts</span></div>
              </div>
              <button
                onClick={() => setMinimizado(true)}
                className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
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
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${colorTamizajes.badge}`}>
                {colorTamizajes.icon} {resultadoTamizajes.nivel}
              </span>
            </div>

            {/* TAMIZAJES DETECTADOS */}
            {resultadoTamizajes.tamizajes.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Hallazgos de tamizaje ({resultadoTamizajes.tamizajes.length}):
                </div>
                <div className="space-y-2">
                  {resultadoTamizajes.tamizajes.map((tamizaje, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg px-3 py-2 text-xs border-l-4 ${colorTamizajes.border} bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">{tamizaje.campo}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-slate-900 dark:text-white">+{tamizaje.puntos}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg px-3 py-2.5 text-xs text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 font-medium">
                ✅ Sin hallazgos de riesgo en tamizajes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
