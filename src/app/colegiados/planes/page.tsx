"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type SessionInfo = {
  nivel?: number;
  displayName?: string;
};

type RegistroColegiado = {
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
  riesgo_25_plus: number;
  fecha_colegiado: string | null;
  plan_id?: number | null;
  plan_estatus?: "borrador" | "completo";
  acciones_total?: number;
  acciones_cumplidas?: number;
  plan_actualizado_en?: string | null;
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

export default function ColegiadosPlanesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroColegiado[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [estatusFilter, setEstatusFilter] = useState<"todos" | "completo" | "borrador">("todos");

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/estatal/colegiados", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el módulo de colegiados");
      const data = (await res.json()) as RegistroColegiado[];
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
    loadData();
  }, [authChecked, loadData]);

  // Sincronización en tiempo real al recuperar foco o storage
  useEffect(() => {
    if (!authChecked) return;

    const handleWindowFocus = () => loadData(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadData(true);
    };
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === "maro:colegiado-updated") loadData(true);
    };

    const intervalId = window.setInterval(() => loadData(true), 20000);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorageSync);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorageSync);
      window.clearInterval(intervalId);
    };
  }, [authChecked, loadData]);

  const registrosConAcciones = useMemo(
    () => registros.filter((row) => (Number(row.acciones_total) || 0) > 0),
    [registros]
  );

  // Opciones de regiones
  const regionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const r of registrosConAcciones) {
      if (r.region?.trim()) set.add(r.region.trim());
    }
    return Array.from(set).sort();
  }, [registrosConAcciones]);

  // Filtrado reactivo
  const registrosFiltrados = useMemo(() => {
    let result = registrosConAcciones;

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.nombre_completo || "").toLowerCase().includes(q) ||
          (r.folio || "").toLowerCase().includes(q) ||
          (r.clues_id || "").toLowerCase().includes(q) ||
          (r.unidad || "").toLowerCase().includes(q)
      );
    }

    if (regionFilter) {
      result = result.filter((r) => r.region?.trim() === regionFilter);
    }

    if (estatusFilter === "completo") {
      result = result.filter((r) => r.plan_estatus === "completo");
    } else if (estatusFilter === "borrador") {
      result = result.filter((r) => r.plan_estatus !== "completo");
    }

    return result;
  }, [registrosConAcciones, busqueda, regionFilter, estatusFilter]);

  // Métricas
  const totalConAcciones = registrosConAcciones.length;
  const planesCompletos = useMemo(
    () => registrosConAcciones.filter((r) => r.plan_estatus === "completo").length,
    [registrosConAcciones]
  );
  const planesBorrador = totalConAcciones - planesCompletos;

  const totalAccionesEstablecidas = useMemo(
    () => registrosConAcciones.reduce((sum, r) => sum + (Number(r.acciones_total) || 0), 0),
    [registrosConAcciones]
  );
  const totalAccionesCumplidas = useMemo(
    () => registrosConAcciones.reduce((sum, r) => sum + (Number(r.acciones_cumplidas) || 0), 0),
    [registrosConAcciones]
  );

  const porcentajeCumplimiento =
    totalAccionesEstablecidas > 0
      ? Math.round((totalAccionesCumplidas / totalAccionesEstablecidas) * 100)
      : 0;

  const tieneFiltrosActivos = Boolean(busqueda.trim() || regionFilter || estatusFilter !== "todos");

  const limpiarFiltros = () => {
    setBusqueda("");
    setRegionFilter("");
    setEstatusFilter("todos");
  };

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
        {/* Encabezado */}
        <header className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <i className="fa-solid fa-clipboard-check text-[11px]" />
              <span>NIVEL ESTATAL · PLANES DE ACCIÓN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Casos con Acciones Establecidas
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Seguimiento, estatus y avance de planes colegiados acordados en el estado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/api/estatal/colegiados/excel"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition shadow-sm cursor-pointer"
            >
              <i className="fa-solid fa-file-excel text-emerald-600 dark:text-emerald-400" />
              <span>Exportar Excel</span>
            </a>
            <Link
              href="/colegiados"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm"
            >
              <i className="fa-solid fa-clock text-amber-500" />
              <span>Pendientes</span>
            </Link>
            <Link
              href="/estatal"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm"
            >
              <i className="fa-solid fa-arrow-left" />
              <span>Volver a estatal</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Tarjetas KPI de Resumen */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total de casos con plan */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Casos con Plan
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {totalConAcciones}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl">
              <i className="fa-solid fa-folder-open" />
            </div>
          </div>

          {/* Card 2: Planes completos */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Planes Completos
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {planesCompletos}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
              <i className="fa-solid fa-circle-check" />
            </div>
          </div>

          {/* Card 3: Planes en borrador */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                En Borrador
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {planesBorrador}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
              <i className="fa-solid fa-pen-ruler" />
            </div>
          </div>

          {/* Card 4: Cumplimiento de acciones */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Acciones Cumplidas
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">
                  {totalAccionesCumplidas}/{totalAccionesEstablecidas}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ({porcentajeCumplimiento}%)
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xl">
              <i className="fa-solid fa-list-check" />
            </div>
          </div>
        </section>

        {/* Panel de Controles y Filtros */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-wrap gap-3 items-end">
          {/* Búsqueda por texto */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Buscar Caso
            </label>
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Paciente, folio, CLUES o unidad..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/50 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400" />
            </div>
          </div>

          {/* Filtro por Región */}
          <div className="min-w-[170px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Región
            </label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="">Todas las regiones</option>
              {regionesDisponibles.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estatus */}
          <div className="min-w-[150px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Estatus de Plan
            </label>
            <select
              value={estatusFilter}
              onChange={(e) => setEstatusFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="todos">Todos los estatus</option>
              <option value="completo">Completo</option>
              <option value="borrador">Borrador</option>
            </select>
          </div>

          {/* Limpiar filtros */}
          {tieneFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <i className="fa-solid fa-filter-circle-xmark" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </section>

        {/* Tabla Principal */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-list-check text-emerald-500" />
              <span>Listado de Planes Colegiados</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({registrosFiltrados.length} {registrosFiltrados.length === 1 ? "registro" : "registros"})
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-emerald-500 border-t-transparent" />
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Cargando casos con acciones...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
              <button
                type="button"
                onClick={() => loadData()}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition"
              >
                Reintentar
              </button>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <i className="fa-solid fa-inbox text-3xl mb-2 text-slate-400 dark:text-slate-600 block" />
              <p className="text-sm font-medium">
                {registrosConAcciones.length === 0
                  ? "Aún no hay casos con acciones definidas en el estado."
                  : "No se encontraron casos que coincidan con los filtros aplicados."}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[500px]">
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-white/10">
                  <tr>
                    <th className="w-[160px] px-3.5 py-3 text-left">Folio</th>
                    <th className="min-w-[170px] px-3.5 py-3 text-left">Paciente</th>
                    <th className="w-[200px] px-3.5 py-3 text-left hidden sm:table-cell">Región / Unidad</th>
                    <th className="w-[105px] px-3.5 py-3 text-center">Estatus</th>
                    <th className="w-[105px] px-3.5 py-3 text-center">Avance</th>
                    <th className="w-[140px] px-3.5 py-3 text-center hidden md:table-cell">Actualización</th>
                    <th className="w-[170px] px-3.5 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                  {registrosFiltrados.map((row) => {
                    const cumplidas = Number(row.acciones_cumplidas) || 0;
                    const total = Number(row.acciones_total) || 0;
                    const pct = total > 0 ? Math.round((cumplidas / total) * 100) : 0;
                    const esCompleto = row.plan_estatus === "completo";

                    return (
                      <tr
                        key={row.consulta_id}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                      >
                        {/* Folio */}
                        <td className="w-[160px] px-3.5 py-3 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                          <span className="truncate block" title={row.folio || "—"}>
                            {row.folio || "—"}
                          </span>
                        </td>

                        {/* Paciente */}
                        <td className="px-3.5 py-3 font-semibold text-slate-900 dark:text-white">
                          <span
                            className="truncate block"
                            title={row.nombre_completo || "Sin nombre"}
                          >
                            {row.nombre_completo || "Sin nombre"}
                          </span>
                        </td>

                        {/* Región / Unidad */}
                        <td
                          className="px-3.5 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell truncate"
                          title={`${row.region || "—"} · ${row.unidad || "—"}`}
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {row.region || "—"}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            {row.unidad || "—"} {row.clues_id ? `(${row.clues_id})` : ""}
                          </span>
                        </td>

                        {/* Estatus */}
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                              esCompleto
                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40"
                                : "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40"
                            }`}
                          >
                            <i className={`fa-solid ${esCompleto ? "fa-circle-check" : "fa-pen-ruler"} text-[10px]`} />
                            <span>{esCompleto ? "Completo" : "Borrador"}</span>
                          </span>
                        </td>

                        {/* Avance */}
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {cumplidas} / {total}
                            </span>
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  pct === 100
                                    ? "bg-emerald-500"
                                    : pct > 50
                                    ? "bg-teal-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Actualización */}
                        <td className="px-3.5 py-3 text-center hidden md:table-cell font-mono text-xs text-slate-600 dark:text-slate-400">
                          {formatDate(row.plan_actualizado_en || null, true)}
                        </td>

                        {/* Acciones */}
                        <td className="px-3.5 py-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Link
                              href={`/colegiados/${row.consulta_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition shadow-sm"
                              title="Ver y editar plan de acciones"
                            >
                              <i className="fa-solid fa-eye text-xs" />
                              <span>Plan</span>
                            </Link>
                            <Link
                              href={`/colegiados/${row.consulta_id}/formato`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition shadow-sm"
                              title="Ver formato colegiado para impresión o PDF"
                            >
                              <i className="fa-solid fa-file-pdf text-xs" />
                              <span>PDF</span>
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