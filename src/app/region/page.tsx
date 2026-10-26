"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { REGION_CONFIGS } from "@/lib/regiones";
import { ThemeToggle } from "@/components/ThemeToggle";

type SessionInfo = {
  nivel?: number;
  region?: string;
  displayName?: string;
  rol?: string;
};

type Paciente = {
  id: number;
  folio: string;
  nombre_completo: string;
  clues_id: string;
  unidad?: string | null;
  municipio: string;
  fecha_ingreso_cpn: string | null;
  sdg_ingreso: number | null;
  semanas_gestacion: number | null;
  factor_riesgo_antecedentes: number | null;
  factor_riesgo_tamizajes: number | null;
  edad?: number | null;
  imc_inicial?: number | null;
  factor_cardiopatia?: number | null;
  factor_hepatopatia?: number | null;
  factor_coagulopatias?: number | null;
  factor_nefropatia?: number | null;
  ultima_consulta_id?: number | null;
  puntaje_ultima_consulta: number | null;
  puntaje_total_actual: number | null;
};

type Metricas = {
  total: number;
  alto_riesgo: number;
  semana_actual: number;
  al_corriente: number;
  proximas_vencer: number;
  inasistencias_30d: number;
};

type AlertaFlotante = {
  cantidad: number;
};

function riesgoColor(puntaje: number | null): string {
  if (puntaje === null) return "text-slate-400 dark:text-slate-500";
  if (puntaje >= 25) return "text-rose-700 dark:text-rose-400 font-black";
  if (puntaje > 15) return "text-amber-700 dark:text-amber-400 font-bold";
  return "text-emerald-700 dark:text-emerald-400 font-bold";
}

function riesgoBadge(puntaje: number | null) {
  if (puntaje === null) return null;
  if (puntaje >= 25)
    return (
      <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-500/25 border border-rose-300 dark:border-rose-400/40 text-rose-900 dark:text-rose-200">
        ALTO
      </span>
    );
  if (puntaje > 15)
    return (
      <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-500/25 border border-amber-300 dark:border-amber-400/40 text-amber-900 dark:text-amber-200">
        MEDIO
      </span>
    );
  return (
    <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/40 text-emerald-900 dark:text-emerald-200">
      BAJO
    </span>
  );
}

function esAlertaPorCriterioClinico(paciente: Paciente): boolean {
  const puntajeGeneral = Number(paciente.puntaje_total_actual) || 0;
  const edad = Number(paciente.edad);
  const imc = Number(paciente.imc_inicial);
  const porEdad = Number.isFinite(edad) && edad >= 10 && edad <= 14;
  const porImc = Number.isFinite(imc) && imc >= 31;
  const porPadecimientoMayor = [
    paciente.factor_cardiopatia,
    paciente.factor_hepatopatia,
    paciente.factor_coagulopatias,
    paciente.factor_nefropatia,
  ].some((value) => Number(value) === 1);
  return (porEdad || porImc || porPadecimientoMayor) && puntajeGeneral <= 25;
}

function motivoClinico(paciente: Paciente): string {
  const motivos: string[] = [];
  const edad = Number(paciente.edad);
  const imc = Number(paciente.imc_inicial);
  if (Number.isFinite(edad) && edad >= 10 && edad <= 14) motivos.push("Edad 10-14");
  if (Number.isFinite(imc) && imc >= 31) motivos.push(`IMC >=31 (${imc.toFixed(1)})`);
  if (Number(paciente.factor_cardiopatia) === 1) motivos.push("Cardiopatia");
  if (Number(paciente.factor_hepatopatia) === 1) motivos.push("Hepatopatia");
  if (Number(paciente.factor_coagulopatias) === 1) motivos.push("Coagulopatia");
  if (Number(paciente.factor_nefropatia) === 1) motivos.push("Nefropatia");
  return motivos.join(", ");
}

export default function RegionPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [folioFilter, setFolioFilter] = useState("");
  const [municipioFilter, setMunicipioFilter] = useState("");
  const [alertaFlotante, setAlertaFlotante] = useState<AlertaFlotante | null>(null);
  const [exportingReporte, setExportingReporte] = useState(false);
  const knownHighRiskRef = useRef<Set<string>>(new Set());

  const descargarReporteExcel = async () => {
    if (!session?.region) return;
    setExportingReporte(true);
    try {
      const res = await fetch(`/api/reportes/clinico?region=${encodeURIComponent(session.region)}`, {
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
      a.download = `reporte-clinico-maro-region-${session.region.toLowerCase()}-${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(errMsg || "Error al descargar el reporte clínico");
    } finally {
      setExportingReporte(false);
    }
  };
  const loadedOnceRef = useRef(false);

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }
    try {
      const s = JSON.parse(stored) as SessionInfo;
      if ((s.nivel ?? 0) < 2) {
        router.replace("/dashboard");
        return;
      }
      setSession(s);
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  const loadRegionData = useCallback(
    async (silent = false) => {
      if (!authChecked || !session?.region) return;
      const region = session.region;

      if (!silent) setLoading(true);
      setError("");

      try {
        const [listData, metData] = await Promise.all([
          fetch(`/api/pacientes?region=${encodeURIComponent(region)}&limit=50`, {
            cache: "no-store",
          }).then((r) => r.json()),
          fetch(`/api/pacientes?summary=metrics&region=${encodeURIComponent(region)}`, {
            cache: "no-store",
          }).then((r) => r.json()),
        ]);

        const nextPacientes = Array.isArray(listData) ? (listData as Paciente[]) : [];
        setPacientes(nextPacientes);
        setMetricas({
          total: metData.total ?? 0,
          alto_riesgo: metData.alto_riesgo ?? 0,
          semana_actual: metData.semana_actual ?? 0,
          al_corriente: metData.al_corriente ?? 0,
          proximas_vencer: metData.proximas_vencer ?? 0,
          inasistencias_30d: metData.inasistencias_30d ?? 0,
        });

        const nextHighRisk = new Set(
          nextPacientes
            .filter((p) => (p.puntaje_total_actual ?? 0) >= 25 || esAlertaPorCriterioClinico(p))
            .map((p) => `${p.id}-${p.ultima_consulta_id ?? "na"}`)
        );

        if (loadedOnceRef.current) {
          let nuevos = 0;
          for (const key of nextHighRisk) {
            if (!knownHighRiskRef.current.has(key)) nuevos += 1;
          }
          if (nuevos > 0) {
            setAlertaFlotante((prev) => ({
              cantidad: (prev?.cantidad ?? 0) + nuevos,
            }));
          }
        }

        knownHighRiskRef.current = nextHighRisk;
        loadedOnceRef.current = true;
      } catch {
        setError("Error al cargar datos. Verifica tu conexión.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authChecked, session]
  );

  // ── Carga inicial y sincronización en vivo ─────────────────────
  useEffect(() => {
    if (!authChecked || !session?.region) return;

    loadRegionData(false);

    const onFocus = () => {
      loadRegionData(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        loadRegionData(true);
      }
    };

    const intervalId = window.setInterval(() => {
      loadRegionData(true);
    }, 15000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [authChecked, loadRegionData, session]);

  const regionDisplay =
    REGION_CONFIGS.find((r) => r.id === session?.region)?.displayName ??
    session?.region ??
    "Región";

  const municipiosDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        pacientes
          .map((p) => String(p.municipio || "").trim())
          .filter((municipio) => municipio.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [pacientes]);

  const foliosDisponibles = useMemo(() => {
    const base = pacientes.filter((p) => {
      const matchBusqueda =
        busqueda === "" ||
        p.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase());
      const matchMunicipio =
        municipioFilter === "" ||
        p.municipio?.toLowerCase() === municipioFilter.toLowerCase();
      return matchBusqueda && matchMunicipio;
    });

    return Array.from(
      new Set(
        base
          .map((p) => String(p.folio || "").trim())
          .filter((folio) => folio.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [busqueda, municipioFilter, pacientes]);

  // Aplicar filtros
  const pacientesFiltrados = pacientes.filter((p) => {
    const matchBusqueda =
      busqueda === "" ||
      p.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchFolio =
      folioFilter === "" || p.folio?.toLowerCase().includes(folioFilter.toLowerCase());
    const matchMunicipio =
      municipioFilter === "" ||
      p.municipio?.toLowerCase().includes(municipioFilter.toLowerCase());
    return matchBusqueda && matchFolio && matchMunicipio;
  });

  // Separar por riesgo
  const altoRiesgo = pacientesFiltrados
    .filter((p) => (p.puntaje_total_actual ?? 0) >= 25 || esAlertaPorCriterioClinico(p))
    .sort((a, b) => (b.puntaje_total_actual ?? 0) - (a.puntaje_total_actual ?? 0));
  const bajoMedioRiesgo = pacientesFiltrados
    .filter((p) => (p.puntaje_total_actual ?? 0) < 25 && !esAlertaPorCriterioClinico(p))
    .sort((a, b) => (b.puntaje_total_actual ?? 0) - (a.puntaje_total_actual ?? 0));

  const semaforoStats = useMemo(() => {
    let conteoAlto = 0;
    let conteoPuntaje25 = 0;
    let conteoCriterioClinico = 0;
    let conteoMedio = 0;
    let conteoBajo = 0;

    for (const p of pacientes) {
      const score = p.puntaje_total_actual ?? 0;
      const alertaClinica = esAlertaPorCriterioClinico(p);
      if (score >= 25 || alertaClinica) {
        conteoAlto++;
        if (score >= 25) conteoPuntaje25++;
        if (alertaClinica) conteoCriterioClinico++;
      } else if (score > 15) {
        conteoMedio++;
      } else {
        conteoBajo++;
      }
    }

    const totalBase = Math.max(metricas?.total ?? 0, pacientes.length, 1);
    const altoTotal = Math.max(metricas?.alto_riesgo ?? 0, conteoAlto);
    const pctAlto = Math.min(100, Math.round((altoTotal / totalBase) * 100));
    const pctMedio = Math.min(100 - pctAlto, Math.round((conteoMedio / totalBase) * 100));
    const pctBajo = Math.max(0, 100 - pctAlto - pctMedio);

    return {
      conteoAlto: altoTotal,
      conteoPuntaje25,
      conteoCriterioClinico,
      conteoMedio,
      conteoBajo,
      pctAlto,
      pctMedio,
      pctBajo,
    };
  }, [metricas, pacientes]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFolioFilter("");
    setMunicipioFilter("");
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
        Validando acceso...
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
            "linear-gradient(135deg, rgba(241, 245, 249, 0.70), rgba(204, 251, 241, 0.52)), url(/region.png)",
        }}
        aria-hidden="true"
      />
      {/* CAPA DE FONDO FIJA - MODO OSCURO */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 hidden dark:block"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(6, 78, 59, 0.78), rgba(15, 118, 110, 0.52)), url(/region.png)",
        }}
        aria-hidden="true"
      />

      {alertaFlotante && (
        <div className="fixed top-4 right-4 z-50 max-w-sm rounded-2xl border border-rose-400/50 bg-rose-900/95 px-4 py-3 shadow-2xl shadow-rose-950/60 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="text-xl leading-none">🚨</div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-rose-200 font-bold">
                Notificación regional
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
                Módulo Regional MARO
              </span>
              {session?.displayName && (
                <span className="text-xs bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
                  {session.displayName}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-map-location-dot text-emerald-600 dark:text-emerald-400"></i>
              <span>{regionDisplay}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Vigilancia epidemiológica, estratificación de riesgo obstétrico y seguimiento regional
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <ThemeToggle />
            <Link
              href="/region/colegiados"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 dark:border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-users-viewfinder text-amber-600 dark:text-amber-300"></i>
              <span>Casos Colegiados</span>
            </Link>
            <button
              onClick={descargarReporteExcel}
              disabled={exportingReporte}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 dark:border-emerald-400/40 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              <i className={`fa-solid ${exportingReporte ? "fa-spinner fa-spin" : "fa-file-excel"}`}></i>
              <span>{exportingReporte ? "Generando Excel..." : "Descargar Reporte Excel Clínico"}</span>
            </button>
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {
                  // Ignorar errores de red; se fuerza salida local de todos modos.
                } finally {
                  localStorage.removeItem("maro:user");
                  router.replace("/inicial");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-white transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-right-from-bracket text-slate-500 dark:text-slate-300"></i>
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* TARJETAS KPI - SEMÁFORO EPIDEMIOLÓGICO REGIONAL */}
        {metricas && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 🟢 TARJETA 1: SEMÁFORO VERDE - POBLACIÓN EN REGIÓN Y CONTROL ÓPTIMO */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 dark:border-emerald-400/50 bg-gradient-to-br from-emerald-50/95 via-white/95 to-teal-50/90 dark:from-emerald-950/85 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-emerald-950/10 dark:shadow-emerald-950/40 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5">
                {/* Franja superior luminosa */}
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400" />
                {/* Halo decorativo */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-2xl" />

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    {/* Indicador visual tipo Semáforo (Luz Verde encendida) */}
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-black/60 border border-emerald-400/40 px-3 py-1 shadow-inner">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/25" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/25" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] ring-2 ring-emerald-300/60" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 ml-1">
                        Semáforo Verde
                      </span>
                    </div>

                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      Pacientes en Región
                    </h2>
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-300/40 flex items-center justify-center text-2xl shrink-0">
                    <i className="fa-solid fa-hospital-user"></i>
                  </div>
                </div>

                <div className="flex items-baseline gap-3 my-1">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 drop-shadow-sm">
                    {metricas.total}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                      Expedientes Activos
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Población obstétrica en la región
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-emerald-500/20 dark:border-emerald-400/20">
                  <div className="rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Bajo Riesgo
                    </span>
                    <span className="text-sm font-black text-emerald-800 dark:text-white">
                      {semaforoStats.conteoBajo}
                    </span>
                  </div>
                  <div className="rounded-xl bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/30 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-[11px]"></i>
                      Al corriente
                    </span>
                    <span className="text-sm font-black text-teal-800 dark:text-white">
                      {metricas.al_corriente}
                    </span>
                  </div>
                </div>
              </div>

              {/* 🟡 TARJETA 2: SEMÁFORO AMARILLO / ÁMBAR - VIGILANCIA E INGRESOS SEMANALES */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/55 dark:border-amber-400/50 bg-gradient-to-br from-amber-50/95 via-white/95 to-yellow-50/90 dark:from-amber-950/85 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-amber-950/10 dark:shadow-amber-950/40 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5">
                {/* Franja superior luminosa */}
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />
                {/* Halo decorativo */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-amber-400/20 dark:bg-amber-500/15 blur-2xl" />

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    {/* Indicador visual tipo Semáforo (Luz Ámbar encendida) */}
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-black/60 border border-amber-400/40 px-3 py-1 shadow-inner">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/25" />
                      <span className="h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] ring-2 ring-amber-200/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/25" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 ml-1">
                        Semáforo Preventivo
                      </span>
                    </div>

                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                      Ingresos Esta Semana y Vigilancia
                    </h2>
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-600/30 border border-amber-300/40 flex items-center justify-center text-2xl shrink-0">
                    <i className="fa-solid fa-calendar-check"></i>
                  </div>
                </div>

                <div className="flex items-baseline gap-3 my-1">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-amber-600 dark:text-amber-400 drop-shadow-sm">
                    {metricas.semana_actual}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                      Nuevos Ingresos (7 días)
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      En seguimiento preventivo CPN
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-amber-500/20 dark:border-amber-400/20">
                  <div className="rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/35 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Riesgo Medio
                    </span>
                    <span className="text-sm font-black text-amber-800 dark:text-white">
                      {semaforoStats.conteoMedio}
                    </span>
                  </div>
                  <div className="rounded-xl bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/35 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                      <i className="fa-solid fa-clock text-amber-600 dark:text-amber-400 text-[11px]"></i>
                      Próx. Cita (21-30d)
                    </span>
                    <span className="text-sm font-black text-orange-800 dark:text-white">
                      {metricas.proximas_vencer}
                    </span>
                  </div>
                </div>
              </div>

              {/* 🔴 TARJETA 3: SEMÁFORO ROJO - ALTO RIESGO ACTIVO (ALERTA CRÍTICA) */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/65 dark:border-rose-400/60 bg-gradient-to-br from-rose-50/95 via-white/95 to-red-50/90 dark:from-rose-950/90 dark:via-slate-900/90 dark:to-slate-900/95 p-6 sm:p-7 shadow-xl shadow-rose-950/15 dark:shadow-rose-950/50 flex flex-col justify-between gap-5 transition-all hover:-translate-y-0.5">
                {/* Franja superior luminosa */}
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500" />
                {/* Halo decorativo */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-rose-500/25 dark:bg-rose-500/20 blur-2xl" />

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    {/* Indicador visual tipo Semáforo (Luz Roja encendida con pulso) */}
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-black/60 border border-rose-400/50 px-3 py-1 shadow-inner">
                      <span className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e] ring-2 ring-rose-300/80 animate-pulse" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/25" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/25" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 ml-1">
                        Semáforo Rojo
                      </span>
                    </div>

                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
                      Alto Riesgo Activo
                    </h2>
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/35 border border-rose-300/40 flex items-center justify-center text-2xl shrink-0">
                    <i className="fa-solid fa-shield-heart animate-pulse"></i>
                  </div>
                </div>

                <div className="flex items-baseline gap-3 my-1">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-rose-600 dark:text-rose-400 drop-shadow-sm">
                    {semaforoStats.conteoAlto}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-rose-900 dark:text-rose-200">
                      Casos Prioritarios ({semaforoStats.pctAlto}%)
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Puntaje ≥25 o criterio clínico mayor
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-rose-500/20 dark:border-rose-400/20">
                  <div className="rounded-xl bg-rose-500/15 dark:bg-rose-500/25 border border-rose-500/35 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                      Puntaje ≥25 / Clín.
                    </span>
                    <span className="text-sm font-black text-rose-800 dark:text-white">
                      {semaforoStats.conteoPuntaje25} / {semaforoStats.conteoCriterioClinico}
                    </span>
                  </div>
                  <div className="rounded-xl bg-red-500/15 dark:bg-red-500/25 border border-red-500/35 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                      <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-[11px]"></i>
                      Inasistencia &gt;30d
                    </span>
                    <span className="text-sm font-black text-red-800 dark:text-white">
                      {metricas.inasistencias_30d}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BARRA GLOBAL DE SEMÁFORO OBSTÉTRICO REGIONAL */}
            <div className="w-full h-8 rounded-2xl bg-white/95 dark:bg-slate-900/90 overflow-hidden flex p-1 gap-1 border border-slate-300 dark:border-white/15 shadow-lg">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-l-xl flex items-center justify-center text-xs font-black text-white drop-shadow-sm transition-all duration-500 min-w-[48px]"
                style={{ width: `${semaforoStats.pctBajo}%` }}
                title={`Bajo Riesgo (≤15): ${semaforoStats.conteoBajo} (${semaforoStats.pctBajo}%)`}
              >
                {semaforoStats.pctBajo}%
              </div>
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-xs font-black text-slate-950 drop-shadow-sm transition-all duration-500 min-w-[48px]"
                style={{ width: `${semaforoStats.pctMedio}%` }}
                title={`Riesgo Medio (16-24): ${semaforoStats.conteoMedio} (${semaforoStats.pctMedio}%)`}
              >
                {semaforoStats.pctMedio}%
              </div>
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-r-xl flex items-center justify-center text-xs font-black text-white drop-shadow-sm transition-all duration-500 min-w-[48px]"
                style={{ width: `${semaforoStats.pctAlto}%` }}
                title={`Alto Riesgo (≥25 / Alerta): ${semaforoStats.conteoAlto} (${semaforoStats.pctAlto}%)`}
              >
                {semaforoStats.pctAlto}%
              </div>
            </div>
          </section>
        )}

        {/* FILTROS */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-5 space-y-3 shadow-xl transition-colors">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <i className="fa-solid fa-filter text-emerald-600 dark:text-emerald-400"></i>
              <span>Filtros de Búsqueda Regional</span>
            </h3>
            {(busqueda || folioFilter || municipioFilter) && (
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="fa-solid fa-rotate-left text-[10px]"></i>
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="search"
              placeholder="Buscar por nombre de paciente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
            />
            <select
              value={folioFilter}
              onChange={(e) => setFolioFilter(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-white/10 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
            >
              <option value="">Todos los folios</option>
              {foliosDisponibles.map((folio) => (
                <option key={folio} value={folio}>
                  {folio}
                </option>
              ))}
            </select>
            <select
              value={municipioFilter}
              onChange={(e) => {
                setMunicipioFilter(e.target.value);
                setFolioFilter("");
              }}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-white/10 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
            >
              <option value="">Todos los municipios</option>
              {municipiosDisponibles.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* ESTADO DE CARGA / ERROR */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 py-12 text-center text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center gap-2 shadow-xl">
            <i className="fa-solid fa-spinner fa-spin text-emerald-600 dark:text-emerald-400"></i>
            <span>Cargando pacientes de la región...</span>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/20 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-lg">
            <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-lg"></i>
            <span>{error}</span>
          </div>
        )}

        {/* TABLA: ALTO RIESGO ACTIVO */}
        {!loading && !error && altoRiesgo.length > 0 && (
          <section className="rounded-2xl border border-rose-300 dark:border-rose-500/35 bg-white/95 dark:bg-slate-900/85 p-5 space-y-4 shadow-xl transition-colors">
            <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-500/25 pb-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-400/40 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-rose-900 dark:text-rose-200">
                    Alto Riesgo Activo
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Pacientes con puntaje ≥25 o criterio clínico prioritario
                  </p>
                </div>
              </div>
              <span className="text-xs text-rose-900 dark:text-rose-200 bg-rose-100 dark:bg-rose-500/25 border border-rose-300 dark:border-rose-400/40 px-3 py-1 rounded-full font-bold">
                {altoRiesgo.length} {altoRiesgo.length === 1 ? "caso activo" : "casos activos"}
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto overflow-x-hidden rounded-xl border border-rose-200 dark:border-rose-500/25">
              <table className="w-full text-xs table-fixed text-left">
                <thead className="sticky top-0 z-10 bg-rose-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-rose-200 dark:border-rose-500/25 text-rose-900 dark:text-rose-200 font-bold">
                  <tr className="whitespace-nowrap">
                    <th className="w-[125px] px-3 py-2.5">Folio</th>
                    <th className="px-3 py-2.5">Paciente</th>
                    <th className="w-[20%] px-3 py-2.5 hidden lg:table-cell">Unidad</th>
                    <th className="w-[12%] px-3 py-2.5 hidden md:table-cell">Municipio</th>
                    <th className="w-[92px] px-2.5 py-2.5 hidden lg:table-cell">Ingreso CPN</th>
                    <th className="w-[52px] text-right px-2 py-2.5 hidden sm:table-cell">SDG</th>
                    <th className="w-[135px] text-right px-2.5 py-2.5">Puntaje</th>
                    <th className="w-[76px] text-center pl-2 pr-3.5 py-2.5">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 dark:divide-rose-500/15">
                  {altoRiesgo.map((p) => (
                    <tr key={p.id} className="hover:bg-rose-50/70 dark:hover:bg-rose-500/10 transition-colors whitespace-nowrap">
                      <td className="px-3 py-2.5 font-mono font-bold text-rose-800 dark:text-rose-300 truncate" title={p.folio}>
                        {p.folio}
                      </td>
                      <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold truncate" title={p.nombre_completo || ""}>
                        {p.nombre_completo || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 hidden lg:table-cell truncate" title={p.unidad || ""}>
                        {p.unidad || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 hidden md:table-cell truncate" title={p.municipio || ""}>
                        {p.municipio || "—"}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                        {p.fecha_ingreso_cpn
                          ? new Date(p.fecha_ingreso_cpn).toLocaleDateString("es-MX")
                          : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right text-slate-700 dark:text-slate-200 font-semibold hidden sm:table-cell">
                        {p.semanas_gestacion ?? p.sdg_ingreso ?? "—"}
                      </td>
                      <td className="px-2.5 py-2.5 text-right">
                        {esAlertaPorCriterioClinico(p) ? (
                          <div className="inline-flex items-center justify-end max-w-full" title={motivoClinico(p) || "Edad/Padecimiento"}>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-500/25 border border-amber-300 dark:border-amber-400/40 text-amber-900 dark:text-amber-200 truncate max-w-[125px]">
                              {motivoClinico(p) || "Criterio clínico"}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-rose-700 dark:text-rose-400 font-black">
                              {p.puntaje_total_actual ?? "—"}
                            </span>
                            {riesgoBadge(p.puntaje_total_actual)}
                          </div>
                        )}
                      </td>
                      <td className="pl-2 pr-3.5 py-2.5 text-center">
                        <Link
                          href={`/region/pacientes/${p.id}`}
                          className="inline-flex items-center justify-center text-xs font-bold text-rose-700 dark:text-rose-200 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-500 border border-rose-300 dark:border-rose-500/40 rounded-lg px-2.5 py-1 transition-colors"
                        >
                          <span>Ver</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TABLA: BAJO/MEDIO RIESGO (<25) */}
        {!loading && !error && bajoMedioRiesgo.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-5 space-y-4 shadow-xl transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-emerald-500/20 border border-teal-300 dark:border-emerald-400/40 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-clipboard-check text-teal-700 dark:text-emerald-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Bajo y Medio Riesgo (Puntaje &lt;25)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Seguimiento prenatal ordinario en unidades de primer nivel
                  </p>
                </div>
              </div>
              <span className="text-xs text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/30 px-3 py-1 rounded-full font-bold">
                {bajoMedioRiesgo.length} {bajoMedioRiesgo.length === 1 ? "paciente" : "pacientes"}
              </span>
            </div>

            <div className="max-h-[420px] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-xs table-fixed text-left">
                <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold">
                  <tr className="whitespace-nowrap">
                    <th className="w-[125px] px-3 py-2.5">Folio</th>
                    <th className="px-3 py-2.5">Paciente</th>
                    <th className="w-[20%] px-3 py-2.5 hidden lg:table-cell">Unidad</th>
                    <th className="w-[12%] px-3 py-2.5 hidden md:table-cell">Municipio</th>
                    <th className="w-[92px] px-2.5 py-2.5 hidden lg:table-cell">Ingreso CPN</th>
                    <th className="w-[52px] text-right px-2 py-2.5 hidden sm:table-cell">SDG</th>
                    <th className="w-[135px] text-right px-2.5 py-2.5">Puntaje</th>
                    <th className="w-[76px] text-center pl-2 pr-3.5 py-2.5">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {bajoMedioRiesgo.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-emerald-300/90 truncate" title={p.folio}>
                        {p.folio}
                      </td>
                      <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold truncate" title={p.nombre_completo || ""}>
                        {p.nombre_completo || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 hidden lg:table-cell truncate" title={p.unidad || ""}>
                        {p.unidad || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 hidden md:table-cell truncate" title={p.municipio || ""}>
                        {p.municipio || "—"}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                        {p.fecha_ingreso_cpn
                          ? new Date(p.fecha_ingreso_cpn).toLocaleDateString("es-MX")
                          : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right text-slate-700 dark:text-slate-200 font-semibold hidden sm:table-cell">
                        {p.semanas_gestacion ?? p.sdg_ingreso ?? "—"}
                      </td>
                      <td className="px-2.5 py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className={riesgoColor(p.puntaje_total_actual)}>
                            {p.puntaje_total_actual ?? "—"}
                          </span>
                          {riesgoBadge(p.puntaje_total_actual)}
                        </div>
                      </td>
                      <td className="pl-2 pr-3.5 py-2.5 text-center">
                        <Link
                          href={`/region/pacientes/${p.id}`}
                          className="inline-flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 border border-emerald-300 dark:border-emerald-500/35 rounded-lg px-2.5 py-1 transition-colors"
                        >
                          <span>Ver</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* SIN REGISTROS */}
        {!loading && !error && pacientesFiltrados.length === 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 py-16 text-center text-slate-500 dark:text-slate-400 text-sm shadow-xl">
            {busqueda || folioFilter || municipioFilter
              ? "Sin resultados para los filtros aplicados"
              : "No hay pacientes registradas en esta región"}
          </div>
        )}
      </div>
    </main>
  );
}

