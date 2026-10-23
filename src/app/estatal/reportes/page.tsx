"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { clasificarNivelRiesgo } from "@/lib/estatal-riesgo";

type SessionInfo = {
  nivel?: number;
  unidad?: string;
  displayName?: string;
};

type RegistroRiesgo = {
  paciente_id: number;
  folio: string | null;
  nombre_completo: string | null;
  region: string | null;
  municipio: string | null;
  unidad: string | null;
  clues_id: string | null;
  consulta_id: number;
  fecha_consulta: string | null;
  puntaje_total_consulta: number;
  puntaje_real_sin_forzar?: number;
  puntaje_consulta_parametros: number;
  riesgo_25_plus: number;
  alerta_por_criterio_clinico?: number;
  motivo_alerta?: string | null;
  colegiado: number;
  consulta_creada: string;
  edad?: number | null;
  localidad?: string | null;
  fecha_ingreso_cpn?: string | null;
  fpp?: string | null;
  imc_inicial?: number | null;
};

type StatsGlobales = {
  total_pacientes: number;
  pacientes_riesgo: number;
  promedio_global: number;
  promedio_riesgo_25: number;
  conteo_bajo: number;
  conteo_alto: number;
  conteo_muy_alto: number;
  criticos_colegiados?: number;
  criticos_pendientes?: number;
  criticos_alerta_clinica?: number;
  criticos_criterio_clinico?: number;
};

type NivelRiesgoFiltro = "muy_alto" | "alto" | "bajo" | "todos";

type PuntoSerie = {
  label: string;
  value: number;
};

type RankingItem = {
  label: string;
  sublabel?: string;
  total: number;
  colegiados: number;
  pendientes: number;
  pctVolumen: number;
  pctColegiado: number;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function dateKey(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function median(numbers: number[]) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function TrendChart({
  title,
  points,
  windowDays,
  onWindowChange,
}: {
  title: string;
  points: PuntoSerie[];
  windowDays: 14 | 30 | 60;
  onWindowChange: (days: 14 | 30 | 60) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const width = 720;
  const height = 275;
  const leftMargin = 44;
  const rightMargin = 16;
  const topMargin = 20;
  const bottomMargin = 32;

  const max = Math.max(...points.map((p) => p.value), 4);
  const totalPeriodo = points.reduce((acc, p) => acc + p.value, 0);
  const promedioDiario = points.length > 0 ? Math.round((totalPeriodo / points.length) * 10) / 10 : 0;

  const plotWidth = width - leftMargin - rightMargin;
  const plotHeight = height - topMargin - bottomMargin;

  const coords = points.map((p, i) => {
    const x = leftMargin + (i * plotWidth) / Math.max(points.length - 1, 1);
    const y = topMargin + (1 - p.value / max) * plotHeight;
    return { x, y, value: p.value, label: p.label };
  });

  const smoothLinePath = buildSmoothSvgPath(coords);
  const smoothAreaPath =
    coords.length > 0
      ? `${smoothLinePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - bottomMargin} L ${coords[0].x.toFixed(1)} ${height - bottomMargin} Z`
      : "";

  const avgY = topMargin + (1 - Math.min(promedioDiario, max) / max) * plotHeight;

  const formatShortDate = (value: string) => {
    const parts = value.split("-");
    if (parts.length < 3) return value;
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${months[mIdx] || parts[1]}`;
  };

  const step = Math.max(1, Math.floor(points.length / 7));
  const tickIndexes = points
    .map((_, idx) => idx)
    .filter((idx) => idx % step === 0 || idx === points.length - 1);

  const yAxisValues = [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
    const value = Math.round(ratio * max);
    const guideY = topMargin + (1 - ratio) * plotHeight;
    return { id: `y-guide-${index}`, value, y: guideY };
  });

  const activePoint = hoveredIdx !== null && coords[hoveredIdx] ? coords[hoveredIdx] : null;

  return (
    <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 opacity-80" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-xs">
              <i className="fa-solid fa-wave-square" />
            </span>
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-10">
            Acumulado en ventana: <strong className="text-slate-800 dark:text-slate-200 font-mono">{totalPeriodo}</strong> casos · Promedio: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{promedioDiario}/día</strong>
          </p>
        </div>

        <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1 border border-slate-200/80 dark:border-white/10">
          {([14, 30, 60] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onWindowChange(days)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                windowDays === days
                  ? "bg-white dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-200 shadow-sm border border-cyan-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          Sin datos para graficar en el periodo seleccionado.
        </div>
      ) : (
        <div className="relative">
          {activePoint && (
            <div className="pointer-events-none absolute top-2 right-3 z-20 rounded-xl border border-cyan-500/30 bg-slate-900/90 dark:bg-slate-950/95 text-white px-3 py-1.5 text-xs shadow-lg backdrop-blur-md flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-semibold text-slate-300">{formatShortDate(activePoint.label)}:</span>
              <span className="font-mono font-black text-cyan-300">{activePoint.value} casos</span>
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full select-none overflow-visible"
            style={{ minHeight: "245px" }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="premiumAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.38" />
                <stop offset="65%" stopColor="#14b8a6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="premiumLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {yAxisValues.map(({ id, value, y }) => (
              <g key={id}>
                <line
                  x1={leftMargin}
                  y1={y}
                  x2={width - rightMargin}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200/80 dark:text-slate-800"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={leftMargin - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  className="text-slate-400 dark:text-slate-500 font-mono"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* Línea de promedio diario */}
            {promedioDiario > 0 && (
              <g>
                <line
                  x1={leftMargin}
                  y1={avgY}
                  x2={width - rightMargin}
                  y2={avgY}
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="5 4"
                  strokeOpacity="0.7"
                />
                <text
                  x={width - rightMargin - 4}
                  y={avgY - 5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#f59e0b"
                  className="font-mono font-bold"
                >
                  Prom: {promedioDiario}
                </text>
              </g>
            )}

            {/* Área bajo la curva */}
            {smoothAreaPath && <path d={smoothAreaPath} fill="url(#premiumAreaGrad)" />}

            {/* Curva Bézier principal */}
            {smoothLinePath && (
              <path
                d={smoothLinePath}
                fill="none"
                stroke="url(#premiumLineGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Guía vertical en hover */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={topMargin}
                x2={activePoint.x}
                y2={height - bottomMargin}
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {/* Puntos interactivos */}
            {coords.map((c, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <g
                  key={`${c.label}-${idx}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  className="cursor-pointer"
                >
                  <circle cx={c.x} cy={c.y} r="12" fill="transparent" />
                  {(isHovered || c.value > 0 || points.length <= 14) && (
                    <>
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={isHovered ? 7 : 4}
                        fill={isHovered ? "#10b981" : "#06b6d4"}
                        className="transition-all duration-150"
                      />
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={isHovered ? 12 : 7}
                        fill={isHovered ? "#10b981" : "#06b6d4"}
                        fillOpacity={isHovered ? 0.25 : 0.15}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Etiquetas Eje X */}
            {tickIndexes.map((idx) => {
              const c = coords[idx];
              if (!c) return null;
              return (
                <text
                  key={`x-tick-${c.label}`}
                  x={c.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  className="text-slate-500 dark:text-slate-400 font-mono"
                >
                  {formatShortDate(c.label)}
                </text>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

function RiskStratificationCard({
  conteoBajo,
  conteoAlto,
  conteoMuyAlto,
  buckets,
  filtroActivo,
  onSelectNivel,
}: {
  conteoBajo: number;
  conteoAlto: number;
  conteoMuyAlto: number;
  buckets: PuntoSerie[];
  filtroActivo: NivelRiesgoFiltro;
  onSelectNivel: (nivel: NivelRiesgoFiltro) => void;
}) {
  const total = Math.max(conteoBajo + conteoAlto + conteoMuyAlto, 1);
  const pctBajo = Math.round((conteoBajo / total) * 1000) / 10;
  const pctAlto = Math.round((conteoAlto / total) * 1000) / 10;
  const pctMuyAlto = Math.round((conteoMuyAlto / total) * 1000) / 10;

  // SVG Donut geometry
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const segMuyAlto = (conteoMuyAlto / total) * circumference;
  const segAlto = (conteoAlto / total) * circumference;
  const segBajo = (conteoBajo / total) * circumference;

  const maxBucket = Math.max(...buckets.map((b) => b.value), 1);

  return (
    <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 opacity-80" />

      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs">
              <i className="fa-solid fa-chart-pie" />
            </span>
            <span>Estratificación MARO y Distribución de Puntajes</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-10">
            Proporción del padrón estatal según los 3 niveles oficiales y desglose del corte activo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center my-auto">
        {/* Donut Chart + Leyenda interactiva */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-white/5">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="16"
              />
              {/* Bajo (<4) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth="16"
                strokeDasharray={`${segBajo} ${circumference}`}
                strokeDashoffset={0}
                className="transition-all duration-500"
              />
              {/* Alto (4-24) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="16"
                strokeDasharray={`${segAlto} ${circumference}`}
                strokeDashoffset={-segBajo}
                className="transition-all duration-500"
              />
              {/* Muy Alto (>=25) */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="16"
                strokeDasharray={`${segMuyAlto} ${circumference}`}
                strokeDashoffset={-(segBajo + segAlto)}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white leading-none">
                {conteoBajo + conteoAlto + conteoMuyAlto}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                Padrón
              </span>
            </div>
          </div>

          <div className="w-full space-y-1.5 mt-3">
            <button
              type="button"
              onClick={() => onSelectNivel(filtroActivo === "muy_alto" ? "todos" : "muy_alto")}
              className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                filtroActivo === "muy_alto"
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200 font-bold"
                  : "border-transparent hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Muy Alto (≥25)</span>
              </span>
              <span className="font-mono font-bold">
                {conteoMuyAlto} <span className="text-[10px] opacity-75">({pctMuyAlto}%)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectNivel(filtroActivo === "alto" ? "todos" : "alto")}
              className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                filtroActivo === "alto"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 font-bold"
                  : "border-transparent hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Alto (4–24)</span>
              </span>
              <span className="font-mono font-bold">
                {conteoAlto} <span className="text-[10px] opacity-75">({pctAlto}%)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectNivel(filtroActivo === "bajo" ? "todos" : "bajo")}
              className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                filtroActivo === "bajo"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-bold"
                  : "border-transparent hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Bajo (&lt;4)</span>
              </span>
              <span className="font-mono font-bold">
                {conteoBajo} <span className="text-[10px] opacity-75">({pctBajo}%)</span>
              </span>
            </button>
          </div>
        </div>

        {/* Barras de distribución del corte actual */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-white/10">
            <span>Rango de Puntaje (Corte Activo)</span>
            <span>Pacientes</span>
          </div>
          {buckets.map((b) => {
            const barColor =
              b.label.includes("0–3")
                ? "from-emerald-500 to-teal-400"
                : b.label.includes("4–14") || b.label.includes("15–24")
                ? "from-amber-500 to-orange-400"
                : "from-rose-500 to-red-500";

            return (
              <div key={b.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{b.label}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {b.value}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300`}
                    style={{ width: `${b.value > 0 ? Math.max((b.value / maxBucket) * 100, 4) : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LeaderboardCard({
  title,
  subtitle,
  icon,
  items,
  selectedKey,
  onSelectKey,
  tone = "cyan",
}: {
  title: string;
  subtitle: string;
  icon: string;
  items: RankingItem[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  tone?: "cyan" | "emerald";
}) {
  const maxVal = Math.max(...items.map((x) => x.total), 1);

  return (
    <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
          tone === "emerald"
            ? "from-emerald-500 via-teal-400 to-cyan-500"
            : "from-cyan-500 via-blue-500 to-indigo-500"
        } opacity-80`}
      />

      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span
              className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs ${
                tone === "emerald"
                  ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                  : "bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/25 text-cyan-600 dark:text-cyan-400"
              }`}
            >
              <i className={`fa-solid ${icon}`} />
            </span>
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-10">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Colegiado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            En seguimiento
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Sin registros disponibles para los filtros actuales.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const isSelected =
              selectedKey !== "" && selectedKey.toLowerCase() === item.label.toLowerCase();
            const widthTotalPct = Math.max((item.total / maxVal) * 100, 3);
            const colegiadoRatio = item.total > 0 ? (item.colegiados / item.total) * 100 : 0;

            const rankBadge =
              idx === 0
                ? "bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/40"
                : idx === 1
                ? "bg-slate-300/30 text-slate-700 dark:text-slate-200 border-slate-400/40"
                : idx === 2
                ? "bg-orange-400/20 text-orange-800 dark:text-orange-300 border-orange-400/40"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-white/10";

            return (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  onSelectKey(isSelected ? "" : item.label === "SIN REGION" || item.label === "SIN UNIDAD" ? "" : item.label)
                }
                className={`w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                  isSelected
                    ? "border-cyan-500/60 bg-cyan-500/10 dark:bg-cyan-500/15 shadow-sm"
                    : "border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50/90 dark:hover:bg-white/5"
                }`}
                title="Clic para filtrar por este elemento"
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-5 rounded-md border text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${rankBadge}`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    {item.colegiados > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                        {item.colegiados} col.
                      </span>
                    )}
                    <span className="font-black text-slate-900 dark:text-white text-xs">
                      {item.total}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 w-11 text-right">
                      ({item.pctVolumen}%)
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full rounded-full flex overflow-hidden transition-all duration-300"
                    style={{ width: `${widthTotalPct}%` }}
                  >
                    {colegiadoRatio > 0 && (
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${colegiadoRatio}%` }}
                      />
                    )}
                    <div
                      className={`h-full flex-1 ${
                        tone === "emerald"
                          ? "bg-gradient-to-r from-cyan-500 to-teal-500"
                          : "bg-gradient-to-r from-cyan-500 to-blue-500"
                      }`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ReportesEstatalesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroRiesgo[]>([]);
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgoFiltro>("muy_alto");
  const filtroRiesgoRef = useRef<NivelRiesgoFiltro>("muy_alto");
  const [statsGlobales, setStatsGlobales] = useState<StatsGlobales>({
    total_pacientes: 0,
    pacientes_riesgo: 0,
    promedio_global: 0,
    promedio_riesgo_25: 0,
    conteo_bajo: 0,
    conteo_alto: 0,
    conteo_muy_alto: 0,
  });

  const [regionFilter, setRegionFilter] = useState("");
  const [unidadFilter, setUnidadFilter] = useState("");
  const [colegiadoFilter, setColegiadoFilter] = useState<"todos" | "colegiados" | "no_colegiados">(
    "todos"
  );
  const [origenFilter, setOrigenFilter] = useState<"todos" | "puntaje" | "criterio">("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [windowDays, setWindowDays] = useState<14 | 30 | 60>(14);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingClinico, setExportingClinico] = useState(false);
  const [exportingCompleto, setExportingCompleto] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const previewPerPage = 15;

  useEffect(() => {
    filtroRiesgoRef.current = filtroRiesgo;
  }, [filtroRiesgo]);

  const loadReportes = useCallback(async (silent = false, riesgoNivel?: NivelRiesgoFiltro) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const nivelTarget = riesgoNivel !== undefined ? riesgoNivel : filtroRiesgoRef.current;
    try {
      const res = await fetch(
        `/api/estatal/riesgo?limit=1500&include_stats=1&nivel_riesgo=${nivelTarget}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("No se pudo cargar el concentrado estatal");
      const json = await res.json();
      const data: RegistroRiesgo[] = Array.isArray(json) ? json : json.registros || [];
      setRegistros(data);
      if (json && json.stats) {
        setStatsGlobales(json.stats);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Error desconocido");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const cambiarNivelRiesgo = (nuevoNivel: NivelRiesgoFiltro) => {
    setFiltroRiesgo(nuevoNivel);
    filtroRiesgoRef.current = nuevoNivel;
    setPreviewPage(1);
    if (nuevoNivel === "bajo" || nuevoNivel === "alto") {
      setColegiadoFilter("todos");
      setOrigenFilter("todos");
    }
    loadReportes(false, nuevoNivel);
  };

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const session = JSON.parse(stored) as SessionInfo;
      if ((session.nivel ?? 0) < 3) {
        router.replace((session.nivel ?? 0) >= 2 ? "/region" : "/dashboard");
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadReportes(false);
  }, [authChecked, loadReportes]);

  useEffect(() => {
    if (!authChecked) return;

    const handleWindowFocus = () => loadReportes(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadReportes(true);
    };
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === "maro:colegiado-updated" || event.key === "maro:estatal-riesgo-updated") {
        loadReportes(true);
      }
    };
    const handleCustomSync = () => loadReportes(true);

    const intervalId = window.setInterval(() => loadReportes(true), 15000);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("maro:colegiado-updated", handleCustomSync as EventListener);
    window.addEventListener("maro:estatal-riesgo-updated", handleCustomSync as EventListener);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("maro:colegiado-updated", handleCustomSync as EventListener);
      window.removeEventListener("maro:estatal-riesgo-updated", handleCustomSync as EventListener);
      window.clearInterval(intervalId);
    };
  }, [authChecked, loadReportes]);

  const regionesDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        registros
          .map((r) => String(r.region || "").trim())
          .filter((r) => r.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [registros]);

  const unidadesDisponibles = useMemo(() => {
    const base = registros.filter((r) => {
      if (!regionFilter) return true;
      return String(r.region || "").toLowerCase() === regionFilter.toLowerCase();
    });

    return Array.from(
      new Set(
        base
          .map((r) => String(r.unidad || "").trim())
          .filter((u) => u.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [regionFilter, registros]);

  // Todos los filtros alimentan de forma unificada a registrosReporte (KPIs, Gráficos y Exportación)
  const registrosReporte = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registros.filter((r) => {
      const matchRegion =
        !regionFilter || String(r.region || "").toLowerCase() === regionFilter.toLowerCase();
      const matchUnidad =
        !unidadFilter || String(r.unidad || "").toLowerCase() === unidadFilter.toLowerCase();

      const esCriterio = Number(r.alerta_por_criterio_clinico) === 1;
      const fecha = dateKey(r.fecha_consulta || r.consulta_creada || null);

      const matchColegiado =
        colegiadoFilter === "todos" ||
        (colegiadoFilter === "colegiados" && Number(r.colegiado) === 1) ||
        (colegiadoFilter === "no_colegiados" && Number(r.colegiado) !== 1);

      const matchOrigen =
        origenFilter === "todos" ||
        (origenFilter === "criterio" && esCriterio) ||
        (origenFilter === "puntaje" && !esCriterio);

      const matchDesde = !fechaDesde || (fecha !== "" && fecha >= fechaDesde);
      const matchHasta = !fechaHasta || (fecha !== "" && fecha <= fechaHasta);

      const matchQuery =
        !q ||
        String(r.folio || "").toLowerCase().includes(q) ||
        String(r.nombre_completo || "").toLowerCase().includes(q) ||
        String(r.unidad || "").toLowerCase().includes(q);

      return (
        matchRegion &&
        matchUnidad &&
        matchColegiado &&
        matchOrigen &&
        matchDesde &&
        matchHasta &&
        matchQuery
      );
    });
  }, [
    registros,
    regionFilter,
    unidadFilter,
    colegiadoFilter,
    origenFilter,
    fechaDesde,
    fechaHasta,
    searchQuery,
  ]);

  useEffect(() => {
    setPreviewPage(1);
  }, [regionFilter, unidadFilter, colegiadoFilter, origenFilter, fechaDesde, fechaHasta, searchQuery]);

  const totalPreviewPages = Math.max(1, Math.ceil(registrosReporte.length / previewPerPage));
  const registrosPreview = useMemo(() => {
    const start = (previewPage - 1) * previewPerPage;
    return registrosReporte.slice(start, start + previewPerPage);
  }, [registrosReporte, previewPage]);

  const hayFiltrosSecundarios = Boolean(
    regionFilter ||
      unidadFilter ||
      colegiadoFilter !== "todos" ||
      origenFilter !== "todos" ||
      fechaDesde ||
      fechaHasta ||
      searchQuery
  );

  const limpiarFiltros = () => {
    setRegionFilter("");
    setUnidadFilter("");
    setColegiadoFilter("todos");
    setOrigenFilter("todos");
    setFechaDesde("");
    setFechaHasta("");
    setSearchQuery("");
  };

  const kpis = useMemo(() => {
    const total = registrosReporte.length;
    const criticos = registrosReporte.filter(
      (r) =>
        Number(r.puntaje_total_consulta) >= 25 ||
        Number(r.riesgo_25_plus) === 1 ||
        Number(r.alerta_por_criterio_clinico) === 1
    ).length;
    const porCriterio = registrosReporte.filter(
      (r) => Number(r.alerta_por_criterio_clinico) === 1
    ).length;
    const colegiados = registrosReporte.filter((r) => Number(r.colegiado) === 1).length;
    const pendientes = Math.max(0, total - colegiados);

    const scores = registrosReporte.map((r) => Number(r.puntaje_total_consulta) || 0);
    const promedio = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
    const med = scores.length ? Math.round(median(scores) * 10) / 10 : 0;
    const maxScore = scores.length ? Math.max(...scores) : 0;
    const minScore = scores.length ? Math.min(...scores) : 0;

    return {
      total,
      criticos,
      porCriterio,
      colegiados,
      pendientes,
      promedio,
      mediana: med,
      maxScore,
      minScore,
      tasaColegiado: total ? Math.round((colegiados / total) * 1000) / 10 : 0,
    };
  }, [registrosReporte]);

  const topRegiones = useMemo<RankingItem[]>(() => {
    const m = new Map<string, { total: number; colegiados: number }>();
    const totalGlobal = Math.max(registrosReporte.length, 1);

    for (const r of registrosReporte) {
      const key = String(r.region || "SIN REGION").trim() || "SIN REGION";
      const prev = m.get(key) || { total: 0, colegiados: 0 };
      prev.total += 1;
      if (Number(r.colegiado) === 1) prev.colegiados += 1;
      m.set(key, prev);
    }

    return Array.from(m.entries())
      .map(([label, stats]) => ({
        label,
        total: stats.total,
        colegiados: stats.colegiados,
        pendientes: stats.total - stats.colegiados,
        pctVolumen: Math.round((stats.total / totalGlobal) * 1000) / 10,
        pctColegiado: stats.total > 0 ? Math.round((stats.colegiados / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [registrosReporte]);

  const topUnidades = useMemo<RankingItem[]>(() => {
    const m = new Map<string, { total: number; colegiados: number }>();
    const totalGlobal = Math.max(registrosReporte.length, 1);

    for (const r of registrosReporte) {
      const key = String(r.unidad || "SIN UNIDAD").trim() || "SIN UNIDAD";
      const prev = m.get(key) || { total: 0, colegiados: 0 };
      prev.total += 1;
      if (Number(r.colegiado) === 1) prev.colegiados += 1;
      m.set(key, prev);
    }

    return Array.from(m.entries())
      .map(([label, stats]) => ({
        label,
        total: stats.total,
        colegiados: stats.colegiados,
        pendientes: stats.total - stats.colegiados,
        pctVolumen: Math.round((stats.total / totalGlobal) * 1000) / 10,
        pctColegiado: stats.total > 0 ? Math.round((stats.colegiados / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [registrosReporte]);

  const distribucionPuntaje = useMemo(() => {
    const buckets = [
      { label: "0–3 pts (Bajo)", min: 0, max: 3.99, count: 0 },
      { label: "4–14 pts (Alto Mod.)", min: 4, max: 14.99, count: 0 },
      { label: "15–24 pts (Alto Sev.)", min: 15, max: 24.99, count: 0 },
      { label: "25–29 pts (Muy Alto)", min: 25, max: 29.99, count: 0 },
      { label: "30–34 pts (Crítico)", min: 30, max: 34.99, count: 0 },
      { label: "35+ pts (Extremo)", min: 35, max: Number.POSITIVE_INFINITY, count: 0 },
    ];

    for (const r of registrosReporte) {
      const s = Number(r.puntaje_total_consulta) || 0;
      const bucket = buckets.find((b) => s >= b.min && s <= b.max);
      if (bucket) bucket.count += 1;
    }

    // Si estamos viendo exclusivamente muy_alto, filtramos las cubetas relevantes si las bajas están en 0
    if (filtroRiesgo === "muy_alto") {
      return buckets
        .filter((b) => b.min >= 25 || b.count > 0)
        .map((b) => ({ label: b.label, value: b.count }));
    }

    return buckets.map((b) => ({ label: b.label, value: b.count }));
  }, [registrosReporte, filtroRiesgo]);

  const tendenciaTemporal = useMemo(() => {
    const dias: string[] = [];
    const now = new Date();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dias.push(dateKey(d.toISOString()));
    }

    const counts = new Map<string, number>();
    dias.forEach((d) => counts.set(d, 0));

    for (const r of registrosReporte) {
      const key = dateKey(r.fecha_consulta || r.consulta_creada || null);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    return dias.map((d) => ({ label: d, value: counts.get(d) || 0 }));
  }, [registrosReporte, windowDays]);

  const ultimoRegistro = useMemo(() => {
    if (registrosReporte.length === 0) return null;
    const sorted = [...registrosReporte].sort((a, b) => {
      const aTs = new Date(a.consulta_creada || a.fecha_consulta || 0).getTime();
      const bTs = new Date(b.consulta_creada || b.fecha_consulta || 0).getTime();
      return bTs - aTs;
    });
    return sorted[0];
  }, [registrosReporte]);

  const descargarExcel = async () => {
    setExportingExcel(true);
    try {
      if (registrosReporte.length === 0) {
        throw new Error("No hay casos para exportar con los filtros seleccionados");
      }

      const res = await fetch("/api/estatal/reportes/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: registrosReporte,
          region: regionFilter || undefined,
          unidad: unidadFilter || undefined,
          colegiadoFilter,
          origenFilter,
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al generar el reporte Excel");
      }

      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-estatal-${filtroRiesgo}-${stamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "No se pudo generar el reporte Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const descargarReporteClinico = async () => {
    setExportingClinico(true);
    try {
      const params = new URLSearchParams();
      if (regionFilter) params.append("region", regionFilter);
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);

      const res = await fetch(`/api/reportes/clinico?${params.toString()}`, {
        method: "GET",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al generar el reporte Excel clínico");
      }

      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const scopeLabel = regionFilter ? regionFilter.toLowerCase() : "estatal";
      a.download = `reporte-clinico-maro-${scopeLabel}-${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || "No se pudo generar el reporte Excel clínico");
    } finally {
      setExportingClinico(false);
    }
  };

  const descargarReporteCompleto = async () => {
    setExportingCompleto(true);
    try {
      const res = await fetch("/api/reportes/completo", { method: "GET" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al generar el reporte completo");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_pacientes_final_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "No se pudo generar el reporte completo");
    } finally {
      setExportingCompleto(false);
    }
  };

  const descargarPdf = async () => {
    setExportingPdf(true);
    try {
      if (registrosReporte.length === 0) {
        throw new Error("No hay casos para exportar con los filtros seleccionados");
      }

      const payload = {
        meta: {
          region: regionFilter || undefined,
          unidad: unidadFilter || undefined,
          colegiadoFilter,
          origenFilter,
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
        },
        kpis: {
          total: kpis.total,
          colegiados: kpis.colegiados,
          pendientes: kpis.pendientes,
          promedio: kpis.promedio,
          mediana: kpis.mediana,
          tasaColegiado: kpis.tasaColegiado,
        },
        topRegiones: topRegiones.map((r) => ({ label: r.label, value: r.total })),
        topUnidades: topUnidades.map((u) => ({ label: u.label, value: u.total })),
        distribucionPuntaje,
        tendencia14dias: tendenciaTemporal.slice(-14),
        rows: registrosReporte.slice(0, 100),
      };

      const res = await fetch("/api/estatal/reportes/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al generar el reporte PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-estatal-casos-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setError(null);
    } catch (err: any) {
      setError(err?.message || "No se pudo generar el reporte PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen relative flex items-center justify-center bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-white transition-colors duration-300">
        <div className="relative z-10 text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300">
            Validando credenciales de inteligencia estatal...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative text-slate-800 dark:text-white transition-colors duration-300">
      {/* CAPA DE FONDO FIJA - MODO CLARO */}
      <div
        className="fixed inset-0 pointer-events-none z-0 dark:hidden bg-slate-100/60"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(248, 250, 252, 0.86), rgba(204, 251, 241, 0.65)), url(/maro_back_estatal.png)",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      {/* CAPA DE FONDO FIJA - MODO OSCURO */}
      <div
        className="fixed inset-0 pointer-events-none z-0 hidden dark:block bg-slate-950"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.90), rgba(15, 118, 110, 0.60)), url(/maro_back_estatal.png)",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      {/* PATRÓN CLÍNICO DE PUNTOS */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-35 dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #0d9488 1.1px, transparent 1.1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        {/* 1. ENCABEZADO EJECUTIVO PREMIUM */}
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/85 dark:border-white/15 bg-white/90 dark:bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                <i className="fa-solid fa-chart-line text-[10px]" />
                <span>Inteligencia Epidemiológica Estatal</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sincronización Activa</span>
              </span>
              {ultimoRegistro && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  · Último movimiento:{" "}
                  <strong className="text-slate-700 dark:text-slate-200 font-mono">
                    {formatDate(ultimoRegistro.fecha_consulta || ultimoRegistro.consulta_creada)}
                  </strong>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Centro Analítico y Generación de Reportes MARO
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              Monitoreo estadístico, estratificación por nivel de riesgo obstétrico, cobertura de planes colegiados y exportación ejecutiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => loadReportes(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm cursor-pointer"
              title="Actualizar métricas ahora"
            >
              <i className={`fa-solid fa-arrows-rotate ${refreshing ? "animate-spin text-cyan-500" : ""}`} />
              <span>{refreshing ? "Actualizando..." : "Actualizar"}</span>
            </button>
            <Link
              href="/estatal"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm"
            >
              <i className="fa-solid fa-arrow-left" />
              <span>Tablero Estatal</span>
            </Link>
            <Link
              href="/colegiados"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-500/35 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 transition shadow-sm"
            >
              <i className="fa-solid fa-users-viewfinder text-emerald-600 dark:text-emerald-400" />
              <span>Sesiones Colegiadas</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* 2. BARRA DE CONTROL Y FILTROS UNIFICADOS */}
        <section className="rounded-3xl border border-slate-200/85 dark:border-white/15 bg-white/90 dark:bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
          {/* Selector de Nivel de Riesgo MARO */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-cyan-600 dark:text-cyan-400" />
                <span>Universo de Análisis por Clasificación MARO</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Seleccione el segmento poblacional para recalcular KPIs, gráficas y descargas
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => cambiarNivelRiesgo("todos")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "todos"
                    ? "border-blue-500 dark:border-blue-400 bg-blue-500/20 text-blue-950 dark:text-blue-100 shadow-sm ring-2 ring-blue-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                <span>Padrón Completo</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10">
                  {statsGlobales.total_pacientes || registros.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => cambiarNivelRiesgo("bajo")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "bajo"
                    ? "border-emerald-500 dark:border-emerald-400 bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Bajo (&lt;4 pts)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                  {statsGlobales.conteo_bajo || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => cambiarNivelRiesgo("alto")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "alto"
                    ? "border-amber-500 dark:border-amber-400 bg-amber-500/20 text-amber-950 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Alto (4–24 pts)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
                  {statsGlobales.conteo_alto || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => cambiarNivelRiesgo("muy_alto")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "muy_alto"
                    ? "border-rose-500 dark:border-rose-400 bg-rose-500/20 text-rose-950 dark:text-rose-100 shadow-sm ring-2 ring-rose-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-rose-500/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Muy Alto (≥25 pts)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200">
                  {statsGlobales.conteo_muy_alto || 0}
                </span>
              </button>
            </div>
          </div>

          {/* Selectores de segmentación fina */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
                Región Sanitaria
              </label>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setUnidadFilter("");
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="">Todas las regiones</option>
                {regionesDisponibles.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
                Unidad Médica
              </label>
              <select
                value={unidadFilter}
                onChange={(e) => setUnidadFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="">Todas las unidades</option>
                {unidadesDisponibles.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
                Estatus Colegiado
              </label>
              <select
                value={colegiadoFilter}
                onChange={(e) =>
                  setColegiadoFilter(e.target.value as "todos" | "colegiados" | "no_colegiados")
                }
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="todos">Todos los casos</option>
                <option value="colegiados">Solo colegiados</option>
                <option value="no_colegiados">Solo pendientes</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
                Origen Clasificación
              </label>
              <select
                value={origenFilter}
                onChange={(e) =>
                  setOrigenFilter(e.target.value as "todos" | "puntaje" | "criterio")
                }
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="todos">Todos los orígenes</option>
                <option value="puntaje">Por escala de puntaje</option>
                <option value="criterio">Por criterio clínico</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
                Fecha Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* Barra de estado de filtros activos */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Mostrando <strong className="text-slate-900 dark:text-white font-mono">{registrosReporte.length}</strong> de{" "}
                <strong className="font-mono">{registros.length}</strong> expedientes en el nivel seleccionado
              </span>

              {regionFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30 font-semibold">
                  Región: {regionFilter}
                  <button type="button" onClick={() => setRegionFilter("")} className="hover:text-rose-500 ml-1 cursor-pointer">
                    ✕
                  </button>
                </span>
              )}
              {unidadFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 font-semibold">
                  Unidad: {unidadFilter}
                  <button type="button" onClick={() => setUnidadFilter("")} className="hover:text-rose-500 ml-1 cursor-pointer">
                    ✕
                  </button>
                </span>
              )}
              {colegiadoFilter !== "todos" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-semibold">
                  {colegiadoFilter === "colegiados" ? "Solo Colegiados" : "Solo Pendientes"}
                  <button type="button" onClick={() => setColegiadoFilter("todos")} className="hover:text-rose-500 ml-1 cursor-pointer">
                    ✕
                  </button>
                </span>
              )}
              {(fechaDesde || fechaHasta) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30 font-semibold">
                  Periodo: {fechaDesde || "Inicio"} → {fechaHasta || "Hoy"}
                  <button
                    type="button"
                    onClick={() => {
                      setFechaDesde("");
                      setFechaHasta("");
                    }}
                    className="hover:text-rose-500 ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>

            {hayFiltrosSecundarios && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <i className="fa-solid fa-filter-circle-xmark" />
                <span>Restablecer filtros</span>
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/65 p-16 text-center space-y-3 backdrop-blur-xl shadow-xl">
            <div className="inline-block animate-spin rounded-full h-9 w-9 border-4 border-cyan-500 border-t-transparent" />
            <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
              Procesando cubos analíticos y métricas estatales...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-300/80 dark:border-rose-500/40 bg-rose-50/90 dark:bg-rose-900/25 p-6 text-center space-y-3 backdrop-blur-xl shadow-xl">
            <p className="text-sm text-rose-800 dark:text-rose-200 font-bold">{error}</p>
            <button
              type="button"
              onClick={() => loadReportes(false)}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
            >
              Reintentar carga
            </button>
          </div>
        ) : (
          <>
            {/* 3. BENTO GRID DE KPIS EJECUTIVOS (6 TARJETAS PREMIUM) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* KPI 1: Expedientes en Corte */}
              <div className="relative overflow-hidden rounded-2xl border border-blue-300/80 dark:border-blue-500/30 bg-white/90 dark:bg-slate-900/75 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Casos en Corte
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-folder-tree" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {kpis.total}
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                  <span>Padrón estatal:</span>
                  <strong className="font-mono text-slate-700 dark:text-slate-200">
                    {statsGlobales.total_pacientes || registros.length}
                  </strong>
                </div>
              </div>

              {/* KPI 2: Casos Críticos / Muy Alto Riesgo */}
              <div className="relative overflow-hidden rounded-2xl border border-rose-300/80 dark:border-rose-500/30 bg-white/90 dark:bg-slate-900/75 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Críticos (≥25 pts)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-triangle-exclamation" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
                    {kpis.criticos}
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                  <span>Criterio clínico:</span>
                  <strong className="font-mono text-rose-700 dark:text-rose-300">
                    {kpis.porCriterio}
                  </strong>
                </div>
              </div>

              {/* KPI 3: Casos Colegiados */}
              <div className="relative overflow-hidden rounded-2xl border border-emerald-300/80 dark:border-emerald-500/30 bg-white/90 dark:bg-slate-900/75 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Colegiados
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-user-check" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                    {kpis.colegiados}
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                  <span>Total estatal:</span>
                  <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                    {statsGlobales.criticos_colegiados ?? kpis.colegiados}
                  </strong>
                </div>
              </div>

              {/* KPI 4: Tasa de Cobertura Colegiada */}
              <div className="relative overflow-hidden rounded-2xl border border-cyan-300/80 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/75 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-teal-500" />
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                    Tasa Cobertura
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-percent" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black font-mono tracking-tight text-cyan-700 dark:text-cyan-300">
                    {kpis.tasaColegiado}%
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(kpis.tasaColegiado, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* KPI 5: Pendientes de Comité */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 dark:border-amber-500/30 bg-white/90 dark:bg-slate-900/75 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Sin Colegiar
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-clock-rotate-left" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                    {kpis.pendientes}
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                  <span>En el corte activo</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Seguimiento</span>
                </div>
              </div>

              {/* KPI 6: Promedio y Mediana de Score */}
              <div className="relative overflow-hidden rounded-2xl border border-teal-300/80 dark:border-teal-500/30 bg-white/90 dark:bg-slate-900/75 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    Score Promedio
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-calculator" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-1.5">
                  <p className="text-3xl font-black font-mono tracking-tight text-teal-700 dark:text-teal-300">
                    {kpis.promedio}
                  </p>
                  <span className="text-xs font-bold text-slate-400">pts</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                  <span>Mediana: <strong className="font-mono text-slate-700 dark:text-slate-200">{kpis.mediana}</strong></span>
                  <span className="font-mono text-[10px]">[{kpis.minScore}–{kpis.maxScore}]</span>
                </div>
              </div>
            </section>

            {/* 4. SUITE DE GRÁFICOS INTERACTIVOS */}
            <section className="grid gap-5 xl:grid-cols-2">
              <TrendChart
                title="Curva de Tendencia de Casos"
                points={tendenciaTemporal}
                windowDays={windowDays}
                onWindowChange={setWindowDays}
              />

              <RiskStratificationCard
                conteoBajo={statsGlobales.conteo_bajo}
                conteoAlto={statsGlobales.conteo_alto}
                conteoMuyAlto={statsGlobales.conteo_muy_alto}
                buckets={distribucionPuntaje}
                filtroActivo={filtroRiesgo}
                onSelectNivel={cambiarNivelRiesgo}
              />

              <LeaderboardCard
                title="Ranking por Región Sanitaria"
                subtitle="Volumen de casos y proporción de cobertura colegiada (clic para filtrar)"
                icon="fa-map-location-dot"
                items={topRegiones}
                selectedKey={regionFilter}
                onSelectKey={(val) => {
                  setRegionFilter(val);
                  setUnidadFilter("");
                }}
                tone="cyan"
              />

              <LeaderboardCard
                title="Top Unidades Médicas con Mayor Concentración"
                subtitle="Unidades con más casos registrados en el segmento activo (clic para filtrar)"
                icon="fa-hospital"
                items={topUnidades}
                selectedKey={unidadFilter}
                onSelectKey={(val) => setUnidadFilter(val)}
                tone="emerald"
              />
            </section>

            {/* 5. CENTRO DE EXPORTACIÓN EJECUTIVA ("DATA EXPORT STUDIO") */}
            <section className="rounded-3xl border border-slate-200/85 dark:border-white/15 bg-white/90 dark:bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs">
                      <i className="fa-solid fa-cloud-arrow-down" />
                    </span>
                    <span>Centro de Exportación Oficial y Sabanas de Datos</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-10">
                    Genere entregables en formato Excel o PDF aplicando los filtros activos
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 px-3.5 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-200">
                  <i className="fa-solid fa-database text-[10px]" />
                  <span>Lista para exportar:</span>
                  <strong className="font-mono">{registrosReporte.length} registros</strong>
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Export 1: Excel Estándar */}
                <button
                  type="button"
                  onClick={descargarExcel}
                  disabled={exportingExcel}
                  className="group relative flex flex-col justify-between rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-slate-900/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500/70 hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-base">
                        <i className={`fa-solid ${exportingExcel ? "fa-spinner fa-spin" : "fa-file-excel"}`} />
                      </div>
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                        .XLSX · {registrosReporte.length} filas
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {exportingExcel ? "Generando archivo..." : "Excel Estándar (Corte)"}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Concentrado ejecutivo de los casos filtrados actualmente en pantalla.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <span>Descargar reporte</span>
                    <i className="fa-solid fa-arrow-down-long group-hover:translate-y-0.5 transition-transform" />
                  </div>
                </button>

                {/* Export 2: Excel Clínico */}
                <button
                  type="button"
                  onClick={descargarReporteClinico}
                  disabled={exportingClinico}
                  className="group relative flex flex-col justify-between rounded-2xl border border-teal-500/35 bg-gradient-to-br from-teal-50/90 to-white dark:from-teal-950/40 dark:to-slate-900/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-teal-500/70 hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/15 dark:bg-teal-500/25 text-teal-600 dark:text-teal-300 flex items-center justify-center text-base">
                        <i className={`fa-solid ${exportingClinico ? "fa-spinner fa-spin" : "fa-file-medical"}`} />
                      </div>
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30">
                        .XLSX · CLÍNICO
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                      {exportingClinico ? "Generando archivo..." : "Sabana Clínica Detallada"}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Incluye antecedentes, signos vitales, tamizajes y desglose médico completo.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-teal-500/15 flex items-center justify-between text-[11px] font-bold text-teal-700 dark:text-teal-300">
                    <span>Descargar sabana</span>
                    <i className="fa-solid fa-arrow-down-long group-hover:translate-y-0.5 transition-transform" />
                  </div>
                </button>

                {/* Export 3: Base de Datos Completa */}
                <button
                  type="button"
                  onClick={descargarReporteCompleto}
                  disabled={exportingCompleto}
                  className="group relative flex flex-col justify-between rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-50/90 to-white dark:from-cyan-950/40 dark:to-slate-900/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500/70 hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 dark:bg-cyan-500/25 text-cyan-600 dark:text-cyan-300 flex items-center justify-center text-base">
                        <i className={`fa-solid ${exportingCompleto ? "fa-spinner fa-spin" : "fa-database"}`} />
                      </div>
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30">
                        .XLSX · FULL DB
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                      {exportingCompleto ? "Exportando base..." : "Padrón Completo (Auditoría)"}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Extracción íntegra en crudo de todas las tablas para cruces bioestadísticos.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                    <span>Descargar padrón</span>
                    <i className="fa-solid fa-arrow-down-long group-hover:translate-y-0.5 transition-transform" />
                  </div>
                </button>

                {/* Export 4: Documento PDF Ejecutivo */}
                <button
                  type="button"
                  onClick={descargarPdf}
                  disabled={exportingPdf}
                  className="group relative flex flex-col justify-between rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-50/90 to-white dark:from-amber-950/40 dark:to-slate-900/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500/70 hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 flex items-center justify-center text-base">
                        <i className={`fa-solid ${exportingPdf ? "fa-spinner fa-spin" : "fa-file-pdf"}`} />
                      </div>
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                        .PDF · EJECUTIVO
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                      {exportingPdf ? "Maquetando PDF..." : "Informe Ejecutivo PDF"}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Documento institucional con gráficas, indicadores y listado oficial para firma.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-amber-500/15 flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    <span>Generar documento</span>
                    <i className="fa-solid fa-arrow-down-long group-hover:translate-y-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            </section>

            {/* 6. VISTA PREVIA INTERACTIVA DE CASOS A EXPORTAR */}
            <section className="rounded-3xl border border-slate-200/85 dark:border-white/15 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-200/70 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((o) => !o)}
                  className="flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-table-list" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        Explorador y Vista Previa de Expedientes
                      </span>
                      <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                        {registrosReporte.length}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      {previewOpen
                        ? "Haga clic para contraer la tabla de verificación"
                        : "Haga clic para desplegar y auditar los registros incluidos en el corte"}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="search"
                      placeholder="Buscar folio o paciente..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (!previewOpen) setPreviewOpen(true);
                      }}
                      className="rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-white/10 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewOpen((o) => !o)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{previewOpen ? "Ocultar" : "Desplegar"}</span>
                    <i
                      className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${
                        previewOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {previewOpen && (
                <div className="p-4 space-y-4">
                  {registrosReporte.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                      No hay expedientes que coincidan con los criterios de filtrado seleccionados.
                    </p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100/95 dark:bg-slate-800/95 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-white/10">
                            <tr className="whitespace-nowrap">
                              <th className="px-3.5 py-2.5">Folio</th>
                              <th className="px-3.5 py-2.5">Paciente</th>
                              <th className="px-3.5 py-2.5 hidden sm:table-cell">Región</th>
                              <th className="px-3.5 py-2.5 hidden md:table-cell">Unidad Médica</th>
                              <th className="px-3.5 py-2.5 text-center">Consulta</th>
                              <th className="px-3.5 py-2.5 text-right">Nivel / Puntaje</th>
                              <th className="px-3.5 py-2.5 text-center">Colegiado</th>
                              <th className="px-3.5 py-2.5 text-center">Expediente</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {registrosPreview.map((row) => {
                              const esCriterio = Number(row.alerta_por_criterio_clinico) === 1;
                              const esEdadCritica =
                                Number(row.edad) >= 10 && Number(row.edad) <= 14;
                              const nivel = clasificarNivelRiesgo(
                                Number(row.puntaje_total_consulta),
                                esCriterio,
                                Number(row.riesgo_25_plus) === 1
                              );

                              return (
                                <tr
                                  key={`${row.consulta_id || 0}-${row.paciente_id}`}
                                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                                >
                                  <td className="px-3.5 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {row.folio || "—"}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate max-w-[200px]">
                                        {row.nombre_completo || "Sin nombre"}
                                      </span>
                                      {esEdadCritica && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40">
                                          ⚠ {row.edad}a
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 hidden sm:table-cell truncate max-w-[140px]">
                                    {row.region || "—"}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 hidden md:table-cell truncate max-w-[220px]">
                                    {row.unidad || "—"}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                                    {formatDate(row.fecha_consulta || row.consulta_creada)}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right">
                                    {esCriterio ? (
                                      <span
                                        className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/40"
                                        title={row.motivo_alerta || "Criterio clínico"}
                                      >
                                        {row.motivo_alerta || "Criterio clínico"}
                                      </span>
                                    ) : nivel === "MUY ALTO" ? (
                                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold font-mono bg-rose-100 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-400/40">
                                        {row.puntaje_total_consulta} pts · MUY ALTO
                                      </span>
                                    ) : nivel === "ALTO" ? (
                                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold font-mono bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/40">
                                        {row.puntaje_total_consulta} pts · ALTO
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold font-mono bg-emerald-100 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-400/40">
                                        {row.puntaje_total_consulta} pts · BAJO
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center">
                                    {nivel !== "MUY ALTO" ? (
                                      <span className="text-[10px] text-slate-400 italic">N/A</span>
                                    ) : Number(row.colegiado) === 1 ? (
                                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40">
                                        <i className="fa-solid fa-check text-[9px]" />
                                        <span>Sí</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                        <span>No</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center">
                                    <Link
                                      href={`/estatal/pacientes/${row.paciente_id}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 transition"
                                    >
                                      <span>Ver</span>
                                      <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginación de la vista previa */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <span>
                          Página <strong className="text-slate-800 dark:text-white">{previewPage}</strong> de{" "}
                          <strong className="text-slate-800 dark:text-white">{totalPreviewPages}</strong> ({registrosReporte.length} registros)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={previewPage <= 1}
                            onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer font-semibold"
                          >
                            Anterior
                          </button>
                          <button
                            type="button"
                            disabled={previewPage >= totalPreviewPages}
                            onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                            className="px-3 py-1 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer font-semibold"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
