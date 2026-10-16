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

export default function ColegiadosPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroColegiado[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [unidadFilter, setUnidadFilter] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"pendientes" | "configurados" | "todos">("pendientes");

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
      const parsedSession = JSON.parse(stored) as SessionInfo;
      if ((parsedSession.nivel ?? 0) < 3) {
        router.replace((parsedSession.nivel ?? 0) >= 2 ? "/region" : "/dashboard");
        return;
      }
      setSession(parsedSession);
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadData();
  }, [authChecked, loadData]);

  useEffect(() => {
    if (!authChecked) return;

    const handleWindowFocus = () => loadData(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadData(true);
    };
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === "maro:colegiado-updated") loadData(true);
    };
    const handleCustomSync = () => loadData(true);

    const intervalId = window.setInterval(() => loadData(true), 15000);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("maro:colegiado-updated", handleCustomSync as EventListener);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("maro:colegiado-updated", handleCustomSync as EventListener);
      window.clearInterval(intervalId);
    };
  }, [authChecked, loadData]);

  // Métricas globales
  const total = registros.length;
  const riesgo25 = useMemo(
    () => registros.filter((r) => Number(r.riesgo_25_plus) === 1).length,
    [registros]
  );
  const pendientes = useMemo(
    () => registros.filter((r) => (Number(r.acciones_total) || 0) === 0),
    [registros]
  );
  const configurados = useMemo(
    () => registros.filter((r) => (Number(r.acciones_total) || 0) > 0),
    [registros]
  );

  // Semáforo de proporciones
  const semaforoStats = useMemo(() => {
    const totalSafe = Math.max(total, 1);
    const pctVerde = Math.min(100, Math.round((configurados.length / totalSafe) * 100));
    const pctAmarillo = Math.min(100 - pctVerde, Math.round((pendientes.length / totalSafe) * 100));
    const pctRojo = Math.max(0, 100 - pctVerde - pctAmarillo);

    return {
      pctVerde,
      pctAmarillo,
      pctRojo,
    };
  }, [total, configurados.length, pendientes.length]);

  // Listas para filtros
  const regionesDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        registros
          .map((r) => String(r.region || "").trim())
          .filter((reg) => reg.length > 0)
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

  // Filtrado reactivo de registros
  const registrosFiltrados = useMemo(() => {
    return registros.filter((row) => {
      // Filtro por estado
      if (filtroEstado === "pendientes" && (Number(row.acciones_total) || 0) > 0) return false;
      if (filtroEstado === "configurados" && (Number(row.acciones_total) || 0) === 0) return false;

      // Filtro por región
      if (regionFilter && String(row.region || "").toLowerCase() !== regionFilter.toLowerCase()) {
        return false;
      }

      // Filtro por unidad
      if (unidadFilter && String(row.unidad || "").toLowerCase() !== unidadFilter.toLowerCase()) {
        return false;
      }

      // Filtro por texto de búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const matchFolio = String(row.folio || "").toLowerCase().includes(query);
        const matchNombre = String(row.nombre_completo || "").toLowerCase().includes(query);
        const matchMunicipio = String(row.municipio || "").toLowerCase().includes(query);
        if (!matchFolio && !matchNombre && !matchMunicipio) return false;
      }

      return true;
    });
  }, [registros, filtroEstado, regionFilter, unidadFilter, busqueda]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setRegionFilter("");
    setUnidadFilter("");
    setFiltroEstado("pendientes");
  };

  const hayFiltrosActivos =
    busqueda.trim() !== "" || regionFilter !== "" || unidadFilter !== "" || filtroEstado !== "pendientes";

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
        Validando acceso estatal...
      </main>
    );
  }

  return (
    <main className="min-h-screen relative transition-colors duration-300">
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

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ENCABEZADO SUPERIOR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-700 dark:text-emerald-300">
                Nivel Estatal · Seguimiento Clínico
              </span>
              <span className="text-xs bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                Mesa Colegiada
              </span>
              {session?.displayName && (
                <span className="text-xs bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-semibold">
                  {session.displayName}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-users-viewfinder text-emerald-600 dark:text-emerald-400"></i>
              <span>Módulo de Casos Colegiados</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Dictaminación colegiada, asignación y seguimiento de planes de acción por nivel de atención
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <ThemeToggle />
            <a
              href="/api/estatal/colegiados/excel"
              download
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs shadow-sm transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-file-excel"></i>
              <span>Descargar Excel</span>
            </a>
            <Link
              href="/colegiados/planes"
              className="inline-flex items-center gap-2 rounded-xl border border-teal-500/40 dark:border-teal-400/30 bg-teal-500/10 hover:bg-teal-500/20 px-3.5 py-2 text-xs font-bold text-teal-900 dark:text-teal-200 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-clipboard-check"></i>
              <span>Casos con acciones ({configurados.length})</span>
            </Link>
            <Link
              href="/estatal"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white shadow-sm transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-slate-500 dark:text-slate-400"></i>
              <span>Volver a Módulo Estatal</span>
            </Link>
          </div>
        </header>

        {/* TARJETAS KPI — SEMÁFORO EPIDEMIOLÓGICO DE COLEGIADOS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 🟢 TARJETA 1: SEMÁFORO VERDE - CASOS CON PLAN DEFINIDO */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 dark:border-emerald-400/40 bg-gradient-to-br from-emerald-50/95 via-white/95 to-teal-50/90 dark:from-emerald-950/85 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-emerald-950/10 dark:shadow-emerald-950/40 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5">
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-2xl" />

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 dark:bg-black/60 border border-white/15 px-2.5 py-0.5 shadow-inner">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] ring-2 ring-emerald-300/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/25" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 ml-1">
                    Semáforo Verde
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">
                  Casos con Plan Definido
                </h2>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-300/40 flex items-center justify-center text-2xl shrink-0">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
            </div>

            <div className="flex items-baseline gap-3 my-1">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 drop-shadow-sm">
                {configurados.length}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  Expedientes con Acciones
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {semaforoStats.pctVerde}% de casos colegiados
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-emerald-500/20 dark:border-emerald-400/20">
              <div className="rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">Total Colegiados</span>
                <span className="text-sm font-black text-emerald-800 dark:text-white">{total}</span>
              </div>
              <div className="rounded-xl bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/30 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200">Seguimiento</span>
                <span className="text-sm font-black text-teal-800 dark:text-white">Activo</span>
              </div>
            </div>
          </div>

          {/* 🟡 TARJETA 2: SEMÁFORO AMARILLO - CASOS PENDIENTES DE ACCIONES */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/55 dark:border-amber-400/50 bg-gradient-to-br from-amber-50/95 via-white/95 to-yellow-50/90 dark:from-amber-950/85 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-amber-950/10 dark:shadow-amber-950/40 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5">
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-amber-400/20 dark:bg-amber-500/15 blur-2xl" />

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 dark:bg-black/60 border border-white/15 px-2.5 py-0.5 shadow-inner">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] ring-2 ring-amber-200/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/25" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 ml-1">
                    Semáforo Preventivo
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">
                  Pendientes de Acciones
                </h2>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/30 border border-amber-300/40 flex items-center justify-center text-2xl shrink-0">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
            </div>

            <div className="flex items-baseline gap-3 my-1">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-amber-600 dark:text-amber-400 drop-shadow-sm">
                {pendientes.length}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Por Dictaminar
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Requieren plan en mesa colegiada
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-amber-500/20 dark:border-amber-400/20">
              <div className="rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">Tasa Pendiente</span>
                <span className="text-sm font-black text-amber-800 dark:text-white">{semaforoStats.pctAmarillo}%</span>
              </div>
              <div className="rounded-xl bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/30 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-900 dark:text-orange-200">Acción Requerida</span>
                <span className="text-sm font-black text-orange-800 dark:text-white">Alta</span>
              </div>
            </div>
          </div>

          {/* 🔴 TARJETA 3: SEMÁFORO ROJO - CASOS EN RIESGO CRÍTICO (≥25 PTS) */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/60 dark:border-rose-400/50 bg-gradient-to-br from-rose-50/95 via-white/95 to-red-50/90 dark:from-rose-950/85 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-rose-950/15 dark:shadow-rose-950/50 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5">
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-rose-500/20 dark:bg-rose-500/15 blur-2xl" />

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 dark:bg-black/60 border border-white/15 px-2.5 py-0.5 shadow-inner">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] ring-2 ring-rose-300/80 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 ml-1">
                    Semáforo Crítico
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">
                  Casos con Riesgo ≥ 25
                </h2>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30 border border-rose-300/40 flex items-center justify-center text-2xl shrink-0">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
            </div>

            <div className="flex items-baseline gap-3 my-1">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-rose-600 dark:text-rose-400 drop-shadow-sm">
                {riesgo25}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold uppercase tracking-wide text-rose-800 dark:text-rose-200">
                  Prioridad Máxima
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Estratificación severa de riesgo
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-rose-500/20 dark:border-rose-400/20">
              <div className="rounded-xl bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/30 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-900 dark:text-rose-200">Impacto Estatal</span>
                <span className="text-sm font-black text-rose-800 dark:text-white">
                  {Math.round((riesgo25 / Math.max(total, 1)) * 100)}%
                </span>
              </div>
              <div className="rounded-xl bg-red-500/15 dark:bg-red-500/20 border border-red-500/30 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-900 dark:text-red-200">Resolución</span>
                <span className="text-sm font-black text-red-800 dark:text-white">Urgente</span>
              </div>
            </div>
          </div>
        </section>

        {/* 📊 BARRA DE DISTRIBUCIÓN PROPORCIONAL DEL SEMÁFORO (CON % DIRECTO) */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-4 shadow-xl transition-colors">
          <div className="h-8 w-full rounded-xl overflow-hidden flex shadow-inner border border-slate-300 dark:border-white/10">
            {semaforoStats.pctVerde > 0 && (
              <div
                style={{ width: `${semaforoStats.pctVerde}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-xs transition-all duration-500"
                title={`Con Plan Definido: ${configurados.length} (${semaforoStats.pctVerde}%)`}
              >
                {semaforoStats.pctVerde}%
              </div>
            )}
            {semaforoStats.pctAmarillo > 0 && (
              <div
                style={{ width: `${semaforoStats.pctAmarillo}%` }}
                className="bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-center text-slate-900 font-black text-xs transition-all duration-500"
                title={`Pendientes de Acciones: ${pendientes.length} (${semaforoStats.pctAmarillo}%)`}
              >
                {semaforoStats.pctAmarillo}%
              </div>
            )}
            {semaforoStats.pctRojo > 0 && (
              <div
                style={{ width: `${semaforoStats.pctRojo}%` }}
                className="bg-gradient-to-r from-rose-500 to-red-600 flex items-center justify-center text-white font-black text-xs transition-all duration-500"
                title={`Riesgo Crítico: ${riesgo25} (${semaforoStats.pctRojo}%)`}
              >
                {semaforoStats.pctRojo}%
              </div>
            )}
          </div>
        </section>

        {/* FILTROS Y CONTROLES DE CORTE */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 space-y-4 shadow-xl transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-filter text-emerald-600 dark:text-emerald-400"></i>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Filtros y Búsqueda
              </h3>
              <span className="text-xs bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold px-2.5 py-0.5 rounded-full">
                {registrosFiltrados.length} encontrados
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botones de estado */}
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFiltroEstado("pendientes")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    filtroEstado === "pendientes"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Pendientes ({pendientes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado("configurados")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    filtroEstado === "configurados"
                      ? "bg-emerald-600 text-white font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Con Plan ({configurados.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado("todos")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    filtroEstado === "todos"
                      ? "bg-slate-700 text-white font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todos ({total})
                </button>
              </div>

              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-300 dark:border-white/15 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-rotate-left text-[10px]"></i>
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Búsqueda por Paciente / Folio
              </label>
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-slate-400"></i>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, folio o municipio..."
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50/70 dark:bg-slate-950/70 pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Filtrar por Región
              </label>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setUnidadFilter("");
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50/70 dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 cursor-pointer"
              >
                <option value="">Todas las regiones ({regionesDisponibles.length})</option>
                {regionesDisponibles.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Filtrar por Unidad Médica
              </label>
              <select
                value={unidadFilter}
                onChange={(e) => setUnidadFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50/70 dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 cursor-pointer"
              >
                <option value="">Todas las unidades ({unidadesDisponibles.length})</option>
                {unidadesDisponibles.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* TABLA DE CASOS COLEGIADOS CON SCROLL VERTICAL PROPIO Y SIN SCROLL HORIZONTAL */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl space-y-3 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-list-check text-emerald-600 dark:text-emerald-400"></i>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Listado de Casos Colegiados
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Desplaza verticalmente para navegar
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
              <i className="fa-solid fa-spinner fa-spin text-emerald-600 dark:text-emerald-400 text-lg"></i>
              <span>Cargando casos colegiados...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
              <span>{error}</span>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <i className="fa-solid fa-folder-open text-3xl text-slate-400 dark:text-slate-500"></i>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {hayFiltrosActivos
                  ? "Sin casos para los filtros seleccionados"
                  : "No hay casos en este estado"}
              </p>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-xs table-fixed text-left">
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold">
                  <tr className="whitespace-nowrap">
                    <th className="w-[155px] px-3 py-3">Folio</th>
                    <th className="min-w-[160px] px-3 py-3">Paciente</th>
                    <th className="w-[150px] px-3 py-3 hidden md:table-cell">Región / Mpio</th>
                    <th className="px-3 py-3 hidden lg:table-cell">Unidad Médica</th>
                    <th className="w-[100px] px-3 py-3 hidden sm:table-cell">Consulta</th>
                    <th className="w-[110px] px-3 py-3 hidden xl:table-cell">Colegiado</th>
                    <th className="w-[85px] px-3 py-3 text-right">Puntaje</th>
                    <th className="w-[115px] px-3 py-3 text-center">Plan</th>
                    <th className="w-[115px] px-3 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {registrosFiltrados.map((row) => {
                    const tienePlan = (Number(row.acciones_total) || 0) > 0;
                    const esCritico = Number(row.riesgo_25_plus) === 1 || (Number(row.puntaje_total_consulta) || 0) >= 25;

                    return (
                      <tr
                        key={row.consulta_id}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                      >
                        <td className="w-[155px] px-3 py-3 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                          <span className="truncate block" title={row.folio || "—"}>
                            {row.folio || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">
                          <span className="truncate block" title={row.nombre_completo || "Sin nombre"}>
                            {row.nombre_completo || "Sin nombre"}
                          </span>
                        </td>
                        <td
                          className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell truncate"
                          title={`${row.region || "—"} · ${row.municipio || "—"}`}
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.region || "—"}</span>
                          {row.municipio && <span className="text-[11px] block">{row.municipio}</span>}
                        </td>
                        <td
                          className="px-3 py-3 text-slate-700 dark:text-slate-300 hidden lg:table-cell truncate"
                          title={row.unidad || "—"}
                        >
                          <span className="truncate block">{row.unidad || "—"}</span>
                          {row.clues_id && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              CLUES: {row.clues_id}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell font-mono">
                          {formatDate(row.fecha_consulta)}
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden xl:table-cell font-mono">
                          {formatDate(row.fecha_colegiado)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-black border ${
                              esCritico
                                ? "bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/40"
                                : "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40"
                            }`}
                          >
                            {Number(row.puntaje_total_consulta) || 0} pts
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {tienePlan ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40">
                              <i className="fa-solid fa-check text-[10px]"></i>
                              <span>{row.acciones_total} acc</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40">
                              <i className="fa-solid fa-clock text-[10px]"></i>
                              <span>Sin acciones</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Link
                            href={`/colegiados/${row.consulta_id}`}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer ${
                              tienePlan
                                ? "border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                : "border border-emerald-500/40 bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            <i className={`fa-solid ${tienePlan ? "fa-eye" : "fa-pen-to-square"} text-xs`}></i>
                            <span>{tienePlan ? "Ver plan" : "Definir"}</span>
                          </Link>
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
