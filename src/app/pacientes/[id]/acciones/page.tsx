"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

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

function formatFechaMostrar(fecha: string | null | undefined) {
  if (!fecha) return "—";
  const clean = fecha.includes("T") ? fecha.split("T")[0] : fecha;
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return fecha;
}

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
          td: data.td ? data.td.split("T")[0] : "",
          tdpa: data.tdpa ? data.tdpa.split("T")[0] : "",
          influenza: data.influenza ? data.influenza.split("T")[0] : "",
          covid: data.covid ? data.covid.split("T")[0] : "",
          otras: data.otras ? data.otras.split("T")[0] : "",
          estomatologia: data.estomatologia ? data.estomatologia.split("T")[0] : "",
          nutricion: data.nutricion ? data.nutricion.split("T")[0] : "",
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
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
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

  const today = new Date().toISOString().split("T")[0];

  const dateInputCard = (key: keyof typeof form, label: string, iconClass: string) => (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4 space-y-2 transition-colors shadow-sm">
      <label className="block space-y-1.5 text-sm">
        <span className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
          <i className={`${iconClass} text-amber-600 dark:text-amber-400`} />
          {label}
        </span>
        <input
          type="date"
          className="w-full rounded-lg bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500/50 dark:[color-scheme:dark]"
          value={form[key]}
          max={today}
          onChange={(e) => handleChange(key, e.target.value)}
        />
      </label>
      {key === "estomatologia" && Boolean(form.estomatologia) && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/50 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in">
          <i className="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400 shrink-0 text-sm" />
          <span>Atención estrecha y continua en 1er Nivel de Atención</span>
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen relative text-slate-900 dark:text-white transition-colors">
      {/* CAPA DE FONDO FIJA - MODO CLARO */}
      <div
        className="fixed inset-0 z-0 dark:hidden"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(241, 245, 249, 0.88), rgba(254, 243, 199, 0.75)), url(/maro-hero.png)",
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
          backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(180,83,9,0.35)), url(/maro-hero.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300">
              Paciente{pacienteFolio ? `: ${pacienteFolio}` : ""}
            </p>
            <h1 className="text-3xl font-extrabold lg:text-4xl text-slate-900 dark:text-white tracking-tight">
              Acciones preventivas
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl">
              Registra las fechas de aplicación de esquema de vacunas y referencias a servicios multidisciplinarios (estomatología y nutrición).
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <ThemeToggle />
            <Link
              href={`/pacientes/${pacienteId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/90 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-white shadow-sm transition-all"
            >
              ← Detalle paciente
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-200 flex items-center gap-2 shadow-sm">
            <span>🚨</span> {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm p-6 space-y-6 shadow-xl transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-heart text-amber-600 dark:text-amber-400" />
                Registrar aplicación y consultas
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Fechas de vacunas y valoraciones estomatológicas y de nutrición
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* GRUPO 1: INMUNIZACIONES (VACUNACIÓN) */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-syringe text-amber-600 dark:text-amber-400" />
                Esquema de Vacunación
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dateInputCard("td", "Vacuna TD", "fa-solid fa-shield-halved")}
                {dateInputCard("tdpa", "Vacuna TDPA", "fa-solid fa-shield-halved")}
                {dateInputCard("influenza", "Vacuna Influenza", "fa-solid fa-virus-slash")}
                {dateInputCard("covid", "Vacuna COVID", "fa-solid fa-virus-covid")}
                {dateInputCard("otras", "Otras Vacunas", "fa-solid fa-syringe")}
              </div>
            </div>

            {/* GRUPO 2: VALORACIONES MULTIDISCIPLINARIAS */}
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-user-doctor text-amber-600 dark:text-amber-400" />
                Atención Multidisciplinaria
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dateInputCard("estomatologia", "Consulta Estomatología", "fa-solid fa-tooth")}
                {dateInputCard("nutricion", "Consulta Nutrición", "fa-solid fa-apple-whole")}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="submit"
                className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold px-5 py-2.5 text-sm shadow-md shadow-amber-600/20 transition-all disabled:opacity-60 cursor-pointer"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                onClick={() => setForm(initialForm)}
              >
                Limpiar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm p-6 space-y-5 shadow-xl transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-history text-amber-600 dark:text-amber-400" />
              Histórico de acciones registradas
            </h2>
            {acciones ? (
              <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 px-3 py-1 rounded-full">
                ID #{acciones.id}
              </span>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Cargando…</p>
          ) : !acciones ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Aún no hay registro de acciones preventivas.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Vacuna TD", value: acciones.td, icon: "fa-solid fa-shield-halved", isEstomatologia: false },
                { label: "Vacuna TDPA", value: acciones.tdpa, icon: "fa-solid fa-shield-halved", isEstomatologia: false },
                { label: "Vacuna INFLUENZA", value: acciones.influenza, icon: "fa-solid fa-virus-slash", isEstomatologia: false },
                { label: "Vacuna COVID", value: acciones.covid, icon: "fa-solid fa-virus-covid", isEstomatologia: false },
                { label: "Otras Vacunas", value: acciones.otras, icon: "fa-solid fa-syringe", isEstomatologia: false },
                { label: "Consulta Estomatología", value: acciones.estomatologia, icon: "fa-solid fa-tooth", isEstomatologia: true },
                { label: "Consulta Nutrición", value: acciones.nutricion, icon: "fa-solid fa-apple-whole", isEstomatologia: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4 space-y-2 shadow-sm transition-colors"
                >
                  <span className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                    <i className={`${item.icon} text-amber-600 dark:text-amber-400`} />
                    {item.label}
                  </span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fecha de aplicación:</span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {formatFechaMostrar(item.value)}
                    </span>
                  </div>
                  {item.isEstomatologia && Boolean(item.value) && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                      <i className="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Atención estrecha y continua en 1er Nivel de Atención</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

