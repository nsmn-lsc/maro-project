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
  puntaje_real_sin_forzar: number;
  puntaje_consulta_parametros: number;
  riesgo_25_plus: number;
  alerta_por_criterio_clinico: number;
  motivo_alerta: string | null;
  colegiado: number;
  consulta_creada: string;
  edad: number | null;
  localidad?: string | null;
  fecha_ingreso_cpn?: string | null;
  fpp?: string | null;
  imc_inicial?: number | null;
};

type AlertaFlotante = {
  cantidad: number;
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

export default function ModuloEstatalRiesgoPage() {
  type EstadoCorte = "todos" | "no_colegiados" | "colegiados";
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("Usuario Estatal");
  const [alertaFlotante, setAlertaFlotante] = useState<AlertaFlotante | null>(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [unidadFilter, setUnidadFilter] = useState("");
  const [folioFilter, setFolioFilter] = useState("");
  const [estadoCorte, setEstadoCorte] = useState<EstadoCorte>("no_colegiados");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const knownConsultaIdsRef = useRef<Set<number>>(new Set());
  const loadedOnceRef = useRef(false);

  useEffect(() => {
    filtroRiesgoRef.current = filtroRiesgo;
  }, [filtroRiesgo]);

  const loadRegistros = useCallback(async (silent = false, riesgoNivel?: NivelRiesgoFiltro) => {
    if (!silent) setLoading(true);
    const nivelTarget = riesgoNivel !== undefined ? riesgoNivel : filtroRiesgoRef.current;
    try {
      const res = await fetch(`/api/estatal/riesgo?limit=1500&include_stats=1&nivel_riesgo=${nivelTarget}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el módulo estatal");
      const json = await res.json();
      const data: RegistroRiesgo[] = Array.isArray(json) ? json : json.registros || [];
      setRegistros(data);
      if (json && json.stats) {
        setStatsGlobales(json.stats);
      }

      // La detección de NUEVOS pacientes en alto riesgo (alertaFlotante)
      // solo debe activarse durante monitoreo periódico en segundo plano (silent=true)
      // y ÚNICAMENTE sobre el grupo de casos críticos ("muy_alto")
      if (nivelTarget === "muy_alto") {
        const currentIds = new Set(
          data
            .map((item) => Number(item.consulta_id))
            .filter((id) => Number.isFinite(id) && id > 0)
        );

        if (silent && loadedOnceRef.current && knownConsultaIdsRef.current.size > 0) {
          let nuevos = 0;
          for (const id of currentIds) {
            if (!knownConsultaIdsRef.current.has(id)) nuevos += 1;
          }

          if (nuevos > 0) {
            setAlertaFlotante({
              cantidad: nuevos,
            });
          }
        }

        knownConsultaIdsRef.current = currentIds;
        loadedOnceRef.current = true;
      }

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
      setSessionName(session.displayName || session.unidad || "Usuario Estatal");
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadRegistros(false).catch(() => {});
  }, [authChecked, loadRegistros]);

  useEffect(() => {
    if (!authChecked) return;

    const handleWindowFocus = () => {
      loadRegistros(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadRegistros(true);
      }
    };

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === "maro:colegiado-updated" || event.key === "maro:estatal-riesgo-updated") {
        loadRegistros(true);
      }
    };

    const handleCustomSync = () => {
      loadRegistros(true);
    };

    const intervalId = window.setInterval(() => {
      loadRegistros(true);
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
  }, [authChecked, loadRegistros]);

  const totalRegistros = registros.length;

  const registrosFiltrados = useMemo(() => {
    return registros.filter((row) => {
      const matchRegion =
        regionFilter === "" ||
        String(row.region || "").toLowerCase().includes(regionFilter.toLowerCase());
      const matchUnidad =
        unidadFilter === "" ||
        String(row.unidad || "").toLowerCase().includes(unidadFilter.toLowerCase());
      const matchFolio =
        folioFilter === "" ||
        String(row.folio || "").toLowerCase().includes(folioFilter.toLowerCase()) ||
        String(row.nombre_completo || "").toLowerCase().includes(folioFilter.toLowerCase());
      return matchRegion && matchUnidad && matchFolio;
    });
  }, [folioFilter, regionFilter, registros, unidadFilter]);

  const promedioPuntaje = useMemo(() => {
    if (registros.length === 0) return 0;
    const sum = registros.reduce((acc, r) => acc + (Number(r.puntaje_total_consulta) || 0), 0);
    return Math.round((sum / registros.length) * 10) / 10;
  }, [registros]);

  const conteoNoColegiados = useMemo(
    () => registrosFiltrados.filter((r) => Number(r.colegiado) !== 1).length,
    [registrosFiltrados]
  );
  const conteoColegiados = useMemo(
    () => registrosFiltrados.filter((r) => Number(r.colegiado) === 1).length,
    [registrosFiltrados]
  );

  const semaforoEstatal = useMemo(() => {
    const totalCriticos = statsGlobales.conteo_muy_alto || statsGlobales.pacientes_riesgo || (filtroRiesgo === "muy_alto" ? registros.length : 0);
    const colegiados = statsGlobales.criticos_colegiados ?? (filtroRiesgo === "muy_alto" ? registros.filter((r) => Number(r.colegiado) === 1).length : 0);
    const criterioClinico = statsGlobales.criticos_criterio_clinico ?? (filtroRiesgo === "muy_alto" ? registros.filter((r) => Number(r.colegiado) !== 1 && Number(r.alerta_por_criterio_clinico) === 1).length : 0);
    const pendientesTotal = statsGlobales.criticos_pendientes ?? Math.max(0, totalCriticos - colegiados);
    const criticosSinColegiar = Math.max(0, pendientesTotal - criterioClinico);

    const totalSeguro = Math.max(totalCriticos, 1);
    const pctVerde = totalCriticos > 0 ? Math.min(100, Math.round((colegiados / totalSeguro) * 100)) : 0;
    const pctAmarillo = totalCriticos > 0 ? Math.min(100 - pctVerde, Math.round((criterioClinico / totalSeguro) * 100)) : 0;
    const pctRojo = totalCriticos > 0 ? Math.max(0, 100 - pctVerde - pctAmarillo) : 0;

    return {
      colegiados,
      pendientesTotal,
      puntaje25Total: totalCriticos,
      alertaClinicaTotal: statsGlobales.criticos_alerta_clinica ?? criterioClinico,
      criticosSinColegiar,
      pctVerde,
      pctAmarillo,
      pctRojo,
    };
  }, [statsGlobales, filtroRiesgo, registros]);

  const registrosSegmentados = useMemo(() => {
    if (estadoCorte === "no_colegiados") {
      return registrosFiltrados.filter((r) => Number(r.colegiado) !== 1);
    }
    if (estadoCorte === "colegiados") {
      return registrosFiltrados.filter((r) => Number(r.colegiado) === 1);
    }
    return registrosFiltrados;
  }, [estadoCorte, registrosFiltrados]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(registrosSegmentados.length / perPage)),
    [registrosSegmentados.length]
  );

  const registrosPaginados = useMemo(() => {
    const start = (page - 1) * perPage;
    return registrosSegmentados.slice(start, start + perPage);
  }, [page, registrosSegmentados]);

  useEffect(() => {
    setPage(1);
  }, [regionFilter, unidadFilter, folioFilter, estadoCorte]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  const cambiarFiltroRiesgo = (nuevoNivel: NivelRiesgoFiltro) => {
    setFiltroRiesgo(nuevoNivel);
    filtroRiesgoRef.current = nuevoNivel;
    setAlertaFlotante(null);
    setPage(1);
    if (nuevoNivel === "bajo" || nuevoNivel === "alto") {
      setEstadoCorte("todos");
    }
    loadRegistros(false, nuevoNivel);
  };

  const limpiarFiltros = () => {
    setRegionFilter("");
    setUnidadFilter("");
    setFolioFilter("");
  };

  const cerrarSesion = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignorar errores de red; se fuerza salida local de todos modos.
    } finally {
      localStorage.removeItem("maro:user");
      router.replace("/inicial");
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

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
        className="fixed inset-0 pointer-events-none z-0 dark:hidden bg-slate-100/50"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(241, 245, 249, 0.78), rgba(204, 251, 241, 0.62)), url(/maro_back_estatal.png)",
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
            "linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(15, 118, 110, 0.65)), url(/maro_back_estatal.png)",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      {alertaFlotante && (
        <div className="fixed top-4 right-4 z-50 max-w-sm rounded-2xl border border-rose-400/50 bg-rose-900/95 px-4 py-3 shadow-2xl shadow-rose-950/60 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="text-xl leading-none">🚨</div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-rose-200 font-bold">
                Notificación estatal
              </p>
              <p className="text-sm text-rose-50 mt-1">
                {alertaFlotante.cantidad === 1
                  ? "Se detectó 1 nuevo paciente en alto riesgo activo."
                  : `Se detectaron ${alertaFlotante.cantidad} pacientes nuevos en alto riesgo activo.`}
              </p>
            </div>
            <button
              onClick={() => setAlertaFlotante(null)}
              className="text-rose-200/70 hover:text-white text-sm cursor-pointer"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ENCABEZADO SUPERIOR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-700 dark:text-emerald-300">
                Módulo Estatal MARO
              </span>
              <span className="text-xs bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
                {sessionName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-shield-heart text-emerald-600 dark:text-emerald-400"></i>
              <span>Pacientes en Alto Riesgo Activo</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Vigilancia epidemiológica consolidada de todas las regiones y unidades médicas del estado
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <ThemeToggle />
            <Link
              href="/estatal/reportes"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 dark:border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 px-3.5 py-2 text-xs font-bold text-cyan-900 dark:text-cyan-200 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-chart-pie text-cyan-600 dark:text-cyan-300"></i>
              <span>Ver Reportes</span>
            </Link>
            <Link
              href="/colegiados"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 dark:border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-users-viewfinder text-amber-600 dark:text-amber-300"></i>
              <span>Ver Colegiados</span>
            </Link>
            <Link
              href="/gestion-accesos"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 dark:border-emerald-400/40 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-user-shield"></i>
              <span>Gestión de Accesos</span>
            </Link>
            <button
              type="button"
              onClick={cerrarSesion}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-white transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-right-from-bracket text-slate-500 dark:text-slate-300"></i>
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* RESUMEN EJECUTIVO ESTATAL - KPIS GLOBALES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Pacientes Totales */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate block">
                  Pacientes Totales
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-400/30 shrink-0">
                  Padrón Global
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {statsGlobales.total_pacientes || totalRegistros}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  pacientes
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                Padrón global registrado en todas las unidades del estado
              </p>
            </div>
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>

          {/* KPI 2: Pacientes de Riesgo Totales */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate block">
                  Pacientes de Riesgo
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-400/30 shrink-0">
                  ≥25 pts / Alerta
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                  {statsGlobales.pacientes_riesgo || totalRegistros}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  casos críticos
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                Casos con puntaje ≥25 o alerta clínica que requieren vigilancia
              </p>
            </div>
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
          </div>

          {/* KPI 3: Puntaje Promedio Pacientes Totales */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate block">
                  Promedio Global
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 shrink-0">
                  Todos
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {statsGlobales.promedio_global || 0}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  pts media
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                Puntaje promedio ponderado del padrón total de pacientes
              </p>
            </div>
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              <i className="fa-solid fa-chart-line"></i>
            </div>
          </div>

          {/* KPI 4: Puntaje Promedio Pacientes de Riesgo ≥25 */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 shadow-xl flex items-center justify-between gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate block">
                  Promedio Riesgo ≥25
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 shrink-0">
                  Críticos
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  {statsGlobales.promedio_riesgo_25 || promedioPuntaje}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  pts críticos
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                Severidad media de pacientes con riesgo ≥25 puntos
              </p>
            </div>
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              <i className="fa-solid fa-gauge-high"></i>
            </div>
          </div>
        </section>

        {/* TARJETAS KPI - SEMÁFORO EPIDEMIOLÓGICO ESTATAL */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 🟢 TARJETA 1: SEMÁFORO VERDE - CASOS COLEGIADOS Y COBERTURA ESTATAL */}
            <div
              onClick={() => {
                cambiarFiltroRiesgo("muy_alto");
                setEstadoCorte("colegiados");
              }}
              className="cursor-pointer relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 dark:border-emerald-400/50 bg-gradient-to-br from-emerald-50/95 via-white/95 to-teal-50/90 dark:from-emerald-950/85 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-emerald-950/10 dark:shadow-emerald-950/40 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5 group"
              title="Filtrar por casos colegiados"
            >
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-2xl" />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-black/60 border border-emerald-400/40 px-3 py-1 shadow-inner">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/25" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/25" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] ring-2 ring-emerald-300/60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 ml-1">
                      Semáforo Verde
                    </span>
                  </div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                    Casos Colegiados y Cobertura
                  </h2>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-300/40 flex items-center justify-center text-2xl shrink-0">
                  <i className="fa-solid fa-hospital-user"></i>
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-1">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 drop-shadow-sm">
                  {semaforoEstatal.colegiados}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                    Pacientes Colegiados ({semaforoEstatal.pctVerde}%)
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Con plan multidisciplinario activo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-emerald-500/20 dark:border-emerald-400/20">
                <div className="rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Regiones Activas
                  </span>
                  <span className="text-sm font-black text-emerald-800 dark:text-white">
                    {regionesDisponibles.length}
                  </span>
                </div>
                <div className="rounded-xl bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/30 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-building-user text-emerald-600 dark:text-emerald-400 text-[11px]"></i>
                    Unidades
                  </span>
                  <span className="text-sm font-black text-teal-800 dark:text-white">
                    {unidadesDisponibles.length}
                  </span>
                </div>
              </div>
            </div>

            {/* 🟡 TARJETA 2: SEMÁFORO AMARILLO / ÁMBAR - PENDIENTES DE COLEGIAR Y PROMEDIO */}
            <div
              onClick={() => {
                cambiarFiltroRiesgo("muy_alto");
                setEstadoCorte("no_colegiados");
              }}
              className="cursor-pointer relative overflow-hidden rounded-3xl border-2 border-amber-500/55 dark:border-amber-400/50 bg-gradient-to-br from-amber-50/95 via-white/95 to-yellow-50/90 dark:from-amber-950/85 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-amber-950/10 dark:shadow-amber-950/40 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5 group"
              title="Filtrar por casos pendientes de colegiar"
            >
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-amber-400/20 dark:bg-amber-500/15 blur-2xl" />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-black/60 border border-amber-400/40 px-3 py-1 shadow-inner">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/25" />
                    <span className="h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] ring-2 ring-amber-200/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/25" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 ml-1">
                      Semáforo Preventivo
                    </span>
                  </div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                    Casos Pendientes de Colegiar
                  </h2>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-600/30 border border-amber-300/40 flex items-center justify-center text-2xl shrink-0">
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-1">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-amber-600 dark:text-amber-400 drop-shadow-sm">
                  {semaforoEstatal.pendientesTotal}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                    Por Dictaminar / Colegiar
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Requieren revisión por comité estatal
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-amber-500/20 dark:border-amber-400/20">
                <div className="rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/35 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Puntaje Promedio
                  </span>
                  <span className="text-sm font-black text-amber-800 dark:text-white">
                    {statsGlobales.promedio_riesgo_25 ? `${statsGlobales.promedio_riesgo_25} pts` : `${promedioPuntaje} pts`}
                  </span>
                </div>
                <div className="rounded-xl bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/35 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-stethoscope text-amber-600 dark:text-amber-400 text-[11px]"></i>
                    Criterio Clínico
                  </span>
                  <span className="text-sm font-black text-orange-800 dark:text-white">
                    {semaforoEstatal.alertaClinicaTotal}
                  </span>
                </div>
              </div>
            </div>

            {/* 🔴 TARJETA 3: SEMÁFORO ROJO - CONCENTRADO ESTATAL DE ALTO RIESGO */}
            <div
              onClick={() => {
                cambiarFiltroRiesgo("muy_alto");
                setEstadoCorte("todos");
              }}
              className="cursor-pointer relative overflow-hidden rounded-3xl border-2 border-rose-500/65 dark:border-rose-400/60 bg-gradient-to-br from-rose-50/95 via-white/95 to-red-50/90 dark:from-rose-950/90 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-rose-950/15 dark:shadow-rose-950/50 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5 group"
              title="Filtrar por casos de muy alto riesgo"
            >
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-rose-500/25 dark:bg-rose-500/20 blur-2xl" />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-black/60 border border-rose-400/50 px-3 py-1 shadow-inner">
                    <span className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e] ring-2 ring-rose-300/80 animate-pulse" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/25" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/25" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 ml-1">
                      Semáforo Rojo
                    </span>
                  </div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
                    Registros en Alto Riesgo Activo
                  </h2>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/35 border border-rose-300/40 flex items-center justify-center text-2xl shrink-0">
                  <i className="fa-solid fa-triangle-exclamation animate-pulse"></i>
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-1">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-rose-600 dark:text-rose-400 drop-shadow-sm">
                  {statsGlobales.conteo_muy_alto || statsGlobales.pacientes_riesgo || totalRegistros}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-rose-900 dark:text-rose-200">
                    Casos Críticos Estatales
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Puntaje ≥25 o alerta clínica prioritaria
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-rose-500/20 dark:border-rose-400/20">
                <div className="rounded-xl bg-rose-500/15 dark:bg-rose-500/25 border border-rose-500/35 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    Por Puntaje ≥25
                  </span>
                  <span className="text-sm font-black text-rose-800 dark:text-white">
                    {semaforoEstatal.puntaje25Total}
                  </span>
                </div>
                <div className="rounded-xl bg-red-500/15 dark:bg-red-500/25 border border-red-500/35 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-bell text-rose-600 dark:text-rose-400 text-[11px]"></i>
                    Sin Colegiar ≥25
                  </span>
                  <span className="text-sm font-black text-red-800 dark:text-white">
                    {semaforoEstatal.criticosSinColegiar}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA GLOBAL DE DISTRIBUCIÓN DEL SEMÁFORO ESTATAL */}
          <div className="w-full h-8 rounded-2xl bg-white/95 dark:bg-slate-900/90 overflow-hidden flex p-1 gap-1 border border-slate-300 dark:border-white/15 shadow-lg">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-l-xl flex items-center justify-center text-xs font-black text-white drop-shadow-sm transition-all duration-500 min-w-[48px]"
              style={{ width: `${semaforoEstatal.pctVerde}%` }}
              title={`Casos Colegiados: ${semaforoEstatal.colegiados} (${semaforoEstatal.pctVerde}%)`}
            >
              {semaforoEstatal.pctVerde}%
            </div>
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-xs font-black text-slate-950 drop-shadow-sm transition-all duration-500 min-w-[48px]"
              style={{ width: `${semaforoEstatal.pctAmarillo}%` }}
              title={`Alerta Clínica en Revisión: ${semaforoEstatal.alertaClinicaTotal} (${semaforoEstatal.pctAmarillo}%)`}
            >
              {semaforoEstatal.pctAmarillo}%
            </div>
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-r-xl flex items-center justify-center text-xs font-black text-white drop-shadow-sm transition-all duration-500 min-w-[48px]"
              style={{ width: `${semaforoEstatal.pctRojo}%` }}
              title={`Críticos ≥25 Pendientes: ${semaforoEstatal.criticosSinColegiar} (${semaforoEstatal.pctRojo}%)`}
            >
              {semaforoEstatal.pctRojo}%
            </div>
          </div>
        </section>

        {/* FILTROS DE BÚSQUEDA ESTATAL */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 space-y-4 shadow-xl transition-colors">
          {/* SELECTOR CLASIFICACIÓN DE RIESGO: BAJO (<4), ALTO (4-24), MUY ALTO (≥25), TODOS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-emerald-600 dark:text-emerald-400"></i>
                <span>Clasificación por Nivel de Riesgo MARO</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Seleccione el grupo de pacientes que desea auditar en la tabla
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => cambiarFiltroRiesgo("todos")}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "todos"
                    ? "border-blue-500 dark:border-blue-400 bg-blue-500/20 text-blue-950 dark:text-blue-100 shadow-sm ring-2 ring-blue-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/10">
                  {statsGlobales.total_pacientes || totalRegistros}
                </span>
              </button>

              <button
                type="button"
                onClick={() => cambiarFiltroRiesgo("bajo")}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "bajo"
                    ? "border-emerald-500 dark:border-emerald-400 bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Bajo (&lt;4 pts)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                  {statsGlobales.conteo_bajo || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => cambiarFiltroRiesgo("alto")}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "alto"
                    ? "border-amber-500 dark:border-amber-400 bg-amber-500/20 text-amber-950 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Alto (4-24 pts)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
                  {statsGlobales.conteo_alto || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => cambiarFiltroRiesgo("muy_alto")}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroRiesgo === "muy_alto"
                    ? "border-rose-500 dark:border-rose-400 bg-rose-500/20 text-rose-950 dark:text-rose-100 shadow-sm ring-2 ring-rose-500/30 font-black"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-rose-500/10"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Muy Alto (≥25 pts)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200">
                  {statsGlobales.conteo_muy_alto || 0}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <i className="fa-solid fa-filter text-emerald-600 dark:text-emerald-400"></i>
              <span>Filtro de Gestión y Búsqueda</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {(filtroRiesgo === "muy_alto" || filtroRiesgo === "todos") ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEstadoCorte("todos")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                      estadoCorte === "todos"
                        ? "border-cyan-500 dark:border-cyan-400 bg-cyan-500/15 dark:bg-cyan-500/25 text-cyan-900 dark:text-cyan-200 shadow-sm"
                        : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    Todos en corte ({registrosFiltrados.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoCorte("no_colegiados")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                      estadoCorte === "no_colegiados"
                        ? "border-amber-500 dark:border-amber-400 bg-amber-500/15 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 shadow-sm"
                        : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    No colegiados ({conteoNoColegiados})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoCorte("colegiados")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                      estadoCorte === "colegiados"
                        ? "border-emerald-500 dark:border-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 shadow-sm"
                        : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    Colegiados ({conteoColegiados})
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-xl border border-slate-200 dark:border-white/10">
                  <i className="fa-solid fa-circle-info text-blue-500"></i>
                  <span>Seguimiento prenatal general (Los planes colegiados aplican a Muy Alto Riesgo ≥25 pts)</span>
                </span>
              )}

              {(regionFilter || unidadFilter || folioFilter) && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl px-2.5 py-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <i className="fa-solid fa-rotate-left text-[10px]"></i>
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setUnidadFilter("");
              }}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-white/10 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
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
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-white/10 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
            >
              <option value="">Todas las unidades</option>
              {unidadesDisponibles.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="search"
                placeholder="Buscar por folio o nombre..."
                value={folioFilter}
                onChange={(e) => setFolioFilter(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-white/10 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* CONCENTRADO ESTATAL DE RIESGO */}
        <section className={`rounded-2xl border bg-white/95 dark:bg-slate-900/85 p-5 space-y-4 shadow-xl transition-colors ${
          filtroRiesgo === "muy_alto"
            ? "border-rose-300 dark:border-rose-500/35"
            : filtroRiesgo === "alto"
            ? "border-amber-300 dark:border-amber-500/35"
            : filtroRiesgo === "bajo"
            ? "border-emerald-300 dark:border-emerald-500/35"
            : "border-slate-200 dark:border-white/10"
        }`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3.5 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                filtroRiesgo === "muy_alto"
                  ? "bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-400/40 text-rose-600 dark:text-rose-400"
                  : filtroRiesgo === "alto"
                  ? "bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-400/40 text-amber-600 dark:text-amber-400"
                  : filtroRiesgo === "bajo"
                  ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/40 text-blue-600 dark:text-blue-400"
              }`}>
                <i className={`fa-solid ${
                  filtroRiesgo === "muy_alto"
                    ? "fa-triangle-exclamation animate-pulse"
                    : filtroRiesgo === "alto"
                    ? "fa-shield-halved"
                    : filtroRiesgo === "bajo"
                    ? "fa-circle-check"
                    : "fa-users"
                } text-lg`}></i>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Padrón Estatal de Pacientes</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    filtroRiesgo === "muy_alto"
                      ? "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-400/40"
                      : filtroRiesgo === "alto"
                      ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-400/40"
                      : filtroRiesgo === "bajo"
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-400/40"
                      : "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-400/40"
                  }`}>
                    {filtroRiesgo === "muy_alto"
                      ? "Muy Alto Riesgo (≥25 pts)"
                      : filtroRiesgo === "alto"
                      ? "Alto Riesgo (4-24 pts)"
                      : filtroRiesgo === "bajo"
                      ? "Bajo Riesgo (<4 pts)"
                      : "Padrón Completo"}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Mostrando {registrosSegmentados.length} de {registros.length} expedientes en este grupo
                </p>
              </div>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
              filtroRiesgo === "muy_alto"
                ? "bg-rose-100 dark:bg-rose-500/25 border-rose-300 dark:border-rose-400/40 text-rose-900 dark:text-rose-200"
                : filtroRiesgo === "alto"
                ? "bg-amber-100 dark:bg-amber-500/25 border-amber-300 dark:border-amber-400/40 text-amber-900 dark:text-amber-200"
                : filtroRiesgo === "bajo"
                ? "bg-emerald-100 dark:bg-emerald-500/25 border-emerald-300 dark:border-emerald-400/40 text-emerald-900 dark:text-emerald-200"
                : "bg-blue-100 dark:bg-blue-500/25 border-blue-300 dark:border-blue-400/40 text-blue-900 dark:text-blue-200"
            }`}>
              {registrosSegmentados.length} {registrosSegmentados.length === 1 ? "caso" : "casos"}
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center gap-2">
              <i className="fa-solid fa-spinner fa-spin text-emerald-600 dark:text-emerald-400"></i>
              <span>Cargando registros estatales...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/20 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400"></i>
              <span>{error}</span>
            </div>
          ) : registros.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              No hay pacientes registrados en este nivel de riesgo.
            </div>
          ) : registrosSegmentados.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              No hay coincidencias para los filtros aplicados.
            </div>
          ) : (
            <>
              <div className="max-h-[440px] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-xs table-fixed text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold">
                    <tr className="whitespace-nowrap">
                      <th className="w-[125px] px-3 py-2.5">Folio</th>
                      <th className="px-3 py-2.5">Paciente</th>
                      <th className="w-[12%] px-2.5 py-2.5 hidden md:table-cell">Región</th>
                      <th className="w-[22%] px-3 py-2.5 hidden lg:table-cell">Unidad</th>
                      <th className="w-[95px] px-2.5 py-2.5 hidden sm:table-cell">Consulta</th>
                      <th className="w-[155px] text-right px-2.5 py-2.5">Riesgo / Motivo</th>
                      <th className="w-[82px] text-center px-2 py-2.5 hidden sm:table-cell">Colegiado</th>
                      <th className="w-[78px] text-center pl-2 pr-3.5 py-2.5">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {registrosPaginados.map((row) => {
                      const esEdadCritica = Number(row.edad) >= 10 && Number(row.edad) <= 14;
                      return (
                        <tr
                          key={`${row.consulta_id || 0}-${row.paciente_id}`}
                          className={`transition-colors whitespace-nowrap ${
                            esEdadCritica
                              ? "bg-rose-50/80 dark:bg-rose-950/35 hover:bg-rose-100/80 dark:hover:bg-rose-900/30"
                              : "hover:bg-slate-50 dark:hover:bg-white/5"
                          }`}
                        >
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200 truncate" title={row.folio || ""}>
                            {row.folio || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold truncate" title={row.nombre_completo || ""}>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{row.nombre_completo || "Sin nombre"}</span>
                              {esEdadCritica && (
                                <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40">
                                  ⚠ {row.edad}a
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5 text-slate-600 dark:text-slate-300 hidden md:table-cell truncate" title={row.region || ""}>
                            {row.region || "—"}
                          </td>
                          <td
                            className="px-3 py-2.5 text-slate-600 dark:text-slate-300 hidden lg:table-cell truncate"
                            title={`${row.unidad || ""}${row.clues_id ? ` (${row.clues_id})` : ""}`}
                          >
                            {row.unidad || "—"}
                            {row.clues_id && (
                              <span className="ml-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                ({row.clues_id})
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-2.5 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                            {formatDate(row.fecha_consulta)}
                          </td>
                          <td className="px-2.5 py-2.5 text-right">
                            {Number(row.alerta_por_criterio_clinico) === 1 ? (
                              <div
                                className="inline-flex items-center justify-end max-w-full"
                                title={row.motivo_alerta || "Criterio clínico"}
                              >
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-500/25 border border-amber-300 dark:border-amber-400/40 text-amber-900 dark:text-amber-200 truncate max-w-[140px]">
                                  {row.motivo_alerta || "Criterio clínico"}
                                </span>
                              </div>
                            ) : (() => {
                              const nivel = clasificarNivelRiesgo(
                                Number(row.puntaje_total_consulta),
                                Number(row.alerta_por_criterio_clinico) === 1,
                                Number(row.riesgo_25_plus) === 1
                              );
                              if (nivel === "MUY ALTO") {
                                return (
                                  <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-rose-100 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-400/40">
                                    {row.puntaje_total_consulta} pts · MUY ALTO
                                  </span>
                                );
                              }
                              if (nivel === "ALTO") {
                                return (
                                  <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/40">
                                    {row.puntaje_total_consulta} pts · ALTO
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-400/40">
                                  {row.puntaje_total_consulta} pts · BAJO
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                            {Number(row.puntaje_total_consulta) < 25 && Number(row.riesgo_25_plus) !== 1 ? (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                N/A
                              </span>
                            ) : Number(row.colegiado) === 1 ? (
                              <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-400/40">
                                Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/15">
                                No
                              </span>
                            )}
                          </td>
                          <td className="pl-2 pr-3.5 py-2.5 text-center">
                            <Link
                              href={`/estatal/pacientes/${row.paciente_id}`}
                              className="inline-flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 border border-slate-300 dark:border-white/20 rounded-lg px-2.5 py-1 transition-colors"
                            >
                              <span>Ver</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {registrosSegmentados.length > perPage && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
