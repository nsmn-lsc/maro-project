"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  return { nivel_atencion: nivel, orden, descripcion: "", cumplido: false, fecha_cumplimiento: null };
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
      if ((session.nivel ?? 0) >= 3) {
        router.replace(`/colegiados/${consultaId}`);
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router, consultaId]);

  useEffect(() => {
    if (!authChecked || !consultaId) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/region/colegiados/${consultaId}`, { cache: "no-store" });
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
    return () => { cancelled = true; };
  }, [authChecked, consultaId]);

  const totalAcciones = useMemo(() => {
    return Object.values(acciones).reduce((acc, items) => acc + items.length, 0);
  }, [acciones]);

  const accionesCompletadas = useMemo(() => {
    return Object.values(acciones).flat().filter((item) => item.cumplido).length;
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
      const res = await fetch(`/api/region/colegiados/${consulta.consulta_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
    } catch (err: any) {
      setError(err?.message || "Error al guardar el plan colegiado");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <main className="min-h-dvh relative text-white bg-emerald-950">
        <Image src="/region.png" alt="" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-teal-900/50" aria-hidden />
        <div className="relative min-h-screen flex items-center justify-center">Validando acceso regional...</div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh relative text-white bg-emerald-950">
      <Image src="/region.png" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-teal-900/50" aria-hidden />

      <div className="relative max-w-7xl mx-auto space-y-6 p-6 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/80">Nivel regional</p>
            <h1 className="text-3xl font-bold">Plan de Acciones Colegiadas</h1>
            <p className="text-sm text-emerald-50/70">Definición de seguimiento por nivel de atención</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/region/colegiados" className="text-sm px-3 py-1.5 rounded-full border border-white/20 text-white hover:bg-white/10 transition">
              Volver a colegiados
            </Link>
            {consulta && (
              <Link href={`/region/pacientes/${consulta.paciente_id}`} className="text-sm px-3 py-1.5 rounded-full border border-emerald-400/40 text-emerald-200 hover:border-emerald-300 transition">
                Ver expediente
              </Link>
            )}
          </div>
        </header>

        {loading ? (
          <section className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-6 backdrop-blur-sm">
            <p className="text-emerald-100/80">Cargando plan colegiado...</p>
          </section>
        ) : error && !consulta ? (
          <section className="rounded-2xl border border-red-500/40 bg-red-900/20 p-6 text-red-200">
            {error}
          </section>
        ) : consulta ? (
          <>
            {/* Tarjetas de info */}
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard title="Región / Unidad" value={consulta.region || "—"} note={consulta.unidad || "—"} />
              <MetricCard title="Fecha consulta" value={formatDate(consulta.fecha_consulta)} note={formatDate(consulta.fecha_colegiado, true)} />
              <MetricCard title="Puntaje total" value={`${Number(consulta.puntaje_total_consulta) || 0} pts`} note={Number(consulta.riesgo_25_plus) === 1 ? "Riesgo ≥ 25" : "Riesgo < 25"} />
              <MetricCard title="SDG / Diagnóstico" value={`${consulta.semanas_gestacion ?? consulta.sdg_ingreso ?? "—"}`} note={consulta.diagnostico || "Sin diagnóstico"} />
            </section>

            {/* Observaciones + Resumen */}
            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Observaciones generales</h2>
                    <p className="text-sm text-emerald-100/60">Comentarios globales del plan colegiado</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-emerald-300/25 px-3 py-1 text-xs text-emerald-100/80">
                    {plan?.estatus === "completo" ? "Completo" : "Borrador"}
                  </span>
                </div>
                <textarea
                  value={observaciones}
                  onChange={(event) => { setSaveMessage(null); setObservaciones(event.target.value); }}
                  rows={5}
                  className="mt-4 w-full rounded-2xl border border-emerald-300/20 bg-emerald-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Agrega aquí observaciones generales, acuerdos o notas del colegiado"
                />
              </div>

              <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-5 space-y-4 backdrop-blur-sm">
                <div>
                  <h2 className="text-lg font-semibold">Resumen del plan</h2>
                  <p className="text-sm text-emerald-100/60">Control rápido del seguimiento</p>
                </div>
                <MetricMini title="Acciones capturadas" value={String(totalAcciones)} />
                <MetricMini title="Cumplidas" value={String(accionesCompletadas)} />
                <MetricMini title="Última actualización" value={formatDate(plan?.updated_at || null, true)} />
              </div>
            </section>

            {/* Niveles de atención */}
            <section className="space-y-4">
              {NIVELES.map((nivel) => {
                const items = acciones[nivel.key];
                const isCollapsed = collapsed[nivel.key];
                const completadas = items.filter((i) => i.cumplido).length;
                return (
                  <div key={nivel.key} className={`rounded-2xl border ${nivel.tone} backdrop-blur-sm`}>
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
                          <p className="text-xs text-emerald-100/50">
                            {items.length === 0 ? "Sin acciones" : `${completadas}/${items.length} completadas`}
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
                        <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 px-4 py-5 text-sm text-emerald-100/60">
                          Sin acciones capturadas en este nivel.
                        </div>
                      ) : (
                        items.map((item, index) => (
                          <div key={`${nivel.key}-${index}-${item.id || "nuevo"}`} className="rounded-2xl border border-white/10 bg-emerald-950/50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-emerald-100/80">
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
                              maxLength={500}
                              className="mt-3 w-full rounded-2xl border border-emerald-300/20 bg-emerald-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                              placeholder="Describe la acción a realizar"
                            />
                            <div className="mt-1 flex justify-end">
                              <span className={`text-xs ${item.descripcion.length >= 480 ? "text-rose-400" : "text-emerald-100/40"}`}>
                                {item.descripcion.length} / 500
                              </span>
                            </div>

                            <label className="mt-3 flex items-center gap-3 text-sm text-emerald-100/80">
                              <input
                                type="checkbox"
                                checked={item.cumplido}
                                onChange={(event) => updateAction(nivel.key, index, { cumplido: event.target.checked })}
                                className="h-4 w-4 rounded border-emerald-300/30 bg-emerald-950"
                              />
                              Cumplimiento realizado
                            </label>

                            <p className="mt-2 text-xs text-emerald-100/40">
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

            {/* Mensajes */}
            {(error || saveMessage) && (
              <section className={`rounded-2xl border p-4 ${error ? "border-red-500/40 bg-red-900/20 text-red-200" : "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"}`}>
                {error || saveMessage}
              </section>
            )}

            {/* Botones de acción */}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/region/colegiados")}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
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
    <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-4 backdrop-blur-sm">
      <p className="text-sm text-emerald-100/60">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs text-emerald-100/40">{note}</p>
    </div>
  );
}

function MetricMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/50 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-emerald-100/50">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
