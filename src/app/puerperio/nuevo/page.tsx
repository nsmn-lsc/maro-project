"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SessionInfo = {
  clues?: string;
  unidad?: string;
  region?: string;
  municipio?: string;
};

const initialForm = {
  folio: "",
  complicaciones: "",
  MMEG: false,
  fecha_atencion_evento: "",
  dias_puerperio: "",
  valoracion_riesgo: "",
  apeo_fecha: "",
  apeo_metodo: "",
  datos_alarma: "",
  diagnostico: "",
  plan: "",
  fecha_siguiente_consulta: "",
  referencia: "",
  usuaria_seguimiento: false,
  fecha_atencion_sna_tna: "",
  fecha_contrareferencia: "",
};

function NuevoPuerperioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pacienteId = searchParams?.get("paciente_id");
  const folioExistente = searchParams?.get("folio");

  const [session, setSession] = useState<SessionInfo>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);

        // Si viene folio existente (desde consulta), usarlo
        if (folioExistente) {
          setForm((prev) => ({ ...prev, folio: folioExistente }));
        } else if (parsed.clues) {
          // Si no, generar uno nuevo
          generarFolio(parsed.clues);
        }
      } catch (_) {
        // ignore
      }
    }
  }, [folioExistente]);

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
        created_by: 1,
        updated_by: 1,
      };

      const res = await fetch("/api/puerperio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo guardar");
      }

      const data = await res.json();
      setSuccess(`Registro de puerperio creado con id ${data.id}`);
      
      setTimeout(() => {
        router.push(`/pacientes/${pacienteId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(139,92,246,0.55)), url(/maro-hero.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-14 space-y-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-purple-200/80">Puerperio</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold lg:text-4xl">Nuevo registro de puerperio</h1>
            <span className="text-sm text-purple-100 bg-purple-500/15 border border-purple-500/30 px-3 py-1 rounded-full">
              {session.clues ? `CLUES ${session.clues}` : "Sesión"}
            </span>
          </div>
          {pacienteId && (
            <Link
              href={`/pacientes/${pacienteId}`}
              className="inline-flex text-sm text-purple-200/80 hover:text-white"
            >
              ← Volver al paciente
            </Link>
          )}
        </header>

        {error && <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificación */}
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold">Identificación</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Folio {loadingFolio && "(generando...)"}</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white cursor-not-allowed"
                  value={form.folio}
                  readOnly
                  disabled
                  placeholder={loadingFolio ? "Generando folio..." : "Se generará automáticamente"}
                />
                <p className="text-xs text-slate-300/70">
                  {folioExistente ? "Folio del paciente" : "Generado automáticamente: P-CLUES-###"}
                </p>
              </label>
            </div>
          </section>

          {/* Datos del evento */}
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold">Datos del evento</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha de atención del evento</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fecha_atencion_evento}
                  onChange={(e) => handleChange("fecha_atencion_evento", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Días de puerperio</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.dias_puerperio}
                  onChange={(e) => handleChange("dias_puerperio", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Valoración de riesgo</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.valoracion_riesgo}
                  onChange={(e) => handleChange("valoracion_riesgo", e.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/40 bg-white/10"
                  checked={form.MMEG}
                  onChange={() => handleChange("MMEG", !form.MMEG)}
                />
                <span className="text-slate-100">MMEG (Morbilidad Materna Extremadamente Grave)</span>
              </label>
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-slate-100">Complicaciones</span>
              <textarea
                rows={3}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                value={form.complicaciones}
                onChange={(e) => handleChange("complicaciones", e.target.value)}
                placeholder="Describir complicaciones si las hay"
              />
            </label>
          </section>

          {/* Anticoncepción postevento obstétrico */}
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold">APEO (Anticoncepción Postevento Obstétrico)</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha APEO</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.apeo_fecha}
                  onChange={(e) => handleChange("apeo_fecha", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Método APEO</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.apeo_metodo}
                  onChange={(e) => handleChange("apeo_metodo", e.target.value)}
                  placeholder="Ej. DIU, Implante, etc."
                />
              </label>
            </div>
          </section>

          {/* Diagnóstico y plan */}
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold">Diagnóstico y plan</h2>
            <div className="space-y-4">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Datos de alarma</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.datos_alarma}
                  onChange={(e) => handleChange("datos_alarma", e.target.value)}
                  placeholder="Signos de alarma o complicaciones"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Diagnóstico</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.diagnostico}
                  onChange={(e) => handleChange("diagnostico", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Plan</span>
                <textarea
                  rows={3}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.plan}
                  onChange={(e) => handleChange("plan", e.target.value)}
                  placeholder="Plan de manejo y seguimiento"
                />
              </label>
            </div>
          </section>

          {/* Seguimiento */}
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold">Seguimiento y referencias</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha siguiente consulta</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fecha_siguiente_consulta}
                  onChange={(e) => handleChange("fecha_siguiente_consulta", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha atención SNA/TNA</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fecha_atencion_sna_tna}
                  onChange={(e) => handleChange("fecha_atencion_sna_tna", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha contrarreferencia</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fecha_contrareferencia}
                  onChange={(e) => handleChange("fecha_contrareferencia", e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm pt-6">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/40 bg-white/10"
                  checked={form.usuaria_seguimiento}
                  onChange={() => handleChange("usuaria_seguimiento", !form.usuaria_seguimiento)}
                />
                <span className="text-slate-100">Usuaria en seguimiento</span>
              </label>
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-slate-100">Referencia</span>
              <textarea
                rows={2}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                value={form.referencia}
                onChange={(e) => handleChange("referencia", e.target.value)}
                placeholder="Detalles de referencia a otro nivel"
              />
            </label>
          </section>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-400 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar registro"}
            </button>
            <Link
              href={pacienteId ? `/pacientes/${pacienteId}` : "/dashboard"}
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Cancelar
            </Link>
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
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
          <p className="text-sm text-slate-300">Cargando formulario de puerperio...</p>
        </main>
      }
    >
      <NuevoPuerperioContent />
    </Suspense>
  );
}
