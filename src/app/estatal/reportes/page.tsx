"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

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

type PuntoSerie = {
  label: string;
  value: number;
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

function Card({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  tone?: "default" | "emerald" | "amber" | "rose" | "cyan" | "teal";
}) {
  const toneMap = {
    default: {
      border: "border-slate-200/80 dark:border-white/10",
      iconBg: "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300",
      valText: "text-slate-900 dark:text-white",
    },
    emerald: {
      border: "border-emerald-300/80 dark:border-emerald-500/30",
      iconBg: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      valText: "text-emerald-700 dark:text-emerald-300",
    },
    amber: {
      border: "border-amber-300/80 dark:border-amber-500/30",
      iconBg: "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
      valText: "text-amber-700 dark:text-amber-300",
    },
    rose: {
      border: "border-rose-300/80 dark:border-rose-500/30",
      iconBg: "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
      valText: "text-rose-700 dark:text-rose-300",
    },
    cyan: {
      border: "border-cyan-300/80 dark:border-cyan-500/30",
      iconBg: "bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
      valText: "text-cyan-700 dark:text-cyan-300",
    },
    teal: {
      border: "border-teal-300/80 dark:border-teal-500/30",
      iconBg: "bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400",
      valText: "text-teal-700 dark:text-teal-300",
    },
  };

  const style = toneMap[tone] || toneMap.default;

  return (
    <div
      className={`rounded-2xl border ${style.border} bg-white/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between transition-all hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>
        {icon && (
          <div
            className={`w-8 h-8 rounded-xl ${style.iconBg} flex items-center justify-center text-xs shrink-0`}
          >
            <i className={`fa-solid ${icon}`} />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className={`text-2xl sm:text-3xl font-black tracking-tight ${style.valText}`}>{value}</p>
        {subtitle && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function BarList({
  title,
  items,
  tone = "cyan",
}: {
  title: string;
  items: PuntoSerie[];
  tone?: "cyan" | "emerald" | "amber";
}) {
  const maxValue = Math.max(...items.map((x) => x.value), 1);
  const toneClass =
    tone === "emerald"
      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
      : tone === "amber"
      ? "bg-gradient-to-r from-amber-500 to-orange-400"
      : "bg-gradient-to-r from-cyan-500 to-blue-500";

  return (
    <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-cyan-500"
          }`}
        />
        <span>{title}</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos para mostrar.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 gap-2">
                <span className="truncate font-medium">{item.label}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {item.value}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${toneClass}`}
                  style={{ width: `${Math.max((item.value / maxValue) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LineChart({ title, points }: { title: string; points: PuntoSerie[] }) {
  const width = 680;
  const height = 280;
  const leftMargin = 48;
  const bottomMargin = 28;
  const padding = 12;
  const max = Math.max(...points.map((p) => p.value), 1);

  const getMonthLabel = () => {
    if (points.length === 0) return "";
    const [year, month] = points[0].label.split("-");
    if (!year || !month) return "";
    const monthNum = parseInt(month, 10);
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return `${monthNames[monthNum - 1] || ""} ${year}`;
  };

  const formatDayOnly = (value: string) => {
    const parts = value.split("-");
    const day = parts[2];
    if (!day) return value;
    return String(parseInt(day, 10));
  };

  const formatFullDate = (value: string) => {
    const parts = value.split("-");
    const month = parts[1];
    const day = parts[2];
    if (!month || !day) return value;
    return `${parseInt(day, 10)}/${month}`;
  };

  const plotWidth = width - leftMargin - padding;
  const plotHeight = height - bottomMargin - padding * 2;

  const coords = points.map((p, i) => {
    const x = leftMargin + (i * plotWidth) / Math.max(points.length - 1, 1);
    const y = padding + (1 - p.value / max) * plotHeight;
    return { x, y, value: p.value, label: p.label };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  const areaPoints =
    coords.length > 0
      ? [
          `${coords[0].x},${height - bottomMargin}`,
          ...coords.map((c) => `${c.x},${c.y}`),
          `${coords[coords.length - 1].x},${height - bottomMargin}`,
        ].join(" ")
      : "";

  const tickIndexes =
    points.length <= 7
      ? points.map((_, index) => index)
      : [0, 2, 4, 6, 8, 10, 12, points.length - 1];
  const uniqueTickIndexes = Array.from(new Set(tickIndexes)).filter(
    (index) => index >= 0 && index < points.length
  );

  const yAxisValues = [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
    const value = Math.round(ratio * max);
    const guideY = padding + (1 - ratio) * plotHeight;
    return { id: `y-guide-${index}-${value}`, value, y: guideY };
  });

  return (
    <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          <span>{title}</span>
        </h2>
        <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/20">
          {getMonthLabel()}
        </span>
      </div>
      {points.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos para mostrar.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minHeight: "260px" }}>
            {yAxisValues.map(({ id, value, y }) => (
              <g key={id}>
                <line
                  x1={leftMargin}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={leftMargin - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  className="text-slate-400 dark:text-slate-500 font-mono"
                  fontWeight="500"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* Axes */}
            <line
              x1={leftMargin}
              y1={padding}
              x2={leftMargin}
              y2={height - bottomMargin}
              stroke="currentColor"
              className="text-slate-300 dark:text-slate-700"
              strokeWidth="2"
            />
            <line
              x1={leftMargin}
              y1={height - bottomMargin}
              x2={width - padding}
              y2={height - bottomMargin}
              stroke="currentColor"
              className="text-slate-300 dark:text-slate-700"
              strokeWidth="2"
            />

            {/* Y-axis label */}
            <text
              x="12"
              y={height / 2}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              className="text-slate-400 dark:text-slate-500 font-bold"
              transform={`rotate(-90 12 ${height / 2})`}
            >
              Casos
            </text>

            {/* Gradient area */}
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {areaPoints && <polygon fill="url(#areaGradient)" points={areaPoints} />}

            {/* Polyline */}
            <polyline
              fill="none"
              stroke="#0891b2"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polyline}
            />

            {/* Data points */}
            {coords.map((c) => (
              <g key={`${c.label}-${c.value}`}>
                <circle cx={c.x} cy={c.y} r="4" fill="#0891b2" />
                <circle cx={c.x} cy={c.y} r="7" fill="#0891b2" fillOpacity="0.2" />
                <title>{`${formatFullDate(c.label)}: ${c.value} casos`}</title>
              </g>
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="mt-3 flex items-start justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400 px-1">
            {uniqueTickIndexes.map((index) => (
              <div key={`tick-${points[index].label}`} className="min-w-0 flex-1 text-center">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {formatDayOnly(points[index].label)}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                  {points[index].value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function ReportesEstatalesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroRiesgo[]>([]);
  const [regionFilter, setRegionFilter] = useState("");
  const [unidadFilter, setUnidadFilter] = useState("");
  const [colegiadoFilter, setColegiadoFilter] = useState<"todos" | "colegiados" | "no_colegiados">(
    "todos"
  );
  const [origenFilter, setOrigenFilter] = useState<"todos" | "puntaje" | "criterio">("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingClinico, setExportingClinico] = useState(false);
  const [exportingCompleto, setExportingCompleto] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadReportes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/estatal/riesgo?limit=1000", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el concentrado estatal");
      const data = (await res.json()) as RegistroRiesgo[];
      setRegistros(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Error desconocido");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      const matchRegion =
        !regionFilter || String(r.region || "").toLowerCase() === regionFilter.toLowerCase();
      const matchUnidad =
        !unidadFilter || String(r.unidad || "").toLowerCase() === unidadFilter.toLowerCase();
      return matchRegion && matchUnidad;
    });
  }, [registros, regionFilter, unidadFilter]);

  const registrosReporte = useMemo(() => {
    return registrosFiltrados.filter((r) => {
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

      return matchColegiado && matchOrigen && matchDesde && matchHasta;
    });
  }, [registrosFiltrados, colegiadoFilter, origenFilter, fechaDesde, fechaHasta]);

  const previewLimit = 20;
  const registrosPreview = useMemo(
    () => registrosReporte.slice(0, previewLimit),
    [registrosReporte]
  );

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
      a.download = `reporte-estatal-casos-${stamp}.xlsx`;
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
        topRegiones,
        topUnidades,
        distribucionPuntaje,
        tendencia14dias,
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

  const kpis = useMemo(() => {
    const total = registrosFiltrados.length;
    const colegiados = registrosFiltrados.filter((r) => Number(r.colegiado) === 1).length;
    const pendientes = total - colegiados;
    const scores = registrosFiltrados
      .filter((r) => Number(r.alerta_por_criterio_clinico) !== 1)
      .map((r) => Number(r.puntaje_total_consulta) || 0);
    const promedio = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
    const med = scores.length ? Math.round(median(scores) * 10) / 10 : 0;

    return {
      total,
      colegiados,
      pendientes,
      promedio,
      mediana: med,
      tasaColegiado: total ? Math.round((colegiados / total) * 1000) / 10 : 0,
    };
  }, [registrosFiltrados]);

  const topRegiones = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of registrosFiltrados) {
      const key = String(r.region || "SIN REGION");
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [registrosFiltrados]);

  const topUnidades = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of registrosFiltrados) {
      const key = String(r.unidad || "SIN UNIDAD");
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [registrosFiltrados]);

  const distribucionPuntaje = useMemo(() => {
    const buckets = [
      { label: "25-29", min: 25, max: 29, count: 0 },
      { label: "30-34", min: 30, max: 34, count: 0 },
      { label: "35-39", min: 35, max: 39, count: 0 },
      { label: "40+", min: 40, max: Number.POSITIVE_INFINITY, count: 0 },
    ];

    for (const r of registrosFiltrados) {
      const s = Number(r.puntaje_total_consulta) || 0;
      const bucket = buckets.find((b) => s >= b.min && s <= b.max);
      if (bucket) bucket.count += 1;
    }

    return buckets.map((b) => ({ label: b.label, value: b.count }));
  }, [registrosFiltrados]);

  const tendencia14dias = useMemo(() => {
    const dias: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dias.push(dateKey(d.toISOString()));
    }

    const counts = new Map<string, number>();
    dias.forEach((d) => counts.set(d, 0));

    for (const r of registrosFiltrados) {
      const key = dateKey(r.fecha_consulta || r.consulta_creada || null);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    return dias.map((d) => ({ label: d, value: counts.get(d) || 0 }));
  }, [registrosFiltrados]);

  const ultimoRegistro = useMemo(() => {
    if (registrosFiltrados.length === 0) return null;
    const sorted = [...registrosFiltrados].sort((a, b) => {
      const aTs = new Date(a.consulta_creada || a.fecha_consulta || 0).getTime();
      const bTs = new Date(b.consulta_creada || b.fecha_consulta || 0).getTime();
      return bTs - aTs;
    });
    return sorted[0];
  }, [registrosFiltrados]);

  if (!authChecked) {
    return (
      <main className="min-h-screen relative flex items-center justify-center bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-white transition-colors duration-300">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 dark:hidden"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(248, 250, 252, 0.78), rgba(204, 251, 241, 0.60)), url(/maro-hero.png)",
          }}
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 hidden dark:block"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(6, 78, 59, 0.60)), url(/maro-hero.png)",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300">
            Validando acceso estatal...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative text-slate-800 dark:text-white transition-colors duration-300">
      {/* CAPA DE FONDO FIJA - MODO CLARO */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 dark:hidden"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(248, 250, 252, 0.78), rgba(204, 251, 241, 0.60)), url(/maro-hero.png)",
        }}
        aria-hidden="true"
      />

      {/* CAPA DE FONDO FIJA - MODO OSCURO */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 hidden dark:block"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(6, 78, 59, 0.60)), url(/maro-hero.png)",
        }}
        aria-hidden="true"
      />

      {/* PATRÓN CLÍNICO DE PUNTOS / RETÍCULA SUTIL */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #059669 1.1px, transparent 1.1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ENCABEZADO */}
        <header className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
              <i className="fa-solid fa-chart-pie text-[11px]" />
              <span>NIVEL ESTATAL · INTELIGENCIA EPIDEMIOLÓGICA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Módulo de Gráficos y Reportes
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Vista analítica de pacientes con riesgo alto obstétrico y seguimiento colegiado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/estatal"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm"
            >
              <i className="fa-solid fa-arrow-left" />
              <span>Volver a estatal</span>
            </Link>
            <Link
              href="/colegiados"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition shadow-sm"
            >
              <i className="fa-solid fa-users-viewfinder text-emerald-600 dark:text-emerald-400" />
              <span>Ver colegiados</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* FILTROS Y DESCARGA */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Región
              </label>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setUnidadFilter("");
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Unidad Médica
              </label>
              <select
                value={unidadFilter}
                onChange={(e) => setUnidadFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="">Todas las unidades</option>
                {unidadesDisponibles.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setRegionFilter("");
                  setUnidadFilter("");
                  setColegiadoFilter("todos");
                  setOrigenFilter("todos");
                  setFechaDesde("");
                  setFechaHasta("");
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <i className="fa-solid fa-filter-circle-xmark" />
                <span>Limpiar filtros</span>
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-slate-200/70 dark:border-white/10">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Colegiados
              </label>
              <select
                value={colegiadoFilter}
                onChange={(e) =>
                  setColegiadoFilter(e.target.value as "todos" | "colegiados" | "no_colegiados")
                }
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="todos">Todos los casos</option>
                <option value="colegiados">Solo colegiados</option>
                <option value="no_colegiados">Solo no colegiados</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Origen de Alerta
              </label>
              <select
                value={origenFilter}
                onChange={(e) =>
                  setOrigenFilter(e.target.value as "todos" | "puntaje" | "criterio")
                }
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="todos">Todos los orígenes</option>
                <option value="puntaje">Alerta por puntaje</option>
                <option value="criterio">Alerta por criterio clínico</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Fecha Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* Opciones de descarga */}
          <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-cloud-arrow-down text-cyan-500" />
                <span>Opciones de Exportación y Descarga</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Casos filtrados para exportación:{" "}
                <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                  {registrosReporte.length}
                </span>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={descargarExcel}
                disabled={exportingExcel}
                className="flex flex-col items-start rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-left transition hover:border-emerald-500/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-1">
                  <i className="fa-solid fa-file-excel text-emerald-600 dark:text-emerald-400" />
                  <span>{exportingExcel ? "Generando..." : "Excel Estándar"}</span>
                </div>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
                  Resumen de los casos de la tabla con los filtros actuales aplicados.
                </p>
              </button>

              <button
                type="button"
                onClick={descargarReporteClinico}
                disabled={exportingClinico}
                className="flex flex-col items-start rounded-2xl border border-teal-500/30 bg-teal-50 dark:bg-teal-950/40 p-4 text-left transition hover:border-teal-500/60 hover:bg-teal-100 dark:hover:bg-teal-900/50 disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm mb-1">
                  <i className="fa-solid fa-file-medical text-teal-600 dark:text-teal-400" />
                  <span>{exportingClinico ? "Generando..." : "Excel Clínico"}</span>
                </div>
                <p className="text-[11px] text-teal-700/80 dark:text-teal-300/70">
                  Detalles médicos, factores de riesgo y parámetros clínicos completos.
                </p>
              </button>

              <button
                type="button"
                onClick={descargarReporteCompleto}
                disabled={exportingCompleto}
                className="flex flex-col items-start rounded-2xl border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40 p-4 text-left transition hover:border-cyan-500/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-bold text-sm mb-1">
                  <i className="fa-solid fa-database text-cyan-600 dark:text-cyan-400" />
                  <span>{exportingCompleto ? "Generando..." : "Base de Datos (SQL)"}</span>
                </div>
                <p className="text-[11px] text-cyan-700/80 dark:text-cyan-300/70">
                  Toda la sábana de datos en crudo para cruces analíticos y auditoría.
                </p>
              </button>

              <button
                type="button"
                onClick={descargarPdf}
                disabled={exportingPdf}
                className="flex flex-col items-start rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 p-4 text-left transition hover:border-amber-500/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm mb-1">
                  <i className="fa-solid fa-file-pdf text-amber-600 dark:text-amber-400" />
                  <span>{exportingPdf ? "Generando..." : "Documento PDF"}</span>
                </div>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70">
                  Formato formal oficial para impresión o presentación ejecutiva.
                </p>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/50 dark:border-white/5">
            <span>
              Registros considerados: <strong>{registrosFiltrados.length}</strong> de{" "}
              {registros.length}
            </span>
            {ultimoRegistro && (
              <span>
                Último registro procesado:{" "}
                <strong>
                  {formatDate(ultimoRegistro.fecha_consulta || ultimoRegistro.consulta_creada)}
                </strong>
              </span>
            )}
          </div>
        </section>

        {/* CONTENIDO PRINCIPAL */}
        {loading ? (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-12 text-center space-y-3 backdrop-blur-xl shadow-xl">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent" />
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              Cargando reportes y analítica estatal...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-300/80 dark:border-rose-500/40 bg-rose-50/80 dark:bg-rose-900/20 p-6 text-center space-y-3 backdrop-blur-xl shadow-xl">
            <p className="text-sm text-rose-700 dark:text-rose-200 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => loadReportes(false)}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* VISTA PREVIA DE CASOS A EXPORTAR (ACORDEÓN) */}
            <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-table-list" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 dark:text-white block">
                      Vista previa de casos a exportar
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Muestra rápida de expedientes según filtros activos
                    </span>
                  </div>
                  <span className="ml-2 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                    {registrosReporte.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {previewOpen && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                      Mostrando {registrosPreview.length} de {registrosReporte.length}
                    </span>
                  )}
                  <i
                    className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
                      previewOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {previewOpen && (
                <div className="border-t border-slate-200/80 dark:border-white/10 p-4">
                  {registrosReporte.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                      No hay casos que coincidan con los filtros actuales.
                    </p>
                  ) : (
                    <div className="overflow-y-auto max-h-80">
                      <table className="w-full table-fixed text-xs text-left">
                        <thead className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-white/10">
                          <tr>
                            <th className="w-[155px] px-3.5 py-2.5">Folio</th>
                            <th className="min-w-[170px] px-3.5 py-2.5">Paciente</th>
                            <th className="w-[130px] px-3.5 py-2.5 hidden sm:table-cell">Región</th>
                            <th className="w-[160px] px-3.5 py-2.5 hidden md:table-cell">Unidad</th>
                            <th className="w-[105px] px-3.5 py-2.5 text-center">Fecha</th>
                            <th className="w-[130px] px-3.5 py-2.5 text-center">Origen</th>
                            <th className="min-w-[140px] px-3.5 py-2.5 hidden lg:table-cell">
                              Motivo
                            </th>
                            <th className="w-[90px] px-3.5 py-2.5 text-right">Puntaje</th>
                            <th className="w-[85px] px-3.5 py-2.5 text-center">Colegiado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                          {registrosPreview.map((row) => {
                            const esCriterio = Number(row.alerta_por_criterio_clinico) === 1;
                            return (
                              <tr
                                key={`${row.consulta_id}-${row.paciente_id}`}
                                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                              >
                                <td className="w-[155px] px-3.5 py-2.5 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                                  <span className="truncate block" title={row.folio || "—"}>
                                    {row.folio || "—"}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white">
                                  <span
                                    className="truncate block"
                                    title={row.nombre_completo || "Sin nombre"}
                                  >
                                    {row.nombre_completo || "Sin nombre"}
                                  </span>
                                </td>
                                <td
                                  className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 hidden sm:table-cell truncate"
                                  title={row.region || "—"}
                                >
                                  <span className="truncate block">{row.region || "—"}</span>
                                </td>
                                <td
                                  className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 hidden md:table-cell truncate"
                                  title={row.unidad || "—"}
                                >
                                  <span className="truncate block">{row.unidad || "—"}</span>
                                </td>
                                <td className="px-3.5 py-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                                  {formatDate(row.fecha_consulta || row.consulta_creada)}
                                </td>
                                <td className="px-3.5 py-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                      esCriterio
                                        ? "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40"
                                        : "bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/40"
                                    }`}
                                  >
                                    <i
                                      className={`fa-solid ${
                                        esCriterio ? "fa-stethoscope" : "fa-chart-line"
                                      } text-[9px]`}
                                    />
                                    <span>{esCriterio ? "Criterio clínico" : "Puntaje"}</span>
                                  </span>
                                </td>
                                <td
                                  className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 hidden lg:table-cell truncate text-[11px]"
                                  title={
                                    row.motivo_alerta || (esCriterio ? "Edad/Padecimiento" : "—")
                                  }
                                >
                                  <span className="truncate block">
                                    {row.motivo_alerta || (esCriterio ? "Edad/Padecimiento" : "—")}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 text-right">
                                  {esCriterio ? (
                                    <span className="text-slate-400 font-mono">—</span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-black bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40 font-mono">
                                      {Number(row.puntaje_total_consulta) || 0} pts
                                    </span>
                                  )}
                                </td>
                                <td className="px-3.5 py-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                      Number(row.colegiado) === 1
                                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                                    }`}
                                  >
                                    <i
                                      className={`fa-solid ${
                                        Number(row.colegiado) === 1 ? "fa-check" : "fa-minus"
                                      } text-[9px]`}
                                    />
                                    <span>{Number(row.colegiado) === 1 ? "Sí" : "No"}</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SECCIÓN DE TARJETAS KPIS */}
            <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              <Card
                title="Alto Riesgo"
                value={String(kpis.total)}
                subtitle="Prioridad de atención"
                icon="fa-triangle-exclamation"
                tone="rose"
              />
              <Card
                title="Colegiados"
                value={String(kpis.colegiados)}
                subtitle="Con plan acordado"
                icon="fa-user-check"
                tone="emerald"
              />
              <Card
                title="Pendientes"
                value={String(kpis.pendientes)}
                subtitle="Sin plan colegiado"
                icon="fa-clock"
                tone="amber"
              />
              <Card
                title="Tasa Colegiado"
                value={`${kpis.tasaColegiado}%`}
                subtitle="Cobertura de casos"
                icon="fa-chart-pie"
                tone="cyan"
              />
              <Card
                title="Promedio Score"
                value={`${kpis.promedio}`}
                subtitle="Puntaje sin criterio"
                icon="fa-calculator"
                tone="teal"
              />
              <Card
                title="Mediana Score"
                value={`${kpis.mediana}`}
                subtitle="Puntaje sin criterio"
                icon="fa-chart-simple"
                tone="default"
              />
            </section>

            {/* SECCIÓN DE GRÁFICOS */}
            <section className="grid gap-5 xl:grid-cols-2">
              <LineChart title="Tendencia de casos (últimos 14 días)" points={tendencia14dias} />
              <BarList title="Distribución de puntaje" items={distribucionPuntaje} tone="amber" />
              <BarList title="Top regiones con mayor volumen" items={topRegiones} tone="cyan" />
              <BarList title="Top unidades con mayor volumen" items={topUnidades} tone="emerald" />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
