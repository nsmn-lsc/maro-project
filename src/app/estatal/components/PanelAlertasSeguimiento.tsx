"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { REGION_CONFIGS } from "@/lib/regiones";

interface CasoAlerta {
  id: number;
  folio: string | null;
  nombre_completo: string | null;
  region: string | null;
  municipio: string | null;
  unidad: string | null;
  clues_id: string | null;
  fecha_ingreso_cpn: string | null;
  created_at: string;
  puntaje_actual: number;
  riesgo_25_plus: number;
  seguimiento: {
    id: number;
    fecha_consulta_externa: string | null;
    fecha_laboratorios: string | null;
    acciones_generales: string | null;
    updated_at?: string;
  } | null;
  evaluacion: {
    estado: "COMPLETADO" | "EN_PLAZO" | "VENCIDO";
    diasTranscurridos: number;
    diasRestantes: number;
    alertaEstatalActiva: boolean;
    motivo: string;
  };
}

interface ResumenRegion {
  region: string;
  total: number;
  alertas_vencidas: number;
  en_plazo: number;
  completados: number;
  porcentaje_cumplimiento: number;
}

interface MetricasEstatales {
  total_alto_riesgo: number;
  alertas_vencidas: number;
  pendientes_en_plazo: number;
  completados: number;
  porcentaje_global_cumplimiento: number;
}

export function PanelAlertasSeguimiento() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricas, setMetricas] = useState<MetricasEstatales>({
    total_alto_riesgo: 0,
    alertas_vencidas: 0,
    pendientes_en_plazo: 0,
    completados: 0,
    porcentaje_global_cumplimiento: 0,
  });
  const [resumenRegiones, setResumenRegiones] = useState<ResumenRegion[]>([]);
  const [casos, setCasos] = useState<CasoAlerta[]>([]);

  // Filtros
  const [filtroRegion, setFiltroRegion] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "VENCIDO" | "EN_PLAZO" | "COMPLETADO">("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const cargarAlertas = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/estatal/alertas-seguimiento", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar las alertas estatales");
      const data = await res.json();
      setMetricas(data.metricas || {
        total_alto_riesgo: 0,
        alertas_vencidas: 0,
        pendientes_en_plazo: 0,
        completados: 0,
        porcentaje_global_cumplimiento: 0,
      });
      setResumenRegiones(data.resumen_por_region || []);
      setCasos(data.casos || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Error al consultar alertas");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarAlertas();
  }, [cargarAlertas]);

  // Filtrado de casos
  const casosFiltrados = useMemo(() => {
    let result = casos;

    if (filtroRegion !== "TODAS") {
      const regUpper = filtroRegion.toUpperCase();
      result = result.filter((c) => String(c.region || "").trim().toUpperCase() === regUpper);
    }

    if (filtroEstado !== "TODOS") {
      result = result.filter((c) => c.evaluacion.estado === filtroEstado);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.nombre_completo?.toLowerCase().includes(q) ||
          c.folio?.toLowerCase().includes(q) ||
          c.clues_id?.toLowerCase().includes(q) ||
          c.unidad?.toLowerCase().includes(q) ||
          c.municipio?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [casos, filtroRegion, filtroEstado, busqueda]);

  const regionesDisponibles = useMemo(() => {
    return Object.keys(REGION_CONFIGS);
  }, []);

  const limpiarFiltros = () => {
    setFiltroRegion("TODAS");
    setFiltroEstado("TODOS");
    setBusqueda("");
  };

  const tieneFiltrosActivos = filtroRegion !== "TODAS" || filtroEstado !== "TODOS" || busqueda.trim() !== "";

  return (
    <div className="space-y-6">
      {/* TARJETAS DE KPIS ESTATALES */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Alto Riesgo */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
          <div className="space-y-1.5 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate block">
              Total Casos &gt; 25 pts
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {metricas.total_alto_riesgo}
              </span>
              <span className="text-xs text-slate-500">en el estado</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Pacientes con protocolo de 7 días activo
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xl shrink-0">
            <i className="fa-solid fa-hospital-user" />
          </div>
        </div>

        {/* KPI 2: Alertas Críticas Vencidas (> 7 días) */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/60 dark:border-rose-500/50 bg-gradient-to-br from-rose-50/95 via-white/95 to-red-50/90 dark:from-rose-950/80 dark:via-slate-900/90 dark:to-slate-900/95 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 truncate block">
                Alertas Vencidas (&gt; 7 días)
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400">
                {metricas.alertas_vencidas}
              </span>
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                omisiones de plazo
              </span>
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-200/80">
              Requieren intervención estatal urgente
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-600 dark:text-rose-300 flex items-center justify-center text-xl shrink-0 shadow-sm">
            <i className="fa-solid fa-triangle-exclamation animate-pulse" />
          </div>
        </div>

        {/* KPI 3: En Plazo Oportuno (<= 7 días) */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-300 dark:border-amber-500/30 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
          <div className="space-y-1.5 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate block">
              En Plazo Preventivo (&le; 7d)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">
                {metricas.pendientes_en_plazo}
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-300">en ventana</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Región en proceso de programación
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-clock" />
          </div>
        </div>

        {/* KPI 4: Seguimientos Completados */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-300 dark:border-emerald-500/30 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
          <div className="space-y-1.5 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate block">
              Planes Completados
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                {metricas.completados}
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                ({metricas.porcentaje_global_cumplimiento}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Con cita y laboratorios programados
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-circle-check" />
          </div>
        </div>
      </section>

      {/* RESUMEN POR REGIÓN */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 space-y-4 shadow-xl transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 flex-wrap gap-2">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot text-emerald-600 dark:text-emerald-400" />
              <span>Semáforo de Cumplimiento por Región</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supervisión del cumplimiento del plazo de 7 días para pacientes de alto riesgo (&gt; 25 pts)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Haz clic en una región para filtrar sus casos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resumenRegiones.map((reg) => {
            const isSelected = filtroRegion.toUpperCase() === reg.region.toUpperCase();
            const tieneAlertas = reg.alertas_vencidas > 0;

            return (
              <button
                key={reg.region}
                type="button"
                onClick={() => setFiltroRegion(isSelected ? "TODAS" : reg.region)}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-500 dark:border-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-md ring-2 ring-emerald-500/30"
                    : tieneAlertas
                    ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-400"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        tieneAlertas ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                      }`}
                    />
                    <span>{reg.region}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                    {reg.total} {reg.total === 1 ? "caso" : "casos"}
                  </span>
                </div>

                {/* Métricas pequeñas */}
                <div className="grid grid-cols-3 gap-1.5 text-[11px] mb-2.5">
                  <div className="rounded-lg bg-rose-100/70 dark:bg-rose-950/40 px-2 py-1 text-center">
                    <div className="font-black text-rose-700 dark:text-rose-300">
                      {reg.alertas_vencidas}
                    </div>
                    <div className="text-[10px] text-rose-800 dark:text-rose-200">Vencidos</div>
                  </div>
                  <div className="rounded-lg bg-amber-100/70 dark:bg-amber-950/40 px-2 py-1 text-center">
                    <div className="font-black text-amber-700 dark:text-amber-300">{reg.en_plazo}</div>
                    <div className="text-[10px] text-amber-800 dark:text-amber-200">En plazo</div>
                  </div>
                  <div className="rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 px-2 py-1 text-center">
                    <div className="font-black text-emerald-700 dark:text-emerald-300">
                      {reg.completados}
                    </div>
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-200">Completos</div>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Cumplimiento</span>
                    <span className="font-bold">{reg.porcentaje_cumplimiento}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        reg.porcentaje_cumplimiento >= 80
                          ? "bg-emerald-500"
                          : reg.porcentaje_cumplimiento >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${reg.porcentaje_cumplimiento}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* FILTROS DE BÚSQUEDA Y ACCIONES */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 space-y-4 shadow-xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <i className="fa-solid fa-filter text-emerald-600 dark:text-emerald-400" />
            <span>Filtros del Panel de Alertas</span>
          </h3>

          {tieneFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left text-[10px]" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Selector de Región */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
              Región
            </label>
            <select
              value={filtroRegion}
              onChange={(e) => setFiltroRegion(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 cursor-pointer"
            >
              <option value="TODAS">Todas las Regiones</option>
              {regionesDisponibles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Estatus */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
              Estatus del Seguimiento
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 cursor-pointer"
            >
              <option value="TODOS">Todos los estatus</option>
              <option value="VENCIDO">🚨 Alertas Vencidas (&gt; 7 días)</option>
              <option value="EN_PLAZO">🟡 En Plazo Preventivo (&le; 7 días)</option>
              <option value="COMPLETADO">🟢 Completados</option>
            </select>
          </div>

          {/* Búsqueda en texto */}
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
              Buscar Paciente, Folio o Unidad
            </label>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="search"
                placeholder="Nombre de paciente, folio MARO, CLUES o unidad..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950/60 pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TABLA PRINCIPAL DE CASOS EN ALERTA */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 backdrop-blur-xl shadow-xl overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-table-list text-emerald-600 dark:text-emerald-400" />
            <span>Casos de Alto Riesgo y Vigilancia de Acciones</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              ({casosFiltrados.length} {casosFiltrados.length === 1 ? "caso" : "casos"})
            </span>
          </h2>

          <button
            type="button"
            onClick={() => cargarAlertas(false)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate" />
            <span>Actualizar</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3 text-slate-600 dark:text-slate-300">
            <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold">Consultando padrón de alertas de seguimiento...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 dark:text-rose-300 space-y-2">
            <i className="fa-solid fa-triangle-exclamation text-2xl text-rose-600" />
            <p className="font-bold">{error}</p>
          </div>
        ) : casosFiltrados.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 text-2xl">
              <i className="fa-solid fa-folder-open" />
            </div>
            <p className="font-bold text-base text-slate-800 dark:text-slate-200">
              No se encontraron casos con los filtros seleccionados.
            </p>
            {tieneFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-rotate-left" />
                <span>Restablecer filtros</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto max-h-[620px] divide-y divide-slate-200/80 dark:divide-white/10">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md shadow-sm">
                  <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold">
                    <th className="px-3 py-3 text-left w-10">#</th>
                    <th className="px-3 py-3 text-left">Folio</th>
                    <th className="px-3 py-3 text-left">Paciente</th>
                    <th className="px-3 py-3 text-left">Región / Unidad</th>
                    <th className="px-3 py-3 text-left">Fecha Registro</th>
                    <th className="px-3 py-3 text-left">Estatus Plazo (7d)</th>
                    <th className="px-3 py-3 text-left">Cita Externa</th>
                    <th className="px-3 py-3 text-left">Cita Laboratorios</th>
                    <th className="px-3 py-3 text-left">Acciones Regionales</th>
                    <th className="px-3 py-3 text-right">Expediente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-transparent">
                  {casosFiltrados.map((c, idx) => {
                    const est = c.evaluacion.estado;
                    const esVencido = est === "VENCIDO";
                    const esEnPlazo = est === "EN_PLAZO";
                    const esCompletado = est === "COMPLETADO";

                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          esVencido
                            ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-900/30"
                            : "hover:bg-emerald-50/60 dark:hover:bg-slate-800/60"
                        }`}
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
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {c.nombre_completo || "Paciente sin nombre"}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">ID: #{c.id}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700/60">
                              {c.puntaje_actual} pts
                            </span>
                          </div>
                        </td>

                        {/* Región / Unidad */}
                        <td className="px-3 py-3 max-w-[210px]">
                          <div className="font-bold text-emerald-800 dark:text-emerald-300">
                            {c.region || "Sin región"}
                          </div>
                          <div
                            className="text-[11px] text-slate-700 dark:text-slate-300 truncate"
                            title={c.unidad || ""}
                          >
                            {c.unidad || "Sin unidad"}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {c.municipio || "—"} {c.clues_id && `(${c.clues_id})`}
                          </div>
                        </td>

                        {/* Fecha Registro */}
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {c.fecha_ingreso_cpn
                            ? new Date(c.fecha_ingreso_cpn).toLocaleDateString("es-MX")
                            : c.created_at
                            ? new Date(c.created_at).toLocaleDateString("es-MX")
                            : "—"}
                        </td>

                        {/* Estatus del Plazo (7 días) */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {esVencido ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border border-rose-400/80 shadow-sm animate-pulse">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <span>ALERTA &gt; 7 DÍAS</span>
                              </span>
                              <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                {c.evaluacion.diasTranscurridos} días sin plan
                              </div>
                            </div>
                          ) : esEnPlazo ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60">
                                <i className="fa-solid fa-clock text-[10px]" />
                                <span>En Plazo ({c.evaluacion.diasRestantes}d restantes)</span>
                              </span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {c.evaluacion.diasTranscurridos} días transcurridos
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60">
                              <i className="fa-solid fa-check text-[10px]" />
                              <span>Completado</span>
                            </span>
                          )}
                        </td>

                        {/* Cita Consulta Externa */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {c.seguimiento?.fecha_consulta_externa ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(c.seguimiento.fecha_consulta_externa).toLocaleDateString(
                                "es-MX"
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No programada</span>
                          )}
                        </td>

                        {/* Cita Laboratorios */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {c.seguimiento?.fecha_laboratorios ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(c.seguimiento.fecha_laboratorios).toLocaleDateString("es-MX")}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No programada</span>
                          )}
                        </td>

                        {/* Acciones Regionales */}
                        <td className="px-3 py-3 max-w-[220px]">
                          {c.seguimiento?.acciones_generales ? (
                            <div
                              className="text-[11px] text-slate-800 dark:text-slate-200 truncate"
                              title={c.seguimiento.acciones_generales}
                            >
                              {c.seguimiento.acciones_generales}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin registrar</span>
                          )}
                        </td>

                        {/* Expediente */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/estatal/pacientes/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/10 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 transition-colors text-slate-700 dark:text-slate-200"
                            title="Ver Expediente Clínico Estatal"
                          >
                            <i className="fa-solid fa-folder-open text-[11px]" />
                            <span>Expediente</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pie de tabla */}
            <div className="p-3 sm:px-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{casosFiltrados.length}</strong> de{" "}
                <strong className="text-slate-800 dark:text-slate-200">{casos.length}</strong> casos registrados en alto riesgo
              </span>
              {casosFiltrados.length > 8 && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                  <i className="fa-solid fa-arrows-up-down text-[10px]" />
                  <span>Contenedor con desplazamiento vertical</span>
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
