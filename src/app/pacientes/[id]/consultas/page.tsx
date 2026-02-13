"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Consulta {
  id: number;
  paciente_id: number;
  fecha_consulta: string | null;
  ta_sistolica: number | null;
  ta_diastolica: number | null;
  frecuencia_cardiaca: number | null;
  indice_choque: number | null;
  frecuencia_respiratoria: number | null;
  temperatura: number | null;
  fondo_uterino_acorde_sdg: 0 | 1;
  ivu_repeticion: 0 | 1;
  reclasificacion_ro: number | null;
  alarma_obstetrica: string | null;
  diagnostico: string | null;
  plan: string | null;
  fecha_referencia: string | null;
  area_referencia: string | null;
  notas: string | null;
  created_at?: string;
}

const initialForm = {
  fecha_consulta: "",
  ta_sistolica: "",
  ta_diastolica: "",
  frecuencia_cardiaca: "",
  indice_choque: "",
  frecuencia_respiratoria: "",
  temperatura: "",
  fondo_uterino_acorde_sdg: false,
  ivu_repeticion: false,
  reclasificacion_ro: "",
  alarma_obstetrica: "",
  diagnostico: "",
  plan: "",
  fecha_referencia: "",
  area_referencia: "",
  notas: "",
};

export default function ConsultasPaciente() {
  const params = useParams();
  const router = useRouter();
  const pacienteId = params?.id as string;

  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [showPuerperioModal, setShowPuerperioModal] = useState(false);
  const [pendingPuerperioRedirect, setPendingPuerperioRedirect] = useState<string | null>(null);
  const [pacienteFolio, setPacienteFolio] = useState<string | null>(null);
  const [pacienteData, setPacienteData] = useState<{
    factor_riesgo_antecedentes: number;
    factor_riesgo_tamizajes: number;
    semanas_gestacion: number;
  }>({ factor_riesgo_antecedentes: 0, factor_riesgo_tamizajes: 0, semanas_gestacion: 0 });
  const [minimizarRiesgo, setMinimizarRiesgo] = useState(false);

  // Validaciones de signos vitales - ROJAS (críticas)
  const taSistolicaNumber = form.ta_sistolica === "" ? null : Number(form.ta_sistolica);
  const taSistolicaAlerta = taSistolicaNumber !== null && (taSistolicaNumber < 89 || taSistolicaNumber > 160);
  
  const taDiastolicaNumber = form.ta_diastolica === "" ? null : Number(form.ta_diastolica);
  const taDiastolicaAlerta = taDiastolicaNumber !== null && (taDiastolicaNumber <= 50 || taDiastolicaNumber >= 110);
  
  const frecuenciaCardiacaNumber = form.frecuencia_cardiaca === "" ? null : Number(form.frecuencia_cardiaca);
  const frecuenciaCardiacaAlerta = frecuenciaCardiacaNumber !== null && (frecuenciaCardiacaNumber < 60 || frecuenciaCardiacaNumber > 100);
  
  const indiceChoqueNumber = form.indice_choque === "" ? null : Number(form.indice_choque);
  const indiceChoqueAlerta = indiceChoqueNumber !== null && indiceChoqueNumber > 0.8;
  
  const frecuenciaRespiratoriaNumber = form.frecuencia_respiratoria === "" ? null : Number(form.frecuencia_respiratoria);
  const frecuenciaRespiratoriaAlerta = frecuenciaRespiratoriaNumber !== null && (frecuenciaRespiratoriaNumber < 16 || frecuenciaRespiratoriaNumber > 20);
  
  const temperaturaNumber = form.temperatura === "" ? null : Number(form.temperatura);
  const temperaturaAlerta = temperaturaNumber !== null && (temperaturaNumber < 36 || temperaturaNumber > 39);

  const reclasificacionRoNumber = form.reclasificacion_ro === "" ? 0 : Number(form.reclasificacion_ro);
  const puntajeRiesgoTotal = (pacienteData.factor_riesgo_antecedentes || 0) + (pacienteData.factor_riesgo_tamizajes || 0) + (Number.isNaN(reclasificacionRoNumber) ? 0 : reclasificacionRoNumber);

  // Validaciones AMARILLAS (advertencia) - solo si no está en rojo
  const taSistolicaAdvertencia = taSistolicaNumber !== null && !taSistolicaAlerta && (taSistolicaNumber >= 140 && taSistolicaNumber <= 159);
  const taDiastolicaAdvertencia = taDiastolicaNumber !== null && !taDiastolicaAlerta && (taDiastolicaNumber >= 90 && taDiastolicaNumber <= 109);
  const indiceChoqueAdvertencia = indiceChoqueNumber !== null && !indiceChoqueAlerta && (indiceChoqueNumber >= 0.7 && indiceChoqueNumber <= 0.8);
  const temperaturaAdvertencia = temperaturaNumber !== null && !temperaturaAlerta && (temperaturaNumber >= 37.5 && temperaturaNumber <= 38.9);

  useEffect(() => {
    const loadPaciente = async () => {
      try {
        const res = await fetch(`/api/pacientes?id=${pacienteId}`);
        if (res.ok) {
          const data = await res.json();
          console.log('📊 Datos del paciente desde API:', data);
          console.log('📊 Factor riesgo antecedentes:', data.factor_riesgo_antecedentes);
          setPacienteFolio(data.folio);
          setPacienteData({
            factor_riesgo_antecedentes: data.factor_riesgo_antecedentes || 0,
            factor_riesgo_tamizajes: data.factor_riesgo_tamizajes || 0,
            semanas_gestacion: data.semanas_gestacion || 0,
          });
        }
      } catch (err) {
        console.error("Error cargando datos del paciente", err);
      }
    };
    if (pacienteId) loadPaciente();
  }, [pacienteId]);

  const loadConsultas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultas?paciente_id=${pacienteId}`);
      if (!res.ok) throw new Error("No se pudieron cargar las consultas");
      const data = await res.json();
      setConsultas(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pacienteId) loadConsultas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const formatDiagnostico = (value: string | null) => {
    if (!value) return "—";
    const diagnosticos: Record<string, string> = {
      seguimiento_embarazo: "Seguimiento de embarazo",
      puerperio: "Puerperio",
    };
    return diagnosticos[value] || value;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const numOrNull = (val: string) => (val === "" ? null : Number(val));
      const payload = {
        paciente_id: Number(pacienteId),
        fecha_consulta: form.fecha_consulta || null,
        ta_sistolica: numOrNull(form.ta_sistolica),
        ta_diastolica: numOrNull(form.ta_diastolica),
        frecuencia_cardiaca: numOrNull(form.frecuencia_cardiaca),
        indice_choque: numOrNull(form.indice_choque),
        frecuencia_respiratoria: numOrNull(form.frecuencia_respiratoria),
        temperatura: numOrNull(form.temperatura),
        fondo_uterino_acorde_sdg: form.fondo_uterino_acorde_sdg,
        ivu_repeticion: form.ivu_repeticion,
        reclasificacion_ro: form.reclasificacion_ro === "" ? null : Number(form.reclasificacion_ro),
        alarma_obstetrica: form.alarma_obstetrica || null,
        diagnostico: form.diagnostico || null,
        plan: form.plan || null,
        fecha_referencia: form.fecha_referencia || null,
        area_referencia: form.area_referencia || null,
        notas: form.notas || null,
        created_by: 1,
        updated_by: 1,
      };

      const res = await fetch("/api/consultas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = (await res.json().catch(() => ({}))).message || "No se pudo guardar";
        throw new Error(message);
      }

      // Si el diagnóstico es puerperio, mostrar modal y preparar redirección
      if (form.diagnostico === "puerperio") {
        // Obtener el folio del paciente actual
        const pacienteRes = await fetch(`/api/pacientes?id=${pacienteId}`);
        if (pacienteRes.ok) {
          const pacienteData = await pacienteRes.json();
          const folioPaciente = pacienteData.folio;
          setPendingPuerperioRedirect(`/puerperio/nuevo?paciente_id=${pacienteId}&folio=${folioPaciente}`);
        } else {
          setPendingPuerperioRedirect(`/puerperio/nuevo?paciente_id=${pacienteId}`);
        }
        setShowPuerperioModal(true);
        return;
      }

      setForm(initialForm);
      await loadConsultas();
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
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <h1 className="text-3xl font-bold lg:text-4xl">Consultas y seguimiento</h1>
              {(pacienteData.factor_riesgo_antecedentes > 0 || pacienteData.factor_riesgo_tamizajes > 0) && (
                <div className="flex gap-2 flex-wrap">
                  {pacienteData.factor_riesgo_antecedentes > 0 && (
                    <div className={`px-4 py-2 rounded-full font-bold text-sm border-2 backdrop-blur-sm ${
                  pacienteData.factor_riesgo_antecedentes <= 3 ? 'bg-green-500/20 text-green-100 border-green-400/60' :
                  pacienteData.factor_riesgo_antecedentes <= 9 ? 'bg-amber-500/20 text-amber-100 border-amber-400/60' :
                  pacienteData.factor_riesgo_antecedentes <= 25 ? 'bg-orange-500/20 text-orange-100 border-orange-400/60' :
                  'bg-red-500/20 text-red-100 border-red-500/60'
                }`}>
                      🚨 Antecedentes: {pacienteData.factor_riesgo_antecedentes} pts
                    </div>
                  )}
                  {pacienteData.factor_riesgo_tamizajes > 0 && (
                    <div className={`px-4 py-2 rounded-full font-bold text-sm border-2 backdrop-blur-sm ${
                      pacienteData.factor_riesgo_tamizajes === 0 ? 'bg-green-500/20 text-green-100 border-green-400/60' :
                      'bg-amber-500/20 text-amber-100 border-amber-400/60'
                    }`}>
                      ⚠️ Tamizajes: {pacienteData.factor_riesgo_tamizajes} pts
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-slate-200/80 max-w-3xl mt-2">Captura de consultas prenatales y seguimiento clínico.</p>
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

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          {/* Formulario principal */}
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold">Nueva consulta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha de consulta *</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fecha_consulta}
                  onChange={(e) => handleChange("fecha_consulta", e.target.value)}
                  required
                />
              </label>
              <label className={`space-y-1 text-sm max-w-[170px] ${taSistolicaAlerta ? "text-red-100" : taSistolicaAdvertencia ? "text-amber-100" : ""}`}>
                <span className="text-slate-100">T/A Sistólica (mmHg)</span>
                <input
                  type="number"
                  className={taSistolicaAlerta 
                    ? "w-full rounded-lg border-2 border-red-400 bg-red-500/20 px-3 py-2 text-white"
                    : taSistolicaAdvertencia
                    ? "w-full rounded-lg border-2 border-amber-400 bg-amber-500/20 px-3 py-2 text-white"
                    : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  }
                  value={form.ta_sistolica}
                  onChange={(e) => handleChange("ta_sistolica", e.target.value)}
                  placeholder="Ej. 110"
                />
              </label>
              <label className={`space-y-1 text-sm max-w-[170px] ${taDiastolicaAlerta ? "text-red-100" : taDiastolicaAdvertencia ? "text-amber-100" : ""}`}>
                <span className="text-slate-100">T/A Diastólica (mmHg)</span>
                <input
                  type="number"
                  className={taDiastolicaAlerta
                    ? "w-full rounded-lg border-2 border-red-400 bg-red-500/20 px-3 py-2 text-white"
                    : taDiastolicaAdvertencia
                    ? "w-full rounded-lg border-2 border-amber-400 bg-amber-500/20 px-3 py-2 text-white"
                    : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  }
                  value={form.ta_diastolica}
                  onChange={(e) => handleChange("ta_diastolica", e.target.value)}
                  placeholder="Ej. 70"
                />
              </label>
              <label className={`space-y-1 text-sm max-w-[170px] ${frecuenciaCardiacaAlerta ? "text-red-100" : ""}`}>
                <span className="text-slate-100">Frecuencia cardiaca (lpm)</span>
                <input
                  type="number"
                  className={frecuenciaCardiacaAlerta
                    ? "w-full rounded-lg border-2 border-red-400 bg-red-500/20 px-3 py-2 text-white"
                    : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  }
                  value={form.frecuencia_cardiaca}
                  onChange={(e) => handleChange("frecuencia_cardiaca", e.target.value)}
                  placeholder="Ej. 82"
                />
              </label>
              <label className={`space-y-1 text-sm max-w-[170px] ${indiceChoqueAlerta ? "text-red-100" : indiceChoqueAdvertencia ? "text-amber-100" : ""}`}>
                <span className="text-slate-100">Índice de choque (FC/TAS)</span>
                <input
                  type="number"
                  step="0.01"
                  className={indiceChoqueAlerta
                    ? "w-full rounded-lg border-2 border-red-400 bg-red-500/20 px-3 py-2 text-white"
                    : indiceChoqueAdvertencia
                    ? "w-full rounded-lg border-2 border-amber-400 bg-amber-500/20 px-3 py-2 text-white"
                    : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  }
                  value={form.indice_choque}
                  onChange={(e) => handleChange("indice_choque", e.target.value)}
                  placeholder="Ej. 0.7"
                />
              </label>
              <label className={`space-y-1 text-sm max-w-[170px] ${frecuenciaRespiratoriaAlerta ? "text-red-100" : ""}`}>
                <span className="text-slate-100">Frecuencia respiratoria</span>
                <input
                  type="number"
                  className={frecuenciaRespiratoriaAlerta
                    ? "w-full rounded-lg border-2 border-red-400 bg-red-500/20 px-3 py-2 text-white"
                    : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  }
                  value={form.frecuencia_respiratoria}
                  onChange={(e) => handleChange("frecuencia_respiratoria", e.target.value)}
                  placeholder="Ej. 18"
                />
              </label>
              <label className={`space-y-1 text-sm max-w-[170px] ${temperaturaAlerta ? "text-red-100" : temperaturaAdvertencia ? "text-amber-100" : ""}`}>
                <span className="text-slate-100">Temperatura (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  className={temperaturaAlerta
                    ? "w-full rounded-lg border-2 border-red-400 bg-red-500/20 px-3 py-2 text-white"
                    : temperaturaAdvertencia
                    ? "w-full rounded-lg border-2 border-amber-400 bg-amber-500/20 px-3 py-2 text-white"
                    : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  }
                  value={form.temperatura}
                  onChange={(e) => handleChange("temperatura", e.target.value)}
                  placeholder="Ej. 36.7"
                />
              </label>
              <div className="flex flex-col gap-2 pt-6 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/40 bg-white/10"
                    checked={form.fondo_uterino_acorde_sdg}
                    onChange={() => handleChange("fondo_uterino_acorde_sdg", !form.fondo_uterino_acorde_sdg)}
                  />
                  <span className="text-slate-100">Fondo uterino acorde a SDG</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/40 bg-white/10"
                    checked={form.ivu_repeticion}
                    onChange={() => handleChange("ivu_repeticion", !form.ivu_repeticion)}
                  />
                  <span className="text-slate-100">IVU o cervicovaginitis de repetición</span>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Reclasificación de RO (ALTO 4-9, MUY ALTO ≥10)</span>
                <input
                  type="number"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.reclasificacion_ro}
                  onChange={(e) => handleChange("reclasificacion_ro", e.target.value)}
                  placeholder="Ej. 6"
                />
              </label>
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-100">Presenta datos de alarma obstétrica (Si / menciónelos)</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.alarma_obstetrica}
                  onChange={(e) => handleChange("alarma_obstetrica", e.target.value)}
                  placeholder="Describir signos de alarma"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Diagnóstico</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.diagnostico}
                  onChange={(e) => handleChange("diagnostico", e.target.value)}
                >
                  <option value="">Seleccione un diagnóstico</option>
                  <option value="seguimiento_embarazo">Seguimiento de embarazo</option>
                  <option value="puerperio">Puerperio</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Plan</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.plan}
                  onChange={(e) => handleChange("plan", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha de referencia a 2º o 3º nivel</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fecha_referencia}
                  onChange={(e) => handleChange("fecha_referencia", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Área de referencia a 2º o 3º nivel</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.area_referencia}
                  onChange={(e) => handleChange("area_referencia", e.target.value)}
                  placeholder="Ej. Gineco-obstetricia"
                />
              </label>
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-100">Notas adicionales</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.notas}
                  onChange={(e) => handleChange("notas", e.target.value)}
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar consulta"}
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

        {/* Espacio reservado para la segunda columna */}
        <aside className="space-y-4" />
      </div>

      {/* Badge flotante de riesgo total (antecedentes + consulta) */}
      <div className="fixed bottom-6 right-6 z-40">
        {minimizarRiesgo ? (
          <button
            type="button"
            onClick={() => setMinimizarRiesgo(false)}
            className={`rounded-full border-2 px-4 py-2 shadow-2xl backdrop-blur-sm text-sm font-semibold ${
              puntajeRiesgoTotal <= 3 ? 'bg-green-500/20 text-green-100 border-green-400/60' :
              puntajeRiesgoTotal <= 9 ? 'bg-amber-500/20 text-amber-100 border-amber-400/60' :
              puntajeRiesgoTotal <= 25 ? 'bg-orange-500/20 text-orange-100 border-orange-400/60' :
              'bg-red-500/20 text-red-100 border-red-500/60'
            }`}
          >
            Riesgo: {puntajeRiesgoTotal} pts
          </button>
        ) : (
          <div className={`rounded-2xl border-2 p-4 shadow-2xl backdrop-blur-sm max-w-[300px] ${
            puntajeRiesgoTotal <= 3 ? 'bg-green-500/20 border-green-400/60' :
            puntajeRiesgoTotal <= 9 ? 'bg-amber-500/20 border-amber-400/60' :
            puntajeRiesgoTotal <= 25 ? 'bg-orange-500/20 border-orange-400/60' :
            'bg-red-500/20 border-red-500/60'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-200/90">Riesgo Total: Antecedentes + Tamizajes + Consulta</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{puntajeRiesgoTotal}</span>
                  <span className="text-xs text-slate-200/80">puntos</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                puntajeRiesgoTotal <= 3 ? 'bg-green-100 text-green-800' :
                puntajeRiesgoTotal <= 9 ? 'bg-amber-100 text-amber-800' :
                puntajeRiesgoTotal <= 25 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {puntajeRiesgoTotal <= 3 ? 'BAJO' :
                 puntajeRiesgoTotal <= 9 ? 'ALTO' :
                 puntajeRiesgoTotal <= 25 ? 'MUY ALTO' : 'CRÍTICO'}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-200/90 space-y-1">
              <div className="flex justify-between gap-6">
                <span>Antecedentes:</span>
                <span>{pacienteData.factor_riesgo_antecedentes || 0} pts</span>
              </div>
              <div className="flex justify-between gap-6">
                <span>Tamizajes:</span>
                <span>{pacienteData.factor_riesgo_tamizajes || 0} pts</span>
              </div>
              <div className="flex justify-between gap-6">
                <span>Consulta (RO):</span>
                <span>{Number.isNaN(reclasificacionRoNumber) ? 0 : reclasificacionRoNumber} pts</span>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setMinimizarRiesgo(true)}
                className="text-xs text-slate-200/80 hover:text-white"
              >
                Minimizar
              </button>
            </div>
          </div>
        )}
      </div>

        <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Historial de consultas</h2>
            <span className="text-xs text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              {consultas.length} registro(s)
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-200/80">Cargando…</p>
          ) : consultas.length === 0 ? (
            <p className="text-sm text-slate-200/80">Aún no hay consultas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-slate-100/80">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">RO</th>
                    <th className="py-2 pr-4">Alarma</th>
                    <th className="py-2 pr-4">Diagnóstico</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {consultas.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5">
                      <td className="py-2 pr-4 text-white">{formatDate(c.fecha_consulta)}</td>
                      <td className="py-2 pr-4 text-slate-100/80">{c.reclasificacion_ro ?? "—"}</td>
                      <td className="py-2 pr-4 text-slate-100/80">{c.alarma_obstetrica || "—"}</td>
                      <td className="py-2 pr-4 text-slate-100/80">{formatDiagnostico(c.diagnostico)}</td>
                      <td className="py-2 pr-4 text-slate-100/80">{c.plan || "—"}</td>
                      <td className="py-2 pr-4 text-slate-100/80">
                        {c.fecha_referencia ? formatDate(c.fecha_referencia) : "—"}
                        {c.area_referencia ? ` · ${c.area_referencia}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal de confirmación para puerperio */}
      {showPuerperioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900/95 to-purple-800/95 backdrop-blur-lg border border-purple-300/30 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-400/20 flex items-center justify-center text-purple-200 text-2xl">
                🤰
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Diagnóstico: Puerperio</h3>
                <p className="text-sm text-purple-100/80">Captura adicional requerida</p>
              </div>
            </div>
            
            <div className="bg-purple-950/30 border border-purple-300/20 rounded-lg p-4">
              <p className="text-white/90 text-sm leading-relaxed">
                Has registrado un diagnóstico de <strong className="text-purple-200">Puerperio</strong>. 
                Serás redirigido a un formulario específico para capturar los datos adicionales 
                requeridos para el seguimiento de puerperio.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPuerperioModal(false);
                  setPendingPuerperioRedirect(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (pendingPuerperioRedirect) {
                    router.push(pendingPuerperioRedirect);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 transition-colors"
              >
                Continuar →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
