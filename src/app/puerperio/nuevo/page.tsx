"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { evaluarCicloObstetrico } from "@/lib/resolucionEmbarazo";

type SessionInfo = {
  clues?: string;
  unidad?: string;
  region?: string;
  municipio?: string;
  userId?: number;
};

type PacienteResumen = {
  nombre_completo: string | null;
  folio: string | null;
  edad: number | null;
  gestas: number | null;
  partos: number | null;
  cesareas: number | null;
  abortos: number | null;
  fum: string | null;
  fpp: string | null;
  fecha_resolucion: string | null;
  tipo_resolucion: string | null;
  lugar_atencion_parto: string | null;
  complicacion_resolucion: string | null;
  dias_puerperio: number | null;
  etapa_puerperio: string | null;
  clues: string | null;
  unidad: string | null;
};

const initialForm = {
  folio: "",
  complicaciones: "",
  MMEG: false,
  fecha_atencion_evento: "",
  dias_puerperio: "",
  valoracion_riesgo: "Bajo Riesgo",
  apeo_fecha: "",
  apeo_metodo: "",
  datos_alarma: "",
  diagnostico: "",
  plan: "",
  fecha_siguiente_consulta: "",
  referencia: "",
  usuaria_seguimiento: true,
  fecha_atencion_sna_tna: "",
  fecha_contrareferencia: "",
};

function NuevoPuerperioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pacienteId = searchParams?.get("paciente_id") || searchParams?.get("id");
  const folioExistente = searchParams?.get("folio");

  const [session, setSession] = useState<SessionInfo>({});
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [loadingPaciente, setLoadingPaciente] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [pacienteData, setPacienteData] = useState<PacienteResumen>({
    nombre_completo: null,
    folio: null,
    edad: null,
    gestas: null,
    partos: null,
    cesareas: null,
    abortos: null,
    fum: null,
    fpp: null,
    fecha_resolucion: null,
    tipo_resolucion: null,
    lugar_atencion_parto: null,
    complicacion_resolucion: null,
    dias_puerperio: null,
    etapa_puerperio: null,
    clues: null,
    unidad: null,
  });

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed?.clues) {
        router.replace("/inicial");
        return;
      }

      setSession(parsed);

      if (folioExistente) {
        setForm((prev) => ({ ...prev, folio: folioExistente }));
      } else if (!pacienteId) {
        generarFolio(parsed.clues);
      }
      setAuthChecked(true);
    } catch (_) {
      router.replace("/inicial");
    }
  }, [folioExistente, pacienteId, router]);

  // Carga de datos del paciente y pre-llenado de resolución
  useEffect(() => {
    if (!pacienteId || !authChecked) return;

    const loadPaciente = async () => {
      setLoadingPaciente(true);
      try {
        const res = await fetch(`/api/pacientes?id=${pacienteId}`);
        if (res.ok) {
          const data = await res.json();
          const ciclo = evaluarCicloObstetrico({
            fum: data.fum,
            estadoEmbarazo: data.estado_embarazo,
            fechaResolucion: data.fecha_resolucion,
          });

          setPacienteData({
            nombre_completo: data.nombre_completo || null,
            folio: data.folio || null,
            edad: data.edad ? Number(data.edad) : null,
            gestas: data.gestas ?? null,
            partos: data.partos ?? null,
            cesareas: data.cesareas ?? null,
            abortos: data.abortos ?? null,
            fum: data.fum || null,
            fpp: data.fpp || null,
            fecha_resolucion: data.fecha_resolucion || null,
            tipo_resolucion: data.tipo_resolucion || null,
            lugar_atencion_parto: data.lugar_atencion_parto || null,
            complicacion_resolucion: data.complicacion_resolucion || null,
            dias_puerperio: ciclo.diasPuerperio,
            etapa_puerperio: ciclo.etapaPuerperio,
            clues: data.clues_id || null,
            unidad: data.unidad || null,
          });

          // Prellenado de datos de resolución para evitar duplicidad
          setForm((prev) => {
            const fechaEvento = prev.fecha_atencion_evento || data.fecha_resolucion || "";
            const diasCalc = ciclo.diasPuerperio !== null ? String(ciclo.diasPuerperio) : "";
            const compl = prev.complicaciones || data.complicacion_resolucion || (data.tipo_resolucion === "con_complicaciones" ? "Resolución con complicaciones obstétricas" : "");
            const diag = prev.diagnostico || (
              data.tipo_resolucion === "con_complicaciones"
                ? `Puerperio patológico ${ciclo.etapaPuerperio ? `(${ciclo.etapaPuerperio})` : ""}`
                : `Puerperio fisiológico ${ciclo.etapaPuerperio ? `(${ciclo.etapaPuerperio})` : ""}`
            );

            return {
              ...prev,
              folio: data.folio || prev.folio,
              fecha_atencion_evento: fechaEvento,
              dias_puerperio: prev.dias_puerperio !== "" ? prev.dias_puerperio : diasCalc,
              complicaciones: compl,
              diagnostico: diag,
              valoracion_riesgo: data.tipo_resolucion === "con_complicaciones" ? "Alto Riesgo" : "Bajo Riesgo",
            };
          });
        }
      } catch (err) {
        console.error("Error cargando paciente para puerperio:", err);
      } finally {
        setLoadingPaciente(false);
      }
    };

    loadPaciente();
  }, [pacienteId, authChecked]);

  const generarFolio = async (cluesId: string) => {
    setLoadingFolio(true);
    try {
      const res = await fetch(`/api/puerperio?action=generar-folio&clues_id=${encodeURIComponent(cluesId)}`);
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({ ...prev, folio: data.folio }));
      }
    } catch (err) {
      console.error("Error generando folio:", err);
    } finally {
      setLoadingFolio(false);
    }
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!pacienteId) {
      setError("No se especificó el paciente");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        paciente_id: Number(pacienteId),
        clues_id: session.clues,
        folio: form.folio,
        complicaciones: form.complicaciones || null,
        MMEG: form.MMEG,
        fecha_atencion_evento: form.fecha_atencion_evento || null,
        dias_puerperio: form.dias_puerperio ? Number(form.dias_puerperio) : null,
        valoracion_riesgo: form.valoracion_riesgo || null,
        apeo_fecha: form.apeo_fecha || null,
        apeo_metodo: form.apeo_metodo || null,
        datos_alarma: form.datos_alarma || null,
        diagnostico: form.diagnostico || null,
        plan: form.plan || null,
        fecha_siguiente_consulta: form.fecha_siguiente_consulta || null,
        referencia: form.referencia || null,
        usuaria_seguimiento: form.usuaria_seguimiento,
        fecha_atencion_sna_tna: form.fecha_atencion_sna_tna || null,
        fecha_contrareferencia: form.fecha_contrareferencia || null,
      };

      const res = await fetch("/api/puerperio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo guardar la consulta de puerperio");
      }

      setSuccess("¡Consulta de puerperio guardada exitosamente!");
      
      setTimeout(() => {
        router.push(`/pacientes/${pacienteId}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Error desconocido al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-spinner fa-spin text-purple-600 dark:text-purple-400 text-xl"></i>
          <p className="text-sm text-slate-600 dark:text-slate-300">Validando sesión médica...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-white transition-colors">
      {/* ========================================================================= */}
      {/* CAPA DE GRADIENTES RADIAL & MESH EN CSS PURO (TAILWIND CSS)               */}
      {/* ========================================================================= */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Orbe 1: Violeta / Púrpura superior izquierdo */}
        <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-purple-500/30 via-violet-600/20 to-transparent blur-[90px] dark:from-purple-600/25 dark:via-violet-800/20 animate-pulse [animation-duration:8s]" />
        
        {/* Orbe 2: Índigo / Púrpura superior derecho */}
        <div className="absolute top-12 -right-20 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl from-indigo-500/25 via-purple-500/15 to-transparent blur-[100px] dark:from-indigo-600/20 dark:via-purple-900/20" />
        
        {/* Orbe 3: Fucsia / Rosa inferior izquierdo */}
        <div className="absolute top-1/2 -left-20 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-fuchsia-500/20 via-pink-500/15 to-transparent blur-[110px] dark:from-fuchsia-600/15 dark:via-rose-900/15" />
        
        {/* Orbe 4: Teal / Cyan inferior derecho (Acento APEO / Planificación) */}
        <div className="absolute -bottom-24 right-10 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tl from-teal-500/20 via-emerald-500/15 to-transparent blur-[100px] dark:from-teal-600/15 dark:via-cyan-900/15" />
        
        {/* Mesh radial central de profundidad */}
        <div 
          className="absolute inset-0 opacity-40 dark:opacity-60 mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 40%, rgba(168, 85, 247, 0.15) 0%, transparent 60%)`
          }}
        />

        {/* Patrón sutil de cuadrícula mesh para acabado clínico premium */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        
        {/* CABECERA CON TÍTULO, BADGES Y BOTÓN DE TEMA */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-extrabold tracking-widest text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/30 px-2.5 py-0.5 rounded-full">
                Módulo de Puerperio
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-2.5 py-0.5 rounded-full font-bold font-mono">
                {session.clues ? `CLUES ${session.clues}` : "Unidad"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>👶 Nuevo Registro de Puerperio y APEO</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {pacienteId && (
              <Link
                href={`/pacientes/${pacienteId}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-xs"></i>
                <span>Volver al Expediente</span>
              </Link>
            )}
            <ThemeToggle />
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/20 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-3 animate-in fade-in">
            <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-lg"></i>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/20 p-4 text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-3 animate-in fade-in">
            <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-lg"></i>
            <span>{success}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TARJETA DE DATOS CLÍNICOS Y NOMBRE DE LA PACIENTE                         */}
        {/* ========================================================================= */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-5 shadow-xl space-y-3.5 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5 flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-hospital-user text-purple-600 dark:text-purple-400"></i>
              <span>Ficha Clínica del Expediente Obstétrico</span>
            </span>
            <div className="flex items-center gap-2">
              {loadingPaciente && (
                <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                  <span>Cargando datos...</span>
                </span>
              )}
              <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono">
                Folio: {pacienteData.folio || form.folio || "—"}
              </span>
            </div>
          </div>

          {/* BANNER CON NOMBRE DE LA PACIENTE */}
          <div className="flex items-center gap-3.5 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-900/30 dark:via-purple-900/10 p-3.5 rounded-xl border border-purple-300/40 dark:border-purple-500/30">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-purple-950/20">
              <i className="fa-solid fa-user-nurse"></i>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700 dark:text-purple-300 block">
                Paciente Obstétrica
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {pacienteData.nombre_completo || (loadingPaciente ? "Cargando nombre..." : "Paciente")}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Edad</span>
              <strong className="text-sm text-slate-900 dark:text-white">{pacienteData.edad ? `${pacienteData.edad} años` : "—"}</strong>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Fórmula Obstétrica</span>
              <strong className="text-xs text-slate-900 dark:text-white font-mono">
                G:{pacienteData.gestas ?? 0} P:{pacienteData.partos ?? 0} C:{pacienteData.cesareas ?? 0} A:{pacienteData.abortos ?? 0}
              </strong>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Fecha de Parto / Término</span>
              <strong className="text-xs text-purple-700 dark:text-purple-300">{formatDate(pacienteData.fecha_resolucion)}</strong>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Día de Puerperio</span>
              <strong className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                {pacienteData.dias_puerperio !== null ? `Día ${pacienteData.dias_puerperio} / 42` : "—"}
              </strong>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Etapa de Puerperio</span>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-200/70 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200 mt-0.5">
                {pacienteData.etapa_puerperio ? `Puerperio ${pacienteData.etapa_puerperio}` : "Puerperio"}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Lugar de Atención</span>
              <strong className="text-xs text-slate-900 dark:text-white truncate block" title={pacienteData.lugar_atencion_parto || "—"}>
                {pacienteData.lugar_atencion_parto || "Unidad médica"}
              </strong>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FORMULARIO DE CAPTURA DE PUERPERIO Y APEO                                 */}
        {/* ========================================================================= */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: DATOS DEL EVENTO OBSTÉTRICO Y PUERPERIO */}
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h2 className="text-base font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <i className="fa-solid fa-baby text-purple-600 dark:text-purple-400"></i>
                <span>1. Datos del Evento Obstétrico y Puerperio</span>
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Información sincronizada con la resolución
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Fecha de Atención del Parto/Evento *</span>
                <input
                  type="date"
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.fecha_atencion_evento}
                  onChange={(e) => handleChange("fecha_atencion_evento", e.target.value)}
                />
              </label>

              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Días de Puerperio *</span>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.dias_puerperio}
                  onChange={(e) => handleChange("dias_puerperio", e.target.value)}
                  placeholder="Ej. 7"
                />
              </label>

              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Valoración de Riesgo Postparto</span>
                <select
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.valoracion_riesgo}
                  onChange={(e) => handleChange("valoracion_riesgo", e.target.value)}
                >
                  <option value="Bajo Riesgo">Bajo Riesgo (Puerperio Fisiológico)</option>
                  <option value="Alto Riesgo">Alto Riesgo (Vigilancia Estrecha)</option>
                  <option value="Muy Alto Riesgo">Muy Alto Riesgo (Referencia a 2º Nivel)</option>
                </select>
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-300/40 bg-rose-50/50 dark:bg-rose-950/20 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                  checked={form.MMEG}
                  onChange={() => handleChange("MMEG", !form.MMEG)}
                />
                <div>
                  <span className="text-rose-900 dark:text-rose-200 font-bold block">
                    MMEG (Morbilidad Materna Extremadamente Grave)
                  </span>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300/80">
                    Marcar si la paciente requirió ingreso a UTI, hemoderivados o intervención quirúrgica de emergencia.
                  </span>
                </div>
              </label>

              <label className="space-y-1 text-xs block">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Complicaciones Obstétricas / Puerperales</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.complicaciones}
                  onChange={(e) => handleChange("complicaciones", e.target.value)}
                  placeholder="Detallar hemorragia, infección, hipertensión puerperal, anemia severa, o 'Sin complicaciones'..."
                />
              </label>
            </div>
          </section>

          {/* SECCIÓN 2: ANTICONCEPCIÓN POSTEVENTO OBSTÉTRICO (APEO) */}
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h2 className="text-base font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                <i className="fa-solid fa-shield-heart text-teal-600 dark:text-teal-400"></i>
                <span>2. APEO (Anticoncepción Postevento Obstétrico)</span>
              </h2>
              <span className="text-[11px] text-teal-700 dark:text-teal-300 font-bold bg-teal-100 dark:bg-teal-950/50 px-2 py-0.5 rounded-md">
                Planificación Familiar
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Fecha de Colocación / Inicio de APEO</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/50"
                  value={form.apeo_fecha}
                  onChange={(e) => handleChange("apeo_fecha", e.target.value)}
                />
              </label>

              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Método Anticonceptivo APEO Aceptado</span>
                <select
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500/50"
                  value={form.apeo_metodo}
                  onChange={(e) => handleChange("apeo_metodo", e.target.value)}
                >
                  <option value="">Seleccione un método</option>
                  <option value="DIU T de Cobre postparto">DIU T de Cobre postparto / transcesárea</option>
                  <option value="DIU con Levonorgestrel (Mirena/Kyleena)">DIU Liberador de Levonorgestrel</option>
                  <option value="Implante Subdérmico">Implante Subdérmico (Etonogestrel)</option>
                  <option value="OTB / Salpingoclasia">OTB / Salpingoclasia (Definitivo)</option>
                  <option value="Progestágeno oral (lactancia)">Progestágeno oral exclusivo para lactancia</option>
                  <option value="Inyectable bimensual / trimestral">Inyectable de progestágeno</option>
                  <option value="Preservativo de barrera">Preservativo de barrera</option>
                  <option value="No aceptó método">No aceptó método (Rechazo informado)</option>
                </select>
              </label>
            </div>
          </section>

          {/* SECCIÓN 3: DIAGNÓSTICO, DATOS DE ALARMA Y PLAN */}
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl transition-colors">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <i className="fa-solid fa-clipboard-list text-slate-600 dark:text-slate-300"></i>
              <span>3. Diagnóstico Clínico, Datos de Alarma y Plan de Manejo</span>
            </h2>

            <div className="space-y-3">
              <label className="space-y-1 text-xs block">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Diagnóstico Clínico del Puerperio *</span>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.diagnostico}
                  onChange={(e) => handleChange("diagnostico", e.target.value)}
                  placeholder="Ej. Puerperio fisiológico tardío (Día 14) con lactancia materna exclusiva"
                />
              </label>

              <label className="space-y-1 text-xs block">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Signos y Datos de Alarma Explicados a la Puérpera</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.datos_alarma}
                  onChange={(e) => handleChange("datos_alarma", e.target.value)}
                  placeholder="Sangrado abundante o con mal olor, fiebre >38°C, cefalea intensa, dolor epigástrico, visión borrosa..."
                />
              </label>

              <label className="space-y-1 text-xs block">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Plan Terapéutico y Recomendaciones</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.plan}
                  onChange={(e) => handleChange("plan", e.target.value)}
                  placeholder="Hierro + ácido fólico postparto, fomento a lactancia materna exclusiva, cuidado de herida quirúrgica..."
                />
              </label>
            </div>
          </section>

          {/* SECCIÓN 4: SEGUIMIENTO, CITAS Y REFERENCIAS */}
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl transition-colors">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <i className="fa-solid fa-calendar-check text-slate-600 dark:text-slate-300"></i>
              <span>4. Continuidad de la Atención y Referencias</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Fecha Próxima Consulta Postparto</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.fecha_siguiente_consulta}
                  onChange={(e) => handleChange("fecha_siguiente_consulta", e.target.value)}
                />
              </label>

              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Fecha de Atención SNA / TNA</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.fecha_atencion_sna_tna}
                  onChange={(e) => handleChange("fecha_atencion_sna_tna", e.target.value)}
                />
              </label>

              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Fecha de Contrarreferencia</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.fecha_contrareferencia}
                  onChange={(e) => handleChange("fecha_contrareferencia", e.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <label className="space-y-1 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Detalles de Referencia (si aplica)</span>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/50"
                  value={form.referencia}
                  onChange={(e) => handleChange("referencia", e.target.value)}
                  placeholder="Ej. Hospital General para manejo de anemia severa"
                />
              </label>

              <label className="flex items-center gap-2 text-xs pt-6 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  checked={form.usuaria_seguimiento}
                  onChange={() => handleChange("usuaria_seguimiento", !form.usuaria_seguimiento)}
                />
                <span className="text-slate-800 dark:text-slate-200 font-bold">
                  Puérpera en seguimiento activo en esta unidad
                </span>
              </label>
            </div>
          </section>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
            <Link
              href={pacienteId ? `/pacientes/${pacienteId}` : "/dashboard"}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm cursor-pointer"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-lg shadow-purple-950/20 disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Guardando registro...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>Guardar Consulta de Puerperio</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}

export default function NuevoPuerperio() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-spinner fa-spin text-purple-600 dark:text-purple-400 text-xl"></i>
            <p className="text-sm text-slate-600 dark:text-slate-300">Cargando formulario de puerperio...</p>
          </div>
        </main>
      }
    >
      <NuevoPuerperioContent />
    </Suspense>
  );
}

