"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface AccionesPreventivas {
  id?: number;
  paciente_id: number;
  td: string | null;
  tdpa: string | null;
  influenza: string | null;
  covid: string | null;
  otras: string | null;
  estomatologia: string | null;
  nutricion: string | null;
}

const initialForm = {
  td: "",
  tdpa: "",
  influenza: "",
  covid: "",
  otras: "",
  estomatologia: "",
  nutricion: "",
};

export default function AccionesPreventivasPage() {
  const params = useParams();
  const router = useRouter();
  const pacienteId = params?.id as string;
  const [authChecked, setAuthChecked] = useState(false);

  const [acciones, setAcciones] = useState<AccionesPreventivas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [pacienteFolio, setPacienteFolio] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { nivel?: number };
      const nivel = parsed.nivel ?? 0;
      if (nivel >= 3) {
        router.replace(`/estatal/pacientes/${pacienteId}`);
        return;
      }
      if (nivel >= 2) {
        router.replace(`/region/pacientes/${pacienteId}`);
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [pacienteId, router]);

  useEffect(() => {
    if (!authChecked) return;

    const loadPaciente = async () => {
      try {
        const res = await fetch(`/api/pacientes?id=${pacienteId}`);
        if (res.ok) {
          const data = await res.json();
          setPacienteFolio(data.folio);
        }
      } catch (err) {
        console.error("Error cargando folio del paciente", err);
      }
    };
    if (pacienteId) loadPaciente();
  }, [authChecked, pacienteId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/acciones?paciente_id=${pacienteId}`);
      if (!res.ok) throw new Error("No se pudieron cargar las acciones preventivas");
      const data = await res.json();
      setAcciones(data);
      if (data) {
        setForm({
          td: data.td || "",
          tdpa: data.tdpa || "",
          influenza: data.influenza || "",
          covid: data.covid || "",
          otras: data.otras || "",
          estomatologia: data.estomatologia || "",
          nutricion: data.nutricion || "",
        });
      } else {
        setForm(initialForm);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    if (pacienteId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, pacienteId]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Validando acceso...
      </main>
    );
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        paciente_id: Number(pacienteId),
        td: form.td || null,
        tdpa: form.tdpa || null,
        influenza: form.influenza || null,
        covid: form.covid || null,
        otras: form.otras || null,
        estomatologia: form.estomatologia || null,
        nutricion: form.nutricion || null,
        created_by: 1,
        updated_by: 1,
      };

      const res = await fetch("/api/acciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = (await res.json().catch(() => ({}))).message || "No se pudo guardar";
        throw new Error(message);
      }

      await load();
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const dateField = (key: keyof typeof form, label: string) => (
    <label className="space-y-1 text-sm">
      <span className="text-slate-100">{label}</span>
      <input
        type="date"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
        value={form[key]}
        onChange={(e) => handleChange(key, e.target.value)}
      />
    </label>
  );

  const displayDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  return (
    <main
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,118,110,0.6)), url(/maro-hero.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/40 mix-blend-multiply" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-14 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-200/80">Paciente{pacienteFolio ? `: ${pacienteFolio}` : ""}</p>
            <h1 className="text-3xl font-bold lg:text-4xl">Acciones preventivas</h1>
            <p className="text-slate-200/80 max-w-3xl">Registra las fechas de aplicación de vacunas y referencias a estomatología y nutrición.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/pacientes/${pacienteId}`}
              className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              ← Detalle paciente
            </Link>
          </div>
        </div>

        {error && <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">{error}</p>}

        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
          <h2 className="text-xl font-semibold">Registrar aplicación</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {dateField("td", "TD")}
              {dateField("tdpa", "TDPA")}
              {dateField("influenza", "INFLUENZA")}
              {dateField("covid", "COVID")}
              {dateField("otras", "Otras")}
              {dateField("estomatologia", "Estomatología (Fecha)")}
              {dateField("nutricion", "Nutrición (Fecha)")}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                onClick={() => setForm(initialForm)}
              >
                Limpiar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Último registro</h2>
            {acciones ? (
              <span className="text-xs text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                ID #{acciones.id}
              </span>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-slate-200/80">Cargando…</p>
          ) : !acciones ? (
            <p className="text-sm text-slate-200/80">Aún no hay registro de acciones preventivas.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[ 
                { label: "TD", value: acciones.td },
                { label: "TDPA", value: acciones.tdpa },
                { label: "INFLUENZA", value: acciones.influenza },
                { label: "COVID", value: acciones.covid },
                { label: "Otras", value: acciones.otras },
                { label: "Estomatología", value: acciones.estomatologia },
                { label: "Nutrición", value: acciones.nutricion },
              ].map((item) => (
                <div key={item.label} className="flex flex-col rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-slate-300/70">{item.label}</span>
                  <span className="text-sm text-white">{displayDate(item.value)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
