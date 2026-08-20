"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Patient = {
  id: number;
  folio: string | null;
  nombre_completo: string | null;
  clues_id: string;
  municipio: string | null;
  localidad: string | null;
  telefono: string | null;
  madrina_nombre: string | null;
  madrina_telefono: string | null;
  fecha_ingreso_cpn: string | null;
  fum: string | null;
  fpp: string | null;
  edad: number | null;
  imc_inicial: number | null;
  sdg_ingreso: number | null;
  semanas_gestacion: number | null;
  factor_riesgo_antecedentes: number | null;
  factor_riesgo_tamizajes: number | null;
  puntaje_ultima_consulta: number | null;
  puntaje_total_actual: number | null;
  ultima_consulta_fecha?: string | null;
  dias_sin_consulta?: number | null;
};

type SessionInfo = {
  clues: string;
  unidad: string;
  region: string;
  municipio: string;
  nivel: number;
  displayName?: string;
};

type FilterType = "todos" | "critico" | "alto" | "bajo" | "inasistencia" | "proxima_vencer" | "al_corriente";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("todos");
  const [showInasistenciasModal, setShowInasistenciasModal] = useState(false);
  
  const [metrics, setMetrics] = useState({
    total: 0,
    alto_riesgo: 0,
    inasistencias_30d: 0,
    proximas_vencer: 0,
    al_corriente: 0,
    semana_actual: 0,
    semana_ingreso: 0,
    semana_sistema: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showEmptyReportModal, setShowEmptyReportModal] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      setUser(JSON.parse(stored));
      setAuthChecked(true);
    } catch {
      localStorage.removeItem("maro:user");
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked || !user) return;

    let cancelled = false;
    const load = async () => {
      setLoadingPatients(true);
      try {
        const params = new URLSearchParams({ limit: "all" });
        if (user?.clues) params.set("clues_id", user.clues);
        if (!user?.clues && user?.region) params.set("region", user.region);

        const res = await fetch(`/api/pacientes?${params.toString()}`);
        if (!res.ok) throw new Error("Error al obtener pacientes");
        const data = await res.json();
        if (!cancelled) {
          setPatients(Array.isArray(data) ? data : []);
          setPatientsError(null);
        }
      } catch (err: any) {
        if (!cancelled) setPatientsError(err.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authChecked, user]);

  useEffect(() => {
    if (!authChecked || !user) return;

    let cancelled = false;
    const loadMetrics = async () => {
      setLoadingMetrics(true);
      try {
        const params = new URLSearchParams({ summary: "metrics" });
        if (user?.clues) params.set("clues_id", user.clues);
        if (!user?.clues && user?.region) params.set("region", user.region);

        const fetchMetrics = async (qs: string) => {
          const res = await fetch(`/api/pacientes?${qs}`);
          if (!res.ok) throw new Error("No se pudieron cargar métricas");
          return res.json();
        };

        const data = await fetchMetrics(params.toString());

        if (!cancelled) {
          setMetrics({
            total: Number(data.total) || 0,
            alto_riesgo: Number(data.alto_riesgo) || 0,
            inasistencias_30d: Number(data.inasistencias_30d) || 0,
            proximas_vencer: Number(data.proximas_vencer) || 0,
            al_corriente: Number(data.al_corriente) || 0,
            semana_actual: Number(data.semana_actual) || 0,
            semana_ingreso: Number(data.semana_ingreso) || 0,
            semana_sistema: Number(data.semana_sistema) || 0,
          });
          setMetricsError(null);
        }
      } catch (err: any) {
        if (!cancelled) setMetricsError(err.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    };

    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [authChecked, user]);

  /** Helper para calcular el estado del semáforo de seguimiento por paciente */
  const getSeguimientoStatus = (p: Patient) => {
    const dias = p.dias_sin_consulta ?? 0;
    if (dias > 30) {
      return {
        tipo: "inasistencia",
        label: `Inasistencia (${dias}d)`,
        dias,
        colorBadge: "bg-rose-500/25 text-rose-200 border-rose-400/50",
        dotColor: "bg-rose-400 animate-pulse",
        icono: "fa-solid fa-triangle-exclamation",
        descripcion: "Mayor a 30 días sin consulta",
      };
    }
    if (dias >= 21) {
      return {
        tipo: "proxima_vencer",
        label: `Próx. a vencer (${dias}d)`,
        dias,
        colorBadge: "bg-amber-500/25 text-amber-200 border-amber-400/50",
        dotColor: "bg-amber-400",
        icono: "fa-solid fa-clock",
        descripcion: "Entre 21 y 30 días",
      };
    }
    return {
      tipo: "al_corriente",
      label: `Al corriente (${dias}d)`,
      dias,
      colorBadge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
      dotColor: "bg-emerald-400",
      icono: "fa-solid fa-circle-check",
      descripcion: "Menos de 21 días",
    };
  };

  // Contadores calculados en memoria
  const counts = useMemo(() => {
    let critico = 0;
    let alto = 0;
    let bajo = 0;
    let inasistencia = 0;
    let proximaVencer = 0;
    let alCorriente = 0;

    for (const p of patients) {
      const score = p.puntaje_total_actual ?? 0;
      if (score >= 25) critico++;
      else if (score >= 4) alto++;
      else bajo++;

      const dias = p.dias_sin_consulta ?? 0;
      if (dias > 30) inasistencia++;
      else if (dias >= 21) proximaVencer++;
      else alCorriente++;
    }

    return { critico, alto, bajo, inasistencia, proximaVencer, alCorriente, total: patients.length };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    let result = patients;

    // Filtro de texto por Folio o Nombre
    if (searchTerm.trim()) {
      const q = searchTerm
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      result = result.filter((p) => {
        const nombre = (p.nombre_completo || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const folio = (p.folio || "").toLowerCase();
        return nombre.includes(q) || folio.includes(q);
      });
    }

    // Filtro por Estado / Semáforo
    if (activeFilter !== "todos") {
      result = result.filter((p) => {
        const score = p.puntaje_total_actual ?? 0;
        const dias = p.dias_sin_consulta ?? 0;

        if (activeFilter === "critico") return score >= 25;
        if (activeFilter === "alto") return score >= 4 && score < 25;
        if (activeFilter === "bajo") return score < 4;
        if (activeFilter === "inasistencia") return dias > 30;
        if (activeFilter === "proxima_vencer") return dias >= 21 && dias <= 30;
        if (activeFilter === "al_corriente") return dias < 21;
        return true;
      });
    }

    return result;
  }, [patients, searchTerm, activeFilter]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  /** Calcula SDG actuales a partir de la FUM (notación médica: semanas.días) */
  const calcularSdgActual = (p: Patient): string => {
    if (p.fum) {
      const fumDate = new Date(p.fum);
      if (!Number.isNaN(fumDate.getTime())) {
        const hoy = new Date();
        const diffMs = hoy.getTime() - fumDate.getTime();
        const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const weeks = Math.floor(totalDays / 7);
        const days = totalDays % 7;
        if (weeks >= 0 && weeks <= 45) {
          return `${weeks}.${days}`;
        }
      }
    }
    if (p.semanas_gestacion != null) return String(p.semanas_gestacion);
    if (p.sdg_ingreso != null) return String(p.sdg_ingreso);
    return "—";
  };

  const handleGenerateExcel = async () => {
    if (patients.length === 0) {
      setShowEmptyReportModal(true);
      return;
    }

    setGeneratingReport(true);
    setReportError(null);

    try {
      const res = await fetch("/api/pacientes/reportes/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: patients,
          clues: user?.clues || undefined,
          unidad: user?.unidad || undefined,
          region: user?.region || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Error al generar el censo en Excel");
      }

      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `censo-pacientes-${user?.clues || 'unidad'}-${stamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setReportError(err?.message || "No se pudo generar el censo en Excel");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignorar errores de red
    } finally {
      localStorage.removeItem("maro:user");
      router.replace("/inicial");
    }
  };

  const pacientesInasistentes = useMemo(() => {
    return patients.filter((p) => (p.dias_sin_consulta ?? 0) > 30);
  }, [patients]);

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-200 bg-slate-900">
        Validando acceso...
      </main>
    );
  }

  return (
    <main
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,118,110,0.65)), url(/maro-hero.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/40 mix-blend-multiply" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* ENCABEZADO PRINCIPAL DE LA UNIDAD */}
        <header className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-6 shadow-2xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Identidad de la Unidad */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-emerald-300">
                  Panel Principal
                </span>
                {user?.clues && (
                  <span className="text-xs bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    CLUES: {user.clues}
                  </span>
                )}
                {user?.region && (
                  <span className="text-xs bg-white/10 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-full">
                    {user.region}
                  </span>
                )}
                {user?.municipio && (
                  <span className="text-xs bg-white/10 border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-full">
                    {user.municipio}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <i className="fa-solid fa-hospital text-emerald-400"></i>
                <span>{user?.unidad || "Unidad Médica de Atención"}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Monitoreo prenatal, censo obstétrico, vigilancia de inasistencias y clasificación MARO
              </p>
            </div>

            {/* Botones de Acción Rápida */}
            <div className="flex flex-wrap items-center gap-2.5">
              {(user?.nivel ?? 0) >= 3 && (
                <Link
                  href="/estatal"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-rose-200 bg-rose-500/20 border border-rose-400/40 px-3.5 py-2 rounded-xl hover:bg-rose-500/30 transition shadow-sm"
                >
                  <i className="fa-solid fa-shield-halved text-rose-300"></i>
                  <span>Módulo Estatal</span>
                </Link>
              )}
              <Link
                href="/pacientes/nuevo"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>+ Nueva Paciente</span>
              </Link>
              <Link
                href="/puerperio/nuevo"
                className="inline-flex items-center gap-2 text-xs font-bold text-white bg-purple-600/80 hover:bg-purple-500 px-3.5 py-2 rounded-xl border border-purple-400/40 transition shadow-lg shadow-purple-950/40 cursor-pointer"
              >
                <i className="fa-solid fa-person-breastfeeding"></i>
                <span>+ Puerperio</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-white/20 rounded-xl px-3 py-2 hover:bg-white/10 transition cursor-pointer"
                title="Cerrar sesión activa"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <span>Salir</span>
              </button>
            </div>

          </div>
        </header>

        {/* BANNER DE ALERTA EPIDEMIOLÓGICA DE INASISTENCIA (SI HAY PACIENTES >30 DÍAS) */}
        {counts.inasistencia > 0 && (
          <div className="rounded-2xl border-2 border-rose-500/80 bg-rose-500/25 p-4 sm:p-5 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-600/40 border border-rose-400/60 flex items-center justify-center text-rose-200 text-xl shrink-0 animate-pulse">
                <i className="fa-solid fa-bell"></i>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-rose-300">
                    Alerta de Inasistencia Prenatal
                  </span>
                  <span className="text-[10px] bg-rose-500 text-white font-black px-2 py-0.5 rounded-full">
                    {counts.inasistencia} {counts.inasistencia === 1 ? "paciente" : "pacientes"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-rose-100">
                  Hay {counts.inasistencia} paciente(s) con más de 30 días sin acudir a consulta. Se requiere búsqueda activa domiciliaria o contacto telefónico.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowInasistenciasModal(true)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-950 bg-white hover:bg-rose-100 px-4 py-2 rounded-xl transition shadow-lg cursor-pointer"
              >
                <i className="fa-solid fa-address-card text-rose-600"></i>
                <span>Censo de Búsqueda Activa</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("inasistencia")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-200 bg-rose-900/50 hover:bg-rose-900/80 border border-rose-400/40 px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <span>Filtrar Tabla</span>
              </button>
            </div>
          </div>
        )}

        {/* FILA DE 4 KPI CARDS PRINCIPALES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total de Pacientes */}
          <div className="rounded-2xl border border-emerald-400/30 bg-white/10 backdrop-blur-md p-5 shadow-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Pacientes en Unidad
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {loadingMetrics ? "…" : metrics.total}
                </span>
                <span className="text-xs text-slate-300 font-medium">expedientes</span>
              </div>
              <p className="text-[11px] text-slate-400">Población obstétrica activa</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 text-xl shrink-0">
              <i className="fa-solid fa-hospital-user"></i>
            </div>
          </div>

          {/* Card 2: Semáforo de Inasistencias / Seguimiento */}
          <div className="rounded-2xl border border-rose-400/30 bg-white/10 backdrop-blur-md p-5 shadow-xl flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Vigilancia CPN
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                counts.inasistencia > 0 ? "bg-rose-500/30 text-rose-200 border border-rose-400/50" : "bg-emerald-500/20 text-emerald-200"
              }`}>
                {counts.inasistencia > 0 ? `${counts.inasistencia} sin acudir` : "100% al corriente"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
              <button
                type="button"
                onClick={() => setActiveFilter("al_corriente")}
                className="bg-emerald-500/15 border border-emerald-400/30 hover:bg-emerald-500/25 rounded-lg py-1 px-1 text-center transition cursor-pointer"
                title="Al corriente (<21 días)"
              >
                <span className="text-[10px] text-emerald-300 font-medium block">🟢 Al corr.</span>
                <span className="text-sm font-bold text-white">{counts.alCorriente}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("proxima_vencer")}
                className="bg-amber-500/15 border border-amber-400/30 hover:bg-amber-500/25 rounded-lg py-1 px-1 text-center transition cursor-pointer"
                title="Próxima a vencer (21-30 días)"
              >
                <span className="text-[10px] text-amber-300 font-medium block">🟡 Próx.</span>
                <span className="text-sm font-bold text-white">{counts.proximaVencer}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("inasistencia")}
                className="bg-rose-500/20 border border-rose-400/40 hover:bg-rose-500/30 rounded-lg py-1 px-1 text-center transition cursor-pointer"
                title="Inasistencia (>30 días)"
              >
                <span className="text-[10px] text-rose-300 font-medium block">🔴 &gt;30d</span>
                <span className="text-sm font-bold text-rose-200">{counts.inasistencia}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Muy Alto Riesgo (≥25 pts) */}
          <div className="rounded-2xl border border-amber-400/30 bg-white/10 backdrop-blur-md p-5 shadow-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Muy Alto Riesgo (≥25)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {loadingMetrics ? "…" : metrics.alto_riesgo}
                </span>
                <span className="text-xs text-slate-300 font-medium">casos</span>
              </div>
              <p className="text-[11px] text-slate-400">Atención y enlace prioritario</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-xl shrink-0">
              <i className="fa-solid fa-shield-heart"></i>
            </div>
          </div>

          {/* Card 4: Generar Censo de Pacientes (Excel) */}
          <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/15 backdrop-blur-md p-5 shadow-xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Censo de Pacientes
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-sm">
                <i className="fa-solid fa-file-excel"></i>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateExcel}
              disabled={generatingReport}
              className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 py-2 px-3 rounded-xl transition shadow-md shadow-cyan-950/40 disabled:opacity-60 cursor-pointer"
            >
              {generatingReport ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Generando censo...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-download"></i>
                  <span>Generar Censo Excel</span>
                </>
              )}
            </button>
          </div>

        </section>

        {reportError && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-500/20 p-4 text-sm text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-400"></i>
              <span>{reportError}</span>
            </div>
            <button
              type="button"
              onClick={() => setReportError(null)}
              className="text-xs text-rose-300 hover:text-white underline cursor-pointer"
            >
              Descartar
            </button>
          </div>
        )}

        {/* SECCIÓN PRINCIPAL: EXPEDIENTES DE LA UNIDAD */}
        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-6 space-y-5 shadow-2xl">
          
          {/* Cabecera de la Sección y Herramientas */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <i className="fa-solid fa-address-book text-emerald-400"></i>
                  <span>Censo y Expedientes Registrados</span>
                </h2>
                <span className="text-xs text-emerald-200 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-bold">
                  {patients.length} {patients.length === 1 ? "paciente" : "pacientes"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {searchTerm || activeFilter !== "todos"
                  ? `Mostrando ${filteredPatients.length} de ${patients.length} registros filtrados`
                  : "Todos los expedientes obstétricos registrados en tu unidad médica"}
              </p>
            </div>

            {/* Filtros Rápidos por Riesgo y Semáforo de Inasistencias */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter("todos")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  activeFilter === "todos"
                    ? "bg-white/20 border-white/40 text-white shadow-sm"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                Todos ({counts.total})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("inasistencia")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  activeFilter === "inasistencia"
                    ? "bg-rose-500/30 border-rose-400 text-rose-100 shadow-sm font-bold"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
                }`}
              >
                🔴 &gt;30d Inasistencia ({counts.inasistencia})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("proxima_vencer")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  activeFilter === "proxima_vencer"
                    ? "bg-amber-500/30 border-amber-400 text-amber-100 shadow-sm"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                }`}
              >
                🟡 Próx. Cita ({counts.proximaVencer})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("critico")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  activeFilter === "critico"
                    ? "bg-purple-500/30 border-purple-400 text-purple-100 shadow-sm"
                    : "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                }`}
              >
                ≥25 Muy Alto ({counts.critico})
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <i className="fa-solid fa-magnifying-glass text-xs"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por folio o nombre de paciente..."
                className="w-full rounded-xl border border-white/15 bg-white/5 pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>

            {(searchTerm || activeFilter !== "todos") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveFilter("todos");
                }}
                className="text-xs text-slate-300 hover:text-white border border-white/15 bg-white/5 px-3 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <i className="fa-solid fa-filter-circle-xmark text-xs"></i>
                <span>Restablecer filtros</span>
              </button>
            )}
          </div>

          {/* CONTENIDO DE LA TABLA */}
          {loadingPatients ? (
            <div className="py-16 text-center space-y-3">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-400"></i>
              <p className="text-xs text-slate-300">Cargando expedientes de la unidad…</p>
            </div>
          ) : patientsError ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation text-rose-400"></i>
              <span>{patientsError}</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300 text-2xl">
                <i className="fa-solid fa-user-plus"></i>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Sin pacientes registrados en esta unidad</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Comienza capturando el primer expediente obstétrico para calcular factores de riesgo y seguimiento prenatal.
                </p>
              </div>
              <Link
                href="/pacientes/nuevo"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-950/40"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Registrar Nueva Paciente</span>
              </Link>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 text-xl">
                <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <div className="space-y-1">
                <p className="text-white font-bold text-sm">
                  Sin coincidencias para los filtros seleccionados
                </p>
                <p className="text-xs text-slate-400">
                  Prueba cambiando el término de búsqueda o seleccionando otra categoría.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveFilter("todos");
                }}
                className="text-xs text-emerald-300 border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 rounded-xl hover:bg-emerald-500/20 transition font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-rotate-left"></i>
                <span>Restablecer Filtros</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-xl border border-white/10 shadow-inner">
              <table className="min-w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-white/10 text-slate-300">
                  <tr>
                    <th className="py-3 px-3.5 font-bold">Folio</th>
                    <th className="py-3 px-3.5 font-bold">Paciente</th>
                    <th className="py-3 px-3.5 font-bold">SDG Actuales</th>
                    <th className="py-3 px-3.5 font-bold text-center">Seguimiento CPN</th>
                    <th className="py-3 px-3.5 font-bold text-center">Antecedentes</th>
                    <th className="py-3 px-3.5 font-bold text-center">Tamizajes</th>
                    <th className="py-3 px-3.5 font-bold text-center">Riesgo Total</th>
                    <th className="py-3 px-3.5 text-right font-bold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPatients.map((p) => {
                    const totalScore = p.puntaje_total_actual ?? 0;
                    const antScore = p.factor_riesgo_antecedentes ?? 0;
                    const tamScore = p.factor_riesgo_tamizajes ?? 0;
                    const seguimiento = getSeguimientoStatus(p);

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        {/* Folio */}
                        <td className="py-2.5 px-3.5 text-white font-mono font-bold whitespace-nowrap">
                          {p.folio || "—"}
                        </td>

                        {/* Nombre */}
                        <td className="py-2.5 px-3.5 text-white font-medium">
                          <div className="flex flex-col">
                            <span>{p.nombre_completo || "Sin nombre registrado"}</span>
                            {p.telefono && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <i className="fa-solid fa-phone text-[9px]"></i>
                                <span>{p.telefono}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SDG Actuales + Ingreso */}
                        <td className="py-2.5 px-3.5 text-slate-300">
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{calcularSdgActual(p)}</span>
                            {p.sdg_ingreso != null && (
                              <span className="text-[10px] text-slate-400">Ingreso: {p.sdg_ingreso} sem</span>
                            )}
                          </div>
                        </td>

                        {/* Semáforo de Seguimiento CPN */}
                        <td className="py-2.5 px-3.5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${seguimiento.colorBadge}`}>
                              <span className={`w-2 h-2 rounded-full ${seguimiento.dotColor}`} />
                              <span>{seguimiento.label}</span>
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              {p.ultima_consulta_fecha ? `Última: ${formatDate(p.ultima_consulta_fecha)}` : `Ingreso: ${formatDate(p.fecha_ingreso_cpn)}`}
                            </span>
                          </div>
                        </td>

                        {/* Antecedentes */}
                        <td className="py-2.5 px-3.5 text-center">
                          {antScore > 0 ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              antScore <= 3 ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' :
                              antScore <= 9 ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30' :
                              'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                            }`}>
                              +{antScore} pts
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">0 pts</span>
                          )}
                        </td>

                        {/* Tamizajes */}
                        <td className="py-2.5 px-3.5 text-center">
                          {tamScore > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                              +{tamScore} pts
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">0 pts</span>
                          )}
                        </td>

                        {/* Total Actual */}
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            totalScore >= 25
                              ? 'bg-rose-500/25 text-rose-200 border border-rose-400/50'
                              : totalScore >= 10
                              ? 'bg-orange-500/25 text-orange-200 border border-orange-400/50'
                              : totalScore >= 4
                              ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50'
                              : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                          }`}>
                            {totalScore} pts
                          </span>
                        </td>

                        {/* Acción */}
                        <td className="py-2.5 px-3.5 text-right">
                          <Link
                            href={`/pacientes/${p.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200 bg-cyan-500/15 border border-cyan-400/40 px-3 py-1 rounded-xl hover:bg-cyan-500/30 hover:text-white transition"
                          >
                            <span>Expediente</span>
                            <i className="fa-solid fa-chevron-right text-[10px]"></i>
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

        {/* MODAL: CENSO DE BÚSQUEDA INTENCIONADA DE INASISTENCIAS (>30 DÍAS) */}
        {showInasistenciasModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowInasistenciasModal(false)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-rose-400/40 bg-slate-900/95 text-slate-100 shadow-2xl shadow-rose-950/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-rose-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 text-xl shrink-0">
                    <i className="fa-solid fa-person-walking-arrow-right"></i>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-400 block">
                      Vigilancia Epidemiológica
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      Censo de Búsqueda Intencionada ({pacientesInasistentes.length} pacientes &gt;30d)
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInasistenciasModal(false)}
                  className="text-slate-400 hover:text-white rounded-full p-1.5 transition cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {/* Contenido Modal */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Listado nominal de pacientes que superan los 30 días sin acudir a control prenatal en la unidad. Utilice los datos de contacto y la red comunitaria (madrina obstétrica) para programar visitas o llamadas inmediatas.
                </p>

                <div className="space-y-3">
                  {pacientesInasistentes.map((p) => {
                    const dias = p.dias_sin_consulta ?? 0;
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-rose-400/30 bg-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/10 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-emerald-300">{p.folio || "—"}</span>
                            <span className="text-sm font-bold text-white">{p.nombre_completo || "Sin nombre"}</span>
                            <span className="text-xs bg-rose-500/20 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-full font-bold">
                              🔴 {dias} días sin acudir
                            </span>
                            <span className="text-xs bg-white/10 text-slate-200 px-2 py-0.5 rounded-full">
                              SDG: {calcularSdgActual(p)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
                            <div>
                              <span className="text-slate-400">Teléfono: </span>
                              <strong className="text-white">{p.telefono || "No registrado"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Madrina obstétrica: </span>
                              <strong className="text-white">
                                {p.madrina_nombre || "No asignada"} {p.madrina_telefono ? `(${p.madrina_telefono})` : ""}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Localidad: </span>
                              <span>{p.localidad || p.municipio || "—"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Última consulta: </span>
                              <span>{formatDate(p.ultima_consulta_fecha || p.fecha_ingreso_cpn)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {p.telefono && (
                            <a
                              href={`tel:${p.telefono}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 px-3 py-2 rounded-xl hover:bg-emerald-500/30 transition"
                            >
                              <i className="fa-solid fa-phone"></i>
                              <span>Llamar</span>
                            </a>
                          )}
                          <Link
                            href={`/pacientes/${p.id}`}
                            onClick={() => setShowInasistenciasModal(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-white hover:bg-slate-200 px-3.5 py-2 rounded-xl transition"
                          >
                            <span>Ver Expediente</span>
                            <i className="fa-solid fa-arrow-right text-[10px]"></i>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Modal */}
              <div className="p-4 border-t border-white/10 bg-slate-950/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInasistenciasModal(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE ADVERTENCIA: SIN PACIENTES */}
        {showEmptyReportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="empty-report-title"
            onClick={() => setShowEmptyReportModal(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl border border-amber-400/40 bg-slate-900/95 p-6 sm:p-8 text-slate-100 shadow-2xl shadow-amber-950/40 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowEmptyReportModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white rounded-full p-1 transition cursor-pointer"
                aria-label="Cerrar ventana modal"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-2xl shadow-inner">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
                    Censo de Pacientes
                  </span>
                  <h3 id="empty-report-title" className="text-xl font-bold text-white">
                    Sin pacientes registrados
                  </h3>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p>
                  No es posible generar el <strong className="text-white">Censo Clínico en Excel</strong> porque actualmente no hay pacientes registrados en tu unidad:
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-emerald-200 font-medium flex items-center gap-2">
                  <i className="fa-solid fa-hospital text-emerald-400"></i>
                  <div>
                    <span>{user?.unidad || "Unidad Médica"}</span>
                    <span className="text-xs text-slate-400 block font-normal mt-0.5">
                      CLUES: {user?.clues || "—"} | Región: {user?.region || "—"}
                    </span>
                  </div>
                </div>
                <p>
                  Para generar y exportar el censo clínico con folios, SDG y factores de riesgo, primero debes capturar al menos un expediente obstétrico.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmptyReportModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                >
                  Entendido
                </button>
                <Link
                  href="/pacientes/nuevo"
                  onClick={() => setShowEmptyReportModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/50 transition inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>Registrar nueva paciente</span>
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
