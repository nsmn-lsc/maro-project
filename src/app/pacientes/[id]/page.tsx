"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { evaluarFactoresRiesgo, DatosFactoresPaciente } from "@/lib/riesgoFactores";
import { evaluarTamizajes, DatosTamizajes } from "@/lib/riesgoTamizajes";
import { evaluarCicloObstetrico } from "@/lib/resolucionEmbarazo";

type Patient = {
  id: number;
  folio: string | null;
  nombre_completo: string | null;
  clues_id: string;
  unidad: string | null;
  municipio: string | null;
  localidad?: string | null;
  region: string | null;
  edad?: number | string | null;
  fecha_ingreso_cpn: string | null;
  fum: string | null;
  fpp: string | null;
  semanas_gestacion: number | null;
  sdg_ingreso: number | null;
  estado_embarazo?: "activo" | "puerperio" | "concluido" | null;
  fecha_resolucion?: string | null;
  tipo_resolucion?: string | null;
  lugar_atencion_parto?: string | null;
  dias_puerperio?: number | null;
  riesgo_obstetrico_ingreso: number | null;
  telefono: string | null;
  direccion: string | null;
  derechohabiencia?: string | null;
  factor_riesgo_antecedentes: number | null;
  // Campos para evaluación de riesgo
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
  tipo_riesgo_social?: string | null;
  ganancia_ponderal_max?: number | string | null;
  otros_antecedentes?: string | null;
  factores_riesgo_epid?: 'ninguno' | 'es_contacto' | 'es_portadora';
  indigena?: boolean | number;
  migrante?: boolean | number;
  imc_inicial?: number | string | null;
  // Campos de tamizajes
  prueba_vih?: string | null;
  prueba_vdrl?: string | null;
  prueba_hepatitis_c?: string | null;
  diabetes_glicemia?: string | null;
  violencia?: string | null;
  factor_riesgo_tamizajes?: number | null;
};

type ConsultaResumen = {
  id: number;
  colegiado?: 0 | 1;
  fecha_colegiado?: string | null;
};

type SessionInfo = {
  nivel?: number;
};

export default function PacienteDetalle() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaConsulta, setUltimaConsulta] = useState<ConsultaResumen | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [alertaIndex, setAlertaIndex] = useState(0);
  const [isAlertaHovered, setIsAlertaHovered] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const session = JSON.parse(stored) as SessionInfo;
      const nivel = session.nivel ?? 0;
      if (nivel >= 3) {
        router.replace(`/estatal/pacientes/${id}`);
        return;
      }
      if (nivel >= 2) {
        router.replace(`/region/pacientes/${id}`);
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [id, router]);

  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [resPaciente, resConsultas] = await Promise.all([
          fetch(`/api/pacientes?id=${id}`),
          fetch(`/api/consultas?paciente_id=${id}`),
        ]);

        if (!resPaciente.ok) throw new Error((await resPaciente.json().catch(() => ({}))).message || "No se pudo cargar el paciente");
        if (!resConsultas.ok) throw new Error((await resConsultas.json().catch(() => ({}))).message || "No se pudieron cargar las consultas");

        const data = await resPaciente.json();
        const consultas = (await resConsultas.json()) as ConsultaResumen[];

        if (!cancelled) {
          setPatient(data);
          setUltimaConsulta(Array.isArray(consultas) && consultas.length > 0 ? consultas[0] : null);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [authChecked, id]);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  /** Calcula SDG actuales o información de puerperio a partir del ciclo obstétrico */
  const calcularSdgActual = (p: Patient | null): string => {
    if (!p) return "—";
    const ciclo = evaluarCicloObstetrico({
      fum: p.fum,
      estadoEmbarazo: p.estado_embarazo,
      fechaResolucion: p.fecha_resolucion,
    });

    if (ciclo.estadoEmbarazo === "puerperio") {
      return `👶 Puerperio (Día ${ciclo.diasPuerperio ?? 1}/42)`;
    }
    if (ciclo.estadoEmbarazo === "concluido") {
      return "Concluido (Alta de puerperio)";
    }
    if (ciclo.esFppVencida) {
      return `${ciclo.sdgTexto} (⚠️ FPP Vencida +${ciclo.diasVencido}d)`;
    }
    return ciclo.sdgTexto;
  };

  // Calcular factor de riesgo basado en los datos del paciente
  const resultadoRiesgo = useMemo(() => {
    if (!patient) return null;

    const datosFactores: DatosFactoresPaciente = {
      gestas: patient.gestas || 0,
      partos: patient.partos || 0,
      cesareas: patient.cesareas || 0,
      abortos: patient.abortos || 0,
      ant_preeclampsia: !!patient.ant_preeclampsia,
      ant_hemorragia: !!patient.ant_hemorragia,
      ant_sepsis: !!patient.ant_sepsis,
      ant_bajo_peso_macrosomia: !!patient.ant_bajo_peso_macrosomia,
      ant_muerte_perinatal: !!patient.ant_muerte_perinatal,
      ant_embarazo_ectopico: !!patient.ant_embarazo_ectopico,
      factor_diabetes: !!patient.factor_diabetes,
      factor_hipertension: !!patient.factor_hipertension,
      factor_obesidad: !!patient.factor_obesidad,
      factor_cardiopatia: !!patient.factor_cardiopatia,
      factor_hepatopatia: !!patient.factor_hepatopatia,
      factor_enf_autoinmune: !!patient.factor_enf_autoinmune,
      factor_nefropatia: !!patient.factor_nefropatia,
      factor_coagulopatias: !!patient.factor_coagulopatias,
      factor_neuropatia: !!patient.factor_neuropatia,
      factor_enf_psiquiatrica: !!patient.factor_enf_psiquiatrica,
      factor_alcoholismo: !!patient.factor_alcoholismo,
      factor_tabaquismo: !!patient.factor_tabaquismo,
      factor_drogas_ilicitas: !!patient.factor_drogas_ilicitas,
      factor_endocrinopatia: !!patient.factor_endocrinopatia,
      factor_neumopatia: !!patient.factor_neumopatia,
      factor_its: !!patient.factor_its,
      factor_cirugias_pelvico_uterinas: !!patient.factor_cirugias_pelvico_uterinas,
      factor_discapacidad: !!patient.factor_discapacidad,
      factores_riesgo_epid: patient.factores_riesgo_epid || 'ninguno',
      indigena: !!patient.indigena,
      migrante: !!patient.migrante,
      imc_inicial: patient.imc_inicial ? Number(patient.imc_inicial) : undefined,
    };

    return evaluarFactoresRiesgo(datosFactores);
  }, [patient]);

  // Calcular factor de riesgo basado en tamizajes
  const resultadoTamizajes = useMemo(() => {
    if (!patient) return null;

    const datosTamizajes: DatosTamizajes = {
      prueba_vih: patient.prueba_vih,
      prueba_vdrl: patient.prueba_vdrl,
      prueba_hepatitis_c: patient.prueba_hepatitis_c,
      diabetes_glicemia: patient.diabetes_glicemia,
      violencia: patient.violencia,
    };

    return evaluarTamizajes(datosTamizajes);
  }, [patient]);

  // Total de puntaje acumulado
  const puntajeTotalCombinado = useMemo(() => {
    return (resultadoRiesgo?.puntajeTotal ?? 0) + (resultadoTamizajes?.puntajeTotal ?? 0);
  }, [resultadoRiesgo, resultadoTamizajes]);

  // Factores y comorbilidades activas
  const antecedentesActivos = useMemo(() => {
    if (!patient) return [];
    const list: { label: string; puntos: number }[] = [];
    if (patient.ant_preeclampsia) list.push({ label: "Antecedente de preeclampsia", puntos: 4 });
    if (patient.ant_hemorragia) list.push({ label: "Antecedente de hemorragia", puntos: 4 });
    if (patient.ant_sepsis) list.push({ label: "Antecedente de sepsis", puntos: 6 });
    if (patient.ant_bajo_peso_macrosomia) list.push({ label: "RN bajo peso / macrosomía", puntos: 6 });
    if (patient.ant_muerte_perinatal) list.push({ label: "Muerte perinatal", puntos: 6 });
    if (patient.ant_embarazo_ectopico) list.push({ label: "Embarazo ectópico", puntos: 6 });
    return list;
  }, [patient]);

  const comorbilidadesActivas = useMemo(() => {
    if (!patient) return [];
    const list: string[] = [];
    if (patient.factor_diabetes) list.push("Diabetes");
    if (patient.factor_hipertension) list.push("Hipertensión");
    if (patient.factor_obesidad) list.push("Obesidad");
    if (patient.factor_cardiopatia) list.push("Cardiopatía");
    if (patient.factor_hepatopatia) list.push("Hepatopatía");
    if (patient.factor_enf_autoinmune) list.push("Enfermedad autoinmune");
    if (patient.factor_nefropatia) list.push("Nefropatía");
    if (patient.factor_coagulopatias) list.push("Coagulopatías");
    if (patient.factor_neuropatia) list.push("Neuropatía");
    if (patient.factor_enf_psiquiatrica) list.push("Enfermedad psiquiátrica");
    if (patient.factor_alcoholismo) list.push("Alcoholismo");
    if (patient.factor_tabaquismo) list.push("Tabaquismo");
    if (patient.factor_drogas_ilicitas) list.push("Drogas ilícitas");
    if (patient.factor_endocrinopatia) list.push("Endocrinopatía");
    if (patient.factor_neumopatia) list.push("Neumopatía");
    if (patient.factor_its) list.push("ITS");
    if (patient.factor_cirugias_pelvico_uterinas) list.push("Cirugías pélvico-uterinas");
    if (patient.factor_discapacidad) list.push("Discapacidad");
    return list;
  }, [patient]);

  // Factores que disparan la Alerta de Referencia a Segundo Nivel (idéntico a pacientes/nuevo)
  const factoresSegundoNivelActivos = useMemo(() => {
    if (!patient) return [];
    const list: string[] = [];
    if (patient.factor_diabetes) list.push("Diabetes");
    if (patient.factor_hipertension) list.push("Hipertensión");
    if (patient.factor_obesidad) list.push("Obesidad");
    if (patient.factor_cardiopatia) list.push("Cardiopatía");
    if (patient.factor_hepatopatia) list.push("Hepatopatía");
    if (patient.factor_enf_autoinmune) list.push("Enfermedad autoinmune");
    if (patient.factor_nefropatia) list.push("Nefropatía");
    if (patient.factor_coagulopatias) list.push("Coagulopatías");
    if (patient.factor_enf_psiquiatrica) list.push("Enfermedad psiquiátrica");
    if (patient.factor_endocrinopatia) list.push("Endocrinopatía");
    if (patient.factor_neumopatia) list.push("Neumopatía");
    if (patient.ant_hemorragia) list.push("Antecedente de hemorragia");
    if (patient.ant_sepsis) list.push("Antecedente de sepsis");
    if (patient.ant_bajo_peso_macrosomia) list.push("Antecedente de bajo peso / macrosomía");
    if (patient.ant_muerte_perinatal) list.push("Antecedente de muerte perinatal");
    if (patient.ant_embarazo_ectopico) list.push("Antecedente de embarazo ectópico");
    return list;
  }, [patient]);

  const tieneAlertaSegundoNivel = factoresSegundoNivelActivos.length > 0;

  // Alerta de Notificación por tamizajes reactivos
  const tamizajesReactivosActivos = useMemo(() => {
    if (!patient) return [];
    const list: string[] = [];
    if (patient.prueba_vih === "Reactiva") list.push("VIH Reactiva");
    if (patient.prueba_vdrl === "Reactiva") list.push("VDRL Reactiva");
    if (patient.prueba_hepatitis_c === "Reactiva") list.push("Hepatitis C Reactiva");
    return list;
  }, [patient]);

  const tieneAlertaNotificacion = tamizajesReactivosActivos.length > 0;

  // Recomendaciones clínicas complementarias basadas en el perfil de la paciente
  const recomendacionesClinicas = useMemo(() => {
    if (!patient) return [];
    const recs: string[] = [];
    if (
      patient.factor_diabetes ||
      patient.diabetes_glicemia === "Diabetes" ||
      patient.diabetes_glicemia === "Resistencia a la insulina"
    ) {
      recs.push("No acumulativos en cada consulta + Manejo conjunto con Segundo Nivel de Atencion");
    }
    if (patient.tipo_riesgo_social === "Medio" || patient.tipo_riesgo_social === "Alto") {
      recs.push("Fortalecer red social, vinculación con acción comunitaria");
    }
    if (patient.factor_discapacidad) {
      recs.push("Fortalecer red social, manejo conjunto con segundo nivel de atención");
    }
    const edad = Number(patient.edad);
    if (Number.isFinite(edad) && (edad < 19 || edad > 35)) {
      recs.push("Vigilancia estrecha por edad extrema de riesgo");
    }
    if (patient.factor_obesidad) {
      recs.push("Asesoría nutricional y control estricto de ganancia de peso");
    }
    if (patient.imc_inicial != null && String(patient.imc_inicial).trim() !== "") {
      const imc = Number(patient.imc_inicial);
      if (!Number.isNaN(imc) && (imc < 18.5 || imc >= 30)) {
        recs.push("Referir a segundo nivel de atención servicio de nutrición");
      }
    }
    if (patient.ganancia_ponderal_max != null && String(patient.ganancia_ponderal_max).trim() !== "") {
      recs.push(`Ganancia de peso máxima recomendada durante el embarazo: ${patient.ganancia_ponderal_max} kg`);
    }
    return recs;
  }, [patient]);

  // Array de tarjetas activas para el Carrusel de Alertas y Recomendaciones
  const cardsAlertas = useMemo(() => {
    if (!patient) return [];
    const cards: Array<{
      id: string;
      tipo: "referencia" | "preeclampsia" | "notificacion" | "discapacidad" | "recomendaciones";
      titulo: string;
      subtitulo?: string;
      icono: string;
      colorTheme: {
        border: string;
        bg: string;
        textTitle: string;
        textBody: string;
        chipBg: string;
        chipBorder: string;
        chipText: string;
      };
      items?: string[];
      lista?: string[];
      texto?: string;
    }> = [];

    // 1. Alerta de Referencia a Segundo Nivel (Comorbilidades / Antecedentes)
    if (tieneAlertaSegundoNivel) {
      cards.push({
        id: "referencia-segundo-nivel",
        tipo: "referencia",
        titulo: "Alerta de Referencia",
        subtitulo: "Segundo Nivel",
        icono: "fa-solid fa-triangle-exclamation",
        colorTheme: {
          border: "border-amber-400/60 dark:border-amber-400/60",
          bg: "bg-amber-50 dark:bg-amber-500/20",
          textTitle: "text-amber-800 dark:text-amber-300",
          textBody: "text-amber-950 dark:text-amber-100",
          chipBg: "bg-amber-100 dark:bg-amber-400/20",
          chipBorder: "border-amber-300 dark:border-amber-300/40",
          chipText: "text-amber-900 dark:text-amber-200",
        },
        texto: "Referencia a segundo nivel de atención con paraclínicos desde la primera consulta",
        items: factoresSegundoNivelActivos,
      });
    }

    // 2. Alerta de Referencia Específica por Preeclampsia
    if (patient.ant_preeclampsia) {
      cards.push({
        id: "referencia-preeclampsia",
        tipo: "preeclampsia",
        titulo: "Alerta de Referencia",
        subtitulo: "Preeclampsia",
        icono: "fa-solid fa-triangle-exclamation",
        colorTheme: {
          border: "border-amber-400/60 dark:border-amber-400/60",
          bg: "bg-amber-50 dark:bg-amber-500/20",
          textTitle: "text-amber-800 dark:text-amber-300",
          textBody: "text-amber-950 dark:text-amber-100",
          chipBg: "bg-amber-100 dark:bg-amber-400/20",
          chipBorder: "border-amber-300 dark:border-amber-300/40",
          chipText: "text-amber-900 dark:text-amber-200",
        },
        texto: "Referencia a segundo nivel de atención con paraclínicos desde la primera consulta + Vigilar ganancia ponderal + Vigilar proteinuria, T.A. a partir de las 20 SDG",
        items: ["Antecedente de preeclampsia"],
      });
    }

    // 3. Alerta de Notificación por Tamizajes Reactivos
    if (tieneAlertaNotificacion) {
      cards.push({
        id: "notificacion-tamizajes",
        tipo: "notificacion",
        titulo: "Alerta de Notificación",
        subtitulo: "Tamizajes Reactivos",
        icono: "fa-solid fa-bullhorn",
        colorTheme: {
          border: "border-rose-400/60 dark:border-rose-400/60",
          bg: "bg-rose-50 dark:bg-rose-500/20",
          textTitle: "text-rose-800 dark:text-rose-300",
          textBody: "text-rose-950 dark:text-rose-100",
          chipBg: "bg-rose-100 dark:bg-rose-400/20",
          chipBorder: "border-rose-300 dark:border-rose-300/40",
          chipText: "text-rose-900 dark:text-rose-200",
        },
        texto: "Informar inmediatamente a enlace zonal y epidemiología regional, seguimiento normativo hasta descarte o confirmación",
        items: tamizajesReactivosActivos,
      });
    }

    // 4. Alerta de Notificación por Violencia
    if (patient.violencia === "Positiva") {
      cards.push({
        id: "notificacion-violencia",
        tipo: "notificacion",
        titulo: "Alerta de Notificación",
        subtitulo: "Violencia",
        icono: "fa-solid fa-shield-halved",
        colorTheme: {
          border: "border-rose-400/60 dark:border-rose-400/60",
          bg: "bg-rose-50 dark:bg-rose-500/20",
          textTitle: "text-rose-800 dark:text-rose-300",
          textBody: "text-rose-950 dark:text-rose-100",
          chipBg: "bg-rose-100 dark:bg-rose-400/20",
          chipBorder: "border-rose-300 dark:border-rose-300/40",
          chipText: "text-rose-900 dark:text-rose-200",
        },
        texto: "Integrar ruta de atencion para violencia; Notificación de caso a enlace zonal",
        items: ["Tamizaje de violencia positiva"],
      });
    }

    // 5. Alerta de Discapacidad
    if (patient.factor_discapacidad) {
      cards.push({
        id: "alerta-discapacidad",
        tipo: "discapacidad",
        titulo: "Alerta de Discapacidad",
        subtitulo: "Atención Especial",
        icono: "fa-solid fa-wheelchair",
        colorTheme: {
          border: "border-sky-400/60 dark:border-sky-400/60",
          bg: "bg-sky-50 dark:bg-sky-500/20",
          textTitle: "text-sky-800 dark:text-sky-300",
          textBody: "text-sky-950 dark:text-sky-100",
          chipBg: "bg-sky-100 dark:bg-sky-400/20",
          chipBorder: "border-sky-300 dark:border-sky-300/40",
          chipText: "text-sky-900 dark:text-sky-200",
        },
        texto: "Fortalecer red social, manejo conjunto con segundo nivel de atención",
      });
    }

    // 6. Recomendaciones Clínicas Activas
    if (recomendacionesClinicas.length > 0) {
      cards.push({
        id: "recomendaciones-clinicas",
        tipo: "recomendaciones",
        titulo: "Recomendaciones Clínicas",
        subtitulo: "Guías activas",
        icono: "fa-solid fa-clipboard-check",
        colorTheme: {
          border: "border-emerald-400/50 dark:border-emerald-400/50",
          bg: "bg-emerald-50 dark:bg-emerald-950/40",
          textTitle: "text-emerald-800 dark:text-emerald-300",
          textBody: "text-slate-800 dark:text-slate-200",
          chipBg: "bg-emerald-100 dark:bg-emerald-400/20",
          chipBorder: "border-emerald-300 dark:border-emerald-300/40",
          chipText: "text-emerald-900 dark:text-emerald-200",
        },
        lista: recomendacionesClinicas,
      });
    }

    return cards;
  }, [patient, tieneAlertaSegundoNivel, factoresSegundoNivelActivos, tieneAlertaNotificacion, tamizajesReactivosActivos, recomendacionesClinicas]);

  // Rotación automática cada 6 segundos si hay más de 1 alerta y no hay hover
  useEffect(() => {
    if (cardsAlertas.length <= 1 || isAlertaHovered) return;

    const timer = setInterval(() => {
      setAlertaIndex((prev) => (prev + 1) % cardsAlertas.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [cardsAlertas.length, isAlertaHovered]);

  const enProcesoColegiado = (ultimaConsulta?.colegiado ?? 0) === 1;

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        Validando acceso...
      </main>
    );
  }

  return (
    <main className="min-h-screen relative transition-colors duration-300">
      {/* CAPA DE FONDO FIJA - MODO CLARO */}
      <div
        className="fixed inset-0 z-0 dark:hidden"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(241, 245, 249, 0.88), rgba(204, 251, 241, 0.75)), url(/maro-hero.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />
      {/* CAPA DE FONDO FIJA - MODO OSCURO */}
      <div
        className="fixed inset-0 z-0 hidden dark:block"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(15,118,110,0.65)), url(/maro-hero.png)",
          backgroundSize: "cover",
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
                Expediente Obstétrico
              </span>
              {patient?.folio && (
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/40 px-2.5 py-0.5 rounded-full font-mono">
                  {patient.folio}
                </span>
              )}
              {enProcesoColegiado && (
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <i className="fa-solid fa-clock-rotate-left text-amber-600 dark:text-amber-300"></i>
                  <span>Colegiado en Proceso</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {patient?.nombre_completo || "Paciente sin nombre"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <i className="fa-solid fa-hospital text-emerald-600 dark:text-emerald-400"></i>
              <span>{patient?.unidad || "Unidad Médica"} · CLUES {patient?.clues_id || "—"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 hover:border-slate-400 dark:hover:border-white/30 transition shadow-sm cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-xs text-slate-500 dark:text-slate-300"></i>
              <span>Dashboard</span>
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Cargando expediente de la paciente…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/40 bg-rose-50 dark:bg-red-950/40 p-6 text-sm text-rose-800 dark:text-red-200 flex items-center gap-3">
            <i className="fa-solid fa-circle-exclamation text-xl text-rose-600 dark:text-red-400"></i>
            <span>{error}</span>
          </div>
        ) : !patient ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Paciente no encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ========================================================================= */}
            {/* COLUMNA PRINCIPAL (IZQUIERDA - 7/12 o 8/12)                               */}
            {/* ========================================================================= */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* ACCESOS RÁPIDOS A MÓDULOS */}
              <div className={`grid grid-cols-1 ${patient.estado_embarazo === 'puerperio' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
                {[
                  {
                    title: "Consultas",
                    subtitle: "Seguimiento y Signos",
                    icon: "fa-solid fa-stethoscope",
                    href: `/pacientes/${patient.id}/consultas`,
                    accent: "border-teal-300 dark:border-cyan-400/40 bg-white/95 dark:bg-cyan-500/10 text-teal-950 dark:text-cyan-100 hover:bg-teal-50 dark:hover:bg-cyan-500/20 hover:border-teal-400 dark:hover:border-cyan-300",
                    iconBox: "bg-teal-100 dark:bg-white/10 text-teal-700 dark:text-cyan-300",
                  },
                  ...(patient.estado_embarazo === "puerperio" ? [{
                    title: "Puerperio",
                    subtitle: "Seguimiento y APEO",
                    icon: "fa-solid fa-baby",
                    href: `/puerperio/nuevo?paciente_id=${patient.id}&folio=${patient.folio || ''}`,
                    accent: "border-purple-300 dark:border-purple-400/40 bg-white/95 dark:bg-purple-500/10 text-purple-950 dark:text-purple-100 hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:border-purple-400 dark:hover:border-purple-300",
                    iconBox: "bg-purple-100 dark:bg-white/10 text-purple-700 dark:text-purple-300",
                  }] : []),
                  {
                    title: "Acciones",
                    subtitle: "Preventivas y Educación",
                    icon: "fa-solid fa-shield-heart",
                    href: `/pacientes/${patient.id}/acciones`,
                    accent: "border-amber-300 dark:border-amber-400/40 bg-white/95 dark:bg-amber-500/10 text-amber-950 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-500/20 hover:border-amber-400 dark:hover:border-amber-300",
                    iconBox: "bg-amber-100 dark:bg-white/10 text-amber-700 dark:text-amber-300",
                  },
                  {
                    title: "Detecciones",
                    subtitle: "Tamizajes y Laboratorios",
                    icon: "fa-solid fa-vial-virus",
                    href: `/pacientes/${patient.id}/detecciones`,
                    accent: "border-emerald-300 dark:border-emerald-400/40 bg-white/95 dark:bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-300",
                    iconBox: "bg-emerald-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-300",
                  },
                ].map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`group rounded-2xl border p-4 shadow-md dark:shadow-lg transition-all duration-200 flex flex-col justify-between gap-3 ${item.accent}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${item.iconBox}`}>
                        <i className={item.icon}></i>
                      </div>
                      <i className="fa-solid fa-arrow-right text-xs opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition"></i>
                    </div>
                    <div>
                      <p className="font-bold text-base text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{item.subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* PERFIL OBSTÉTRICO Y CRONOGRAMA GESTACIONAL */}
              <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl transition-colors">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <i className="fa-solid fa-person-pregnant text-emerald-600 dark:text-emerald-400"></i>
                    <span>Perfil Obstétrico y Gestacional</span>
                  </h2>
                  <span className="text-xs font-bold text-teal-900 dark:text-cyan-200 bg-teal-100 dark:bg-cyan-500/20 border border-teal-300 dark:border-cyan-400/30 px-3 py-1 rounded-full">
                    {calcularSdgActual(patient)} SDG Actuales
                  </span>
                </div>

                {/* Grid de Métricas Obstétricas Clave */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-center">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-medium">FUM</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{formatDate(patient.fum)}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-center">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-medium">FPP</span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">{formatDate(patient.fpp)}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-center">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-medium">SDG Ingreso</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{patient.sdg_ingreso != null ? `${patient.sdg_ingreso} sem` : patient.semanas_gestacion != null ? `${Math.floor(Number(patient.semanas_gestacion))} sem` : "—"}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-center">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-medium">Ingreso CPN</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{formatDate(patient.fecha_ingreso_cpn)}</span>
                  </div>
                </div>

                {/* Fórmula Obstétrica Destacada */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-baby text-teal-600 dark:text-cyan-300"></i>
                    <span>Fórmula Obstétrica (G - P - C - A)</span>
                  </span>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <div className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-lg p-2.5 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Gestas</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{patient.gestas ?? 0}</span>
                    </div>
                    <div className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-lg p-2.5 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Partos</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{patient.partos ?? 0}</span>
                    </div>
                    <div className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-lg p-2.5 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Cesáreas</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{patient.cesareas ?? 0}</span>
                    </div>
                    <div className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-lg p-2.5 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Abortos</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{patient.abortos ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Datos antropométricos / adicionales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2.5">
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <i className="fa-solid fa-weight-scale text-slate-400"></i>
                      <span>IMC Inicial:</span>
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{patient.imc_inicial ? `${patient.imc_inicial} kg/m²` : "—"}</span>
                  </div>
                  {patient.edad ? (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2.5">
                      <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <i className="fa-solid fa-user text-slate-400"></i>
                        <span>Edad de la paciente:</span>
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{patient.edad} años</span>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* ANTECEDENTES Y COMORBILIDADES REGISTRADAS */}
              <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl transition-colors">
                <h2 className="text-lg font-bold text-teal-800 dark:text-cyan-300 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                  <i className="fa-solid fa-notes-medical text-teal-600 dark:text-cyan-400"></i>
                  <span>Antecedentes y Factores Clínicos Registrados</span>
                </h2>

                <div className="space-y-4">
                  {/* Antecedentes Gineco-obstétricos patológicos */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Antecedentes Gineco-Obstétricos de Riesgo:
                    </p>
                    {antecedentesActivos.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2">
                        Sin antecedentes gineco-obstétricos de riesgo registrados.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {antecedentesActivos.map((ant, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-400/50 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-full shadow-xs"
                          >
                            <i className="fa-solid fa-circle-exclamation text-amber-600 dark:text-amber-400 text-[10px]"></i>
                            <span>{ant.label}</span>
                            <span className="bg-amber-200 dark:bg-amber-400/30 text-amber-950 dark:text-amber-100 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                              +{ant.puntos} pts
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comorbilidades activas */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Comorbilidades y Factores Crónicos:
                    </p>
                    {comorbilidadesActivas.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2">
                        Sin comorbilidades o toxicomanías activas registradas.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {comorbilidadesActivas.map((comorb, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 dark:bg-cyan-500/20 border border-teal-300 dark:border-cyan-400/40 text-teal-950 dark:text-cyan-200 px-3 py-1 rounded-full shadow-xs"
                          >
                            <i className="fa-solid fa-check text-teal-600 dark:text-cyan-400 text-[10px]"></i>
                            <span>{comorb}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Otros factores */}
                  {(patient.indigena || patient.migrante || (patient.factores_riesgo_epid && patient.factores_riesgo_epid !== 'ninguno') || patient.otros_antecedentes) && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Factores Epidemiológicos y Sociodemográficos:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Boolean(patient.indigena) && (
                          <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-400/40 text-indigo-950 dark:text-indigo-200 px-2.5 py-1 rounded-full">
                            Población Indígena
                          </span>
                        )}
                        {Boolean(patient.migrante) && (
                          <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-400/40 text-indigo-950 dark:text-indigo-200 px-2.5 py-1 rounded-full">
                            Población Migrante
                          </span>
                        )}
                        {patient.factores_riesgo_epid && patient.factores_riesgo_epid !== 'ninguno' && (
                          <span className="text-xs font-bold bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-400/40 text-purple-950 dark:text-purple-200 px-2.5 py-1 rounded-full">
                            Epidemiológico: {patient.factores_riesgo_epid.replaceAll('_', ' ')}
                          </span>
                        )}
                      </div>
                      {patient.otros_antecedentes && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 mt-2">
                          <strong className="text-slate-900 dark:text-white">Otros antecedentes:</strong> {patient.otros_antecedentes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* IDENTIFICACIÓN, UBICACIÓN Y CONTACTO */}
              <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl transition-colors">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                  <i className="fa-solid fa-hospital-user text-indigo-600 dark:text-indigo-400"></i>
                  <span>Identificación, Ubicación y Contacto</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Teléfono</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-phone text-xs text-emerald-600 dark:text-emerald-400"></i>
                      <span>{patient.telefono || "—"}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Derechohabiencia</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-id-card text-xs text-teal-600 dark:text-cyan-400"></i>
                      <span>{patient.derechohabiencia || "—"}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Municipio</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-location-dot text-xs text-amber-600 dark:text-amber-400"></i>
                      <span>{patient.municipio || "—"}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Localidad / Colonia</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{patient.localidad || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dirección</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{patient.direccion || "—"}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* ========================================================================= */}
            {/* PANEL LATERAL DE RIESGO Y RECOMENDACIONES (DERECHA - 5/12 o 4/12 STICKY) */}
            {/* ========================================================================= */}
            <aside className="lg:col-span-5 xl:col-span-4 space-y-5 lg:sticky lg:top-6">
              {/* TARJETA DE RESUMEN GLOBAL DE RIESGO */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-slate-900/80 p-5 space-y-4 shadow-xl transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <i className="fa-solid fa-gauge-high text-emerald-600 dark:text-emerald-400"></i>
                    <span>Semáforo de Riesgo</span>
                  </span>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs ${
                    puntajeTotalCombinado >= 25 ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-600 dark:text-white' :
                    puntajeTotalCombinado >= 10 ? 'bg-orange-100 text-orange-900 border border-orange-300 dark:bg-orange-500 dark:text-white' :
                    puntajeTotalCombinado >= 4 ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500 dark:text-slate-900' :
                    'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-600 dark:text-white'
                  }`}>
                    {puntajeTotalCombinado >= 25 ? 'CRÍTICO' :
                     puntajeTotalCombinado >= 10 ? 'MUY ALTO' :
                     puntajeTotalCombinado >= 4 ? 'ALTO' : 'BAJO'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Puntaje Total Combinado</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{puntajeTotalCombinado} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">pts</span></span>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Antecedentes: <strong className="text-slate-900 dark:text-white font-bold">{resultadoRiesgo?.puntajeTotal ?? 0} pts</strong>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Tamizajes: <strong className="text-slate-900 dark:text-white font-bold">{resultadoTamizajes?.puntajeTotal ?? 0} pts</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARRUSEL DE ALERTAS Y RECOMENDACIONES CLÍNICAS */}
              {cardsAlertas.length > 0 && (() => {
                const totalAlertas = cardsAlertas.length;
                const safeIndex = ((alertaIndex % totalAlertas) + totalAlertas) % totalAlertas;
                const currentCard = cardsAlertas[safeIndex];

                return (
                  <div 
                    onMouseEnter={() => setIsAlertaHovered(true)}
                    onMouseLeave={() => setIsAlertaHovered(false)}
                    className={`rounded-2xl border ${currentCard.colorTheme.border} ${currentCard.colorTheme.bg} p-4 space-y-3 shadow-md transition-all duration-300 relative`}
                  >
                    {/* Header del Carrusel con Controles */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <i className={`${currentCard.icono} ${currentCard.colorTheme.textTitle} text-sm shrink-0`}></i>
                        <span className={`text-xs font-bold uppercase tracking-wider ${currentCard.colorTheme.textTitle} truncate`}>
                          {currentCard.titulo}
                        </span>
                        {currentCard.subtitulo && (
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block font-medium">
                            {currentCard.subtitulo}
                          </span>
                        )}
                      </div>

                      {totalAlertas > 1 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mr-1">
                            {safeIndex + 1} de {totalAlertas}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAlertaIndex((prev) => (prev - 1 + totalAlertas) % totalAlertas)}
                            className="w-6 h-6 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-slate-300 dark:border-white/10 flex items-center justify-center text-xs text-slate-700 dark:text-white transition-all cursor-pointer"
                            title="Alerta anterior"
                            aria-label="Alerta anterior"
                          >
                            <i className="fa-solid fa-chevron-left"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlertaIndex((prev) => (prev + 1) % totalAlertas)}
                            className="w-6 h-6 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-slate-300 dark:border-white/10 flex items-center justify-center text-xs text-slate-700 dark:text-white transition-all cursor-pointer"
                            title="Siguiente alerta"
                            aria-label="Siguiente alerta"
                          >
                            <i className="fa-solid fa-chevron-right"></i>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Contenido de la Alerta Actual */}
                    <div className="space-y-2.5 min-h-[70px] flex flex-col justify-between animate-in fade-in duration-200">
                      {currentCard.texto && (
                        <p className={`text-xs font-semibold ${currentCard.colorTheme.textBody} leading-snug`}>
                          {currentCard.texto}
                        </p>
                      )}

                      {/* Chips / Factores asociados */}
                      {currentCard.items && currentCard.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {currentCard.items.map((item, index) => (
                            <span
                              key={index}
                              className={`text-[10px] ${currentCard.colorTheme.chipBg} border ${currentCard.colorTheme.chipBorder} ${currentCard.colorTheme.chipText} font-semibold px-2 py-0.5 rounded-full`}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Lista de recomendaciones estructuradas */}
                      {currentCard.lista && currentCard.lista.length > 0 && (
                        <ul className="space-y-1.5 pt-1 max-h-[220px] overflow-y-auto pr-1">
                          {currentCard.lista.map((rec, index) => (
                            <li key={index} className="text-xs text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg p-2 flex items-start gap-2">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Indicadores inferiores (Dots de navegación) */}
                    {totalAlertas > 1 && (
                      <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-200 dark:border-white/5">
                        {cardsAlertas.map((card, idx) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => setAlertaIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                              idx === safeIndex ? "w-5 bg-slate-800 dark:bg-white" : "w-1.5 bg-slate-400 dark:bg-white/30 hover:bg-slate-600 dark:hover:bg-white/50"
                            }`}
                            aria-label={`Ir a alerta ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* EVALUACIÓN DE FACTORES DE RIESGO: ANTECEDENTES */}
              {resultadoRiesgo && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-4 space-y-3 shadow-xl transition-colors">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-clipboard-list text-emerald-600 dark:text-emerald-400"></i>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Riesgo Antecedentes</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md">
                      +{resultadoRiesgo.puntajeTotal} pts
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {resultadoRiesgo.descripcion}
                  </p>

                  {resultadoRiesgo.factores.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Factores Sumatorios:</span>
                      <div className="space-y-1">
                        {resultadoRiesgo.factores.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-xs">
                            <span className="text-slate-800 dark:text-slate-200">{f.campo}</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">+{f.puntos} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 italic">
                      Sin factores de riesgo identificados en antecedentes.
                    </div>
                  )}
                </div>
              )}

              {/* EVALUACIÓN DE FACTORES DE RIESGO: TAMIZAJES */}
              {resultadoTamizajes && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-4 space-y-3 shadow-xl transition-colors">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-flask-vial text-teal-600 dark:text-cyan-400"></i>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Riesgo Tamizajes</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      resultadoTamizajes.puntajeTotal > 0
                        ? "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300"
                        : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    }`}>
                      +{resultadoTamizajes.puntajeTotal} pts
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {resultadoTamizajes.descripcion}
                  </p>

                  {resultadoTamizajes.tamizajes.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Hallazgos Reactivos:</span>
                      <div className="space-y-1">
                        {resultadoTamizajes.tamizajes.map((t, i) => (
                          <div key={i} className="flex items-center justify-between bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 rounded-lg px-2.5 py-1.5 text-xs text-rose-950 dark:text-rose-200">
                            <span>{t.campo}</span>
                            <span className="font-bold text-rose-800 dark:text-rose-300">+{t.puntos} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 italic">
                      Todos los tamizajes iniciales dentro de parámetros normales.
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
