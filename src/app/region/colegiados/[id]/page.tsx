"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type SessionInfo = {
  nivel?: number;
  region?: string;
};

type ConsultaColegiada = {
  consulta_id: number;
  paciente_id: number;
  region: string | null;
  municipio: string | null;
  unidad: string | null;
  clues_id: string | null;
  fecha_ingreso_cpn: string | null;
  sdg_ingreso: number | null;
  semanas_gestacion: number | null;
  factor_riesgo_antecedentes: number | null;
  factor_riesgo_tamizajes: number | null;
  fecha_consulta: string | null;
  puntaje_total_consulta: number | null;
  puntaje_consulta_parametros: number | null;
  riesgo_25_plus: number;
  colegiado: number;
  fecha_colegiado: string | null;
  diagnostico: string | null;
  plan: string | null;
  notas: string | null;
};

type PlanColegiado = {
  id: number | null;
  consulta_id: number;
  paciente_id: number;
  estatus: "borrador" | "completo";
  observaciones: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AccionColegiada = {
  id?: number;
  nivel_atencion: NivelAtencion;
  orden: number;
  descripcion: string;
  cumplido: boolean;
  fecha_cumplimiento?: string | null;
};

type NivelAtencion = "primer_nivel" | "segundo_nivel" | "tercer_nivel";

type ApiResponse = {
  consulta: ConsultaColegiada;
  plan: PlanColegiado;
  acciones: Array<{
    id: number;
    nivel_atencion: NivelAtencion;
    orden: number;
    descripcion: string;
    cumplido: 0 | 1;
    fecha_cumplimiento: string | null;
  }>;
};

const NIVELES_CONFIG: Array<{
  key: NivelAtencion;
  title: string;
  icon: string;
  cardTone: string;
  badgeTone: string;
  buttonTone: string;
}> = [
  {
    key: "primer_nivel",
    title: "Acciones a realizar por Primer Nivel",
    icon: "fa-solid fa-house-medical",
    cardTone: "border-emerald-300/80 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20",
    badgeTone: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40",
    buttonTone: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  {
    key: "segundo_nivel",
    title: "Acciones a realizar por Segundo Nivel",
    icon: "fa-solid fa-hospital",
    cardTone: "border-teal-300/80 dark:border-teal-500/40 bg-teal-50/40 dark:bg-teal-950/20",
    badgeTone: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-500/20 dark:text-teal-200 dark:border-teal-500/40",
    buttonTone: "bg-teal-600 hover:bg-teal-500 text-white",
  },
  {
    key: "tercer_nivel",
    title: "Acciones a realizar por Tercer Nivel",
    icon: "fa-solid fa-hospital-user",
    cardTone: "border-amber-300/80 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20",
    badgeTone: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40",
    buttonTone: "bg-amber-600 hover:bg-amber-500 text-white",
  },
];

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  if (!includeTime) return `${dd}-${mm}-${yyyy}`;

  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

function emptyAction(nivel: NivelAtencion, orden: number): AccionColegiada {
  return {
    nivel_atencion: nivel,
    orden,
    descripcion: "",
    cumplido: false,
    fecha_cumplimiento: null,
  };
}

export default function RegionDetalleColegiadoPage() {
  const router = useRouter();
  const params = useParams();
  const consultaId = String(params?.id || "");

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [consulta, setConsulta] = useState<ConsultaColegiada | null>(null);
  const [plan, setPlan] = useState<PlanColegiado | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [acciones, setAcciones] = useState<Record<NivelAtencion, AccionColegiada[]>>({
    primer_nivel: [],
    segundo_nivel: [],
    tercer_nivel: [],
  });
  const [collapsed, setCollapsed] = useState<Record<NivelAtencion, boolean>>({
    primer_nivel: false,
    segundo_nivel: false,
    tercer_nivel: false,
  });

  const toggleCollapsed = (nivel: NivelAtencion) =>
    setCollapsed((prev) => ({ ...prev, [nivel]: !prev[nivel] }));

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const session = JSON.parse(stored) as SessionInfo;
      if ((session.nivel ?? 0) < 2) {
        router.replace("/dashboard");
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked || !consultaId) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/colegiados/${consultaId}`, { cache: "no-store" });
        const data = (await res.json()) as ApiResponse | { message?: string; details?: string };

        if (!res.ok) {
          throw new Error((data as any)?.details || (data as any)?.message || "No se pudo cargar el plan colegiado");
        }

        if (cancelled) return;

        const payload = data as ApiResponse;
        setConsulta(payload.consulta);
        setPlan(payload.plan);
        setObservaciones(payload.plan.observaciones || "");

        const grouped: Record<NivelAtencion, AccionColegiada[]> = {
          primer_nivel: [],
          segundo_nivel: [],
          tercer_nivel: [],
        };

        for (const action of payload.acciones || []) {
          grouped[action.nivel_atencion].push({
            id: action.id,
            nivel_atencion: action.nivel_atencion,
            orden: action.orden,
            descripcion: action.descripcion || "",
            cumplido: Number(action.cumplido) === 1,
            fecha_cumplimiento: action.fecha_cumplimiento,
          });
        }

        setAcciones(grouped);
        setError(null);
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
  }, [authChecked, consultaId]);

  const totalAcciones = useMemo(() => {
    return Object.values(acciones).reduce((acc, items) => acc + items.length, 0);
  }, [acciones]);

  const accionesCompletadas = useMemo(() => {
    return Object.values(acciones)
      .flat()
      .filter((item) => item.cumplido).length;
  }, [acciones]);

  const porcentajeAvance = useMemo(() => {
    if (totalAcciones === 0) return 0;
    return Math.round((accionesCompletadas / totalAcciones) * 100);
  }, [accionesCompletadas, totalAcciones]);

  const esAltoRiesgo = useMemo(() => {
    if (!consulta) return false;
    return Number(consulta.riesgo_25_plus) === 1 || (Number(consulta.puntaje_total_consulta) || 0) >= 25;
  }, [consulta]);

  const updateAction = (nivel: NivelAtencion, index: number, patch: Partial<AccionColegiada>) => {
    setSaveMessage(null);
    setAcciones((prev) => ({
      ...prev,
      [nivel]: prev[nivel].map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        const next = { ...item, ...patch };
        if (patch.cumplido === false) {
          next.fecha_cumplimiento = null;
        }
        if (patch.cumplido === true && !next.fecha_cumplimiento) {
          next.fecha_cumplimiento = new Date().toISOString();
        }
        return next;
      }),
    }));
  };

  const addAction = (nivel: NivelAtencion) => {
    setSaveMessage(null);
    setAcciones((prev) => {
      if (prev[nivel].length >= 5) return prev;
      return {
        ...prev,
        [nivel]: [...prev[nivel], emptyAction(nivel, prev[nivel].length + 1)],
      };
    });
  };

  const removeAction = (nivel: NivelAtencion, index: number) => {
    setSaveMessage(null);
    setAcciones((prev) => ({
      ...prev,
      [nivel]: prev[nivel]
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, nextIndex) => ({ ...item, orden: nextIndex + 1 })),
    }));
  };

  const handleSave = async () => {
    if (!consulta) return;

    const payload = Object.values(acciones)
      .flat()
      .filter((item) => item.descripcion.trim().length > 0)
      .map((item) => ({
        nivel_atencion: item.nivel_atencion,
        descripcion: item.descripcion.trim(),
        cumplido: item.cumplido,
        fecha_cumplimiento: item.cumplido ? item.fecha_cumplimiento || new Date().toISOString() : null,
      }));

    setSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/colegiados/${consulta.consulta_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          observaciones: observaciones.trim() || null,
          acciones: payload,
          estatus: payload.length > 0 ? "completo" : "borrador",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.message || "No se pudo guardar el plan colegiado");
      }

      const response = data as ApiResponse;
      setPlan(response.plan);
      setObservaciones(response.plan.observaciones || "");

      const grouped: Record<NivelAtencion, AccionColegiada[]> = {
        primer_nivel: [],
        segundo_nivel: [],
        tercer_nivel: [],
      };

      for (const action of response.acciones || []) {
        grouped[action.nivel_atencion].push({
          id: action.id,
          nivel_atencion: action.nivel_atencion,
          orden: action.orden,
          descripcion: action.descripcion || "",
          cumplido: Number(action.cumplido) === 1,
          fecha_cumplimiento: action.fecha_cumplimiento,
        });
      }

      setAcciones(grouped);
      setSaveMessage("Plan colegiado guardado correctamente.");

      const syncStamp = String(Date.now());
      localStorage.setItem("maro:colegiado-updated", syncStamp);
      window.dispatchEvent(new CustomEvent("maro:colegiado-updated", { detail: syncStamp }));
    } catch (err: any) {
      setError(err?.message || "Error al guardar el plan colegiado");
    } finally {
      setSaving(false);
    }
  };

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
      {/* PATRÓN CLÍNICO DE PUNTOS / RETÍCULA SUTIL */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #059669 1.1px, transparent 1.1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ENCABEZADO SUPERIOR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-700 dark:text-emerald-300">
                Nivel Regional · Caso Colegiado
              </span>
              <span className="text-xs bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Consulta #{consultaId}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  plan?.estatus === "completo"
                    ? "border-emerald-400/60 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                    : "border-amber-400/60 bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200"
                }`}
              >
                {plan?.estatus === "completo" ? "Plan Completo" : "Plan en Borrador"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-list-check text-emerald-600 dark:text-emerald-400"></i>
              <span>Plan de Acciones Colegiadas</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Definición y seguimiento de intervenciones clínicas en la región
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ThemeToggle />
            <Link
              href="/region/colegiados"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-white transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-slate-500 dark:text-slate-400"></i>
              <span>Volver a colegiados</span>
            </Link>
            {consulta && (
              <Link
                href={`/region/pacientes/${consulta.paciente_id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/50 dark:border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-file-medical"></i>
                <span>Ver expediente regional</span>
              </Link>
            )}
          </div>
        </header>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 py-12 text-center text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center gap-2 shadow-xl">
            <i className="fa-solid fa-spinner fa-spin text-emerald-600 dark:text-emerald-400"></i>
            <span>Cargando plan colegiado...</span>
          </section>
        ) : error && !consulta ? (
          <section className="rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 p-6 text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-lg">
            <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-lg"></i>
            <span>{error}</span>
          </section>
        ) : consulta ? (
          <>
            {/* TARJETAS KPI DEL CASO */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Región y Unidad */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal-400 to-emerald-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300">
                      Jurisdicción
                    </span>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Región / Unidad
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-700 dark:text-teal-300 text-xl shrink-0">
                    <i className="fa-solid fa-hospital"></i>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate" title={consulta.region || ""}>
                    {consulta.region || "—"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5" title={consulta.unidad || ""}>
                    {consulta.unidad || "Sin unidad especificada"}
                  </p>
                </div>
              </div>

              {/* Card 2: Fechas del Caso */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                      Cronología
                    </span>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Fecha Consulta / Colegiado
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xl shrink-0">
                    <i className="fa-solid fa-calendar-check"></i>
                  </div>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatDate(consulta.fecha_consulta)}
                  </span>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Colegiado: {formatDate(consulta.fecha_colegiado, true)}
                  </p>
                </div>
              </div>

              {/* Card 3: Semáforo de Riesgo y Puntaje */}
              <div
                className={`relative overflow-hidden rounded-3xl border-2 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3 transition-all ${
                  esAltoRiesgo
                    ? "border-rose-500/60 dark:border-rose-400/60 bg-gradient-to-br from-rose-50/95 via-white/95 to-red-50/90 dark:from-rose-950/90 dark:via-slate-900/90 dark:to-slate-900/95"
                    : "border-amber-500/60 dark:border-amber-400/60 bg-gradient-to-br from-amber-50/95 via-white/95 to-yellow-50/90 dark:from-amber-950/85 dark:via-slate-900/90 dark:to-slate-900/95"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 ${
                    esAltoRiesgo
                      ? "bg-gradient-to-r from-rose-500 via-red-500 to-orange-500"
                      : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 dark:bg-black/60 border border-white/15 px-2.5 py-0.5 shadow-inner">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          esAltoRiesgo
                            ? "bg-rose-500 shadow-[0_0_10px_#f43f5e] ring-2 ring-rose-300/80 animate-pulse"
                            : "bg-amber-400 shadow-[0_0_10px_#fbbf24] ring-2 ring-amber-200/70"
                        }`}
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-white ml-1">
                        {esAltoRiesgo ? "Alto Riesgo (≥25)" : "Riesgo < 25"}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Puntaje Consulta
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-md shrink-0 ${
                      esAltoRiesgo
                        ? "bg-gradient-to-br from-rose-600 to-red-600"
                        : "bg-gradient-to-br from-amber-500 to-orange-500"
                    }`}
                  >
                    <i className="fa-solid fa-heart-pulse"></i>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl sm:text-5xl font-black tracking-tight ${
                      esAltoRiesgo ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {Number(consulta.puntaje_total_consulta) || 0}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    puntos MARO
                  </span>
                </div>
              </div>

              {/* Card 4: Semanas de Gestación y Diagnóstico */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-3">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-purple-400 to-indigo-500" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 dark:text-purple-300">
                      Etapa Obstétrica
                    </span>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      SDG / Diagnóstico
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 dark:bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-300 text-xl shrink-0">
                    <i className="fa-solid fa-person-pregnant"></i>
                  </div>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {consulta.semanas_gestacion ?? consulta.sdg_ingreso ?? "—"} SDG
                  </span>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5" title={consulta.diagnostico || ""}>
                    {consulta.diagnostico || "Sin diagnóstico asentado"}
                  </p>
                </div>
              </div>
            </section>

            {/* SECCIÓN DE OBSERVACIONES Y RESUMEN */}
            <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl space-y-3 transition-colors">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <i className="fa-solid fa-comment-medical text-emerald-600 dark:text-emerald-400 text-lg"></i>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Observaciones Generales
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Comentarios globales del plan colegiado regional
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold border ${
                      plan?.estatus === "completo"
                        ? "border-emerald-400/60 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                        : "border-amber-400/60 bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200"
                    }`}
                  >
                    {plan?.estatus === "completo" ? "Completo" : "Borrador"}
                  </span>
                </div>

                <textarea
                  value={observaciones}
                  onChange={(event) => {
                    setSaveMessage(null);
                    setObservaciones(event.target.value);
                  }}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 dark:border-white/15 bg-slate-50/70 dark:bg-slate-950/70 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400"
                  placeholder="Agrega aquí observaciones generales, acuerdos o notas del colegiado regional..."
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/85 p-5 sm:p-6 shadow-xl space-y-4 transition-colors flex flex-col justify-between">
                <div className="border-b border-slate-200 dark:border-white/10 pb-3 flex items-center gap-2.5">
                  <i className="fa-solid fa-chart-pie text-emerald-600 dark:text-emerald-400 text-lg"></i>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Resumen del Plan
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Control del seguimiento regional
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Avance Global</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
                      {porcentajeAvance}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeAvance}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      Acciones
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {totalAcciones}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block tracking-wider">
                      Cumplidas
                    </span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                      {accionesCompletadas}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Última actualización: {formatDate(plan?.updated_at || null, true)}
                </p>
              </div>
            </section>

            {/* ACCIONES POR NIVEL DE ATENCIÓN */}
            <section className="space-y-4">
              {NIVELES_CONFIG.map((nivel) => {
                const items = acciones[nivel.key];
                const isCollapsed = collapsed[nivel.key];
                const completadas = items.filter((i) => i.cumplido).length;

                return (
                  <div
                    key={nivel.key}
                    className={`rounded-2xl border shadow-xl transition-colors overflow-hidden ${nivel.cardTone}`}
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6 cursor-pointer select-none bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm border-b border-inherit"
                      onClick={() => toggleCollapsed(nivel.key)}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-300 dark:border-white/20 text-xs text-slate-700 dark:text-white transition-transform duration-200 bg-white/80 dark:bg-white/5"
                          style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                        >
                          <i className="fa-solid fa-chevron-down text-xs"></i>
                        </span>
                        <div className="flex items-center gap-2.5">
                          <i className={`${nivel.icon} text-lg text-slate-700 dark:text-slate-300`}></i>
                          <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                              {nivel.title}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {items.length === 0
                                ? "Sin acciones registradas"
                                : `${completadas} de ${items.length} completadas (${Math.round((completadas / items.length) * 100)}%)`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold border ${nivel.badgeTone}`}
                        >
                          {items.length}/5 acciones
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addAction(nivel.key);
                          }}
                          disabled={items.length >= 5}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${nivel.buttonTone}`}
                        >
                          <i className="fa-solid fa-plus text-xs"></i>
                          <span>Agregar acción</span>
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-5 sm:p-6 space-y-4">
                        {items.length === 0 ? (
                          <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-white/40 dark:bg-black/20 p-8 text-center text-sm text-slate-500 dark:text-slate-400 space-y-1">
                            <i className="fa-solid fa-circle-info text-xl text-slate-400 block mb-1"></i>
                            <p className="font-semibold">Sin acciones capturadas en este nivel</p>
                            <p className="text-xs">
                              Haz clic en &quot;Agregar acción&quot; para registrar tareas en {nivel.title.toLowerCase()}.
                            </p>
                          </div>
                        ) : (
                          items.map((item, index) => (
                            <div
                              key={`${nivel.key}-${index}-${item.id || "nuevo"}`}
                              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 shadow-md space-y-3 transition-colors"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-0.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Acción {index + 1}
                                  </span>
                                  {item.cumplido && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                                      <i className="fa-solid fa-check text-[10px]"></i>
                                      Cumplida
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAction(nivel.key, index)}
                                  className="inline-flex items-center gap-1 text-xs rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                                >
                                  <i className="fa-solid fa-trash text-xs"></i>
                                  <span>Eliminar</span>
                                </button>
                              </div>

                              <textarea
                                value={item.descripcion}
                                onChange={(event) =>
                                  updateAction(nivel.key, index, { descripcion: event.target.value })
                                }
                                rows={3}
                                maxLength={500}
                                className="w-full rounded-2xl border border-slate-300 dark:border-white/15 bg-slate-50/70 dark:bg-slate-950/70 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400"
                                placeholder="Describe puntualmente la acción técnica, médica o de gestión..."
                              />

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={item.cumplido}
                                    onChange={(event) =>
                                      updateAction(nivel.key, index, { cumplido: event.target.checked })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span>Cumplimiento realizado</span>
                                </label>

                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    {item.cumplido
                                      ? `Fecha: ${formatDate(item.fecha_cumplimiento || null, true)}`
                                      : "Pendiente"}
                                  </span>
                                  <span
                                    className={
                                      item.descripcion.length >= 480
                                        ? "text-rose-600 dark:text-rose-400 font-bold"
                                        : "text-slate-400"
                                    }
                                  >
                                    {item.descripcion.length} / 500
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* AVISOS DE GUARDADO / ERROR */}
            {(error || saveMessage) && (
              <section
                className={`rounded-2xl border p-4 text-sm flex items-center gap-3 shadow-lg ${
                  error
                    ? "border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200"
                    : "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                <i
                  className={`fa-solid ${
                    error ? "fa-triangle-exclamation text-rose-600 text-lg" : "fa-circle-check text-emerald-600 text-lg"
                  }`}
                ></i>
                <span>{error || saveMessage}</span>
              </section>
            )}

            {/* BARRA DE ACCIONES INFERIOR */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => router.push("/region/colegiados")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-5 py-2.5 text-xs font-bold text-slate-800 dark:text-white shadow-sm transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}></i>
                <span>{saving ? "Guardando..." : "Guardar plan colegiado"}</span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
