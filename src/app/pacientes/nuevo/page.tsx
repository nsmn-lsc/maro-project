"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ContadorRiesgo from "@/app/components/ContadorRiesgo";
import { useSaveFactorRiesgoPaciente } from "@/lib/hooks/useSaveFactorRiesgoPaciente";

type SessionInfo = {
  clues?: string;
  unidad?: string;
  region?: string;
  municipio?: string;
};

export default function NuevoPaciente() {
  const router = useRouter();
  const { guardar: guardarFactorRiesgo } = useSaveFactorRiesgoPaciente();
  const [session, setSession] = useState<SessionInfo>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [mostrarFactoresRiesgo, setMostrarFactoresRiesgo] = useState(false);
  const [mostrarFactoresEpid, setMostrarFactoresEpid] = useState(false);
  const [puntajeFactorAntecedentes, setPuntajeFactorAntecedentes] = useState(0);
  const [puntajeFactorTamizajes, setPuntajeFactorTamizajes] = useState(0);

  const [form, setForm] = useState({
    // Identidad
    nombre_completo: "",
    curp: "",
    edad: "",
    indigena: false,
    folio: "",
    region: "",
    clues_id: "",
    unidad: "",
    municipio: "",
    localidad: "",
    colonia: "",
    direccion: "",
    telefono: "",

    // Red de apoyo
    madrina_nombre: "",
    madrina_telefono: "",

    // Ubicación y traslado
    tipo_localidad: "Urbana",
    hospital_referencia: "",
    mecanismo_traslado: "Personal",

    // Ingreso y riesgo
    fecha_ingreso_cpn: "",
    fum: "",
    fpp: "",
    semanas_gestacion: "",
    sdg_ingreso: "",
    riesgo_obstetrico_ingreso: "",
    tipo_riesgo_social: "Bajo",
    factores_riesgo_epid: "ninguno",
    imc_inicial: "",
    ganancia_ponderal_max: "",

    // Factores de riesgo (comorbilidades y toxicomanías)
    factor_diabetes: false,
    factor_hipertension: false,
    factor_obesidad: false,
    factor_cardiopatia: false,
    factor_hepatopatia: false,
    factor_enf_autoinmune: false,
    factor_nefropatia: false,
    factor_coagulopatias: false,
    factor_neuropatia: false,
    factor_enf_psiquiatrica: false,
    factor_alcoholismo: false,
    factor_tabaquismo: false,
    factor_drogas_ilicitas: false,

    // Antecedentes gineco-obstétricos
    menarca: "",
    gestas: "",
    partos: "",
    cesareas: "",
    abortos: "",
    ant_preeclampsia: false,
    ant_hemorragia: false,
    ant_sepsis: false,
    ant_bajo_peso_macrosomia: false,
    ant_muerte_perinatal: false,

    // Tamizajes iniciales (detecciones primer contacto)
    prueba_vih: "",
    prueba_vdrl: "",
    prueba_hepatitis_c: "",
    diabetes_glicemia: "",
    violencia: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        setForm((prev) => ({
          ...prev,
          clues_id: parsed.clues || prev.clues_id,
          unidad: parsed.unidad || prev.unidad,
          municipio: parsed.municipio || prev.municipio,
          region: parsed.region || prev.region,
        }));
        
        // Generar folio automáticamente basado en CLUES
        if (parsed.clues) {
          generarFolio(parsed.clues);
        }
      } catch (_) {
        // ignore
      }
    }
  }, []);

  const generarFolio = async (cluesId: string) => {
    setLoadingFolio(true);
    try {
      const res = await fetch(`/api/pacientes?action=generar-folio&clues_id=${encodeURIComponent(cluesId)}`);
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

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const computeFppFromFum = (fumValue: string) => {
    const base = new Date(fumValue);
    if (Number.isNaN(base.getTime())) return "";
    base.setDate(base.getDate() + 280);
    return base.toISOString().slice(0, 10);
  };

  const handleToggle = (field: string) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const toNumberOrNull = (value: string) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!form.nombre_completo.trim()) {
      setError("El nombre es obligatorio");
      setSaving(false);
      return;
    }
    if (!form.clues_id.trim()) {
      setError("La CLUES es obligatoria");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          edad: toNumberOrNull(form.edad),
          semanas_gestacion: toNumberOrNull(form.semanas_gestacion),
          sdg_ingreso: toNumberOrNull(form.sdg_ingreso),
          riesgo_obstetrico_ingreso: toNumberOrNull(form.riesgo_obstetrico_ingreso),
          menarca: toNumberOrNull(form.menarca),
          gestas: toNumberOrNull(form.gestas),
          partos: toNumberOrNull(form.partos),
          cesareas: toNumberOrNull(form.cesareas),
          abortos: toNumberOrNull(form.abortos),
          imc_inicial: form.imc_inicial === "" ? null : Number(form.imc_inicial),
          ganancia_ponderal_max: form.ganancia_ponderal_max === "" ? null : Number(form.ganancia_ponderal_max),
          ant_preeclampsia: form.ant_preeclampsia,
          ant_hemorragia: form.ant_hemorragia,
          ant_sepsis: form.ant_sepsis,
          ant_bajo_peso_macrosomia: form.ant_bajo_peso_macrosomia,
          ant_muerte_perinatal: form.ant_muerte_perinatal,
          // Factores de riesgo
          factor_diabetes: form.factor_diabetes,
          factor_hipertension: form.factor_hipertension,
          factor_obesidad: form.factor_obesidad,
          factor_cardiopatia: form.factor_cardiopatia,
          factor_hepatopatia: form.factor_hepatopatia,
          factor_enf_autoinmune: form.factor_enf_autoinmune,
          factor_nefropatia: form.factor_nefropatia,
          factor_coagulopatias: form.factor_coagulopatias,
          factor_neuropatia: form.factor_neuropatia,
          factor_enf_psiquiatrica: form.factor_enf_psiquiatrica,
          factor_alcoholismo: form.factor_alcoholismo,
          factor_tabaquismo: form.factor_tabaquismo,
          factor_drogas_ilicitas: form.factor_drogas_ilicitas,
          // Tamizajes iniciales
          prueba_vih: form.prueba_vih || null,
          prueba_vdrl: form.prueba_vdrl || null,
          prueba_hepatitis_c: form.prueba_hepatitis_c || null,
          diabetes_glicemia: form.diabetes_glicemia || null,
          violencia: form.violencia || null,
          created_by: 1,
          updated_by: 1,
          region: form.region || session.region || null,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "No se pudo guardar");
      }

      const data = await res.json();
      setSuccess(`Paciente creado con id ${data.id}`);
      setSaving(false);
      setForm((prev) => ({ ...prev, folio: prev.folio || data.id, nombre_completo: prev.nombre_completo }));

      // Guardar factor de riesgo de antecedentes y tamizajes
      try {
        await guardarFactorRiesgo(data.id, puntajeFactorAntecedentes, puntajeFactorTamizajes);
        console.log('✅ Factores de riesgo guardados automáticamente');
      } catch (riesgoError) {
        console.error('⚠️ No se pudieron guardar los factores de riesgo, pero el paciente fue creado:', riesgoError);
      }

      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
      setSaving(false);
    }
  };

  return (
    <main
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(16,185,129,0.55)), url(/maro-hero.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-14 space-y-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-200/80">Pacientes</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold lg:text-4xl">Nuevo paciente</h1>
            <span className="text-sm text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
              {session.clues ? `CLUES ${session.clues}` : "Sesión"}
            </span>
          </div>
          <p className="text-slate-200/80 max-w-3xl">
            Captura completa de datos para cat_pacientes. Conservamos el fondo del dashboard y secciones ordenadas para agilizar la captura clínica.
          </p>
        </header>

        {error && <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">{success}</p>}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Identificación</h2>
                <p className="text-sm text-slate-200/70">Datos personales y de contacto</p>
              </div>
              <span className="text-xs text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">Obligatorio *</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-100">Nombre completo *</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.nombre_completo}
                  onChange={(e) => handleChange("nombre_completo", e.target.value)}
                  required
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Folio {loadingFolio && "(generando...)"}</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white cursor-not-allowed"
                  value={form.folio}
                  readOnly
                  disabled
                  placeholder={loadingFolio ? "Generando folio..." : "Se generará automáticamente"}
                />
                <p className="text-xs text-slate-300/70">Generado automáticamente: CLUES-###</p>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">CURP</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.curp}
                  onChange={(e) => handleChange("curp", e.target.value.toUpperCase())}
                  maxLength={18}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Edad</span>
                <input
                  type="number"
                  min={10}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.edad}
                  onChange={(e) => handleChange("edad", e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm pt-6">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/40 bg-white/10"
                  checked={form.indigena}
                  onChange={() => handleToggle("indigena")}
                />
                <span className="text-slate-100">Población indígena</span>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Región</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  placeholder={session.region || ""}
                  readOnly
                  disabled
                />
                <p className="text-xs text-slate-300/70">Controlado por la sesión</p>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">CLUES *</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.clues_id}
                  onChange={(e) => handleChange("clues_id", e.target.value.toUpperCase())}
                  required
                  readOnly
                  disabled
                />
                <p className="text-xs text-slate-300/70">Controlado por la sesión</p>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Unidad</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.unidad}
                  onChange={(e) => handleChange("unidad", e.target.value)}
                  readOnly
                  disabled
                />
                <p className="text-xs text-slate-300/70">Controlado por la sesión</p>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Municipio</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.municipio}
                  onChange={(e) => handleChange("municipio", e.target.value)}
                  readOnly
                  disabled
                />
                <p className="text-xs text-slate-300/70">Controlado por la sesión</p>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Localidad</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.localidad}
                  onChange={(e) => handleChange("localidad", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Colonia</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.colonia}
                  onChange={(e) => handleChange("colonia", e.target.value)}
                />
              </label>

              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-100">Dirección</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Teléfono</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.telefono}
                  onChange={(e) => handleChange("telefono", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Ingreso CPN y riesgo</h2>
                <p className="text-sm text-slate-200/70">Datos clínicos iniciales</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Fecha ingreso CPN</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fecha_ingreso_cpn}
                  onChange={(e) => handleChange("fecha_ingreso_cpn", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">FUM</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fum}
                  onChange={(e) => {
                    const value = e.target.value;
                    const fpp = computeFppFromFum(value);
                    setForm((prev) => ({ ...prev, fum: value, fpp }));
                  }}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Semanas gestación</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.semanas_gestacion}
                  onChange={(e) => handleChange("semanas_gestacion", e.target.value)}
                  placeholder="ej. 30.5"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">FPP</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fpp}
                  onChange={(e) => handleChange("fpp", e.target.value)}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">SDG ingreso</span>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.sdg_ingreso}
                  onChange={(e) => handleChange("sdg_ingreso", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Riesgo obstétrico ingreso</span>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.riesgo_obstetrico_ingreso}
                  onChange={(e) => handleChange("riesgo_obstetrico_ingreso", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Tipo de riesgo social</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.tipo_riesgo_social}
                  onChange={(e) => handleChange("tipo_riesgo_social", e.target.value)}
                >
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">IMC inicial</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.imc_inicial}
                  onChange={(e) => handleChange("imc_inicial", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Ganancia ponderal máx.</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.ganancia_ponderal_max}
                  onChange={(e) => handleChange("ganancia_ponderal_max", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Hospital de referencia</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.hospital_referencia}
                  onChange={(e) => handleChange("hospital_referencia", e.target.value)}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Tipo de localidad</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.tipo_localidad}
                  onChange={(e) => handleChange("tipo_localidad", e.target.value)}
                >
                  <option value="Urbana">Urbana</option>
                  <option value="Rural">Rural</option>
                </select>
              </label>
            </div>

            {/* FACTORES DE RIESGO: Comorbilidades y toxicomanías */}
            <div className="space-y-3">
              <div>
                <button
                  type="button"
                  onClick={() => setMostrarFactoresRiesgo(!mostrarFactoresRiesgo)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-slate-100 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{mostrarFactoresRiesgo ? '▼' : '▶'}</span>
                    <span>Factores de riesgo (Comorbilidades y/o toxicomanías)</span>
                  </div>
                  <span className="text-xs text-slate-300">
                    {mostrarFactoresRiesgo ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>
              </div>
              
              {mostrarFactoresRiesgo && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-slate-200/70 px-1">
                    Selecciona todos los que apliquen
                  </p>
                  
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { key: "factor_diabetes", label: "Diabetes", puntos: 4 },
                      { key: "factor_hipertension", label: "Hipertensión", puntos: 4 },
                      { key: "factor_obesidad", label: "Obesidad", puntos: 4 },
                      { key: "factor_cardiopatia", label: "Cardiopatía", puntos: 4 },
                      { key: "factor_hepatopatia", label: "Hepatopatía", puntos: 4 },
                      { key: "factor_enf_autoinmune", label: "Enfermedad autoinmune", puntos: 4 },
                      { key: "factor_nefropatia", label: "Nefropatía", puntos: 4 },
                      { key: "factor_coagulopatias", label: "Coagulopatías", puntos: 4 },
                      { key: "factor_neuropatia", label: "Neuropatía", puntos: 4 },
                      { key: "factor_enf_psiquiatrica", label: "Enfermedad psiquiátrica", puntos: 4 },
                      { key: "factor_alcoholismo", label: "Alcoholismo", puntos: 4 },
                      { key: "factor_tabaquismo", label: "Tabaquismo", puntos: 2 },
                      { key: "factor_drogas_ilicitas", label: "Drogas ilícitas", puntos: 4 },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-white/40 bg-white/10"
                          checked={(form as any)[item.key]}
                          onChange={() => handleToggle(item.key)}
                        />
                        <span className="text-slate-100 flex-1">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FACTORES EPIDEMIOLÓGICOS */}
            <div className="space-y-3">
              <div>
                <button
                  type="button"
                  onClick={() => setMostrarFactoresEpid(!mostrarFactoresEpid)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-slate-100 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{mostrarFactoresEpid ? '▼' : '▶'}</span>
                    <span>Factores epidemiológicos</span>
                  </div>
                  <span className="text-xs text-slate-300">
                    {mostrarFactoresEpid ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>
              </div>
              
              {mostrarFactoresEpid && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-slate-200/70 px-1">
                    Portadora o contacto de enfermedad sujeta a vigilancia epidemiológica
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="radio"
                        name="factores_riesgo_epid"
                        value="ninguno"
                        className="h-4 w-4"
                        checked={form.factores_riesgo_epid === 'ninguno'}
                        onChange={() => handleChange('factores_riesgo_epid', 'ninguno')}
                      />
                      <span className="text-slate-100 flex-1">Ninguno</span>
                    </label>
                    
                    <label className="flex items-center gap-3 text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="radio"
                        name="factores_riesgo_epid"
                        value="es_contacto"
                        className="h-4 w-4"
                        checked={form.factores_riesgo_epid === 'es_contacto'}
                        onChange={() => handleChange('factores_riesgo_epid', 'es_contacto')}
                      />
                      <span className="text-slate-100 flex-1">Es contacto</span>
                    </label>
                    
                    <label className="flex items-center gap-3 text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="radio"
                        name="factores_riesgo_epid"
                        value="es_portadora"
                        className="h-4 w-4"
                        checked={form.factores_riesgo_epid === 'es_portadora'}
                        onChange={() => handleChange('factores_riesgo_epid', 'es_portadora')}
                      />
                      <span className="text-slate-100 flex-1">Es portadora</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Antecedentes gineco-obstétricos</h2>
                <p className="text-sm text-slate-200/70">Paridad y riesgos previos</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              {[
                { key: "menarca", label: "Menarca (años)" },
                { key: "gestas", label: "Gestas" },
                { key: "partos", label: "Partos" },
                { key: "cesareas", label: "Cesáreas" },
                { key: "abortos", label: "Abortos" },
              ].map((item) => (
                <label key={item.key} className="space-y-1 text-sm">
                  <span className="text-slate-100">{item.label}</span>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                    value={(form as any)[item.key]}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "ant_preeclampsia", label: "Antecedente de preeclampsia" },
                { key: "ant_hemorragia", label: "Antecedente de hemorragia" },
                { key: "ant_sepsis", label: "Antecedente de sepsis" },
                { key: "ant_bajo_peso_macrosomia", label: "RN bajo peso / macrosomía" },
                { key: "ant_muerte_perinatal", label: "Muerte perinatal" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/40 bg-white/10"
                    checked={(form as any)[item.key]}
                    onChange={() => handleToggle(item.key)}
                  />
                  <span className="text-slate-100">{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Tamizajes iniciales</h2>
                <p className="text-sm text-slate-200/70">Detecciones del primer contacto</p>
              </div>
              <span className="text-xs text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">Primer contacto</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-50">
                <span className="mt-0.5 text-lg">ℹ️</span>
                <p className="text-sm">Captura las pruebas de VIH, VDRL, Hepatitis C, glicemia y violencia realizadas en el primer contacto con la paciente.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Prueba VIH</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.prueba_vih}
                  onChange={(e) => handleChange("prueba_vih", e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  <option value="Reactiva">Reactiva</option>
                  <option value="No reactiva">No reactiva</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Prueba VDRL</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.prueba_vdrl}
                  onChange={(e) => handleChange("prueba_vdrl", e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  <option value="Reactiva">Reactiva</option>
                  <option value="No reactiva">No reactiva</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Prueba Hepatitis C</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.prueba_hepatitis_c}
                  onChange={(e) => handleChange("prueba_hepatitis_c", e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  <option value="Reactiva">Reactiva</option>
                  <option value="No reactiva">No reactiva</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Diabetes (Glicemia)</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.diabetes_glicemia}
                  onChange={(e) => handleChange("diabetes_glicemia", e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  <option value="Normal">Normal</option>
                  <option value="Resistencia a la insulina">Resistencia a la insulina</option>
                  <option value="Diabetes">Diabetes</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Violencia de cualquier tipo</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.violencia}
                  onChange={(e) => handleChange("violencia", e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  <option value="Positiva">Positiva</option>
                  <option value="Negativa">Negativa</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Red de apoyo y traslado</h2>
                <p className="text-sm text-slate-200/70">Contacto de madrina y traslado</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-100">Nombre de madrina</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.madrina_nombre}
                  onChange={(e) => handleChange("madrina_nombre", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Teléfono de madrina</span>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.madrina_telefono}
                  onChange={(e) => handleChange("madrina_telefono", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Mecanismo de traslado</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.mecanismo_traslado}
                  onChange={(e) => handleChange("mecanismo_traslado", e.target.value)}
                >
                  <option value="Personal">Personal</option>
                  <option value="Comunitario">Comunitario</option>
                  <option value="Ninguno">Ninguno</option>
                </select>
              </label>
            </div>
          </section>

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar paciente"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              onClick={() => router.push("/dashboard")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* CONTADOR FLOTANTE DE FACTOR DE RIESGO */}
      <ContadorRiesgo 
        formData={form} 
        onPuntajeChange={(puntosAntecedentes, puntosTamizajes) => {
          setPuntajeFactorAntecedentes(puntosAntecedentes);
          setPuntajeFactorTamizajes(puntosTamizajes);
        }}
      />
    </main>
  );
}
