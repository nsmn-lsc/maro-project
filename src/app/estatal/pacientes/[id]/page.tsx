"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { evaluarCampoIndividual } from "@/lib/riesgoFactores";
import { evaluarTamizajes } from "@/lib/riesgoTamizajes";
import { clasificarNivelRiesgo } from "@/lib/estatal-riesgo";
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
  localidad?: string | null;
  region: string | null;
  fecha_ingreso_cpn: string | null;
  fum?: string | null;
  fpp?: string | null;
  semanas_gestacion?: number | null;
  sdg_ingreso: number | null;
  imc_inicial?: number | null;
  estado_embarazo?: string | null;
  indigena?: boolean | number;
  migrante?: boolean | number;
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

type HallazgoActivo = {
  id: string;
  categoria: "CRITERIO CLÍNICO" | "ANTECEDENTE" | "TAMIZAJE" | "CONSULTA";
  etiqueta: string;
  detalle: string;
  puntos: number;
  critico?: boolean;
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

function valueLabel(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
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
    return "border-rose-300 dark:border-rose-500/50 bg-rose-50/90 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200 shadow-sm";
  if (points >= 2)
    return "border-amber-300 dark:border-amber-500/50 bg-amber-50/90 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 shadow-sm";
  return "";
}

function scoreBadgeClass(points: number) {
  if (points >= 4)
    return "border-rose-300 dark:border-rose-500/50 bg-rose-100 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200";
  if (points >= 2)
    return "border-amber-300 dark:border-amber-500/50 bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200";
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
  const [selectedConsultaId, setSelectedConsultaId] = useState<number | null>(null);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [soloPositivos, setSoloPositivos] = useState(false);
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

        if (!resPaciente.ok) throw new Error("No se pudo cargar el expediente del paciente");
        if (!resConsultas.ok) throw new Error("No se pudieron cargar las consultas prenatales");

        const pacienteData = (await resPaciente.json()) as Paciente;
        const consultasData = (await resConsultas.json()) as Consulta[];
        const lista = Array.isArray(consultasData) ? consultasData : [];

        if (!cancelled) {
          setPaciente(pacienteData);
          setConsultas(lista);
          if (lista.length > 0) {
            setSelectedConsultaId(lista[0].id);
          }
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
  const consultaActiva = useMemo(() => {
    if (!consultas.length) return null;
    if (selectedConsultaId !== null) {
      return consultas.find((c) => c.id === selectedConsultaId) || consultas[0];
    }
    return consultas[0];
  }, [consultas, selectedConsultaId]);

  const consultaColegiada = useMemo(
    () => consultas.find((c) => (c?.colegiado ?? 0) === 1) || null,
    [consultas]
  );
  const yaColegiado = Boolean(consultaColegiada);

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

  const puntajeAntecedentes = Number(paciente?.factor_riesgo_antecedentes) || 0;
  const puntajeTamizajes = Number(paciente?.factor_riesgo_tamizajes) || 0;
  const puntajeParametrosConsulta = Number(ultimaConsulta?.puntaje_consulta_parametros) || 0;

  const puntajeTotalActual = useMemo(() => {
    if (
      ultimaConsulta?.puntaje_total_consulta !== null &&
      ultimaConsulta?.puntaje_total_consulta !== undefined
    ) {
      return Number(ultimaConsulta.puntaje_total_consulta) || 0;
    }
    return puntajeAntecedentes + puntajeTamizajes;
  }, [ultimaConsulta, puntajeAntecedentes, puntajeTamizajes]);

  // Criterios clínicos prioritarios homologados con /api/estatal/riesgo
  const motivosCriterioClinico = useMemo(() => {
    if (!paciente) return [] as string[];
    const lista: string[] = [];
    const edad = Number(paciente.edad) || 0;
    const imc = Number(paciente.imc_inicial) || 0;
    if (edad >= 10 && edad <= 14) lista.push(`Edad crítica (${edad} años)`);
    if (imc >= 31) lista.push(`IMC ≥ 31 (${imc.toFixed(1)})`);
    if (paciente.factor_cardiopatia) lista.push("Cardiopatía");
    if (paciente.factor_hepatopatia) lista.push("Hepatopatía");
    if (paciente.factor_coagulopatias) lista.push("Coagulopatía");
    if (paciente.factor_nefropatia) lista.push("Nefropatía");
    return lista;
  }, [paciente]);

  const tieneAlertaClinica = motivosCriterioClinico.length > 0;
  const tieneRiesgo25Plus = Number(ultimaConsulta?.riesgo_25_plus) === 1;

  const nivelRiesgoOficial = useMemo(
    () => clasificarNivelRiesgo(puntajeTotalActual, tieneAlertaClinica, tieneRiesgo25Plus),
    [puntajeTotalActual, tieneAlertaClinica, tieneRiesgo25Plus]
  );

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

  const consultaActivaScores = useMemo(
    () => (consultaActiva ? getConsultaScores(consultaActiva) : null),
    [consultaActiva]
  );

  // Lista consolidada de hallazgos activos para auditoría rápida en 2 segundos
  const hallazgosActivos = useMemo<HallazgoActivo[]>(() => {
    if (!paciente) return [];
    const items: HallazgoActivo[] = [];

    const edad = Number(paciente.edad) || 0;
    if (edad >= 10 && edad <= 14) {
      items.push({
        id: "crit-edad",
        categoria: "CRITERIO CLÍNICO",
        etiqueta: "Edad Materna Crítica",
        detalle: `${edad} años`,
        puntos: 8,
        critico: true,
      });
    }

    const imc = Number(paciente.imc_inicial) || 0;
    if (imc >= 31) {
      items.push({
        id: "crit-imc",
        categoria: "CRITERIO CLÍNICO",
        etiqueta: "Obesidad Severa (IMC ≥ 31)",
        detalle: `IMC ${imc.toFixed(1)}`,
        puntos: 4,
        critico: true,
      });
    }

    const etiquetasAntecedentes: Record<string, string> = {
      gestas: "Gestas",
      cesareas: "Cesáreas previas",
      abortos: "Abortos previos",
      ant_preeclampsia: "Antecedente de Preeclampsia",
      ant_hemorragia: "Antecedente de Hemorragia",
      ant_sepsis: "Antecedente de Sepsis",
      ant_bajo_peso_macrosomia: "Bajo peso / Macrosomía",
      ant_muerte_perinatal: "Muerte perinatal previa",
      ant_embarazo_ectopico: "Embarazo ectópico previo",
      factor_diabetes: "Diabetes Mellitus",
      factor_hipertension: "Hipertensión Arterial",
      factor_obesidad: "Obesidad",
      factor_cardiopatia: "Cardiopatía",
      factor_hepatopatia: "Hepatopatía",
      factor_enf_autoinmune: "Enfermedad Autoinmune",
      factor_nefropatia: "Nefropatía",
      factor_coagulopatias: "Coagulopatía",
      factor_neuropatia: "Neuropatía",
      factor_enf_psiquiatrica: "Enfermedad Psiquiátrica",
      factor_alcoholismo: "Alcoholismo",
      factor_tabaquismo: "Tabaquismo",
      factor_drogas_ilicitas: "Sustancias ilícitas",
      factor_endocrinopatia: "Endocrinopatía",
      factor_neumopatia: "Neumopatía",
      factor_its: "Infección de Transmisión Sexual",
      factor_cirugias_pelvico_uterinas: "Cirugía pélvico-uterina",
      factor_discapacidad: "Discapacidad",
      factores_riesgo_epid: "Riesgo Epidemiológico",
    };

    Object.entries(antecedentesConPuntos).forEach(([campo, pts]) => {
      if (pts > 0) {
        items.push({
          id: `ant-${campo}`,
          categoria: "ANTECEDENTE",
          etiqueta: etiquetasAntecedentes[campo] || campo,
          detalle:
            campo === "gestas" || campo === "cesareas" || campo === "abortos"
              ? `Valor: ${(paciente as any)[campo]}`
              : "Positivo",
          puntos: pts,
          critico: pts >= 4,
        });
      }
    });

    const etiquetasTamizajes: Record<string, { nombre: string; val: string | null | undefined }> = {
      prueba_vih: { nombre: "Tamizaje VIH", val: paciente.prueba_vih },
      prueba_vdrl: { nombre: "Tamizaje VDRL / Sífilis", val: paciente.prueba_vdrl },
      prueba_hepatitis_c: { nombre: "Tamizaje Hepatitis C", val: paciente.prueba_hepatitis_c },
      diabetes_glicemia: { nombre: "Glicemia / Diabetes", val: paciente.diabetes_glicemia },
      violencia: { nombre: "Tamizaje de Violencia", val: paciente.violencia },
    };

    Object.entries(tamizajesConPuntos).forEach(([campo, pts]) => {
      if (pts > 0) {
        const meta = etiquetasTamizajes[campo];
        items.push({
          id: `tam-${campo}`,
          categoria: "TAMIZAJE",
          etiqueta: meta?.nombre || campo,
          detalle: String(meta?.val || "Reactivo"),
          puntos: pts,
          critico: pts >= 4,
        });
      }
    });

    if (ultimaConsulta) {
      const sc = getConsultaScores(ultimaConsulta);
      if (sc.taTotal > 0) {
        items.push({
          id: "con-ta",
          categoria: "CONSULTA",
          etiqueta: "Tensión Arterial Alterada",
          detalle: `${ultimaConsulta.ta_sistolica ?? "—"}/${ultimaConsulta.ta_diastolica ?? "—"} mmHg`,
          puntos: sc.taTotal,
          critico: sc.taTotal >= 4,
        });
      }
      if (sc.frecuenciaCardiaca > 0) {
        items.push({
          id: "con-fc",
          categoria: "CONSULTA",
          etiqueta: "Frecuencia Cardíaca Alterada",
          detalle: `${ultimaConsulta.frecuencia_cardiaca} lpm`,
          puntos: sc.frecuenciaCardiaca,
          critico: true,
        });
      }
      if (sc.indiceChoque > 0) {
        items.push({
          id: "con-ic",
          categoria: "CONSULTA",
          etiqueta: "Índice de Choque Elevado",
          detalle: `${ultimaConsulta.indice_choque}`,
          puntos: sc.indiceChoque,
          critico: sc.indiceChoque >= 4,
        });
      }
      if (sc.temperatura > 0) {
        items.push({
          id: "con-temp",
          categoria: "CONSULTA",
          etiqueta: "Temperatura fuera de rango",
          detalle: `${ultimaConsulta.temperatura} °C`,
          puntos: sc.temperatura,
          critico: sc.temperatura >= 4,
        });
      }
    }

    return items.sort((a, b) => b.puntos - a.puntos);
  }, [paciente, antecedentesConPuntos, tamizajesConPuntos, ultimaConsulta]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Validando acceso al expediente estatal...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative text-slate-800 dark:text-white transition-colors duration-300">
      {/* CAPA DE FONDO FIJA - MODO CLARO */}
      <div
        className="fixed inset-0 pointer-events-none z-0 dark:hidden bg-slate-100/50"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(241, 245, 249, 0.78), rgba(204, 251, 241, 0.62)), url(/maro_back_estatal.png)",
          backgroundSize: "cover",
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
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {loading ? (
          <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-slate-900/75 py-16 text-center space-y-3 shadow-xl">
            <div className="inline-block animate-spin rounded-full h-9 w-9 border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Cargando expediente clínico e historial prenatal...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-rose-300 dark:border-rose-500/40 bg-rose-50/90 dark:bg-rose-900/25 p-6 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-xl" />
              <span className="font-semibold text-sm">{error}</span>
            </div>
            <Link
              href="/estatal"
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
            >
              Volver a Estatal
            </Link>
          </section>
        ) : !paciente ? (
          <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-slate-900/75 p-10 text-center text-slate-600 dark:text-slate-300 shadow-xl">
            Expediente no encontrado.
          </section>
        ) : (
          <>
            {/* 1. FICHA SUPERIOR DE IDENTIDAD CLÍNICA ("PATIENT COMMAND HEADER") */}
            <header className="relative overflow-hidden rounded-3xl border border-slate-200/85 dark:border-white/15 bg-white/80 dark:bg-slate-900/70 p-5 sm:p-6 shadow-xl space-y-5">
              <div
                className={`absolute inset-x-0 top-0 h-1.5 ${
                  nivelRiesgoOficial === "MUY ALTO"
                    ? "bg-gradient-to-r from-rose-500 via-red-500 to-orange-500"
                    : nivelRiesgoOficial === "ALTO"
                      ? "bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500"
                      : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                }`}
              />

              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Avatar Clínico */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shrink-0 ${
                      nivelRiesgoOficial === "MUY ALTO"
                        ? "bg-gradient-to-br from-rose-600 to-red-600 shadow-rose-600/30"
                        : nivelRiesgoOficial === "ALTO"
                          ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30"
                    }`}
                  >
                    <i className="fa-solid fa-hospital-user" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-300">
                        Auditoría Clínica Estatal
                      </span>
                      {paciente.folio && (
                        <span className="text-xs bg-slate-900 dark:bg-white/10 text-white px-2.5 py-0.5 rounded-full font-mono font-bold">
                          {paciente.folio}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-black border ${
                          nivelRiesgoOficial === "MUY ALTO"
                            ? "bg-rose-500/15 border-rose-500/40 text-rose-800 dark:text-rose-200"
                            : nivelRiesgoOficial === "ALTO"
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
                        }`}
                      >
                        RIESGO {nivelRiesgoOficial} ({puntajeTotalActual} PTS)
                      </span>
                      {yaColegiado && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                          <i className="fa-solid fa-circle-check text-[10px]" />
                          <span>Caso Colegiado</span>
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {paciente.nombre_completo || "Paciente sin nombre registrado"}
                    </h1>

                    {/* Cinta rápida de contexto demográfico y obstétrico */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border ${
                          Number(paciente.edad) >= 10 && Number(paciente.edad) <= 14
                            ? "bg-rose-100 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border-rose-400"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10"
                        }`}
                      >
                        <i className="fa-solid fa-cake-candles text-[10px] opacity-75" />
                        <span>
                          {paciente.edad !== null && paciente.edad !== undefined
                            ? `${paciente.edad} años`
                            : "Edad N/D"}
                        </span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 border border-cyan-500/25">
                        <span>G:{paciente.gestas ?? 0}</span>
                        <span>·</span>
                        <span>P:{paciente.partos ?? 0}</span>
                        <span>·</span>
                        <span>C:{paciente.cesareas ?? 0}</span>
                        <span>·</span>
                        <span>A:{paciente.abortos ?? 0}</span>
                      </span>

                      {(ultimaConsulta?.sdg || paciente.semanas_gestacion || paciente.sdg_ingreso) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-teal-500/10 dark:bg-teal-500/20 text-teal-900 dark:text-teal-200 border border-teal-500/25">
                          <i className="fa-solid fa-baby text-[10px]" />
                          <span>
                            {ultimaConsulta?.sdg ?? paciente.semanas_gestacion ?? paciente.sdg_ingreso} SDG
                          </span>
                        </span>
                      )}

                      {paciente.fpp && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                          <i className="fa-regular fa-calendar text-[10px]" />
                          <span>FPP: {formatDate(paciente.fpp)}</span>
                        </span>
                      )}

                      {paciente.imc_inicial !== null && paciente.imc_inicial !== undefined && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold border ${
                            Number(paciente.imc_inicial) >= 31
                              ? "bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-400"
                              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10"
                          }`}
                        >
                          <span>IMC: {Number(paciente.imc_inicial).toFixed(1)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones de Navegación y Dictamen */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {yaColegiado && consultaColegiada ? (
                    <>
                      <Link
                        href={`/colegiados/${consultaColegiada.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition"
                      >
                        <i className="fa-solid fa-list-check" />
                        <span>Plan Colegiado</span>
                      </Link>
                      <Link
                        href={`/colegiados/${consultaColegiada.id}/formato`}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 transition"
                      >
                        <i className="fa-solid fa-file-pdf" />
                        <span>Formato Oficial</span>
                      </Link>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleColegiarCaso}
                      disabled={!ultimaConsulta || colegiando}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className={`fa-solid ${colegiando ? "fa-spinner fa-spin" : "fa-users-viewfinder"}`} />
                      <span>{colegiando ? "Dictaminando..." : "Colegiar Caso"}</span>
                    </button>
                  )}

                  <Link
                    href="/estatal"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition"
                  >
                    <i className="fa-solid fa-arrow-left text-emerald-600 dark:text-emerald-400" />
                    <span>Tablero Estatal</span>
                  </Link>
                  <ThemeToggle />
                </div>
              </div>

              {/* Cinta inferior de adscripción médica y localización */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-4 border-t border-slate-200/80 dark:border-white/10 text-xs">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Unidad Médica
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block" title={paciente.unidad || ""}>
                    {valueLabel(paciente.unidad)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Clave CLUES
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 block">
                    {valueLabel(paciente.clues_id)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Región Sanitaria
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {valueLabel(paciente.region)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Municipio / Loc.
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {valueLabel(paciente.municipio)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Ingreso CPN / Derechohab.
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {formatDate(paciente.fecha_ingreso_cpn)} · {valueLabel(paciente.derechohabiencia)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Contacto / Teléfono
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {valueLabel(paciente.telefono)}
                  </span>
                </div>
              </div>
            </header>

            {colegiadoError && (
              <section className="rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-lg">
                <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-lg" />
                <span>{colegiadoError}</span>
              </section>
            )}

            {/* 2. BENTO GRID DE ESTRATIFICACIÓN Y ECUACIÓN MARO (4 TARJETAS) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Semáforo Oficial MARO */}
              <div
                className={`relative overflow-hidden rounded-3xl border-2 p-5 shadow-xl flex flex-col justify-between gap-3 ${
                  nivelRiesgoOficial === "MUY ALTO"
                    ? "border-rose-500/60 dark:border-rose-400/50 bg-gradient-to-br from-rose-50/95 via-white to-red-50/90 dark:from-rose-950/85 dark:via-slate-900 dark:to-slate-900"
                    : nivelRiesgoOficial === "ALTO"
                      ? "border-amber-500/60 dark:border-amber-400/50 bg-gradient-to-br from-amber-50/95 via-white to-yellow-50/90 dark:from-amber-950/80 dark:via-slate-900 dark:to-slate-900"
                      : "border-emerald-500/50 dark:border-emerald-400/50 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/90 dark:from-emerald-950/80 dark:via-slate-900 dark:to-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Clasificación Oficial MARO
                    </span>
                    <p
                      className={`text-sm font-black uppercase ${
                        nivelRiesgoOficial === "MUY ALTO"
                          ? "text-rose-700 dark:text-rose-300"
                          : nivelRiesgoOficial === "ALTO"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      Riesgo {nivelRiesgoOficial}
                    </p>
                  </div>
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-md shrink-0 ${
                      nivelRiesgoOficial === "MUY ALTO"
                        ? "bg-gradient-to-br from-rose-600 to-red-600"
                        : nivelRiesgoOficial === "ALTO"
                          ? "bg-gradient-to-br from-amber-500 to-orange-500"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600"
                    }`}
                  >
                    <i className="fa-solid fa-heart-pulse" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                      nivelRiesgoOficial === "MUY ALTO"
                        ? "text-rose-600 dark:text-rose-400"
                        : nivelRiesgoOficial === "ALTO"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {puntajeTotalActual}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    pts totales
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <span>Umbral crítico: ≥25 pts</span>
                  <span className="font-mono font-bold">
                    {tieneAlertaClinica ? "Alerta Clínica" : "Por Puntaje"}
                  </span>
                </div>
              </div>

              {/* KPI 2: Antecedentes */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/85 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300">
                      Componente 1 · Historia
                    </span>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      Antecedentes Clínicos
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-700 dark:text-teal-300 text-lg shrink-0">
                    <i className="fa-solid fa-notes-medical" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    +{puntajeAntecedentes}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    pts
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span>Factores positivos:</span>
                  <strong className="font-mono text-teal-700 dark:text-teal-300">
                    {Object.keys(antecedentesConPuntos).length} detectados
                  </strong>
                </div>
              </div>

              {/* KPI 3: Tamizajes */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/85 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                      Componente 2 · Detección
                    </span>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      Tamizajes Prenatales
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 text-lg shrink-0">
                    <i className="fa-solid fa-vial-circle-check" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    +{puntajeTamizajes}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    pts
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span>Reactivos / Alertas:</span>
                  <strong className="font-mono text-amber-700 dark:text-amber-300">
                    {Object.values(tamizajesConPuntos).filter((v) => v > 0).length} de 5 pruebas
                  </strong>
                </div>
              </div>

              {/* KPI 4: Parámetros de Consulta */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/85 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                      Componente 3 · Evolución
                    </span>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      Signos en Consulta
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-300 text-lg shrink-0">
                    <i className="fa-solid fa-stethoscope" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    +{puntajeParametrosConsulta}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    pts
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span>Última: {formatDate(ultimaConsulta?.fecha_consulta)}</span>
                  <strong className="font-mono text-cyan-700 dark:text-cyan-300">
                    {consultas.length} {consultas.length === 1 ? "visita" : "visitas"}
                  </strong>
                </div>
              </div>
            </section>

            {/* 3. BANNER DE HALLAZGOS CRÍTICOS Y FACTORES ACTIVOS (AUDITORÍA EN 2 SEGUNDOS) */}
            <section className="rounded-3xl border border-slate-200/85 dark:border-white/15 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xs">
                    <i className="fa-solid fa-bolt" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      Resumen de Hallazgos Positivos que Aportan al Riesgo
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Factores clínicos, antecedentes, tamizajes y signos vitales que justifican la puntuación actual
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  {hallazgosActivos.length}{" "}
                  {hallazgosActivos.length === 1 ? "factor activo" : "factores activos"}
                </span>
              </div>

              {hallazgosActivos.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400" />
                  <span>
                    No se detectaron factores de riesgo ni alteraciones en signos vitales con puntaje activo.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {hallazgosActivos.map((h) => (
                    <div
                      key={h.id}
                      className={`flex items-stretch justify-between gap-3 rounded-2xl border p-3 min-h-[76px] shadow-sm ${
                        h.critico
                          ? "border-rose-300 dark:border-rose-500/45 bg-rose-50/90 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100"
                          : "border-amber-300 dark:border-amber-500/45 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100"
                      }`}
                    >
                      <div className="min-w-0 flex flex-col justify-between gap-1.5">
                        <span
                          className={`self-start text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            h.critico
                              ? "bg-rose-500/20 text-rose-800 dark:text-rose-200"
                              : "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                          }`}
                        >
                          {h.categoria}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate" title={h.etiqueta}>
                            {h.etiqueta}
                          </p>
                          <p
                            className="text-[11px] text-slate-600 dark:text-slate-400 truncate"
                            title={h.detalle}
                          >
                            {h.detalle}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 self-center w-16 text-center font-mono text-xs font-black py-1.5 rounded-xl border ${
                          h.critico
                            ? "bg-rose-600 text-white border-rose-500"
                            : "bg-amber-500 text-slate-950 border-amber-400"
                        }`}
                      >
                        +{h.puntos} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4. MONITOR CLÍNICO DE CONSULTA PRENATAL (COLAPSABLE Y SELECCIONABLE) */}
            <CollapsibleSection
              title="Monitor de Consulta Prenatal y Signos Vitales"
              subtitle={
                consultaActiva
                  ? `Evaluación: ${formatDate(consultaActiva.fecha_consulta)} · SDG: ${consultaActiva.sdg ?? "—"} · ${
                      ultimaConsulta && consultaActiva.id === ultimaConsulta.id
                        ? "Consulta más reciente"
                        : "Inspeccionando consulta histórica"
                    }`
                  : "Sin consultas registradas para esta paciente"
              }
              icon="fa-solid fa-heart-pulse"
              open={monitorOpen}
              onToggle={setMonitorOpen}
            >
              {consultaActiva && ultimaConsulta && consultaActiva.id !== ultimaConsulta.id && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    Inspeccionando consulta histórica del {formatDate(consultaActiva.fecha_consulta)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedConsultaId(ultimaConsulta.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]" />
                    <span>Volver a última consulta</span>
                  </button>
                </div>
              )}

              {!consultaActiva ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                  No existen registros de consultas prenatales para mostrar.
                </p>
              ) : (
                <>
                  {/* Tarjetas tipo Monitor de Signos Vitales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Signo 1: Tensión Arterial */}
                    <div
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between ${
                        scoreToneClass(consultaActivaScores?.taTotal ?? 0) ||
                        "border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Tensión Arterial
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreBadgeClass(
                            consultaActivaScores?.taTotal ?? 0
                          )}`}
                        >
                          +{consultaActivaScores?.taTotal ?? 0}
                        </span>
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                          {valueLabel(consultaActiva.ta_sistolica)}/{valueLabel(consultaActiva.ta_diastolica)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">mmHg</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Normal: &lt;140/90
                      </span>
                    </div>

                    {/* Signo 2: Frecuencia Cardíaca */}
                    <div
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between ${
                        scoreToneClass(consultaActivaScores?.frecuenciaCardiaca ?? 0) ||
                        "border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Frec. Cardíaca
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreBadgeClass(
                            consultaActivaScores?.frecuenciaCardiaca ?? 0
                          )}`}
                        >
                          +{consultaActivaScores?.frecuenciaCardiaca ?? 0}
                        </span>
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                          {valueLabel(consultaActiva.frecuencia_cardiaca)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">lpm</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Rango: 60–100 lpm
                      </span>
                    </div>

                    {/* Signo 3: Índice de Choque */}
                    <div
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between ${
                        scoreToneClass(consultaActivaScores?.indiceChoque ?? 0) ||
                        "border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Índice Choque
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreBadgeClass(
                            consultaActivaScores?.indiceChoque ?? 0
                          )}`}
                        >
                          +{consultaActivaScores?.indiceChoque ?? 0}
                        </span>
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                          {valueLabel(consultaActiva.indice_choque)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">FC/TAS</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Normal: &lt;0.7
                      </span>
                    </div>

                    {/* Signo 4: Temperatura */}
                    <div
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between ${
                        scoreToneClass(consultaActivaScores?.temperatura ?? 0) ||
                        "border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Temperatura
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreBadgeClass(
                            consultaActivaScores?.temperatura ?? 0
                          )}`}
                        >
                          +{consultaActivaScores?.temperatura ?? 0}
                        </span>
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                          {valueLabel(consultaActiva.temperatura)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">°C</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Rango: 36.0–37.4 °C
                      </span>
                    </div>

                    {/* Signo 5: Frecuencia Respiratoria y SDG */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Frec. Respiratoria
                      </span>
                      <div className="my-1.5">
                        <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                          {valueLabel(consultaActiva.frecuencia_respiratoria)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">rpm</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Respiración: {valueLabel(consultaActiva.respiracion)}
                      </span>
                    </div>

                    {/* Signo 6: Estado Clínico General */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Estado Clínico
                      </span>
                      <div className="my-1 space-y-0.5 text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          Conciencia: {valueLabel(consultaActiva.estado_conciencia)}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          Piel: {valueLabel(consultaActiva.color_piel)}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Hemorragia: {valueLabel(consultaActiva.hemorragia)}
                      </span>
                    </div>
                  </div>

                  {/* Diagnóstico, Plan de Manejo y Notas Clínicas */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                        <i className="fa-solid fa-file-medical" />
                        <span>Diagnóstico Clínico</span>
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                        {valueLabel(consultaActiva.diagnostico)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <i className="fa-solid fa-clipboard-check" />
                        <span>Plan de Manejo Terapéutico</span>
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                        {valueLabel(consultaActiva.plan)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <i className="fa-solid fa-comment-medical" />
                        <span>Notas y Observaciones</span>
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {valueLabel(consultaActiva.notas)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleSection>

            {/* 5. HISTORIAL DE CONSULTAS INTERACTIVO */}
            <CollapsibleSection
              title={`Historial de Consultas Prenatales (${consultas.length})`}
              subtitle="Haga clic en cualquier fila para cargar y desplegar sus signos vitales, diagnóstico y plan en el monitor superior"
              icon="fa-solid fa-clock-rotate-left"
              defaultOpen={true}
            >
              {consultas.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sin historial de consultas registradas.
                </p>
              ) : (
                <div className="max-h-[380px] overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-xs text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold">
                      <tr className="whitespace-nowrap">
                        <th className="px-3.5 py-2.5">Fecha</th>
                        <th className="px-2.5 py-2.5">SDG</th>
                        <th className="px-2.5 py-2.5">T/A (mmHg)</th>
                        <th className="px-2.5 py-2.5">FC</th>
                        <th className="px-2.5 py-2.5 hidden md:table-cell">Temp</th>
                        <th className="px-2.5 py-2.5 hidden lg:table-cell">Índ. Choque</th>
                        <th className="px-2.5 py-2.5 hidden xl:table-cell">Diagnóstico</th>
                        <th className="px-2.5 py-2.5 text-right">Pts Signos</th>
                        <th className="px-2.5 py-2.5 text-right">Puntaje Total</th>
                        <th className="px-3 py-2.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                      {consultas.map((consulta, idx) => {
                        const scores = getConsultaScores(consulta);
                        const isSelected = consultaActiva?.id === consulta.id;
                        const nivelRow = clasificarNivelRiesgo(
                          Number(consulta.puntaje_total_consulta),
                          tieneAlertaClinica,
                          Number(consulta.riesgo_25_plus) === 1
                        );

                        return (
                          <tr
                            key={consulta.id}
                            onClick={() => {
                              setSelectedConsultaId(consulta.id);
                              setMonitorOpen(true);
                            }}
                            className={`transition-colors whitespace-nowrap cursor-pointer ${
                              isSelected
                                ? "bg-cyan-500/10 dark:bg-cyan-500/15 font-semibold"
                                : "hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <td className="px-3.5 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span>{formatDate(consulta.fecha_consulta)}</span>
                                {idx === 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-sans font-bold">
                                    Actual
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2.5 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                              {consulta.sdg ?? "—"}
                            </td>
                            <td className="px-2.5 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                              {valueLabel(consulta.ta_sistolica)}/{valueLabel(consulta.ta_diastolica)}
                              {scores.taTotal > 0 && (
                                <span
                                  className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(
                                    scores.taTotal
                                  )}`}
                                >
                                  +{scores.taTotal}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                              {valueLabel(consulta.frecuencia_cardiaca)}
                              {scores.frecuenciaCardiaca > 0 && (
                                <span
                                  className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(
                                    scores.frecuenciaCardiaca
                                  )}`}
                                >
                                  +{scores.frecuenciaCardiaca}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 font-mono text-slate-800 dark:text-slate-200 hidden md:table-cell">
                              {valueLabel(consulta.temperatura)}
                              {scores.temperatura > 0 && (
                                <span
                                  className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(
                                    scores.temperatura
                                  )}`}
                                >
                                  +{scores.temperatura}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 font-mono text-slate-800 dark:text-slate-200 hidden lg:table-cell">
                              {valueLabel(consulta.indice_choque)}
                              {scores.indiceChoque > 0 && (
                                <span
                                  className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(
                                    scores.indiceChoque
                                  )}`}
                                >
                                  +{scores.indiceChoque}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-600 dark:text-slate-400 hidden xl:table-cell max-w-[200px] truncate">
                              {valueLabel(consulta.diagnostico)}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                              +{consulta.puntaje_consulta_parametros ?? 0}
                            </td>
                            <td className="px-2.5 py-2.5 text-right">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-bold border ${
                                  nivelRow === "MUY ALTO"
                                    ? "bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/40"
                                    : nivelRow === "ALTO"
                                      ? "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40"
                                      : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40"
                                }`}
                              >
                                {valueLabel(consulta.puntaje_total_consulta)} pts
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                  isSelected
                                    ? "bg-cyan-600 text-white"
                                    : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <i className="fa-solid fa-eye text-[9px]" />
                                <span>{isSelected ? "En monitor" : "Ver"}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* 6. ANTECEDENTES Y TAMIZAJES AGRUPADOS CON FILTRO "SOLO POSITIVOS" */}
            <CollapsibleSection
              title="Matriz Completa de Antecedentes y Tamizajes"
              subtitle="Audita el desglose por dominios clínicos (colapsado por defecto para priorizar hallazgos activos)"
              icon="fa-solid fa-clipboard-list"
              defaultOpen={false}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
                <ScoreLegend />

                <button
                  type="button"
                  onClick={() => setSoloPositivos((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    soloPositivos
                      ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-sm"
                      : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  <i className={`fa-solid ${soloPositivos ? "fa-filter-circle-xmark" : "fa-filter"}`} />
                  <span>
                    {soloPositivos ? "Mostrando solo hallazgos positivos" : "Ocultar descartados (No)"}
                  </span>
                </button>
              </div>

              {/* Grid de 3 Dominios Clínicos Balanceados */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2">
                {/* DOMINIO 1: HISTORIA GINECO-OBSTÉTRICA */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-white/10 pb-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-300">
                          <i className="fa-solid fa-person-pregnant text-[11px]" />
                        </span>
                        <span>Historia Gineco-Obstétrica</span>
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-200 border border-teal-500/20">
                        Fórmula GPCA
                      </span>
                    </div>

                    {/* Cinta de Fórmula Obstétrica (4 contadores numéricos) */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: "gestas", short: "G", label: "Gestas", val: paciente.gestas ?? 0 },
                        { key: "partos", short: "P", label: "Partos", val: paciente.partos ?? 0 },
                        { key: "cesareas", short: "C", label: "Cesáreas", val: paciente.cesareas ?? 0 },
                        { key: "abortos", short: "A", label: "Abortos", val: paciente.abortos ?? 0 },
                      ].map((item) => {
                        const pts = antecedentesConPuntos[item.key] || 0;
                        return (
                          <div
                            key={item.key}
                            className={`rounded-xl border p-2.5 text-center transition ${
                              pts > 0
                                ? scoreToneClass(pts)
                                : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/70"
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                              {item.label}
                            </span>
                            <span className="text-xl font-black font-mono text-slate-900 dark:text-white block mt-0.5">
                              {item.val}
                            </span>
                            {pts > 0 && (
                              <span className="inline-block mt-1 text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200">
                                +{pts} pts
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Antecedentes Obstétricos Relevantes */}
                    {(() => {
                      const obsItems = [
                        { key: "ant_preeclampsia", label: "Preeclampsia previa", raw: paciente.ant_preeclampsia },
                        { key: "ant_hemorragia", label: "Hemorragia obstétrica", raw: paciente.ant_hemorragia },
                        { key: "ant_sepsis", label: "Sepsis materna", raw: paciente.ant_sepsis },
                        { key: "ant_bajo_peso_macrosomia", label: "Bajo peso / Macrosomía", raw: paciente.ant_bajo_peso_macrosomia },
                        { key: "ant_muerte_perinatal", label: "Muerte perinatal", raw: paciente.ant_muerte_perinatal },
                        { key: "ant_embarazo_ectopico", label: "Embarazo ectópico", raw: paciente.ant_embarazo_ectopico },
                        { key: "factor_cirugias_pelvico_uterinas", label: "Cirugía pélvico-uterina", raw: paciente.factor_cirugias_pelvico_uterinas },
                      ];
                      const positivos = obsItems.filter(
                        (item) => (antecedentesConPuntos[item.key] || 0) > 0 || Boolean(item.raw)
                      );
                      const negativos = obsItems.filter(
                        (item) => !((antecedentesConPuntos[item.key] || 0) > 0 || Boolean(item.raw))
                      );

                      return (
                        <div className="space-y-3">
                          {positivos.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
                                Hallazgos Obstétricos Positivos ({positivos.length})
                              </span>
                              {positivos.map((item) => {
                                const pts = antecedentesConPuntos[item.key] || 0;
                                return (
                                  <div
                                    key={item.key}
                                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${scoreToneClass(
                                      pts || 2
                                    )}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <i className="fa-solid fa-circle-exclamation text-rose-600 dark:text-rose-400" />
                                      <span>{item.label}</span>
                                    </div>
                                    <span className="font-mono font-black text-[11px] px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30">
                                      Sí {pts ? `· +${pts} pts` : ""}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                              <i className="fa-solid fa-circle-check text-emerald-500" />
                              <span>Sin antecedentes obstétricos adversos reportados</span>
                            </div>
                          )}

                          {!soloPositivos && negativos.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                Condiciones Descartadas ({negativos.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {negativos.map((item) => (
                                  <div
                                    key={item.key}
                                    className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400"
                                  >
                                    <span className="truncate" title={item.label}>
                                      {item.label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                                      <i className="fa-solid fa-check text-emerald-500/70 text-[9px]" />
                                      No
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* DOMINIO 2: COMORBILIDADES CRÓNICAS Y SISTÉMICAS */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-white/10 pb-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-300">
                          <i className="fa-solid fa-heart-circle-exclamation text-[11px]" />
                        </span>
                        <span>Comorbilidades Crónicas</span>
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border border-cyan-500/20">
                        13 Patologías
                      </span>
                    </div>

                    {(() => {
                      const comorbilidades = [
                        { key: "factor_diabetes", label: "Diabetes Mellitus", raw: paciente.factor_diabetes },
                        { key: "factor_hipertension", label: "Hipertensión Arterial", raw: paciente.factor_hipertension },
                        { key: "factor_obesidad", label: "Obesidad Clínica", raw: paciente.factor_obesidad },
                        { key: "factor_cardiopatia", label: "Cardiopatía", raw: paciente.factor_cardiopatia },
                        { key: "factor_hepatopatia", label: "Hepatopatía", raw: paciente.factor_hepatopatia },
                        { key: "factor_nefropatia", label: "Nefropatía", raw: paciente.factor_nefropatia },
                        { key: "factor_coagulopatias", label: "Coagulopatías", raw: paciente.factor_coagulopatias },
                        { key: "factor_enf_autoinmune", label: "Enf. Autoinmune", raw: paciente.factor_enf_autoinmune },
                        { key: "factor_endocrinopatia", label: "Endocrinopatía", raw: paciente.factor_endocrinopatia },
                        { key: "factor_neumopatia", label: "Neumopatía", raw: paciente.factor_neumopatia },
                        { key: "factor_neuropatia", label: "Neuropatía / Epilepsia", raw: paciente.factor_neuropatia },
                        { key: "factor_enf_psiquiatrica", label: "Enf. Psiquiátrica", raw: paciente.factor_enf_psiquiatrica },
                        { key: "factor_its", label: "Infección Transmisión Sexual", raw: paciente.factor_its },
                      ];

                      const positivos = comorbilidades.filter(
                        (item) => (antecedentesConPuntos[item.key] || 0) > 0 || Boolean(item.raw)
                      );
                      const negativos = comorbilidades.filter(
                        (item) => !((antecedentesConPuntos[item.key] || 0) > 0 || Boolean(item.raw))
                      );

                      return (
                        <div className="space-y-3">
                          {positivos.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
                                Patologías Activas Detectadas ({positivos.length})
                              </span>
                              {positivos.map((item) => {
                                const pts = antecedentesConPuntos[item.key] || 0;
                                return (
                                  <div
                                    key={item.key}
                                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${scoreToneClass(
                                      pts || 2
                                    )}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400" />
                                      <span>{item.label}</span>
                                    </div>
                                    <span className="font-mono font-black text-[11px] px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30">
                                      Positivo {pts ? `· +${pts} pts` : ""}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                              <i className="fa-solid fa-shield-heart text-emerald-500" />
                              <span>Sin comorbilidades crónicas activas</span>
                            </div>
                          )}

                          {!soloPositivos && negativos.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                Patologías Descartadas ({negativos.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {negativos.map((item) => (
                                  <div
                                    key={item.key}
                                    className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400"
                                  >
                                    <span className="truncate" title={item.label}>
                                      {item.label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                                      <i className="fa-solid fa-check text-emerald-500/70 text-[9px]" />
                                      No
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* DOMINIO 3: PANEL DE TAMIZAJES Y PSICOSOCIALES */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    {/* Sub-bloque 3A: Tamizajes Prenatales */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-white/10 pb-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300">
                            <i className="fa-solid fa-microscope text-[11px]" />
                          </span>
                          <span>Tamizajes Prenatales</span>
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                          +{puntajeTamizajes} pts
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {[
                          { key: "prueba_vih", label: "Prueba VIH", val: paciente.prueba_vih },
                          { key: "prueba_vdrl", label: "Sífilis (VDRL)", val: paciente.prueba_vdrl },
                          { key: "prueba_hepatitis_c", label: "Hepatitis C", val: paciente.prueba_hepatitis_c },
                          { key: "diabetes_glicemia", label: "Diabetes / Glicemia", val: paciente.diabetes_glicemia },
                          { key: "violencia", label: "Tamizaje Violencia", val: paciente.violencia },
                        ]
                          .filter((item) => !soloPositivos || (tamizajesConPuntos[item.key] || 0) > 0)
                          .map((item) => {
                            const pts = tamizajesConPuntos[item.key] || 0;
                            return (
                              <div
                                key={item.key}
                                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                                  pts > 0
                                    ? scoreToneClass(pts)
                                    : "border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-200"
                                }`}
                              >
                                <span className="font-semibold">{item.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                      pts > 0
                                        ? "bg-white/75 dark:bg-black/30"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    }`}
                                  >
                                    {valueLabel(item.val)}
                                  </span>
                                  {pts > 0 && (
                                    <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white">
                                      +{pts} pts
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Sub-bloque 3B: Factores Psicosociales y Otros */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Factores Psicosociales y Toxicomanías
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: "factor_alcoholismo", label: "Alcoholismo", raw: paciente.factor_alcoholismo },
                          { key: "factor_tabaquismo", label: "Tabaquismo", raw: paciente.factor_tabaquismo },
                          { key: "factor_drogas_ilicitas", label: "Otras Drogas", raw: paciente.factor_drogas_ilicitas },
                          { key: "factor_discapacidad", label: "Discapacidad", raw: paciente.factor_discapacidad },
                        ]
                          .filter(
                            (item) =>
                              !soloPositivos ||
                              (antecedentesConPuntos[item.key] || 0) > 0 ||
                              Boolean(item.raw)
                          )
                          .map((item) => {
                            const pts = antecedentesConPuntos[item.key] || 0;
                            const activo = pts > 0 || Boolean(item.raw);
                            return (
                              <div
                                key={item.key}
                                className={`flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                                  activo
                                    ? scoreToneClass(pts || 2)
                                    : "border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                <span className="truncate font-medium">{item.label}</span>
                                <span className="font-mono font-bold text-[10px] shrink-0">
                                  {activo ? `Sí${pts ? ` (+${pts})` : ""}` : "No"}
                                </span>
                              </div>
                            );
                          })}
                      </div>

                      {paciente.otros_antecedentes && (
                        <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/70 p-2.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Otros antecedentes registrados
                          </span>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                            {paciente.otros_antecedentes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
  open,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (nextOpen: boolean) => void;
}) {
  const isControlled = open !== undefined;

  return (
    <details
      open={isControlled ? open : defaultOpen}
      onToggle={
        isControlled && onToggle
          ? (e) => onToggle((e.currentTarget as HTMLDetailsElement).open)
          : undefined
      }
      className="group rounded-3xl border border-slate-200/85 dark:border-white/15 bg-white/80 dark:bg-slate-900/70 p-5 sm:p-6 shadow-xl transition-colors"
    >
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                <i className={icon} />
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 group-open:hidden">
            Desplegar
          </span>
          <span className="hidden group-open:inline text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5">
            Contraer
          </span>
        </div>
      </summary>
      <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-white/10 space-y-4">
        {children}
      </div>
    </details>
  );
}

function ScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center rounded-lg border border-emerald-300 dark:border-emerald-400/35 bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-1 font-semibold text-emerald-800 dark:text-emerald-100">
        0 pts · Normal
      </span>
      <span className="inline-flex items-center rounded-lg border border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-200">
        +2 pts · Alerta moderada
      </span>
      <span className="inline-flex items-center rounded-lg border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/20 px-2.5 py-1 font-semibold text-rose-800 dark:text-rose-200">
        +4 pts o más · Riesgo alto
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
