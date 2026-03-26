"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Detecciones {
  id?: number;
  paciente_id: number;
  prueba_vih: string | null;
  prueba_vdrl: string | null;
  prueba_hepatitis_c: string | null;
  prueba_vih_t3: string | null;
  prueba_vdrl_t3: string | null;
  prueba_hepatitis_c_t3: string | null;
  diabetes_glicemia: string | null;
  violencia: string | null;
}

const initialForm = {
  prueba_vih_t3: "",
  prueba_vdrl_t3: "",
  prueba_hepatitis_c_t3: "",
};

const VIH_OPTS = ["Reactiva", "No reactiva"];
const VDRL_OPTS = ["Reactiva", "No reactiva"];
const HEP_OPTS = ["Reactiva", "No reactiva"];

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
      const res = await fetch(`/api/detecciones?paciente_id=${pacienteId}`);
      if (!res.ok) throw new Error("No se pudieron cargar las detecciones");
      const data = await res.json();
      setDetecciones(data);
      if (data) {
        setForm({
          prueba_vih_t3: data.prueba_vih_t3 || "",
          prueba_vdrl_t3: data.prueba_vdrl_t3 || "",
          prueba_hepatitis_c_t3: data.prueba_hepatitis_c_t3 || "",
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
        prueba_vih_t3: form.prueba_vih_t3 || null,
        prueba_vdrl_t3: form.prueba_vdrl_t3 || null,
        prueba_hepatitis_c_t3: form.prueba_hepatitis_c_t3 || null,
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

  const selectField = (key: keyof typeof form, label: string, options: string[], required = true) => (
    <label className="space-y-1 text-sm">
      <span className="text-slate-100">{label}</span>
      <select
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
        value={form[key]}
        onChange={(e) => handleChange(key, e.target.value)}
        required={required}
      >
        <option value="">Selecciona…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );

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
            <h1 className="text-3xl font-bold lg:text-4xl">Detecciones tercer trimestre</h1>
            <p className="text-slate-200/80 max-w-3xl">
              Captura las pruebas de seguimiento del tercer trimestre: VIH, VDRL y Hepatitis C.
            </p>
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Registrar pruebas del tercer trimestre</h2>
              <p className="text-sm text-slate-200/70 mt-1">Pruebas de seguimiento durante el tercer trimestre</p>
            </div>
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
              3er trimestre
            </span>
          </div>
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-50">
              <span className="mt-0.5 text-lg">•</span>
              <p className="text-sm">Captura las pruebas de VIH, VDRL y Hepatitis C de seguimiento durante el tercer trimestre del embarazo.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Pruebas de laboratorio</h3>
                <div className="grid gap-4 lg:grid-cols-3">
                  {selectField("prueba_vih_t3", "Prueba VIH (3er trimestre)", VIH_OPTS, false)}
                  {selectField("prueba_vdrl_t3", "Prueba VDRL (3er trimestre)", VDRL_OPTS, false)}
                  {selectField("prueba_hepatitis_c_t3", "Prueba Hepatitis C (3er trimestre)", HEP_OPTS, false)}
                </div>
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
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pruebas registradas (3er trimestre)</h2>
            {detecciones ? (
              <span className="text-xs text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                ID #{detecciones.id}
              </span>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-slate-200/80">Cargando…</p>
          ) : !detecciones || (!detecciones.prueba_vih_t3 && !detecciones.prueba_vdrl_t3 && !detecciones.prueba_hepatitis_c_t3) ? (
            <p className="text-sm text-slate-200/80">Aún no hay pruebas del tercer trimestre registradas.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[ 
                  { label: "Prueba VIH (3er trimestre)", value: detecciones.prueba_vih_t3 },
                  { label: "Prueba VDRL (3er trimestre)", value: detecciones.prueba_vdrl_t3 },
                  { label: "Prueba Hepatitis C (3er trimestre)", value: detecciones.prueba_hepatitis_c_t3 },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-xs uppercase tracking-wide text-slate-300/70">{item.label}</span>
                    <span className="text-sm text-white">{item.value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
