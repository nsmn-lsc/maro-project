"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { evaluarCampoIndividual } from "@/lib/riesgoFactores";
import { evaluarTamizajes } from "@/lib/riesgoTamizajes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { validarCriterioColegiacion } from "@/lib/colegiados";
import {
  normalizarFechaISO,
  formatDateSafe,
  type ResultadoEvaluacionSeguimiento,
} from "@/lib/seguimiento-regional";

type SessionInfo = {
  nivel?: number;
  region?: string;
};

type Paciente = {
  id: number;
  folio: string | null;
  nombre_completo: string | null;
  edad?: number | null;
  imc_inicial?: number | null;
  clues_id: string;
  unidad: string | null;
  municipio: string | null;
  region: string | null;
  fecha_ingreso_cpn: string | null;
  fum: string | null;
  fpp: string | null;
  semanas_gestacion: number | null;
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
  diagnostico: string | null;
  plan: string | null;
  notas: string | null;
  colegiado?: number | null;
  fecha_colegiado?: string | null;
};

type Acciones = {
  td: string | null;
  tdpa: string | null;
  influenza: string | null;
  covid: string | null;
  otras: string | null;
  estomatologia: string | null;
  nutricion: string | null;
};

type Detecciones = {
  prueba_vih_t3: string | null;
  prueba_vdrl_t3: string | null;
  prueba_hepatitis_c_t3: string | null;
};

function formatDate(value: string | Date | null | undefined, fallback = "—") {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function boolLabel(value: boolean | number | null | undefined) {
  return value ? "Sí" : "No";
}

function normalizeRegion(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
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

export default function RegionPacienteResumenPage() {
  const router = useRouter();
  const params = useParams();
  const pacienteId = params?.id as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [acciones, setAcciones] = useState<Acciones | null>(null);
  const [detecciones, setDetecciones] = useState<Detecciones | null>(null);

  // Estado de Seguimiento Regional (> 25 pts)
  const [seguimiento, setSeguimiento] = useState<{
    id?: number;
    fecha_consulta_externa: string;
    fecha_laboratorios: string;
    acciones_generales: string;
    updated_at?: string;
  } | null>(null);
  const [evaluacionSeguimiento, setEvaluacionSeguimiento] = useState<ResultadoEvaluacionSeguimiento | null>(null);
  const [formCitaExterna, setFormCitaExterna] = useState("");
  const [formLabs, setFormLabs] = useState("");
  const [formAcciones, setFormAcciones] = useState("");
  const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);
  const [seguimientoError, setSeguimientoError] = useState<string | null>(null);
  const [seguimientoExito, setSeguimientoExito] = useState(false);

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
        router.replace(`/estatal/pacientes/${pacienteId}`);
        return;
      }
      setSession(parsed);
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [pacienteId, router]);

  useEffect(() => {
    if (!authChecked || !pacienteId || !session?.region) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [resPaciente, resConsultas, resAcciones, resDetecciones, resSeguimiento] = await Promise.all([
          fetch(`/api/pacientes?id=${pacienteId}`),
          fetch(`/api/consultas?paciente_id=${pacienteId}`),
          fetch(`/api/acciones?paciente_id=${pacienteId}`),
          fetch(`/api/detecciones?paciente_id=${pacienteId}`),
          fetch(`/api/region/seguimiento-riesgo?paciente_id=${pacienteId}`).then((r) => r.json()).catch(() => null),
        ]);

        if (!resPaciente.ok) throw new Error("No se pudo cargar el paciente");
        if (!resConsultas.ok) throw new Error("No se pudieron cargar las consultas");

        const pacienteData = (await resPaciente.json()) as Paciente;

        if (normalizeRegion(pacienteData.region) !== normalizeRegion(session.region)) {
          throw new Error("No tienes acceso a este paciente por región");
        }

        const consultasData = (await resConsultas.json()) as Consulta[];
        const accionesData = resAcciones.ok ? ((await resAcciones.json()) as Acciones | null) : null;
        const deteccionesData = resDetecciones.ok ? ((await resDetecciones.json()) as Detecciones | null) : null;

        if (!cancelled) {
          setPaciente(pacienteData);
          setConsultas(Array.isArray(consultasData) ? consultasData : []);
          setAcciones(accionesData);
          setDetecciones(deteccionesData);

          if (resSeguimiento?.seguimiento) {
            setSeguimiento(resSeguimiento.seguimiento);
            setFormCitaExterna(resSeguimiento.seguimiento.fecha_consulta_externa || "");
            setFormLabs(resSeguimiento.seguimiento.fecha_laboratorios || "");
            setFormAcciones(resSeguimiento.seguimiento.acciones_generales || "");
          }
          if (resSeguimiento?.evaluacion) {
            setEvaluacionSeguimiento(resSeguimiento.evaluacion);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Error desconocido");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authChecked, pacienteId, session]);

  const ultimaConsulta = consultas[0] || null;
  const [selectedConsultaId, setSelectedConsultaId] = useState<number | null>(null);
  const [monitorOpen, setMonitorOpen] = useState(true);
  const [soloPositivos, setSoloPositivos] = useState(true);

  const consultaActiva = useMemo(() => {
    if (!consultas.length) return null;
    if (selectedConsultaId !== null) {
      return consultas.find((c) => c.id === selectedConsultaId) || consultas[0];
    }
    return consultas[0];
  }, [consultas, selectedConsultaId]);

  const [colegiando, setColegiando] = useState(false);
  const [colegiadoError, setColegiadoError] = useState<string | null>(null);

  const consultaColegiada = useMemo(
    () => consultas.find((c) => Number(c?.colegiado) === 1) || null,
    [consultas]
  );
  const yaColegiado = Boolean(consultaColegiada);

  const evaluacionColegiacion = useMemo(() => {
    return validarCriterioColegiacion(paciente, ultimaConsulta);
  }, [paciente, ultimaConsulta]);

  const handleColegiarCaso = async () => {
    if (!ultimaConsulta || colegiando || yaColegiado || !evaluacionColegiacion.califica) return;

    setColegiando(true);
    setColegiadoError(null);

    try {
      const res = await fetch("/api/region/colegiados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta_id: ultimaConsulta.id, paciente_id: paciente?.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo colegiar el caso regional");
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
      window.dispatchEvent(new CustomEvent("maro:colegiado-updated", { detail: syncStamp }));

      router.push(`/region/colegiados/${ultimaConsulta.id}`);
    } catch (err: any) {
      setColegiadoError(err?.message || "Error al colegiar caso regional");
    } finally {
      setColegiando(false);
    }
  };

  const handleGuardarSeguimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    setGuardandoSeguimiento(true);
    setSeguimientoError(null);
    setSeguimientoExito(false);

    try {
      const res = await fetch("/api/region/seguimiento-riesgo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente_id: paciente.id,
          fecha_consulta_externa: formCitaExterna,
          fecha_laboratorios: formLabs,
          acciones_generales: formAcciones,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data?.errores)
          ? data.errores.join(". ")
          : data?.message || "Error al registrar el seguimiento regional";
        throw new Error(msg);
      }

      setSeguimiento(data.seguimiento);
      setEvaluacionSeguimiento(data.evaluacion);
      setSeguimientoExito(true);

      const syncStamp = String(Date.now());
      localStorage.setItem("maro:seguimiento-updated", syncStamp);
      window.dispatchEvent(new CustomEvent("maro:seguimiento-updated", { detail: syncStamp }));

      setTimeout(() => setSeguimientoExito(false), 5000);
    } catch (err: any) {
      setSeguimientoError(err?.message || "Error al guardar seguimiento");
    } finally {
      setGuardandoSeguimiento(false);
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

  const consultaActivaScores = useMemo(
    () => (consultaActiva ? getConsultaScores(consultaActiva) : null),
    [consultaActiva]
  );

  const hallazgosActivos = useMemo(() => {
    if (!paciente) return [];
    const items: Array<{
      id: string;
      categoria: "CRITERIO CLÍNICO" | "ANTECEDENTE" | "TAMIZAJE" | "CONSULTA";
      etiqueta: string;
      detalle: string;
      puntos: number;
      critico: boolean;
    }> = [];

    const edad = Number(paciente.edad);
    if (Number.isFinite(edad) && edad >= 10 && edad <= 14) {
      items.push({
        id: "crit-edad",
        categoria: "CRITERIO CLÍNICO",
        etiqueta: "Edad Materna Extrema (10–14 años)",
        detalle: `${edad} años`,
        puntos: 4,
        critico: true,
      });
    }

    const imc = Number(paciente.imc_inicial);
    if (Number.isFinite(imc) && imc >= 31) {
      items.push({
        id: "crit-imc",
        categoria: "CRITERIO CLÍNICO",
        etiqueta: "Obesidad por IMC ≥ 31",
        detalle: `IMC ${imc.toFixed(1)}`,
        puntos: 4,
        critico: true,
      });
    }

    const etiquetasAntecedentes: Record<string, string> = {
      gestas: "Multiparidad / Gestas",
      cesareas: "Antecedente de Cesáreas",
      abortos: "Antecedente de Abortos",
      ant_preeclampsia: "Preeclampsia previa",
      ant_hemorragia: "Hemorragia obstétrica previa",
      ant_sepsis: "Sepsis materna previa",
      ant_bajo_peso_macrosomia: "Bajo peso / Macrosomía fetal",
      ant_muerte_perinatal: "Muerte perinatal previa",
      ant_embarazo_ectopico: "Embarazo ectópico previo",
      factor_diabetes: "Diabetes Mellitus",
      factor_hipertension: "Hipertensión Arterial",
      factor_obesidad: "Obesidad Clínica",
      factor_cardiopatia: "Cardiopatía",
      factor_hepatopatia: "Hepatopatía",
      factor_enf_autoinmune: "Enfermedad Autoinmune",
      factor_nefropatia: "Nefropatía",
      factor_coagulopatias: "Coagulopatías",
      factor_neuropatia: "Neuropatía / Epilepsia",
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
              ? `Valor registrado: ${(paciente as any)[campo]}`
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

    if (ultimaConsulta && ultimaConsultaScores) {
      if (ultimaConsultaScores.taTotal > 0) {
        items.push({
          id: "con-ta",
          categoria: "CONSULTA",
          etiqueta: "Tensión Arterial Alterada",
          detalle: `${ultimaConsulta.ta_sistolica ?? "—"}/${ultimaConsulta.ta_diastolica ?? "—"} mmHg`,
          puntos: ultimaConsultaScores.taTotal,
          critico: ultimaConsultaScores.taTotal >= 4,
        });
      }
      if (ultimaConsultaScores.frecuenciaCardiaca > 0) {
        items.push({
          id: "con-fc",
          categoria: "CONSULTA",
          etiqueta: "Frecuencia Cardíaca Alterada",
          detalle: `${ultimaConsulta.frecuencia_cardiaca} lpm`,
          puntos: ultimaConsultaScores.frecuenciaCardiaca,
          critico: true,
        });
      }
      if (ultimaConsultaScores.indiceChoque > 0) {
        items.push({
          id: "con-ic",
          categoria: "CONSULTA",
          etiqueta: "Índice de Choque Elevado",
          detalle: `${ultimaConsulta.indice_choque}`,
          puntos: ultimaConsultaScores.indiceChoque,
          critico: ultimaConsultaScores.indiceChoque >= 4,
        });
      }
      if (ultimaConsultaScores.temperatura > 0) {
        items.push({
          id: "con-temp",
          categoria: "CONSULTA",
          etiqueta: "Temperatura Fuera de Rango",
          detalle: `${ultimaConsulta.temperatura} °C`,
          puntos: ultimaConsultaScores.temperatura,
          critico: ultimaConsultaScores.temperatura >= 4,
        });
      }
    }

    return items.sort((a, b) => b.puntos - a.puntos);
  }, [paciente, antecedentesConPuntos, tamizajesConPuntos, ultimaConsulta, ultimaConsultaScores]);

  const esAltoRiesgo = puntajeTotalActual >= 25;
  const esMedioRiesgo = puntajeTotalActual > 15 && puntajeTotalActual < 25;

  const fechaRegistroBase = useMemo(() => {
    return normalizarFechaISO(paciente?.fecha_ingreso_cpn || (paciente as any)?.created_at);
  }, [paciente]);

  const maxFechaConsultaExterna = useMemo(() => {
    if (!fechaRegistroBase) return undefined;
    const parts = fechaRegistroBase.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return undefined;
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return undefined;
    dateObj.setDate(dateObj.getDate() + 30);
    const yStr = dateObj.getFullYear();
    const mStr = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dStr = String(dateObj.getDate()).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  }, [fechaRegistroBase]);

  const aplicaSeguimientoRegional = esAltoRiesgo || Number(ultimaConsulta?.riesgo_25_plus) === 1;

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
        Validando acceso regional...
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

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ENCABEZADO SUPERIOR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-700 dark:text-emerald-300">
                Resumen Clínico Regional
              </span>
              {paciente?.folio && (
                <span className="text-xs bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {paciente.folio}
                </span>
              )}
              <span className="text-xs bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-semibold">
                Solo lectura
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-file-medical text-emerald-600 dark:text-emerald-400"></i>
              <span>{paciente?.nombre_completo || "Expediente de Paciente"}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Supervisión epidemiológica regional. Monitoreo clínico, seguimiento obstétrico y dictamen colegiado.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {yaColegiado && consultaColegiada ? (
              <>
                <Link
                  href={`/region/colegiados/${consultaColegiada.id}`}
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
                  <span>Cédula Oficial</span>
                </Link>
              </>
            ) : evaluacionColegiacion.califica ? (
              <button
                type="button"
                onClick={handleColegiarCaso}
                disabled={!ultimaConsulta || colegiando}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={evaluacionColegiacion.motivo || "Caso elegible para colegiar"}
              >
                <i className={`fa-solid ${colegiando ? "fa-spinner fa-spin" : "fa-users-viewfinder"}`} />
                <span>{colegiando ? "Colegiando..." : "Colegiar Caso"}</span>
              </button>
            ) : null}

            <ThemeToggle />
            <Link
              href="/region"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-800 dark:text-white shadow-sm transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-emerald-600 dark:text-emerald-400"></i>
              <span>Volver a Región</span>
            </Link>
          </div>
        </header>

        {colegiadoError && (
          <section className="rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 p-4 text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-md">
            <i className="fa-solid fa-triangle-exclamation text-rose-600 text-sm"></i>
            <span>{colegiadoError}</span>
          </section>
        )}

        {loading ? (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 py-12 text-center text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center gap-2 shadow-xl">
            <i className="fa-solid fa-spinner fa-spin text-emerald-600 dark:text-emerald-400"></i>
            <span>Cargando resumen clínico...</span>
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

            {/* SECCIÓN PRIORITARIA: SEGUIMIENTO REGIONAL DE ALTO RIESGO (> 25 PTS) */}
            {aplicaSeguimientoRegional && (
              <section
                className={`rounded-2xl border p-5 sm:p-6 shadow-xl transition-colors space-y-5 ${
                  evaluacionSeguimiento?.estado === "VENCIDO"
                    ? "border-rose-400/80 dark:border-rose-500/50 bg-rose-50/90 dark:bg-rose-950/30 ring-2 ring-rose-500/30"
                    : evaluacionSeguimiento?.estado === "EN_PLAZO"
                    ? "border-amber-400/80 dark:border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/30 ring-2 ring-amber-500/30"
                    : "border-emerald-400/80 dark:border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/30"
                }`}
              >
                {/* Encabezado con estado del plazo */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4 border-slate-200/80 dark:border-white/10">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm ${
                        evaluacionSeguimiento?.estado === "VENCIDO"
                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400/40"
                          : evaluacionSeguimiento?.estado === "EN_PLAZO"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40"
                          : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40"
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          evaluacionSeguimiento?.estado === "VENCIDO"
                            ? "fa-triangle-exclamation animate-pulse"
                            : evaluacionSeguimiento?.estado === "EN_PLAZO"
                            ? "fa-clock"
                            : "fa-calendar-check"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          Acciones de Seguimiento Regional (&gt; 25 pts)
                        </h2>
                        {evaluacionSeguimiento?.estado === "VENCIDO" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-sm animate-pulse">
                            ALERTA ESTATAL ACTIVA (&gt; 7 DÍAS)
                          </span>
                        )}
                        {evaluacionSeguimiento?.estado === "EN_PLAZO" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400">
                            EN PLAZO ({evaluacionSeguimiento.diasRestantes}d restantes)
                          </span>
                        )}
                        {evaluacionSeguimiento?.estado === "COMPLETADO" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-sm">
                            PLAN COMPLETADO
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {evaluacionSeguimiento?.motivo ||
                          "Plazo de 7 días naturales posteriores al registro para programar consulta externa, laboratorios y acciones."}
                      </p>
                      {fechaRegistroBase && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Fecha de registro base: <strong>{formatDateSafe(fechaRegistroBase)}</strong> · Días
                          transcurridos: <strong>{evaluacionSeguimiento?.diasTranscurridos ?? 0} días</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                <form onSubmit={handleGuardarSeguimiento} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Fecha de Cita para Consulta Externa */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Fecha de Cita para Consulta Externa *</span>
                        <span className="text-[10px] text-slate-500 font-normal">Máx. 30 días post-registro</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={fechaRegistroBase || undefined}
                        max={maxFechaConsultaExterna}
                        value={formCitaExterna}
                        onChange={(e) => setFormCitaExterna(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {maxFechaConsultaExterna &&
                          `Límite máximo permitido: ${formatDateSafe(maxFechaConsultaExterna)}`}
                      </p>
                    </div>

                    {/* 2. Fecha de Cita a Laboratorios y Paraclínicos */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Fecha de Cita a Laboratorios *</span>
                        <span className="text-[10px] text-slate-500 font-normal">Previa a consulta externa</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={fechaRegistroBase || undefined}
                        max={formCitaExterna || maxFechaConsultaExterna}
                        value={formLabs}
                        onChange={(e) => setFormLabs(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {formCitaExterna
                          ? `Debe ser previa o igual a: ${formatDateSafe(formCitaExterna)}`
                          : "Seleccione primero la fecha de consulta externa"}
                      </p>
                    </div>
                  </div>

                  {/* 3. Acciones Generales (500 caracteres) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Acciones Generales de Seguimiento Regional *
                      </label>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          formAcciones.length > 500
                            ? "text-rose-600"
                            : formAcciones.length > 450
                            ? "text-amber-600"
                            : "text-slate-500"
                        }`}
                      >
                        {formAcciones.length} / 500 caracteres
                      </span>
                    </div>
                    <textarea
                      required
                      rows={3}
                      maxLength={500}
                      value={formAcciones}
                      onChange={(e) => setFormAcciones(e.target.value)}
                      placeholder="Describa las acciones generales coordinadas por el equipo regional (interconsultas, traslado, laboratorio, etc.)..."
                      className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 p-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Mensajes de error o éxito */}
                  {seguimientoError && (
                    <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-rose-600" />
                      <span>{seguimientoError}</span>
                    </div>
                  )}

                  {seguimientoExito && (
                    <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      <i className="fa-solid fa-circle-check text-emerald-600" />
                      <span>Plan de seguimiento regional registrado con éxito.</span>
                    </div>
                  )}

                  {/* Botón de Guardado */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={guardandoSeguimiento}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      <i
                        className={`fa-solid ${
                          guardandoSeguimiento ? "fa-spinner fa-spin" : "fa-floppy-disk"
                        }`}
                      />
                      <span>
                        {guardandoSeguimiento ? "Guardando Plan..." : "Guardar Plan de Seguimiento Regional"}
                      </span>
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* FICHA COMPACTA DE IDENTIFICACIÓN Y CONTEXTO OBSTÉTRICO */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 space-y-4 shadow-xl transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-id-card text-emerald-600 dark:text-emerald-400 text-lg"></i>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Identificación y Contexto Obstétrico
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border ${
                      Number(paciente.edad) >= 10 && Number(paciente.edad) <= 14
                        ? "bg-rose-100 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border-rose-400"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                      <i className="fa-regular fa-calendar text-[10px]" />
                      <span>FPP: {formatDate(paciente.fpp)}</span>
                    </span>
                  )}

                  {paciente.imc_inicial !== null && paciente.imc_inicial !== undefined && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold border ${
                        Number(paciente.imc_inicial) >= 31
                          ? "bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-400"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span>IMC: {Number(paciente.imc_inicial).toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Unidad Médica
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block" title={paciente.unidad || ""}>
                    {formatValue(paciente.unidad)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Clave CLUES
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 block">
                    {formatValue(paciente.clues_id)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Región Sanitaria
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {formatValue(paciente.region)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Municipio
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {formatValue(paciente.municipio)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Ingreso CPN · Derechohab.
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {formatDate(paciente.fecha_ingreso_cpn)} · {formatValue(paciente.derechohabiencia)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Contacto / Teléfono
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {formatValue(paciente.telefono)}
                  </span>
                </div>
              </div>
            </section>

            {/* RESUMEN DE HALLAZGOS POSITIVOS QUE APORTAN AL RIESGO (EVITA EL MURO GRIS) */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 text-sm">
                    <i className="fa-solid fa-bolt" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      Factores de Riesgo y Hallazgos Positivos Detectados
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Síntesis directa de los factores clínicos, antecedentes, tamizajes y signos que aportan al riesgo
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30">
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
                      className={`flex items-stretch justify-between gap-3 rounded-2xl border p-3.5 min-h-[74px] shadow-sm ${
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

            {/* MONITOR CLÍNICO DE CONSULTA PRENATAL Y SIGNOS VITALES */}
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
              icon="fa-solid fa-stethoscope"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]" />
                    <span>Volver a última consulta</span>
                  </button>
                </div>
              )}

              {!consultaActiva ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                  Sin consultas registradas.
                </p>
              ) : (
                <>
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
                          {formatValue(consultaActiva.ta_sistolica)}/{formatValue(consultaActiva.ta_diastolica)}
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
                          {formatValue(consultaActiva.frecuencia_cardiaca)}
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
                          {formatValue(consultaActiva.indice_choque)}
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
                          {formatValue(consultaActiva.temperatura)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">°C</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Rango: 36.0–37.4 °C
                      </span>
                    </div>

                    {/* Signo 5: Frecuencia Respiratoria */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Frec. Respiratoria
                      </span>
                      <div className="my-1.5">
                        <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                          {formatValue(consultaActiva.frecuencia_respiratoria)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">rpm</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Respiración: {formatValue(consultaActiva.respiracion)}
                      </span>
                    </div>

                    {/* Signo 6: Estado Clínico General */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Estado Clínico
                      </span>
                      <div className="my-1 space-y-0.5 text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          Conciencia: {formatValue(consultaActiva.estado_conciencia)}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          Piel: {formatValue(consultaActiva.color_piel)}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Hemorragia: {formatValue(consultaActiva.hemorragia)}
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
                        {formatValue(consultaActiva.diagnostico)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <i className="fa-solid fa-clipboard-check" />
                        <span>Plan de Manejo</span>
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                        {formatValue(consultaActiva.plan)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <i className="fa-solid fa-comment-medical" />
                        <span>Notas y Observaciones</span>
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {formatValue(consultaActiva.notas)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleSection>

            {/* ANTECEDENTES Y TAMIZAJES AGRUPADOS CON FILTRO "SOLO POSITIVOS" ACTIVO POR DEFECTO */}
            <CollapsibleSection
              title="Desglose de Antecedentes, Comorbilidades y Tamizajes"
              subtitle="Muestra por defecto únicamente los factores activos para evitar ruido visual; puede expandir los descartados si lo requiere"
              icon="fa-solid fa-clipboard-list"
              defaultOpen={true}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
                <ScoreLegend />

                <button
                  type="button"
                  onClick={() => setSoloPositivos((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    soloPositivos
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20"
                      : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  <i className={`fa-solid ${soloPositivos ? "fa-eye" : "fa-eye-slash"}`} />
                  <span>
                    {soloPositivos
                      ? "Mostrar también campos descartados (No)"
                      : "Ocultar campos descartados (No)"}
                  </span>
                </button>
              </div>

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

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: "gestas", label: "Gestas", val: paciente.gestas ?? 0 },
                        { key: "partos", label: "Partos", val: paciente.partos ?? 0 },
                        { key: "cesareas", label: "Cesáreas", val: paciente.cesareas ?? 0 },
                        { key: "abortos", label: "Abortos", val: paciente.abortos ?? 0 },
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
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              {item.label}
                            </span>
                            <span className="text-xl font-black font-mono text-slate-900 dark:text-white block mt-0.5">
                              {item.val}
                            </span>
                            {pts > 0 && (
                              <span className="inline-block mt-1 text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200">
                                +{pts} pts
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

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
                              <span>Sin antecedentes obstétricos adversos</span>
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
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 shrink-0">
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

                {/* DOMINIO 2: COMORBILIDADES CRÓNICAS */}
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
                        Patologías Sistémicas
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
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 shrink-0">
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
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-white/10 pb-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300">
                            <i className="fa-solid fa-microscope text-[11px]" />
                          </span>
                          <span>Tamizajes Prenatales</span>
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                          +{Number(paciente.factor_riesgo_tamizajes) || 0} pts
                        </span>
                      </div>

                      {(() => {
                        const tamizajesList = [
                          { key: "prueba_vih", label: "Prueba VIH", val: paciente.prueba_vih },
                          { key: "prueba_vdrl", label: "Sífilis (VDRL)", val: paciente.prueba_vdrl },
                          { key: "prueba_hepatitis_c", label: "Hepatitis C", val: paciente.prueba_hepatitis_c },
                          { key: "diabetes_glicemia", label: "Diabetes / Glicemia", val: paciente.diabetes_glicemia },
                          { key: "violencia", label: "Tamizaje Violencia", val: paciente.violencia },
                        ];
                        const visibles = tamizajesList.filter(
                          (item) => !soloPositivos || (tamizajesConPuntos[item.key] || 0) > 0
                        );

                        if (visibles.length === 0) {
                          return (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                              <i className="fa-solid fa-circle-check text-emerald-500" />
                              <span>Sin tamizajes reactivos o alterados</span>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1.5">
                            {visibles.map((item) => {
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
                                      {formatValue(item.val)}
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
                        );
                      })()}

                      {(detecciones?.prueba_vih_t3 || detecciones?.prueba_vdrl_t3 || detecciones?.prueba_hepatitis_c_t3) && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Detecciones 3er Trimestre
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                            <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 px-2 py-1 text-center">
                              <span className="text-[9px] text-slate-400 block">VIH 3T</span>
                              <span className="font-bold">{formatValue(detecciones?.prueba_vih_t3)}</span>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 px-2 py-1 text-center">
                              <span className="text-[9px] text-slate-400 block">VDRL 3T</span>
                              <span className="font-bold">{formatValue(detecciones?.prueba_vdrl_t3)}</span>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 px-2 py-1 text-center">
                              <span className="text-[9px] text-slate-400 block">Hep C 3T</span>
                              <span className="font-bold">{formatValue(detecciones?.prueba_hepatitis_c_t3)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sub-bloque 3B: Factores Psicosociales y Toxicomanías */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Factores Psicosociales y Toxicomanías
                      </span>
                      {(() => {
                        const psicoItems = [
                          { key: "factor_alcoholismo", label: "Alcoholismo", raw: paciente.factor_alcoholismo },
                          { key: "factor_tabaquismo", label: "Tabaquismo", raw: paciente.factor_tabaquismo },
                          { key: "factor_drogas_ilicitas", label: "Otras Drogas", raw: paciente.factor_drogas_ilicitas },
                          { key: "factor_discapacidad", label: "Discapacidad", raw: paciente.factor_discapacidad },
                        ];
                        const visibles = psicoItems.filter(
                          (item) =>
                            !soloPositivos ||
                            (antecedentesConPuntos[item.key] || 0) > 0 ||
                            Boolean(item.raw)
                        );

                        if (visibles.length === 0) {
                          return (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                              <i className="fa-solid fa-check text-emerald-500" />
                              <span>Sin toxicomanías ni factores psicosociales activos</span>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 gap-1.5">
                            {visibles.map((item) => {
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
                        );
                      })()}

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

            {/* HISTORIAL DE CONSULTAS INTERACTIVO */}
            <CollapsibleSection
              title={`Historial de Consultas Prenatales (${consultas.length})`}
              subtitle="Haga clic en cualquier fila para inspeccionar sus signos vitales y diagnóstico en el monitor superior"
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
                        <th className="w-[115px] px-3 py-2.5">Fecha</th>
                        <th className="w-[55px] px-2.5 py-2.5">SDG</th>
                        <th className="px-2.5 py-2.5">T/A</th>
                        <th className="px-2.5 py-2.5">FC</th>
                        <th className="w-[55px] px-2.5 py-2.5 hidden sm:table-cell">FR</th>
                        <th className="px-2.5 py-2.5 hidden md:table-cell">Temp</th>
                        <th className="px-2.5 py-2.5 hidden lg:table-cell">Índice choque</th>
                        <th className="w-[90px] px-2.5 py-2.5 text-right hidden sm:table-cell">Pts consulta</th>
                        <th className="w-[100px] px-2.5 py-2.5 text-right">Puntaje total</th>
                        <th className="w-[85px] px-3 py-2.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {consultas.map((consulta, idx) => {
                        const scores = getConsultaScores(consulta);
                        const isSelected = consultaActiva?.id === consulta.id;
                        return (
                          <tr
                            key={consulta.id}
                            onClick={() => {
                              setSelectedConsultaId(consulta.id);
                              setMonitorOpen(true);
                            }}
                            className={`transition-colors whitespace-nowrap cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500/10 dark:bg-emerald-500/15 font-semibold"
                                : "hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span>{formatDate(consulta.fecha_consulta)}</span>
                                {idx === 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                                    Actual
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2.5 py-2.5 font-bold text-slate-900 dark:text-white">
                              {consulta.sdg ?? "—"}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200">
                              {formatValue(consulta.ta_sistolica)}/{formatValue(consulta.ta_diastolica)}
                              {scores.taTotal > 0 && (
                                <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.taTotal)}`}>
                                  +{scores.taTotal}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200">
                              {formatValue(consulta.frecuencia_cardiaca)}
                              {scores.frecuenciaCardiaca > 0 && (
                                <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.frecuenciaCardiaca)}`}>
                                  +{scores.frecuenciaCardiaca}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                              {formatValue(consulta.frecuencia_respiratoria)}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200 hidden md:table-cell">
                              {formatValue(consulta.temperatura)}
                              {scores.temperatura > 0 && (
                                <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.temperatura)}`}>
                                  +{scores.temperatura}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-800 dark:text-slate-200 hidden lg:table-cell">
                              {formatValue(consulta.indice_choque)}
                              {scores.indiceChoque > 0 && (
                                <span className={`ml-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${scoreBadgeClass(scores.indiceChoque)}`}>
                                  +{scores.indiceChoque}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                              +{consulta.puntaje_consulta_parametros ?? 0}
                            </td>
                            <td className="px-2.5 py-2.5 text-right">
                              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40">
                                {formatValue(consulta.puntaje_total_consulta)} pts
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  isSelected
                                    ? "bg-emerald-600 text-white"
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

            {(evaluacionColegiacion.califica || yaColegiado) && (
              <section className="rounded-2xl border border-amber-400/60 dark:border-amber-500/40 bg-amber-50/95 dark:bg-amber-950/35 p-5 sm:p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-700 dark:text-amber-300 text-xl shrink-0">
                      <i className="fa-solid fa-users-viewfinder"></i>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-200">
                        {yaColegiado ? "Caso Colegiado en Seguimiento Regional" : "Dictamen para Caso Colegiado"}
                      </h2>
                      <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-100/80">
                        {yaColegiado
                          ? `Este caso fue colegiado y se encuentra activo con acciones asignadas.`
                          : `Esta paciente califica para colegiación regional: ${evaluacionColegiacion.motivo}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {yaColegiado && consultaColegiada ? (
                      <>
                        <Link
                          href={`/region/colegiados/${consultaColegiada.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition"
                        >
                          <i className="fa-solid fa-list-check"></i>
                          <span>Plan Colegiado</span>
                        </Link>
                        <Link
                          href={`/colegiados/${consultaColegiada.id}/formato`}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 transition"
                        >
                          <i className="fa-solid fa-file-pdf"></i>
                          <span>Cédula Oficial</span>
                        </Link>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleColegiarCaso}
                        disabled={!ultimaConsulta || colegiando}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className={`fa-solid ${colegiando ? "fa-spinner fa-spin" : "fa-users-viewfinder"}`} />
                        <span>{colegiando ? "Colegiando Caso..." : "Colegiar Caso Ahora"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ACCIONES PREVENTIVAS COMPACTAS (COLAPSABLE) */}
            <CollapsibleSection
              title="Acciones Preventivas y Vacunación"
              subtitle="Esquema preventivo registrado durante el control prenatal"
              icon="fa-solid fa-syringe"
              defaultOpen={false}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                {[
                  { label: "TD", val: acciones?.td },
                  { label: "TDPA", val: acciones?.tdpa },
                  { label: "Influenza", val: acciones?.influenza },
                  { label: "COVID-19", val: acciones?.covid },
                  { label: "Estomatología", val: acciones?.estomatologia },
                  { label: "Nutrición", val: acciones?.nutricion },
                  { label: "Otras", val: acciones?.otras },
                ].map((acc) => {
                  const aplicada = Boolean(acc.val);
                  return (
                    <div
                      key={acc.label}
                      className={`rounded-xl border px-3 py-2.5 flex flex-col justify-between gap-1 ${
                        aplicada
                          ? "border-emerald-500/35 bg-emerald-50/70 dark:bg-emerald-950/35 text-emerald-900 dark:text-emerald-100"
                          : "border-slate-200/70 dark:border-white/5 bg-slate-50/60 dark:bg-slate-900/50 text-slate-400"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">{acc.label}</span>
                      <span className="font-mono font-bold text-xs">
                        {aplicada ? formatDate(acc.val) : "Pendiente"}
                      </span>
                    </div>
                  );
                })}
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
        0 pts · Normal
      </span>
      <span className="inline-flex items-center rounded-lg border border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-200">
        +2 pts · Alerta moderada
      </span>
      <span className="inline-flex items-center rounded-lg border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/20 px-2.5 py-1 font-semibold text-rose-800 dark:text-rose-200">
        +4 pts o más · Alto riesgo
      </span>
    </div>
  );
}