"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type SessionInfo = {
  nivel?: number;
  region?: string;
  displayName?: string;
};

type CasoColegiadoRegion = {
  consulta_id: number;
  paciente_id: number;
  folio: string | null;
  nombre_completo: string | null;
  region: string | null;
  municipio: string | null;
  unidad: string | null;
  clues_id: string | null;
  fecha_consulta: string | null;
  puntaje_total_consulta: number | null;
  riesgo_25_plus: 0 | 1;
  fecha_colegiado: string | null;
  plan_id: number | null;
  plan_estatus: "borrador" | "completo";
  acciones_total: number;
  acciones_cumplidas: number;
  plan_actualizado_en: string | null;
};

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  if (!includeTime) return `${dd}-${mm}-${yyyy}`;
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

export default function RegionColegiadosPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [casos, setCasos] = useState<CasoColegiadoRegion[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [municipioFilter, setMunicipioFilter] = useState("");
  const [estatusFilter, setEstatusFilter] = useState<"todos" | "completo" | "borrador">("todos");

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/region/colegiados", { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || "Error al cargar los casos colegiados regionales");
      }
      const data = await res.json();
      setCasos(Array.isArray(data) ? data : []);
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
      const parsed = JSON.parse(stored) as SessionInfo;
      if ((parsed.nivel ?? 0) < 2) {
        router.replace("/dashboard");
        return;
      }
      if ((parsed.nivel ?? 0) >= 3) {
        router.replace("/colegiados");
        return;
      }
      setSession(parsed);
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadData();
  }, [authChecked, loadData]);

  // Sincronización al volver a enfocar la ventana o recibir eventos de actualización
  useEffect(() => {
    if (!authChecked) return;
    const handleFocus = () => loadData(true);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "maro:colegiado-updated") loadData(true);
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [authChecked, loadData]);

  // Lista de municipios únicos
  const municipios = useMemo(() => {
    const set = new Set<string>();
    casos.forEach((c) => {
      if (c.municipio?.trim()) set.add(c.municipio.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [casos]);

  // Filtrado reactivo
  const filtered = useMemo(() => {
    return casos.filter((c) => {
      // Filtro de texto
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const matchNombre = String(c.nombre_completo || "").toLowerCase().includes(q);
        const matchFolio = String(c.folio || "").toLowerCase().includes(q);
        const matchClues = String(c.clues_id || "").toLowerCase().includes(q);
        const matchUnidad = String(c.unidad || "").toLowerCase().includes(q);
        if (!matchNombre && !matchFolio && !matchClues && !matchUnidad) return false;
      }

      // Filtro de municipio
      if (municipioFilter && c.municipio !== municipioFilter) {
        return false;
      }

      // Filtro de estatus de plan
      if (estatusFilter !== "todos" && c.plan_estatus !== estatusFilter) {
        return false;
      }

      return true;
    });
  }, [casos, busqueda, municipioFilter, estatusFilter]);

  // Métricas agregadas
  const metricas = useMemo(() => {
    const total = casos.length;
    const completos = casos.filter((c) => c.plan_estatus === "completo").length;
    const borradores = total - completos;
    const criticos = casos.filter((c) => (Number(c.puntaje_total_consulta) || 0) >= 25 || c.riesgo_25_plus === 1).length;
    const totalAcciones = casos.reduce((acc, c) => acc + (Number(c.acciones_total) || 0), 0);
    const cumplidas = casos.reduce((acc, c) => acc + (Number(c.acciones_cumplidas) || 0), 0);
    const pendientes = totalAcciones - cumplidas;
    const pctCumplimiento = totalAcciones > 0 ? Math.round((cumplidas / totalAcciones) * 100) : 0;

    return {
      total,
      completos,
      borradores,
      criticos,
      totalAcciones,
      cumplidas,
      pendientes,
      pctCumplimiento,
    };
  }, [casos]);

  const tieneFiltros = Boolean(busqueda || municipioFilter || estatusFilter !== "todos");

  const limpiarFiltros = () => {
    setBusqueda("");
    setMunicipioFilter("");
    setEstatusFilter("todos");
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-spinner fa-spin text-emerald-600 dark:text-emerald-400 text-xl" />
          <span className="text-sm font-semibold">Validando acceso regional...</span>
        </div>
      </main>
    );
  }

  const regionNombre = session?.region || "Región Sanitaria";

  return (
    <main className="min-h-screen relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* CAPA DECORATIVA DE FONDO */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-25"
        style={{
          backgroundImage: "radial-gradient(circle, #059669 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ENCABEZADO SUPERIOR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.22em] font-extrabold text-emerald-700 dark:text-emerald-400">
                Nivel Regional · MARO Hub
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60">
                <i className="fa-solid fa-map-location-dot text-[11px]" />
                <span>{regionNombre}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-users-viewfinder text-emerald-600 dark:text-emerald-400" />
              <span>Casos Colegiados de la Región</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Vigilancia, dictamen de planes de acción y seguimiento de acuerdos clínicos y zonales
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              title="Refrescar listado"
            >
              <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <Link
              href="/region"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-800 dark:text-white shadow-sm transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-emerald-600 dark:text-emerald-400" />
              <span>Tablero Regional</span>
            </Link>
          </div>
        </header>

        {/* TARJETAS KPI DE RESUMEN EJECUTIVO */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Colegiados */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-5 backdrop-blur-xl shadow-lg flex items-center justify-between transition-all">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Colegiados
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {metricas.total}
                </span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {metricas.criticos} en riesgo muy alto
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-users-viewfinder" />
            </div>
          </div>

          {/* Card 2: Planes Completos */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-5 backdrop-blur-xl shadow-lg flex items-center justify-between transition-all">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Planes Completos
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {metricas.completos}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ({metricas.total > 0 ? Math.round((metricas.completos / metricas.total) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-circle-check" />
            </div>
          </div>

          {/* Card 3: Planes en Borrador */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-5 backdrop-blur-xl shadow-lg flex items-center justify-between transition-all">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                En Borrador
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {metricas.borradores}
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  por concluir
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-file-pen" />
            </div>
          </div>

          {/* Card 4: Acciones Cumplidas */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-5 backdrop-blur-xl shadow-lg flex items-center justify-between transition-all">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Acciones Cumplidas
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400">
                  {metricas.cumplidas}/{metricas.totalAcciones}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ({metricas.pctCumplimiento}%)
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-list-check" />
            </div>
          </div>
        </section>

        {/* BARRA DE FILTROS Y CONTROLES */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/75 p-4 sm:p-5 backdrop-blur-xl shadow-lg flex flex-wrap gap-3 items-end">
          {/* Búsqueda por texto */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Buscar Paciente o Caso
            </label>
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, folio, CLUES o unidad médica..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400" />
            </div>
          </div>

          {/* Filtro por Municipio */}
          <div className="min-w-[170px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Municipio
            </label>
            <select
              value={municipioFilter}
              onChange={(e) => setMunicipioFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 cursor-pointer"
            >
              <option value="">Todos los municipios</option>
              {municipios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estatus del Plan */}
          <div className="min-w-[160px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Estatus del Plan
            </label>
            <select
              value={estatusFilter}
              onChange={(e) => setEstatusFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 cursor-pointer"
            >
              <option value="todos">Todos los estatus</option>
              <option value="completo">Completo</option>
              <option value="borrador">En Borrador</option>
            </select>
          </div>

          {/* Botón para Limpiar Filtros */}
          {tieneFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-filter-circle-xmark text-slate-500" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </section>

        {/* TABLA PRINCIPAL DE CASOS COLEGIADOS */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 backdrop-blur-xl shadow-xl overflow-hidden transition-colors">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-table-list text-emerald-600 dark:text-emerald-400" />
              <span>Casos Colegiados Asignados a la Región</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({filtered.length} {filtered.length === 1 ? "caso" : "casos"})
              </span>
            </h2>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Haz clic en cualquier fila para abrir el plan colegiado
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-3 text-slate-600 dark:text-slate-300">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold">Cargando casos colegiados de la región...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-700 dark:text-rose-300 space-y-2">
              <i className="fa-solid fa-triangle-exclamation text-2xl text-rose-600" />
              <p className="font-bold">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-4 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 text-2xl">
                <i className="fa-solid fa-folder-open" />
              </div>
              <p className="font-bold text-base text-slate-800 dark:text-slate-200">
                {casos.length === 0
                  ? "No hay casos colegiados registrados en esta región."
                  : "No se encontraron casos con los filtros seleccionados."}
              </p>
              <p className="text-xs max-w-md mx-auto">
                {casos.length === 0
                  ? "Puedes iniciar un caso colegiado desde el expediente de cualquier paciente con riesgo ≥ 25 pts o criterios clínicos graves."
                  : "Intenta cambiar los términos de búsqueda o limpiar los filtros activos."}
              </p>
              {tieneFiltros && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-filter-circle-xmark" />
                  <span>Restablecer filtros</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold">
                    <th className="px-3 py-3 text-left w-10">#</th>
                    <th className="px-3 py-3 text-left">Folio</th>
                    <th className="px-3 py-3 text-left">Paciente</th>
                    <th className="px-3 py-3 text-left">Unidad Médica / Municipio</th>
                    <th className="px-3 py-3 text-left">Puntaje</th>
                    <th className="px-3 py-3 text-left">Fecha Colegiado</th>
                    <th className="px-3 py-3 text-left">Estatus Plan</th>
                    <th className="px-3 py-3 text-left">Acciones</th>
                    <th className="px-3 py-3 text-right">Acceso Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-transparent">
                  {filtered.map((c, idx) => {
                    const puntaje = Number(c.puntaje_total_consulta) || 0;
                    const esMuyAltoRiesgo = puntaje >= 25 || c.riesgo_25_plus === 1;
                    const progresoPct =
                      c.acciones_total > 0 ? Math.round((c.acciones_cumplidas / c.acciones_total) * 100) : 0;

                    return (
                      <tr
                        key={c.consulta_id}
                        onClick={() => router.push(`/region/colegiados/${c.consulta_id}`)}
                        className="hover:bg-emerald-50/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      >
                        {/* Num */}
                        <td className="px-3 py-3 text-slate-400 font-bold">{idx + 1}</td>

                        {/* Folio */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10">
                            {c.folio || "SIN FOLIO"}
                          </span>
                        </td>

                        {/* Paciente */}
                        <td className="px-3 py-3">
                          <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {c.nombre_completo || "Paciente sin nombre"}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: #{c.paciente_id} · Consulta #{c.consulta_id}
                          </span>
                        </td>

                        {/* Unidad / Municipio */}
                        <td className="px-3 py-3 max-w-[220px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={c.unidad || ""}>
                            {c.unidad || "Sin unidad"}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="truncate">{c.municipio || "—"}</span>
                            {c.clues_id && (
                              <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                ({c.clues_id})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Puntaje */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              esMuyAltoRiesgo
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700/60"
                                : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700/60"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${esMuyAltoRiesgo ? "bg-rose-500" : "bg-amber-500"}`} />
                            <span>{puntaje} pts</span>
                          </span>
                        </td>

                        {/* Fecha Colegiado */}
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {formatDate(c.fecha_colegiado)}
                        </td>

                        {/* Estatus del Plan */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {c.plan_estatus === "completo" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60">
                              <i className="fa-solid fa-check text-[10px]" />
                              <span>Completo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60">
                              <i className="fa-solid fa-clock text-[10px]" />
                              <span>Borrador</span>
                            </span>
                          )}
                        </td>

                        {/* Progreso de Acciones */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {c.acciones_cumplidas}/{c.acciones_total}
                            </span>
                            {c.acciones_total > 0 && (
                              <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    c.acciones_cumplidas === c.acciones_total ? "bg-emerald-500" : "bg-amber-500"
                                  }`}
                                  style={{ width: `${progresoPct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Acciones Rápidas */}
                        <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/region/colegiados/${c.consulta_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                              title="Editar o capturar plan colegiado"
                            >
                              <i className="fa-solid fa-pen-to-square text-[11px]" />
                              <span>Plan</span>
                            </Link>

                            <a
                              href={`/api/colegiados/${c.consulta_id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border border-rose-300 dark:border-rose-700/50 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                              title="Descargar Cédula Oficial (PDF)"
                            >
                              <i className="fa-solid fa-file-pdf text-xs" />
                            </a>

                            <Link
                              href={`/colegiados/${c.consulta_id}/formato`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              title="Ver Vista de Formato Web"
                            >
                              <i className="fa-solid fa-table-list text-xs" />
                            </Link>

                            <Link
                              href={`/region/pacientes/${c.paciente_id}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
                              title="Ver Expediente de la Paciente"
                            >
                              <i className="fa-solid fa-user-doctor text-xs" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
