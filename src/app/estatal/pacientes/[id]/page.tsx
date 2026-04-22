"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { evaluarCampoIndividual } from "@/lib/riesgoFactores";
import { evaluarTamizajes } from "@/lib/riesgoTamizajes";

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
  sdg_ingreso: number | null;
  telefono: string | null;
  direccion: string | null;
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
  factores_riesgo_epid?: 'ninguno' | 'es_contacto' | 'es_portadora';
  prueba_vih?: string | null;
  prueba_vdrl?: string | null;
  prueba_hepatitis_c?: string | null;
  diabetes_glicemia?: string | null;
  violencia?: string | null;
};

type Consulta = {
  id: number;
  fecha_consulta: string | null;
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

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

  const taSistolica = taS === null
    ? 0
    : (taS <= 89 || taS >= 160)
      ? 4
      : (taS >= 140 && taS <= 159)
        ? 2
        : 0;

  const taDiastolica = taD === null
    ? 0
    : (taD <= 50 || taD >= 110)
      ? 4
      : (taD >= 90 && taD <= 109)
        ? 2
        : 0;

  const frecuenciaCardiaca = fc === null
    ? 0
    : (fc < 60 || fc > 100)
      ? 4
      : 0;

  const indiceChoque = idx === null
    ? 0
    : idx > 0.8
      ? 4
      : (idx >= 0.7 && idx <= 0.8)
        ? 2
        : 0;

  const temperatura = temp === null
    ? 0
    : (temp < 36 || temp > 39)
      ? 4
      : (temp >= 37.5 && temp <= 38.9)
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
  if (points >= 4) return "border-red-500/50 bg-red-900/30 text-red-200";
  if (points >= 2) return "border-amber-500/50 bg-amber-900/30 text-amber-200";
  return "border-slate-700 bg-slate-800/60 text-slate-100";
}

function scoreBadgeClass(points: number) {
  if (points >= 4) return "border-red-500/50 bg-red-500/20 text-red-200";
  if (points >= 2) return "border-amber-500/50 bg-amber-500/20 text-amber-200";
  return "border-slate-600 bg-slate-700/40 text-slate-200";
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
      factores_riesgo_epid: paciente.factores_riesgo_epid || 'ninguno',
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

  const estatalBackgroundStyle = {
    backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,118,110,0.6)), url(/maro_back_estatal.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat" as const,
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen relative text-slate-100" style={estatalBackgroundStyle}>
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative min-h-screen flex items-center justify-center">
          Validando acceso estatal...
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen relative text-slate-100"
      style={estatalBackgroundStyle}
    >
      <div className="absolute inset-0 bg-black/45" aria-hidden />

      <div className="relative max-w-7xl mx-auto space-y-6 p-6 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Detalle estatal</p>
            <h1 className="text-3xl font-bold">Paciente {paciente?.folio ? `· ${paciente.folio}` : ""}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleColegiarCaso}
              disabled={!ultimaConsulta || colegiando || yaColegiado}
              className="text-sm px-3 py-1.5 rounded-full border border-emerald-500/50 text-emerald-200 hover:border-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {colegiando ? "Colegiando..." : yaColegiado ? "Caso ya colegiado" : "Colegiar caso"}
            </button>
            <Link href="/estatal" className="text-sm px-3 py-1.5 rounded-full border border-slate-600 hover:border-slate-400">
              Volver a módulo estatal
            </Link>
          </div>
        </header>

        {colegiadoError && (
          <section className="rounded-2xl border border-red-500/40 bg-red-900/20 p-3 text-sm text-red-200">
            {colegiadoError}
          </section>
        )}

        {!loading && yaColegiado && (
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-900/20 p-3 text-sm text-emerald-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Caso colegiado y enviado al módulo de Colegiados.</span>
              {ultimaConsulta?.id ? (
                <Link
                  href={`/colegiados/${ultimaConsulta.id}`}
                  className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs text-emerald-100 hover:border-emerald-300"
                >
                  Capturar acciones
                </Link>
              ) : null}
            </div>
          </section>
        )}

        {loading ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            Cargando datos del paciente...
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-red-500/40 bg-red-900/20 p-6 text-red-200">
            {error}
          </section>
        ) : !paciente ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            Paciente no encontrado.
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Card title="Puntaje total actual" value={`${puntajeTotalActual} pts`} highlight />
              <Card title="Antecedentes" value={`${Number(paciente.factor_riesgo_antecedentes) || 0} pts`} />
              <Card title="Tamizajes" value={`${Number(paciente.factor_riesgo_tamizajes) || 0} pts`} />
              <Card title="Última consulta" value={formatDate(ultimaConsulta?.fecha_consulta || null)} />
            </section>

            <section className="rounded-3xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Identificación y ubicación</h2>

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
                      ? "border-red-500/50 bg-red-900/30 text-red-200"
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
              </div>
            </section>

            <CollapsibleSection
              title="Antecedentes y factores de riesgo"
              subtitle="Campos resaltados aportan al puntaje de antecedentes"
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
                  label="Drogas ilícitas"
                  value={antecedentesConPuntos.factor_drogas_ilicitas ? `${boolLabel(paciente.factor_drogas_ilicitas)} · ${antecedentesConPuntos.factor_drogas_ilicitas} pts` : boolLabel(paciente.factor_drogas_ilicitas)}
                  size="compact"
                  toneClass={scoreToneClass(antecedentesConPuntos.factor_drogas_ilicitas || 0)}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Tamizajes"
              subtitle="Campos resaltados aportan al puntaje de tamizajes"
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
              defaultOpen={true}
            >
              <ScoreLegend />
              {!ultimaConsulta ? (
                <p className="text-slate-300">Sin consultas registradas.</p>
              ) : (
                <>
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
                </>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Historial de consultas"
              subtitle="Evolución de parámetros y puntajes por fecha"
              defaultOpen={false}
            >
              <ScoreLegend />
              {consultas.length === 0 ? (
                <p className="text-slate-300">Sin historial de consultas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-300">
                        <th className="py-2 pr-4">Fecha</th>
                        <th className="py-2 pr-4">T/A</th>
                        <th className="py-2 pr-4">FC</th>
                        <th className="py-2 pr-4">FR</th>
                        <th className="py-2 pr-4">Temp</th>
                        <th className="py-2 pr-4">Índice choque</th>
                        <th className="py-2 pr-4">Puntaje consulta</th>
                        <th className="py-2 pr-4">Puntaje total</th>
                        <th className="py-2 pr-0">Riesgo ≥25</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {consultas.map((consulta) => {
                        const scores = getConsultaScores(consulta);
                        return (
                        <tr key={consulta.id} className="hover:bg-slate-800/40">
                          <td className="py-2 pr-4">{formatDate(consulta.fecha_consulta)}</td>
                          <td className="py-2 pr-4">
                            {valueLabel(consulta.ta_sistolica)}/{valueLabel(consulta.ta_diastolica)}
                            <span className={`ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold ${scoreBadgeClass(scores.taTotal)}`}>
                              +{scores.taTotal}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            {valueLabel(consulta.frecuencia_cardiaca)}
                            <span className={`ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold ${scoreBadgeClass(scores.frecuenciaCardiaca)}`}>
                              +{scores.frecuenciaCardiaca}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{valueLabel(consulta.frecuencia_respiratoria)}</td>
                          <td className="py-2 pr-4">
                            {valueLabel(consulta.temperatura)}
                            <span className={`ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold ${scoreBadgeClass(scores.temperatura)}`}>
                              +{scores.temperatura}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            {valueLabel(consulta.indice_choque)}
                            <span className={`ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold ${scoreBadgeClass(scores.indiceChoque)}`}>
                              +{scores.indiceChoque}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{valueLabel(consulta.puntaje_consulta_parametros)}</td>
                          <td className="py-2 pr-4">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-200 border border-red-500/40">
                              {valueLabel(consulta.puntaje_total_consulta)} pts
                            </span>
                          </td>
                          <td className="py-2 pr-0">
                            {consulta.riesgo_25_plus ? (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-200 border border-red-500/40">
                                Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                                No
                              </span>
                            )}
                          </td>
                        </tr>
                      );})}
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

function Card({ title, value, highlight = false }: { title: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 shadow-lg ${highlight ? "border-red-500/40 bg-red-900/20" : "border-slate-700/80 bg-slate-900/70"}`}>
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-3xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-lg">
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-slate-300 mt-1">{subtitle}</p>}
          </div>
          <span className="text-xs px-2 py-1 rounded-full border border-slate-600 text-slate-300 bg-slate-800/70 group-open:hidden">
            Mostrar
          </span>
          <span className="hidden group-open:inline text-xs px-2 py-1 rounded-full border border-slate-600 text-slate-300 bg-slate-800/70">
            Ocultar
          </span>
        </div>
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  );
}

function ScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center rounded-md border border-slate-600 bg-slate-700/40 px-2 py-1 text-slate-200">Sin puntos</span>
      <span className="inline-flex items-center rounded-md border border-amber-500/50 bg-amber-500/20 px-2 py-1 text-amber-200">2 pts · alerta</span>
      <span className="inline-flex items-center rounded-md border border-red-500/50 bg-red-500/20 px-2 py-1 text-red-200">4+ pts · alto riesgo</span>
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
    <div className={`rounded-xl border px-3 py-2 min-w-0 ${sizeClass} ${toneClass || "border-slate-700 bg-slate-800/60"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm break-words ${toneClass ? "" : "text-slate-100"}`}>{valueLabel(value)}</p>
    </div>
  );
}
