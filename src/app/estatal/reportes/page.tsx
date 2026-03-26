"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
};

type PuntoSerie = {
  label: string;
  value: number;
};

function formatDate(value: string | null) {
  if (!value) return "-";
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

function Card({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

function BarList({ title, items, tone = "cyan" }: { title: string; items: PuntoSerie[]; tone?: "cyan" | "emerald" | "amber" }) {
  const maxValue = Math.max(...items.map((x) => x.value), 1);
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/40"
      : tone === "amber"
        ? "bg-amber-500/40"
        : "bg-cyan-500/40";

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos para mostrar.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1 gap-2">
                <span className="truncate">{item.label}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
              <div className="h-2 w-full rounded bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${toneClass}`}
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
  const bottomMargin = 24;
  const padding = 12;
  const max = Math.max(...points.map((p) => p.value), 1);

  // Extract month/year from first point
  const getMonthLabel = () => {
    if (points.length === 0) return "";
    const [year, month, day] = points[0].label.split("-");
    if (!year || !month) return "";
    const monthNum = parseInt(month);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${monthNames[monthNum - 1]} ${year}`;
  };

  const formatDayOnly = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!day) return value;
    return String(parseInt(day)); // Remove leading zero
  };

  const formatFullDate = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${parseInt(day)}/${month}`;
  };

  const plotWidth = width - leftMargin - padding;
  const plotHeight = height - bottomMargin - padding * 2;

  const coords = points.map((p, i) => {
    const x = leftMargin + (i * plotWidth) / Math.max(points.length - 1, 1);
    const y = padding + (1 - p.value / max) * plotHeight;
    return { x, y, value: p.value, label: p.label };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  
  // Create gradient area
  const areaPoints = [
    `${coords[0].x},${height - bottomMargin}`,
    ...coords.map((c) => `${c.x},${c.y}`),
    `${coords[coords.length - 1].x},${height - bottomMargin}`,
  ].join(" ");

  const tickIndexes = points.length <= 7
    ? points.map((_, index) => index)
    : [0, 2, 4, 6, 8, 10, 12, points.length - 1];
  const uniqueTickIndexes = Array.from(new Set(tickIndexes)).filter((index) => index >= 0 && index < points.length);

  // Y-axis value labels
  const yAxisValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = Math.round(ratio * max);
    const guideY = padding + (1 - ratio) * plotHeight;
    return { value, y: guideY };
  });

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-xs text-slate-400">{getMonthLabel()}</span>
      </div>
      {points.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos para mostrar.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minHeight: "280px" }}>
            {/* Y-axis gridlines with values */}
            {yAxisValues.map(({ value, y }) => (
              <g key={`y-guide-${value}`}>
                <line
                  x1={leftMargin}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={leftMargin - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontWeight="500"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* Axes */}
            <line x1={leftMargin} y1={padding} x2={leftMargin} y2={height - bottomMargin} stroke="#64748b" strokeWidth="2" />
            <line x1={leftMargin} y1={height - bottomMargin} x2={width - padding} y2={height - bottomMargin} stroke="#64748b" strokeWidth="2" />

            {/* Y-axis label */}
            <text x="8" y={height / 2} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="500" transform={`rotate(-90 8 ${height / 2})`}>
              Casos
            </text>

            {/* Gradient area under line */}
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon fill="url(#areaGradient)" points={areaPoints} />

            {/* Line */}
            <polyline fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={polyline} />

            {/* Data points */}
            {coords.map((c) => (
              <g key={`${c.label}-${c.value}`}>
                <circle cx={c.x} cy={c.y} r="4" fill="#06b6d4" />
                <circle cx={c.x} cy={c.y} r="6" fill="#06b6d4" fillOpacity="0.2" />
                <title>{`${formatFullDate(c.label)}: ${c.value} casos`}</title>
              </g>
            ))}
          </svg>

          {/* X-axis labels: days only */}
          <div className="mt-4 flex items-start justify-between gap-1 text-[10px] text-slate-400 px-1">
            {uniqueTickIndexes.map((index) => (
              <div key={`tick-${points[index].label}`} className="min-w-0 flex-1 text-center">
                <div className="font-semibold text-slate-200">{formatDayOnly(points[index].label)}</div>
                <div className="mt-0.5 text-slate-500">{points[index].value}</div>
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

    const handleWindowFocus = () => {
      loadReportes(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadReportes(true);
      }
    };

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === "maro:colegiado-updated" || event.key === "maro:estatal-riesgo-updated") {
        loadReportes(true);
      }
    };

    const handleCustomSync = () => {
      loadReportes(true);
    };

    const intervalId = window.setInterval(() => {
      loadReportes(true);
    }, 15000);

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
      const matchRegion = !regionFilter || String(r.region || "").toLowerCase() === regionFilter.toLowerCase();
      const matchUnidad = !unidadFilter || String(r.unidad || "").toLowerCase() === unidadFilter.toLowerCase();
      return matchRegion && matchUnidad;
    });
  }, [registros, regionFilter, unidadFilter]);

  const kpis = useMemo(() => {
    const total = registrosFiltrados.length;
    const colegiados = registrosFiltrados.filter((r) => Number(r.colegiado) === 1).length;
    const pendientes = total - colegiados;
    const scores = registrosFiltrados
      .filter((r) => Number(r.alerta_por_criterio_clinico) !== 1)
      .map((r) => Number(r.puntaje_total_consulta) || 0);
    const promedio = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
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

  const bgStyle = {
    backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,118,110,0.6)), url(/maro_back_estatal.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat" as const,
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen relative text-slate-100" style={bgStyle}>
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative min-h-screen flex items-center justify-center">Validando acceso estatal...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative text-slate-100" style={bgStyle}>
      <div className="absolute inset-0 bg-black/45" aria-hidden />

      <div className="relative max-w-7xl mx-auto space-y-6 p-6 lg:p-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Nivel estatal</p>
            <h1 className="text-3xl font-bold">Modulo de graficos y reportes</h1>
            <p className="text-slate-300/80">Vista analitica de pacientes con riesgo alto y seguimiento colegiado</p>
          </div>
          <div className="flex gap-2">
            <Link href="/estatal" className="text-sm px-3 py-1.5 rounded-full border border-slate-600 hover:border-slate-400">
              Volver a estatal
            </Link>
            <Link href="/colegiados" className="text-sm px-3 py-1.5 rounded-full border border-emerald-500/50 text-emerald-200 hover:border-emerald-300">
              Ver colegiados
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setUnidadFilter("");
              }}
              className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Todas las regiones</option>
              {regionesDisponibles.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <select
              value={unidadFilter}
              onChange={(e) => setUnidadFilter(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Todas las unidades</option>
              {unidadesDisponibles.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setRegionFilter("");
                setUnidadFilter("");
              }}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-slate-400"
            >
              Limpiar filtros
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Registros considerados: {registrosFiltrados.length} de {registros.length}
            {ultimoRegistro ? ` · Ultimo registro: ${formatDate(ultimoRegistro.fecha_consulta || ultimoRegistro.consulta_creada)}` : ""}
          </p>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            Cargando reportes estatales...
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-red-500/40 bg-red-900/20 p-6 text-red-200">
            {error}
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Card title="Casos alto riesgo" value={String(kpis.total)} />
              <Card title="Colegiados" value={String(kpis.colegiados)} />
              <Card title="Pendientes" value={String(kpis.pendientes)} />
              <Card title="Tasa colegiado" value={`${kpis.tasaColegiado}%`} />
              <Card title="Puntaje promedio (sin criterio clinico)" value={`${kpis.promedio}`} />
              <Card title="Puntaje mediana (sin criterio clinico)" value={`${kpis.mediana}`} />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <LineChart title="Tendencia de casos (ultimos 14 dias)" points={tendencia14dias} />
              <BarList title="Distribucion de puntaje" items={distribucionPuntaje} tone="amber" />
              <BarList title="Top regiones con mayor volumen" items={topRegiones} tone="cyan" />
              <BarList title="Top unidades con mayor volumen" items={topUnidades} tone="emerald" />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
