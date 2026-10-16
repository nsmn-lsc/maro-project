"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { evaluarCampoIndividual } from "@/lib/riesgoFactores";
import { evaluarTamizajes } from "@/lib/riesgoTamizajes";
import { ThemeToggle } from "@/components/ThemeToggle";

type SessionInfo = {
  nivel?: number;
};

type Paciente = {
  id: number;
  folio: string | null;
  nombre_completo: string | null;
  edad?: number | null;
  clues_id: string;
  unidad: string | null;
  municipio: string | null;
  region: string | null;
  fecha_ingreso_cpn: string | null;
  fum?: string | null;
  fpp?: string | null;
  semanas_gestacion?: number | null;
  sdg_ingreso: number | null;
  telefono: string | null;
  direccion: string | null;
  derechohabiencia?: string | null;
  factor_riesgo_antecedentes: number | null;
  factor_riesgo_tamizajes: number | null;
  gestas?: number | null;
  partos?: number | null;
  cesareas?: number | null;
  abortos?: number | null;
  ant_preeclampsia?: boolean | number;
  ant_hemorragia?: boolean | number;
  ant_sepsis?: boolean | number;
  ant_bajo_peso_macrosomia?: boolean | number;
  ant_muerte_perinatal?: boolean | number;
  ant_embarazo_ectopico?: boolean | number;
  factor_diabetes?: boolean | number;
  factor_hipertension?: boolean | number;
  factor_obesidad?: boolean | number;
  factor_cardiopatia?: boolean | number;
  factor_hepatopatia?: boolean | number;
  factor_enf_autoinmune?: boolean | number;
  factor_nefropatia?: boolean | number;
  factor_coagulopatias?: boolean | number;
  factor_neuropatia?: boolean | number;
  factor_enf_psiquiatrica?: boolean | number;
  factor_alcoholismo?: boolean | number;
  factor_tabaquismo?: boolean | number;
  factor_drogas_ilicitas?: boolean | number;
  factor_endocrinopatia?: boolean | number;
  factor_neumopatia?: boolean | number;
  factor_its?: boolean | number;
  factor_cirugias_pelvico_uterinas?: boolean | number;
  factor_discapacidad?: boolean | number;
  otros_antecedentes?: string | null;
  factores_riesgo_epid?: "ninguno" | "es_contacto" | "es_portadora";
  prueba_vih?: string | null;
  prueba_vdrl?: string | null;
  prueba_hepatitis_c?: string | null;
  diabetes_glicemia?: string | null;
  violencia?: string | null;
};

type Consulta = {
  id: number;
  fecha_consulta: string | null;
  sdg: number | null;
  ta_sistolica: number | null;
  ta_diastolica: number | null;
  frecuencia_cardiaca: number | null;
  frecuencia_respiratoria: number | null;
  temperatura: number | null;
  indice_choque: number | null;
  estado_conciencia: "alteraciones" | "conciente" | null;
  hemorragia: "visible o abundante" | "no visible o moderada" | "no visible o escasa" | null;
  respiracion: "alterada" | "normal" | null;
  color_piel: "cianotica" | "palida" | "normal" | null;
  puntaje_consulta_parametros: number | null;
  puntaje_total_consulta: number | null;
  riesgo_25_plus: 0 | 1;
  colegiado?: 0 | 1;
  fecha_colegiado?: string | null;
  diagnostico: string | null;
  plan: string | null;
  notas: string | null;
};

function formatDate(value: string | Date | null | undefined, fallback = "—") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function boolLabel(value: boolean | number | null | undefined) {
  return value ? "Sí" : "No";
}

function valueLabel(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function getConsultaScores(consulta: Consulta) {
  const taS = consulta.ta_sistolica;
  const taD = consulta.ta_diastolica;
  const fc = consulta.frecuencia_cardiaca;
  const idx = consulta.indice_choque;
  const temp = consulta.temperatura;

  const taSistolica =
    taS === null
      ? 0
      : taS <= 89 || taS >= 160
        ? 4
        : taS >= 140 && taS <= 159
          ? 2
          : 0;

  const taDiastolica =
    taD === null
      ? 0
      : taD <= 50 || taD >= 110
        ? 4
        : taD >= 90 && taD <= 109
          ? 2
          : 0;

  const frecuenciaCardiaca = fc === null ? 0 : fc < 60 || fc > 100 ? 4 : 0;

  const indiceChoque =
    idx === null ? 0 : idx > 0.8 ? 4 : idx >= 0.7 && idx <= 0.8 ? 2 : 0;

  const temperatura =
    temp === null
      ? 0
      : temp < 36 || temp > 39
        ? 4
        : temp >= 37.5 && temp <= 38.9
          ? 2
          : 0;

  return {
    taSistolica,
    taDiastolica,
    taTotal: taSistolica + taDiastolica,
    frecuenciaCardiaca,
    indiceChoque,
    temperatura,
  };
}

function scoreToneClass(points: number) {
  if (points >= 4)
    return "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200";
  if (points >= 2)
    return "border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200";
  return "";
}

function scoreBadgeClass(points: number) {
  if (points >= 4)
    return "border-rose-300 dark:border-rose-500/50 bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200";
  if (points >= 2)
    return "border-amber-300 dark:border-amber-500/50 bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200";
  return "border-emerald-300 dark:border-emerald-400/35 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100";
}

export default function DetallePacienteEstatalPage() {
  const router = useRouter();
  const params = useParams();
  const pacienteId = params?.id as string;

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [colegiando, setColegiando] = useState(false);
  const [colegiadoError, setColegiadoError] = useState<string | null>(null);

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
    if (!authChecked || !pacienteId) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [resPaciente, resConsultas] = await Promise.all([
          fetch(`/api/pacientes?id=${pacienteId}`),
          fetch(`/api/consultas?paciente_id=${pacienteId}`),
        ]);

        if (!resPaciente.ok) throw new Error("No se pudo cargar el paciente");
        if (!resConsultas.ok) throw new Error("No se pudieron cargar las consultas");

        const pacienteData = (await resPaciente.json()) as Paciente;
        const consultasData = (await resConsultas.json()) as Consulta[];

        if (!cancelled) {
          setPaciente(pacienteData);
          setConsultas(Array.isArray(consultasData) ? consultasData : []);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [authChecked, pacienteId]);

  const ultimaConsulta = consultas[0] || null;
  const yaColegiado = consultas.some((consulta) => (consulta?.colegiado ?? 0) === 1);

  const handleColegiarCaso = async () => {
    if (!ultimaConsulta || colegiando || yaColegiado) return;

    setColegiando(true);
    setColegiadoError(null);

    try {
      const res = await fetch("/api/estatal/colegiados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta_id: ultimaConsulta.id, paciente_id: paciente?.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "No se pudo colegiar el caso");
      }

      setConsultas((prev) => {
        if (!prev.length) return prev;
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          colegiado: 1,
          fecha_colegiado: new Date().toISOString(),
        };
        return updated;
      });

      const syncStamp = String(Date.now());
      localStorage.setItem("maro:colegiado-updated", syncStamp);
      localStorage.setItem("maro:estatal-riesgo-updated", syncStamp);
      window.dispatchEvent(new CustomEvent("maro:colegiado-updated", { detail: syncStamp }));
      window.dispatchEvent(new CustomEvent("maro:estatal-riesgo-updated", { detail: syncStamp }));

      router.push(`/colegiados/${ultimaConsulta.id}`);
    } catch (err: any) {
      setColegiadoError(err?.message || "Error al colegiar caso");
    } finally {
      setColegiando(false);
    }
  };

  const puntajeTotalActual = useMemo(() => {
    if (ultimaConsulta?.puntaje_total_consulta !== null && ultimaConsulta?.puntaje_total_consulta !== undefined) {
      return Number(ultimaConsulta.puntaje_total_consulta) || 0;
    }
    return (Number(paciente?.factor_riesgo_antecedentes) || 0) + (Number(paciente?.factor_riesgo_tamizajes) || 0);
  }, [ultimaConsulta, paciente]);

  const antecedentesConPuntos = useMemo(() => {
    if (!paciente) return {} as Record<string, number>;

    const mapa: Record<string, number> = {};
    const valores: Record<string, any> = {
      gestas: paciente.gestas,
      partos: paciente.partos,
      cesareas: paciente.cesareas,
      abortos: paciente.abortos,
      ant_preeclampsia: !!paciente.ant_preeclampsia,
      ant_hemorragia: !!paciente.ant_hemorragia,
      ant_sepsis: !!paciente.ant_sepsis,
      ant_bajo_peso_macrosomia: !!paciente.ant_bajo_peso_macrosomia,
      ant_muerte_perinatal: !!paciente.ant_muerte_perinatal,
      ant_embarazo_ectopico: !!paciente.ant_embarazo_ectopico,
      factor_diabetes: !!paciente.factor_diabetes,
      factor_hipertension: !!paciente.factor_hipertension,
      factor_obesidad: !!paciente.factor_obesidad,
      factor_cardiopatia: !!paciente.factor_cardiopatia,
      factor_hepatopatia: !!paciente.factor_hepatopatia,
      factor_enf_autoinmune: !!paciente.factor_enf_autoinmune,
      factor_nefropatia: !!paciente.factor_nefropatia,
      factor_coagulopatias: !!paciente.factor_coagulopatias,
      factor_neuropatia: !!paciente.factor_neuropatia,
      factor_enf_psiquiatrica: !!paciente.factor_enf_psiquiatrica,
      factor_alcoholismo: !!paciente.factor_alcoholismo,
      factor_tabaquismo: !!paciente.factor_tabaquismo,
      factor_drogas_ilicitas: !!paciente.factor_drogas_ilicitas,
      factor_endocrinopatia: !!paciente.factor_endocrinopatia,
      factor_neumopatia: !!paciente.factor_neumopatia,
      factor_its: !!paciente.factor_its,
      factor_cirugias_pelvico_uterinas: !!paciente.factor_cirugias_pelvico_uterinas,
      factor_discapacidad: !!paciente.factor_discapacidad,
      factores_riesgo_epid: paciente.factores_riesgo_epid || "ninguno",
    };

    Object.entries(valores).forEach(([campo, valor]) => {
      const alerta = evaluarCampoIndividual(campo as any, valor);
      if (alerta?.puntos) {
        mapa[campo] = alerta.puntos;
      }
    });

    return mapa;
  }, [paciente]);

  const tamizajesConPuntos = useMemo(() => {
    if (!paciente) return {} as Record<string, number>;

    const resultado = evaluarTamizajes({
      prueba_vih: paciente.prueba_vih,
      prueba_vdrl: paciente.prueba_vdrl,
      prueba_hepatitis_c: paciente.prueba_hepatitis_c,
      diabetes_glicemia: paciente.diabetes_glicemia,
      violencia: paciente.violencia,
    });

    const mapa: Record<string, number> = {
      prueba_vih: 0,
      prueba_vdrl: 0,
      prueba_hepatitis_c: 0,
      diabetes_glicemia: 0,
      violencia: 0,
    };

    resultado.tamizajes.forEach((item) => {
      if (item.campo === "VIH") mapa.prueba_vih = item.puntos;
      if (item.campo === "VDRL") mapa.prueba_vdrl = item.puntos;
      if (item.campo === "Hepatitis C") mapa.prueba_hepatitis_c = item.puntos;
      if (item.campo === "Diabetes/Glicemia") mapa.diabetes_glicemia = item.puntos;
      if (item.campo === "Violencia") mapa.violencia = item.puntos;
    });

    return mapa;
  }, [paciente]);

  const ultimaConsultaScores = useMemo(
    () => (ultimaConsulta ? getConsultaScores(ultimaConsulta) : null),
    [ultimaConsulta]
  );

  const esAltoRiesgo = puntajeTotalActual >= 25;
  const esMedioRiesgo = puntajeTotalActual > 15 && puntajeTotalActual < 25;

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

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ENCABEZADO SUPERIOR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-700 dark:text-emerald-300">
                Detalle Clínico Estatal
              </span>
              {paciente?.folio && (
                <span className="text-xs bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {paciente.folio}
                </span>
              )}
              {yaColegiado && (
                <span className="text-xs bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                  Colegiado
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-file-medical text-emerald-600 dark:text-emerald-400"></i>
              <span>{paciente?.nombre_completo || "Expediente de Paciente"}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Evaluación integral de riesgo obstétrico y dictaminación para seguimiento colegiado estatal
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleColegiarCaso}
              disabled={!ultimaConsulta || colegiando || yaColegiado}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                yaColegiado
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                  : "border-emerald-500/50 bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              <i className={`fa-solid ${colegiando ? "fa-spinner fa-spin" : yaColegiado ? "fa-circle-check" : "fa-users-viewfinder"}`}></i>
              <span>{colegiando ? "Colegiando..." : yaColegiado ? "Caso ya colegiado" : "Colegiar caso"}</span>
            </button>
            <Link
              href="/estatal"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-800 dark:text-white shadow-sm transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-emerald-600 dark:text-emerald-400"></i>
              <span>Volver a Módulo Estatal</span>
            </Link>
          </div>
        </header>

        {colegiadoError && (
          <section className="rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-lg">
            <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-lg"></i>
            <span>{colegiadoError}</span>
          </section>
        )}

        {!loading && yaColegiado && (
          <section className="rounded-2xl border border-emerald-400/60 dark:border-emerald-500/40 bg-emerald-50/95 dark:bg-emerald-950/35 p-4 sm:p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-lg shrink-0">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-200">
                    Caso colegiado activo
                  </h2>
                  <p className="text-xs text-emerald-800 dark:text-emerald-100/80">
                    Este expediente ya fue dictaminado y enviado al módulo de Casos Colegiados.
                  </p>
                </div>
              </div>
              {ultimaConsulta?.id ? (
                <Link
                  href={`/colegiados/${ultimaConsulta.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition"
                >
                  <i className="fa-solid fa-list-check"></i>
                  <span>Capturar acciones</span>
                </Link>
              ) : null}
            </div>
          </section>
        )}

        {loading ? (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 py-12 text-center text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center gap-2 shadow-xl">
            <i className="fa-solid fa-spinner fa-spin text-emerald-600 dark:text-emerald-400"></i>
            <span>Cargando datos del paciente...</span>
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 p-6 text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-lg">
            <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-lg"></i>
            <span>{error}</span>
          </section>
        ) : !paciente ? (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-8 text-center text-slate-600 dark:text-slate-300 shadow-xl">
            Paciente no encontrado.
          </section>
        ) : (
          <>
            {/* TARJETAS KPI DEL EXPEDIENTE CON SEMÁFORO DE RIESGO */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Semáforo de Puntaje Total Actual */}
              <div
                className={`relative overflow-hidden rounded-3xl border-2 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3 transition-all ${
                  esAltoRiesgo
                    ? "border-rose-500/60 dark:border-rose-400/60 bg-gradient-to-br from-rose-50/95 via-white/95 to-red-50/90 dark:from-rose-950/90 dark:via-slate-900/90 dark:to-slate-900/95"
                    : esMedioRiesgo
                      ? "border-amber-500/60 dark:border-amber-400/60 bg-gradient-to-br from-amber-50/95 via-white/95 to-yellow-50/90 dark:from-amber-950/85 dark:via-slate-900/90 dark:to-slate-900/95"
                      : "border-emerald-500/50 dark:border-emerald-400/50 bg-gradient-to-br from-emerald-50/95 via-white/95 to-teal-50/90 dark:from-emerald-950/85 dark:via-slate-900/90 dark:to-slate-900/95"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 ${
                    esAltoRiesgo
                      ? "bg-gradient-to-r from-rose-500 via-red-500 to-orange-500"
                      : esMedioRiesgo
                        ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
                        : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400"
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 dark:bg-black/60 border border-white/15 px-2.5 py-0.5 shadow-inner">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          esAltoRiesgo
                            ? "bg-rose-500 shadow-[0_0_10px_#f43f5e] ring-2 ring-rose-300/80 animate-pulse"
                            : "bg-rose-500/25"
                        }`}
                      />
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          esMedioRiesgo
                            ? "bg-amber-400 shadow-[0_0_10px_#fbbf24] ring-2 ring-amber-200/70"
                            : "bg-amber-400/25"
                        }`}
                      />
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          !esAltoRiesgo && !esMedioRiesgo
                            ? "bg-emerald-400 shadow-[0_0_10px_#34d399] ring-2 ring-emerald-300/60"
                            : "bg-emerald-400/25"
                        }`}
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-white ml-1">
                        {esAltoRiesgo ? "Alto Riesgo" : esMedioRiesgo ? "Riesgo Medio" : "Bajo Riesgo"}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Puntaje Total Actual
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-md shrink-0 ${
                      esAltoRiesgo
                        ? "bg-gradient-to-br from-rose-600 to-red-600"
                        : esMedioRiesgo
                          ? "bg-gradient-to-br from-amber-500 to-orange-500"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600"
                    }`}
                  >
                    <i className="fa-solid fa-heart-pulse"></i>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl sm:text-5xl font-black tracking-tight ${
                      esAltoRiesgo
                        ? "text-rose-600 dark:text-rose-400"
                        : esMedioRiesgo
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {puntajeTotalActual}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    puntos MARO
                  </span>
                </div>
              </div>

              {/* Card 2: Antecedentes */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal-400 to-emerald-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300">
                      Historia Clínica
                    </span>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Antecedentes
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-700 dark:text-teal-300 text-xl shrink-0">
                    <i className="fa-solid fa-notes-medical"></i>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {Number(paciente.factor_riesgo_antecedentes) || 0}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    pts acumulados
                  </span>
                </div>
              </div>

              {/* Card 3: Tamizajes */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                      Detección Oportuna
                    </span>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Tamizajes
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 text-xl shrink-0">
                    <i className="fa-solid fa-vial-circle-check"></i>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {Number(paciente.factor_riesgo_tamizajes) || 0}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    pts tamizaje
                  </span>
                </div>
              </div>

              {/* Card 4: Última Consulta */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                      Seguimiento CPN
                    </span>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Última Consulta
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xl shrink-0">
                    <i className="fa-solid fa-calendar-check"></i>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatDate(ultimaConsulta?.fecha_consulta || null, "Sin registro")}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {consultas.length} {consultas.length === 1 ? "consulta registrada" : "consultas registradas"}
                  </span>
                </div>
              </div>
            </section>

            {/* IDENTIFICACIÓN Y UBICACIÓN */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 space-y-4 shadow-xl transition-colors">
              <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
                <i className="fa-solid fa-id-card text-emerald-600 dark:text-emerald-400 text-lg"></i>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Identificación y ubicación
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
                <Info label="Nombre" value={paciente.nombre_completo} size="wide" />
                <Info label="Folio" value={paciente.folio} size="compact" />
                <Info
                  label="Edad"
                  value={paciente.edad !== null && paciente.edad !== undefined ? `${paciente.edad} años` : null}
                  size="compact"
                  toneClass={
                    Number(paciente.edad) >= 10 && Number(paciente.edad) <= 14
                      ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200"
                      : undefined
                  }
                />
                <Info label="CLUES" value={paciente.clues_id} size="compact" />
                <Info label="Región" value={paciente.region} size="compact" />
                <Info label="Municipio" value={paciente.municipio} size="compact" />
                <Info label="Unidad" value={paciente.unidad} size="wide" />
                <Info label="Fecha ingreso CPN" value={formatDate(paciente.fecha_ingreso_cpn)} size="compact" />
                <Info label="SDG ingreso" value={paciente.sdg_ingreso} size="compact" />
                <Info label="Teléfono" value={paciente.telefono} size="compact" />
                <Info label="Derechohabiencia" value={paciente.derechohabiencia} size="compact" />
              </div>
            </section>

            <CollapsibleSection
              title="Antecedentes y factores de riesgo"
              subtitle="Campos resaltados aportan al puntaje de antecedentes"
              icon="fa-solid fa-clipboard-list"
              defaultOpen={true}
            >
              <ScoreLegend />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
                <Info
                  label="Gestas"
                  value={antecedentesConPuntos.gestas ? `${valueLabel(paciente.gestas)} · ${antecedentesConPuntos.gestas} pts` : paciente.gestas}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.gestas || 0)}
                />
                <Info label="Partos" value={paciente.partos} size="compact" />
                <Info
                  label="Cesáreas"
                  value={antecedentesConPuntos.cesareas ? `${valueLabel(paciente.cesareas)} · ${antecedentesConPuntos.cesareas} pts` : paciente.cesareas}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.cesareas || 0)}
                />
                <Info
                  label="Abortos"
                  value={antecedentesConPuntos.abortos ? `${valueLabel(paciente.abortos)} · ${antecedentesConPuntos.abortos} pts` : paciente.abortos}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.abortos || 0)}
                />
                <Info
                  label="Antecedente preeclampsia"
                  value={antecedentesConPuntos.ant_preeclampsia ? `${boolLabel(paciente.ant_preeclampsia)} · ${antecedentesConPuntos.ant_preeclampsia} pts` : boolLabel(paciente.ant_preeclampsia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.ant_preeclampsia || 0)}
                />
                <Info
                  label="Antecedente hemorragia"
                  value={antecedentesConPuntos.ant_hemorragia ? `${boolLabel(paciente.ant_hemorragia)} · ${antecedentesConPuntos.ant_hemorragia} pts` : boolLabel(paciente.ant_hemorragia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.ant_hemorragia || 0)}
                />
                <Info
                  label="Antecedente sepsis"
                  value={antecedentesConPuntos.ant_sepsis ? `${boolLabel(paciente.ant_sepsis)} · ${antecedentesConPuntos.ant_sepsis} pts` : boolLabel(paciente.ant_sepsis)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.ant_sepsis || 0)}
                />
                <Info
                  label="Bajo peso/macrosomía"
                  value={antecedentesConPuntos.ant_bajo_peso_macrosomia ? `${boolLabel(paciente.ant_bajo_peso_macrosomia)} · ${antecedentesConPuntos.ant_bajo_peso_macrosomia} pts` : boolLabel(paciente.ant_bajo_peso_macrosomia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.ant_bajo_peso_macrosomia || 0)}
                />
                <Info
                  label="Muerte perinatal"
                  value={antecedentesConPuntos.ant_muerte_perinatal ? `${boolLabel(paciente.ant_muerte_perinatal)} · ${antecedentesConPuntos.ant_muerte_perinatal} pts` : boolLabel(paciente.ant_muerte_perinatal)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.ant_muerte_perinatal || 0)}
                />
                <Info
                  label="Embarazo ectópico"
                  value={antecedentesConPuntos.ant_embarazo_ectopico ? `${boolLabel(paciente.ant_embarazo_ectopico)} · ${antecedentesConPuntos.ant_embarazo_ectopico} pts` : boolLabel(paciente.ant_embarazo_ectopico)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.ant_embarazo_ectopico || 0)}
                />
                <Info
                  label="Diabetes"
                  value={antecedentesConPuntos.factor_diabetes ? `${boolLabel(paciente.factor_diabetes)} · ${antecedentesConPuntos.factor_diabetes} pts` : boolLabel(paciente.factor_diabetes)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_diabetes || 0)}
                />
                <Info
                  label="Hipertensión"
                  value={antecedentesConPuntos.factor_hipertension ? `${boolLabel(paciente.factor_hipertension)} · ${antecedentesConPuntos.factor_hipertension} pts` : boolLabel(paciente.factor_hipertension)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_hipertension || 0)}
                />
                <Info
                  label="Obesidad"
                  value={antecedentesConPuntos.factor_obesidad ? `${boolLabel(paciente.factor_obesidad)} · ${antecedentesConPuntos.factor_obesidad} pts` : boolLabel(paciente.factor_obesidad)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_obesidad || 0)}
                />
                <Info
                  label="Cardiopatía"
                  value={antecedentesConPuntos.factor_cardiopatia ? `${boolLabel(paciente.factor_cardiopatia)} · ${antecedentesConPuntos.factor_cardiopatia} pts` : boolLabel(paciente.factor_cardiopatia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_cardiopatia || 0)}
                />
                <Info
                  label="Hepatopatía"
                  value={antecedentesConPuntos.factor_hepatopatia ? `${boolLabel(paciente.factor_hepatopatia)} · ${antecedentesConPuntos.factor_hepatopatia} pts` : boolLabel(paciente.factor_hepatopatia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_hepatopatia || 0)}
                />
                <Info
                  label="Enf. autoinmune"
                  value={antecedentesConPuntos.factor_enf_autoinmune ? `${boolLabel(paciente.factor_enf_autoinmune)} · ${antecedentesConPuntos.factor_enf_autoinmune} pts` : boolLabel(paciente.factor_enf_autoinmune)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_enf_autoinmune || 0)}
                />
                <Info
                  label="Nefropatía"
                  value={antecedentesConPuntos.factor_nefropatia ? `${boolLabel(paciente.factor_nefropatia)} · ${antecedentesConPuntos.factor_nefropatia} pts` : boolLabel(paciente.factor_nefropatia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_nefropatia || 0)}
                />
                <Info
                  label="Coagulopatías"
                  value={antecedentesConPuntos.factor_coagulopatias ? `${boolLabel(paciente.factor_coagulopatias)} · ${antecedentesConPuntos.factor_coagulopatias} pts` : boolLabel(paciente.factor_coagulopatias)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_coagulopatias || 0)}
                />
                <Info
                  label="Neuropatía"
                  value={antecedentesConPuntos.factor_neuropatia ? `${boolLabel(paciente.factor_neuropatia)} · ${antecedentesConPuntos.factor_neuropatia} pts` : boolLabel(paciente.factor_neuropatia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_neuropatia || 0)}
                />
                <Info
                  label="Enf. psiquiátrica"
                  value={antecedentesConPuntos.factor_enf_psiquiatrica ? `${boolLabel(paciente.factor_enf_psiquiatrica)} · ${antecedentesConPuntos.factor_enf_psiquiatrica} pts` : boolLabel(paciente.factor_enf_psiquiatrica)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_enf_psiquiatrica || 0)}
                />
                <Info
                  label="Alcoholismo"
                  value={antecedentesConPuntos.factor_alcoholismo ? `${boolLabel(paciente.factor_alcoholismo)} · ${antecedentesConPuntos.factor_alcoholismo} pts` : boolLabel(paciente.factor_alcoholismo)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_alcoholismo || 0)}
                />
                <Info
                  label="Tabaquismo"
                  value={antecedentesConPuntos.factor_tabaquismo ? `${boolLabel(paciente.factor_tabaquismo)} · ${antecedentesConPuntos.factor_tabaquismo} pts` : boolLabel(paciente.factor_tabaquismo)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_tabaquismo || 0)}
                />
                <Info
                  label="Otras drogas"
                  value={antecedentesConPuntos.factor_drogas_ilicitas ? `${boolLabel(paciente.factor_drogas_ilicitas)} · ${antecedentesConPuntos.factor_drogas_ilicitas} pts` : boolLabel(paciente.factor_drogas_ilicitas)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_drogas_ilicitas || 0)}
                />
                <Info
                  label="Endocrinopatía"
                  value={antecedentesConPuntos.factor_endocrinopatia ? `${boolLabel(paciente.factor_endocrinopatia)} · ${antecedentesConPuntos.factor_endocrinopatia} pts` : boolLabel(paciente.factor_endocrinopatia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_endocrinopatia || 0)}
                />
                <Info
                  label="Neumopatía"
                  value={antecedentesConPuntos.factor_neumopatia ? `${boolLabel(paciente.factor_neumopatia)} · ${antecedentesConPuntos.factor_neumopatia} pts` : boolLabel(paciente.factor_neumopatia)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_neumopatia || 0)}
                />
                <Info
                  label="ITS"
                  value={antecedentesConPuntos.factor_its ? `${boolLabel(paciente.factor_its)} · ${antecedentesConPuntos.factor_its} pts` : boolLabel(paciente.factor_its)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_its || 0)}
                />
                <Info
                  label="Cirugías pélvico uterinas"
                  value={antecedentesConPuntos.factor_cirugias_pelvico_uterinas ? `${boolLabel(paciente.factor_cirugias_pelvico_uterinas)} · ${antecedentesConPuntos.factor_cirugias_pelvico_uterinas} pts` : boolLabel(paciente.factor_cirugias_pelvico_uterinas)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_cirugias_pelvico_uterinas || 0)}
                />
                <Info
                  label="Discapacidad"
                  value={antecedentesConPuntos.factor_discapacidad ? `${boolLabel(paciente.factor_discapacidad)} · ${antecedentesConPuntos.factor_discapacidad} pts` : boolLabel(paciente.factor_discapacidad)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_discapacidad || 0)}
                />
                {paciente.otros_antecedentes && (
                  <Info
                    label="Otros antecedentes"
                    value={paciente.otros_antecedentes}
                    size="compact"
                  />
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Tamizajes"
              subtitle="Campos resaltados aportan al puntaje de tamizajes"
              icon="fa-solid fa-microscope"
              defaultOpen={true}
            >
              <ScoreLegend />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
                <Info
                  label="Prueba VIH"
                  value={tamizajesConPuntos.prueba_vih ? `${valueLabel(paciente.prueba_vih)} · ${tamizajesConPuntos.prueba_vih} pts` : paciente.prueba_vih}
                  size="compact"
                  toneClass={scoreToneClass(tamizajesConPuntos.prueba_vih || 0)}
                />
                <Info
                  label="Prueba VDRL"
                  value={tamizajesConPuntos.prueba_vdrl ? `${valueLabel(paciente.prueba_vdrl)} · ${tamizajesConPuntos.prueba_vdrl} pts` : paciente.prueba_vdrl}
                  size="compact"
                  toneClass={scoreToneClass(tamizajesConPuntos.prueba_vdrl || 0)}
                />
                <Info
                  label="Prueba Hepatitis C"
                  value={tamizajesConPuntos.prueba_hepatitis_c ? `${valueLabel(paciente.prueba_hepatitis_c)} · ${tamizajesConPuntos.prueba_hepatitis_c} pts` : paciente.prueba_hepatitis_c}
                  size="compact"
                  toneClass={scoreToneClass(tamizajesConPuntos.prueba_hepatitis_c || 0)}
                />
                <Info
                  label="Diabetes glicemia"
                  value={tamizajesConPuntos.diabetes_glicemia ? `${valueLabel(paciente.diabetes_glicemia)} · ${tamizajesConPuntos.diabetes_glicemia} pts` : paciente.diabetes_glicemia}
                  size="compact"
                  toneClass={scoreToneClass(tamizajesConPuntos.diabetes_glicemia || 0)}
                />
                <Info
                  label="Violencia"
                  value={tamizajesConPuntos.violencia ? `${valueLabel(paciente.violencia)} · ${tamizajesConPuntos.violencia} pts` : paciente.violencia}
                  size="compact"
                  toneClass={scoreToneClass(tamizajesConPuntos.violencia || 0)}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Última consulta prenatal"
              subtitle="Parámetros y severidad de la consulta más reciente"
              icon="fa-solid fa-stethoscope"
              defaultOpen={true}
            >
              <ScoreLegend />
              {!ultimaConsulta ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin consultas registradas.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
                  <Info label="Fecha consulta" value={formatDate(ultimaConsulta.fecha_consulta)} size="compact" />
                  <Info
                    label="T/A"
                    value={`${valueLabel(ultimaConsulta.ta_sistolica)}/${valueLabel(ultimaConsulta.ta_diastolica)} · ${ultimaConsultaScores?.taTotal ?? 0} pts`}
                    size="compact"
                    toneClass={scoreToneClass(ultimaConsultaScores?.taTotal ?? 0)}
                  />
                  <Info
                    label="Frecuencia cardiaca"
                    value={`${valueLabel(ultimaConsulta.frecuencia_cardiaca)} · ${ultimaConsultaScores?.frecuenciaCardiaca ?? 0} pts`}
                    size="compact"
                    toneClass={scoreToneClass(ultimaConsultaScores?.frecuenciaCardiaca ?? 0)}
                  />
                  <Info label="Frecuencia respiratoria" value={ultimaConsulta.frecuencia_respiratoria} size="compact" />
                  <Info
                    label="Temperatura"
                    value={`${valueLabel(ultimaConsulta.temperatura)} · ${ultimaConsultaScores?.temperatura ?? 0} pts`}
                    size="compact"
                    toneClass={scoreToneClass(ultimaConsultaScores?.temperatura ?? 0)}
                  />
                  <Info
                    label="Índice de choque"
                    value={`${valueLabel(ultimaConsulta.indice_choque)} · ${ultimaConsultaScores?.indiceChoque ?? 0} pts`}
                    size="compact"
                    toneClass={scoreToneClass(ultimaConsultaScores?.indiceChoque ?? 0)}
                  />
                  <Info label="Estado de conciencia" value={ultimaConsulta.estado_conciencia} size="normal" />
                  <Info label="Hemorragia" value={ultimaConsulta.hemorragia} size="normal" />
                  <Info label="Respiración" value={ultimaConsulta.respiracion} size="compact" />
                  <Info label="Color de piel" value={ultimaConsulta.color_piel} size="compact" />
                  <Info label="Puntaje consulta" value={ultimaConsulta.puntaje_consulta_parametros} size="compact" />
                  <Info label="Puntaje total" value={ultimaConsulta.puntaje_total_consulta} size="compact" />
                  <Info label="Riesgo ≥25" value={ultimaConsulta.riesgo_25_plus ? "Sí" : "No"} size="compact" />
                  <Info label="Diagnóstico" value={ultimaConsulta.diagnostico} size="wide" />
                  <Info label="Plan" value={ultimaConsulta.plan} size="wide" />
                  <Info label="Notas" value={ultimaConsulta.notas} size="full" />
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Historial de consultas"
              subtitle="Evolución de parámetros y puntajes por fecha"
              icon="fa-solid fa-clock-rotate-left"
              defaultOpen={false}
            >
              <ScoreLegend />
              {consultas.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin historial de consultas.</p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-xs table-fixed text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold">
                      <tr className="whitespace-nowrap">
                        <th className="w-[100px] px-3 py-2.5">Fecha</th>
                        <th className="w-[60px] px-2.5 py-2.5">SDG</th>
                        <th className="px-2.5 py-2.5">T/A</th>
                        <th className="px-2.5 py-2.5">FC</th>
                        <th className="w-[60px] px-2.5 py-2.5 hidden sm:table-cell">FR</th>
                        <th className="px-2.5 py-2.5 hidden md:table-cell">Temp</th>
                        <th className="px-2.5 py-2.5 hidden lg:table-cell">Índice choque</th>
                        <th className="w-[95px] px-2.5 py-2.5 text-right hidden sm:table-cell">Pts consulta</th>
                        <th className="w-[105px] px-2.5 py-2.5 text-right">Puntaje total</th>
                        <th className="w-[85px] px-3 py-2.5 text-center">Riesgo ≥25</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {consultas.map((consulta) => {
                        const scores = getConsultaScores(consulta);
                        return (
                          <tr key={consulta.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap">
                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                              {formatDate(consulta.fecha_consulta)}
                            </td>
                            <td className="px-2.5 py-2.5 font-bold text-slate-900 dark:text-white">
                              {consulta.sdg ?? "—"}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200">
                              {valueLabel(consulta.ta_sistolica)}/{valueLabel(consulta.ta_diastolica)}
                              <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.taTotal)}`}>
                                +{scores.taTotal}
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200">
                              {valueLabel(consulta.frecuencia_cardiaca)}
                              <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.frecuenciaCardiaca)}`}>
                                +{scores.frecuenciaCardiaca}
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                              {valueLabel(consulta.frecuencia_respiratoria)}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200 hidden md:table-cell">
                              {valueLabel(consulta.temperatura)}
                              <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.temperatura)}`}>
                                +{scores.temperatura}
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200 hidden lg:table-cell">
                              {valueLabel(consulta.indice_choque)}
                              <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.indiceChoque)}`}>
                                +{scores.indiceChoque}
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                              {valueLabel(consulta.puntaje_consulta_parametros)}
                            </td>
                            <td className="px-2.5 py-2.5 text-right">
                              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40">
                                {valueLabel(consulta.puntaje_total_consulta)} pts
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {consulta.riesgo_25_plus ? (
                                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40">
                                  Sí
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40">
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    </main>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl transition-colors"
    >
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && <i className={`${icon} text-emerald-600 dark:text-emerald-400 text-lg`}></i>}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 group-open:hidden">
            Mostrar
          </span>
          <span className="hidden group-open:inline text-xs font-semibold px-3 py-1 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5">
            Ocultar
          </span>
        </div>
      </summary>
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">{children}</div>
    </details>
  );
}

function ScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center rounded-lg border border-emerald-300 dark:border-emerald-400/35 bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-1 font-semibold text-emerald-800 dark:text-emerald-100">
        Sin puntos
      </span>
      <span className="inline-flex items-center rounded-lg border border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-200">
        2 pts · alerta
      </span>
      <span className="inline-flex items-center rounded-lg border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/20 px-2.5 py-1 font-semibold text-rose-800 dark:text-rose-200">
        4+ pts · alto riesgo
      </span>
    </div>
  );
}

function Info({
  label,
  value,
  size = "normal",
  toneClass,
}: {
  label: string;
  value: string | number | null | undefined;
  size?: "compact" | "normal" | "wide" | "full";
  toneClass?: string;
}) {
  const sizeClass =
    size === "compact"
      ? "sm:col-span-1 xl:col-span-2"
      : size === "wide"
        ? "sm:col-span-2 xl:col-span-4"
        : size === "full"
          ? "sm:col-span-2 xl:col-span-12"
          : "sm:col-span-1 xl:col-span-3";

  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 min-w-0 transition-colors ${sizeClass} ${
        toneClass ||
        "border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-slate-800/70 text-slate-900 dark:text-white"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5 break-words">{valueLabel(value)}</p>
    </div>
  );
}
