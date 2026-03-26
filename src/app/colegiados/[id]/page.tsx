"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SessionInfo = {
  nivel?: number;
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

const NIVELES: Array<{ key: NivelAtencion; title: string; tone: string }> = [
  { key: "primer_nivel", title: "Acciones a realizar por primer nivel", tone: "border-emerald-500/40 bg-emerald-950/40" },
  { key: "segundo_nivel", title: "Acciones a realizar por segundo nivel", tone: "border-cyan-500/40 bg-cyan-950/40" },
  { key: "tercer_nivel", title: "Acciones a realizar por tercer nivel", tone: "border-fuchsia-500/40 bg-fuchsia-950/40" },
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

export default function DetalleColegiadoPage() {
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

  const backgroundStyle = {
    backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(12,74,110,0.68)), url(/maro_back_estatal.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat" as const,
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen relative text-slate-100" style={backgroundStyle}>
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative min-h-screen flex items-center justify-center">Validando acceso estatal...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative text-slate-100" style={backgroundStyle}>
      <div className="absolute inset-0 bg-black/45" aria-hidden />

      <div className="relative max-w-7xl mx-auto space-y-6 p-6 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Nivel estatal</p>
            <h1 className="text-3xl font-bold">Plan de Acciones Colegiadas</h1>
            <p className="text-slate-300/80">Definición de seguimiento por nivel de atención</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/colegiados/${consultaId}/formato`} className="text-sm px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-200 hover:border-emerald-300">
              Formato PDF
            </Link>
            <Link href="/colegiados/planes" className="text-sm px-3 py-1.5 rounded-full border border-slate-600 hover:border-slate-400">
              Casos con acciones
            </Link>
            <Link href="/colegiados" className="text-sm px-3 py-1.5 rounded-full border border-slate-600 hover:border-slate-400">
              Volver a colegiados
            </Link>
            {consulta && (
              <Link href={`/estatal/pacientes/${consulta.paciente_id}`} className="text-sm px-3 py-1.5 rounded-full border border-cyan-500/40 text-cyan-200 hover:border-cyan-300">
                Ver expediente estatal
              </Link>
            )}
          </div>
        </header>

        {loading ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            <p className="text-slate-300">Cargando plan colegiado...</p>
          </section>
        ) : error && !consulta ? (
          <section className="rounded-2xl border border-red-500/40 bg-red-950/40 p-6 text-red-200">
            {error}
          </section>
        ) : consulta ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard title="Región / Unidad" value={consulta.region || "—"} note={consulta.unidad || "—"} />
              <MetricCard title="Fecha consulta" value={formatDate(consulta.fecha_consulta)} note={formatDate(consulta.fecha_colegiado, true)} />
              <MetricCard title="Puntaje total" value={`${Number(consulta.puntaje_total_consulta) || 0} pts`} note={Number(consulta.riesgo_25_plus) === 1 ? "Riesgo ≥ 25" : "Riesgo < 25"} />
              <MetricCard title="SDG / Diagnóstico" value={`${consulta.semanas_gestacion ?? consulta.sdg_ingreso ?? "—"}`} note={consulta.diagnostico || "Sin diagnóstico"} />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Observaciones generales</h2>
                    <p className="text-sm text-slate-300/80">Comentarios globales del plan colegiado</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200">
                    {plan?.estatus === "completo" ? "Completo" : "Borrador"}
                  </span>
                </div>
                <textarea
                  value={observaciones}
                  onChange={(event) => {
                    setSaveMessage(null);
                    setObservaciones(event.target.value);
                  }}
                  rows={5}
                  className="mt-4 w-full rounded-2xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                  placeholder="Agrega aquí observaciones generales, acuerdos o notas del colegiado"
                />
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Resumen del plan</h2>
                  <p className="text-sm text-slate-300/80">Control rápido del seguimiento</p>
                </div>
                <MetricMini title="Acciones capturadas" value={String(totalAcciones)} />
                <MetricMini title="Cumplidas" value={String(accionesCompletadas)} />
                <MetricMini title="Última actualización" value={formatDate(plan?.updated_at || null, true)} />
              </div>
            </section>

            <section className="space-y-4">
              {NIVELES.map((nivel) => {
                const items = acciones[nivel.key];
                const isCollapsed = collapsed[nivel.key];
                const completadas = items.filter((i) => i.cumplido).length;
                return (
                  <div key={nivel.key} className={`rounded-2xl border ${nivel.tone}`}>
                    {/* Cabecera siempre visible — actúa como toggle */}
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 p-5 cursor-pointer select-none"
                      onClick={() => toggleCollapsed(nivel.key)}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs text-white transition-transform duration-200"
                          style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                        >
                          ▼
                        </span>
                        <div>
                          <h2 className="text-lg font-semibold">{nivel.title}</h2>
                          <p className="text-xs text-slate-300/70">
                            {items.length === 0
                              ? "Sin acciones"
                              : `${completadas}/${items.length} completadas`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addAction(nivel.key); }}
                        disabled={items.length >= 5}
                        className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Agregar acción
                      </button>
                    </div>

                    {!isCollapsed && <div className="px-5 pb-5 space-y-3">
                      {items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 px-4 py-5 text-sm text-slate-300/80">
                          Sin acciones capturadas en este nivel.
                        </div>
                      ) : (
                        items.map((item, index) => (
                          <div key={`${nivel.key}-${index}-${item.id || "nuevo"}`} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-200">
                                Acción {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAction(nivel.key, index)}
                                className="text-xs rounded-full border border-red-500/30 px-3 py-1 text-red-200 hover:border-red-400/60"
                              >
                                Eliminar
                              </button>
                            </div>

                            <textarea
                              value={item.descripcion}
                              onChange={(event) => updateAction(nivel.key, index, { descripcion: event.target.value })}
                              rows={3}
                              className="mt-3 w-full rounded-2xl border border-slate-600 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                              placeholder="Describe la acción a realizar"
                            />

                            <label className="mt-3 flex items-center gap-3 text-sm text-slate-200">
                              <input
                                type="checkbox"
                                checked={item.cumplido}
                                onChange={(event) => updateAction(nivel.key, index, { cumplido: event.target.checked })}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                              />
                              Cumplimiento realizado
                            </label>

                            <p className="mt-2 text-xs text-slate-400">
                              {item.cumplido
                                ? `Fecha de cumplimiento: ${formatDate(item.fecha_cumplimiento || null, true)}`
                                : "Pendiente de cumplimiento"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>}
                  </div>
                );
              })}
            </section>

            {(error || saveMessage) && (
              <section className={`rounded-2xl border p-4 ${error ? "border-red-500/40 bg-red-950/40 text-red-200" : "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"}`}>
                {error || saveMessage}
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/colegiados")}
                className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-slate-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar plan colegiado"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/65 p-4">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function MetricMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}