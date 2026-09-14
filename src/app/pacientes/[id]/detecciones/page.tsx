"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Detecciones {
  id?: number;
  paciente_id: number;
  prueba_vih: string | null;
  prueba_vdrl: string | null;
  prueba_hepatitis_c: string | null;
  prueba_vih_t3: string | null;
  prueba_vdrl_t3: string | null;
  prueba_hepatitis_c_t3: string | null;
  fecha_deteccion_t3?: string | null;
  fecha_vih_t3?: string | null;
  fecha_vdrl_t3?: string | null;
  fecha_hepatitis_c_t3?: string | null;
  diabetes_glicemia: string | null;
  violencia: string | null;
}

const initialForm = {
  prueba_vih_t3: "",
  fecha_vih_t3: "",
  prueba_vdrl_t3: "",
  fecha_vdrl_t3: "",
  prueba_hepatitis_c_t3: "",
  fecha_hepatitis_c_t3: "",
};

const VIH_OPTS = ["Reactiva", "No reactiva"];
const VDRL_OPTS = ["Reactiva", "No reactiva"];
const HEP_OPTS = ["Reactiva", "No reactiva"];

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

export default function DeteccionesPage() {
  const params = useParams();
  const router = useRouter();
  const pacienteId = params?.id as string;
  const [authChecked, setAuthChecked] = useState(false);

  const [detecciones, setDetecciones] = useState<Detecciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [pacienteFolio, setPacienteFolio] = useState<string | null>(null);

  // Estados para Modal de Alerta Epidemiológica (Pruebas Reactivas)
  const [showReactivaModal, setShowReactivaModal] = useState(false);
  const [reactivasDetectadas, setReactivasDetectadas] = useState<string[]>([]);

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

  const getReactivasFromForm = (f: typeof initialForm) => {
    const list: string[] = [];
    if (f.prueba_vih_t3 === "Reactiva") list.push("Prueba VIH (3er trimestre)");
    if (f.prueba_vdrl_t3 === "Reactiva") list.push("Prueba VDRL (3er trimestre)");
    if (f.prueba_hepatitis_c_t3 === "Reactiva") list.push("Prueba Hepatitis C (3er trimestre)");
    return list;
  };

  const getReactivasFromData = (d: Detecciones | null) => {
    if (!d) return [];
    const list: string[] = [];
    if (d.prueba_vih_t3 === "Reactiva" || d.prueba_vih === "Reactiva") list.push("Prueba VIH");
    if (d.prueba_vdrl_t3 === "Reactiva" || d.prueba_vdrl === "Reactiva") list.push("Prueba VDRL");
    if (d.prueba_hepatitis_c_t3 === "Reactiva" || d.prueba_hepatitis_c === "Reactiva") list.push("Prueba Hepatitis C");
    return list;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/detecciones?paciente_id=${pacienteId}`);
      if (!res.ok) throw new Error("No se pudieron cargar las detecciones");
      const data = await res.json();
      setDetecciones(data);
      if (data) {
        setForm({
          prueba_vih_t3: data.prueba_vih_t3 || "",
          fecha_vih_t3: data.fecha_vih_t3 ? data.fecha_vih_t3.split("T")[0] : (data.fecha_deteccion_t3 ? data.fecha_deteccion_t3.split("T")[0] : ""),
          prueba_vdrl_t3: data.prueba_vdrl_t3 || "",
          fecha_vdrl_t3: data.fecha_vdrl_t3 ? data.fecha_vdrl_t3.split("T")[0] : (data.fecha_deteccion_t3 ? data.fecha_deteccion_t3.split("T")[0] : ""),
          prueba_hepatitis_c_t3: data.prueba_hepatitis_c_t3 || "",
          fecha_hepatitis_c_t3: data.fecha_hepatitis_c_t3 ? data.fecha_hepatitis_c_t3.split("T")[0] : (data.fecha_deteccion_t3 ? data.fecha_deteccion_t3.split("T")[0] : ""),
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
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (value === "Reactiva") {
        const reactivas = getReactivasFromForm(updated);
        setReactivasDetectadas(reactivas);
        setShowReactivaModal(true);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const reactivas = getReactivasFromForm(form);
    if (reactivas.length > 0) {
      setReactivasDetectadas(reactivas);
      setShowReactivaModal(true);
    }

    try {
      const payload = {
        paciente_id: Number(pacienteId),
        prueba_vih_t3: form.prueba_vih_t3 || null,
        fecha_vih_t3: form.fecha_vih_t3 || null,
        prueba_vdrl_t3: form.prueba_vdrl_t3 || null,
        fecha_vdrl_t3: form.fecha_vdrl_t3 || null,
        prueba_hepatitis_c_t3: form.prueba_hepatitis_c_t3 || null,
        fecha_hepatitis_c_t3: form.fecha_hepatitis_c_t3 || null,
        created_by: 1,
        updated_by: 1,
      };

      const res = await fetch("/api/detecciones", {
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

  return (
    <main className="min-h-screen relative text-slate-900 dark:text-white transition-colors">
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
          backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,118,110,0.65)), url(/maro-hero.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300">
              Paciente{pacienteFolio ? `: ${pacienteFolio}` : ""}
            </p>
            <h1 className="text-3xl font-extrabold lg:text-4xl text-slate-900 dark:text-white tracking-tight">
              Detecciones tercer trimestre
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl">
              Captura el resultado y la fecha de toma independiente de cada prueba del tercer trimestre: VIH, VDRL y Hepatitis C.
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

        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm p-6 space-y-5 shadow-xl transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registrar pruebas del tercer trimestre</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Pruebas de seguimiento durante el tercer trimestre con fecha independiente por prueba
              </p>
            </div>
            <span className="rounded-full border border-amber-300 dark:border-amber-400/40 bg-amber-100 dark:bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-100">
              3er trimestre
            </span>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 p-3.5 text-amber-950 dark:text-amber-50 shadow-sm">
              <span className="mt-0.5 text-lg text-amber-600 dark:text-amber-400">•</span>
              <p className="text-xs sm:text-sm leading-relaxed">
                Puedes registrar el resultado y la fecha de toma individual de cada prueba de laboratorio según se vayan realizando en la paciente.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-flask text-emerald-600 dark:text-emerald-400" />
                  Pruebas de laboratorio
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Tarjeta VIH */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4 space-y-3 transition-colors shadow-sm">
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <i className="fa-solid fa-vial text-emerald-600 dark:text-emerald-400" />
                      Prueba VIH (3er trimestre)
                    </h4>
                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">Resultado</span>
                      <select
                        className="w-full rounded-lg bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/50"
                        value={form.prueba_vih_t3}
                        onChange={(e) => handleChange("prueba_vih_t3", e.target.value)}
                      >
                        <option value="">Selecciona…</option>
                        {VIH_OPTS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">Fecha de toma</span>
                      <input
                        type="date"
                        className="w-full rounded-lg bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/50 dark:[color-scheme:dark]"
                        value={form.fecha_vih_t3}
                        max={today}
                        onChange={(e) => handleChange("fecha_vih_t3", e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Tarjeta VDRL */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4 space-y-3 transition-colors shadow-sm">
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <i className="fa-solid fa-vial-virus text-emerald-600 dark:text-emerald-400" />
                      Prueba VDRL (3er trimestre)
                    </h4>
                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">Resultado</span>
                      <select
                        className="w-full rounded-lg bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/50"
                        value={form.prueba_vdrl_t3}
                        onChange={(e) => handleChange("prueba_vdrl_t3", e.target.value)}
                      >
                        <option value="">Selecciona…</option>
                        {VDRL_OPTS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">Fecha de toma</span>
                      <input
                        type="date"
                        className="w-full rounded-lg bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/50 dark:[color-scheme:dark]"
                        value={form.fecha_vdrl_t3}
                        max={today}
                        onChange={(e) => handleChange("fecha_vdrl_t3", e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Tarjeta Hepatitis C */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4 space-y-3 transition-colors shadow-sm">
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <i className="fa-solid fa-notes-medical text-emerald-600 dark:text-emerald-400" />
                      Prueba Hepatitis C (3er trimestre)
                    </h4>
                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">Resultado</span>
                      <select
                        className="w-full rounded-lg bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/50"
                        value={form.prueba_hepatitis_c_t3}
                        onChange={(e) => handleChange("prueba_hepatitis_c_t3", e.target.value)}
                      >
                        <option value="">Selecciona…</option>
                        {HEP_OPTS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">Fecha de toma</span>
                      <input
                        type="date"
                        className="w-full rounded-lg bg-white dark:bg-white/10 border border-slate-300 dark:border-white/15 px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500/50 dark:[color-scheme:dark]"
                        value={form.fecha_hepatitis_c_t3}
                        max={today}
                        onChange={(e) => handleChange("fecha_hepatitis_c_t3", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer"
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
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm p-6 space-y-5 shadow-xl transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pruebas registradas (3er trimestre)</h2>
            {detecciones ? (
              <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 px-3 py-1 rounded-full">
                ID #{detecciones.id}
              </span>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Cargando…</p>
          ) : !detecciones ||
            (!detecciones.prueba_vih_t3 &&
              !detecciones.prueba_vdrl_t3 &&
              !detecciones.prueba_hepatitis_c_t3 &&
              !detecciones.fecha_vih_t3 &&
              !detecciones.fecha_vdrl_t3 &&
              !detecciones.fecha_hepatitis_c_t3 &&
              !detecciones.fecha_deteccion_t3) ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Aún no hay pruebas del tercer trimestre registradas.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "Prueba VIH (3er trimestre)",
                    resultado: detecciones.prueba_vih_t3,
                    fecha: detecciones.fecha_vih_t3 || detecciones.fecha_deteccion_t3,
                  },
                  {
                    label: "Prueba VDRL (3er trimestre)",
                    resultado: detecciones.prueba_vdrl_t3,
                    fecha: detecciones.fecha_vdrl_t3 || detecciones.fecha_deteccion_t3,
                  },
                  {
                    label: "Prueba Hepatitis C (3er trimestre)",
                    resultado: detecciones.prueba_hepatitis_c_t3,
                    fecha: detecciones.fecha_hepatitis_c_t3 || detecciones.fecha_deteccion_t3,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4 space-y-2 shadow-sm transition-colors"
                  >
                    <span className="text-xs uppercase tracking-wide text-emerald-800 dark:text-emerald-300 font-bold">{item.label}</span>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Resultado:</span>
                      <span
                        className={`text-sm font-bold ${
                          item.resultado === "Reactiva"
                            ? "text-rose-600 dark:text-rose-400 font-extrabold"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {item.resultado || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Fecha de toma:</span>
                      <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200">
                        {formatFechaMostrar(item.fecha)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MODAL DE ALERTA EPIDEMIOLÓGICA - PRUEBA REACTIVA */}
      {showReactivaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border-2 border-rose-500 bg-slate-900 text-white shadow-2xl overflow-hidden">
            {/* Encabezado Rojo */}
            <div className="bg-rose-600 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold uppercase tracking-wide text-white">
                  🚨 Alerta Epidemiológica: Prueba Reactiva
                </h2>
                <p className="text-xs text-rose-100 font-semibold">
                  Protocolo de seguimiento inmediato
                </p>
              </div>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 space-y-5 bg-slate-900">
              {reactivasDetectadas.length > 0 && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 space-y-1">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wide block">
                    Prueba(s) con resultado Reactivo:
                  </span>
                  <ul className="list-disc list-inside text-sm font-bold text-rose-100">
                    {reactivasDetectadas.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-rose-500/50 bg-rose-950/80 p-4 text-center space-y-2 shadow-inner">
                <i className="fa-solid fa-bell-concierge text-3xl text-rose-400 animate-bounce" />
                <p className="text-sm font-black text-rose-100 leading-relaxed uppercase tracking-tight">
                  Informar inmediatamente a enlace zonal y epidemiologia regional, seguimiento normativo hasta descarte o confirmacion
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed text-center">
                Todo resultado reactivo requiere la notificación oportuna para la toma de muestra confirmatoria y la referencia prioritaria.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowReactivaModal(false)}
                  className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2.5 text-sm shadow-lg shadow-rose-600/40 transition-all cursor-pointer"
                >
                  Entendido / Notificado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

