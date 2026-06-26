"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ContadorRiesgo from "@/app/components/ContadorRiesgo";
import { useSaveFactorRiesgoPaciente } from "@/lib/hooks/useSaveFactorRiesgoPaciente";

type SessionInfo = {
  nivel?: number;
  clues?: string;
  unidad?: string;
  region?: string;
  municipio?: string;
};

function calcularEdadDesdeCurp(curp: string): number | null {
  const curpRegex = /^[A-ZÑ]{4}(\d{2})(\d{2})(\d{2})[HMX][A-ZÑ]{5}([A-Z0-9])[A-Z0-9]$/;
  const match = curp.match(curpRegex);
  if (!match) {
    return null;
  }

  const year2Dig = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const centuryChar = match[4];

  // Determinar el siglo basado en el caracter 17 (letra para 2000+, número para 1900+)
  let year = year2Dig;
  if (Number.isNaN(Number(centuryChar))) {
    year += 2000;
  } else {
    year += 1900;
  }

  // Fallback para evitar años en el futuro (ej. CURPs atípicas con letra pero año de 1900s)
  if (year > new Date().getFullYear()) {
    year -= 100;
  }

  // Validar que sea una fecha de nacimiento válida
  const fechaNacimiento = new Date(year, month - 1, day);
  if (
    fechaNacimiento.getFullYear() !== year ||
    fechaNacimiento.getMonth() !== month - 1 ||
    fechaNacimiento.getDate() !== day
  ) {
    return null;
  }

  // Calcular la edad actual
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const diferenciaMes = hoy.getMonth() - fechaNacimiento.getMonth();
  if (
    diferenciaMes < 0 ||
    (diferenciaMes === 0 && hoy.getDate() < fechaNacimiento.getDate())
  ) {
    edad--;
  }

  return edad >= 0 ? edad : null;
}

const HOSPITALES_REFERENCIA = [
  { clues: "HGIMB000151", nombre: "HOSPITAL GENERAL ACTOPAN" },
  { clues: "HGIMB000431", nombre: "HOSPITAL INTEGRAL ATLAPEXCO" },
  { clues: "HGIMB001481", nombre: "HOSPITAL REGIONAL DEL VALLE DEL MEZQUITAL" },
  { clues: "HGIMB001686", nombre: "HOSPITAL INTEGRAL JACALA" },
  { clues: "HGIMB002036", nombre: "HOSPITAL INTEGRAL CINTA LARGA" },
  { clues: "HGIMB002572", nombre: "HOSPITAL REGIONAL OTOMI TEPEHUA" },
  { clues: "HGIMB004561", nombre: "HOSPITAL ZIMAPÁN" },
  { clues: "HGIMB004573", nombre: "HOSPITAL MATERNO INFANTIL" },
  { clues: "HGIMB004795", nombre: "HOSPITAL INTEGRAL DE TLANCHINOL" },
  { clues: "HGIMB004800", nombre: "HOSPITAL GENERAL DE APAN" },
  { clues: "HGIMB004812", nombre: "HOSPITAL GENERAL DE LA HUASTECA" },
  { clues: "HGIMB004824", nombre: "HOSPITAL GENERAL TULA" },
  { clues: "HGIMB004841", nombre: "HBC HUEHUETLA" },
  { clues: "HGIMB004952", nombre: "HOSPITAL IMSS BIENESTAR METZTITLÁN" },
  { clues: "HGIMB005005", nombre: "HOSPITAL GENERAL DE TULANCINGO" },
  { clues: "HGIMB005034", nombre: "HOSPITAL VILLA OCARANZA" },
  { clues: "HGIMB002304", nombre: "HOSPITAL GENERAL PACHUCA" },
  { clues: "HGIMB001394", nombre: "HOSPITAL GENERAL HUICHAPAN" }
];

export default function NuevoPaciente() {
  const router = useRouter();
  const { guardar: guardarFactorRiesgo } = useSaveFactorRiesgoPaciente();
  const [session, setSession] = useState<SessionInfo>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [mostrarFactoresRiesgo, setMostrarFactoresRiesgo] = useState(false);
  const [mostrarFactoresEpid, setMostrarFactoresEpid] = useState(false);
  const [puntajeFactorAntecedentes, setPuntajeFactorAntecedentes] = useState(0);
  const [puntajeFactorTamizajes, setPuntajeFactorTamizajes] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEdadAlertaModal, setShowEdadAlertaModal] = useState(false);
  const [edadAlertaConfirmada, setEdadAlertaConfirmada] = useState(false);

  const hospitalesDisponibles = useMemo(() => {
    if (!session.clues) return HOSPITALES_REFERENCIA;
    return HOSPITALES_REFERENCIA.filter((h) => h.clues !== session.clues);
  }, [session.clues]);

  const [form, setForm] = useState({
    // Identidad
    nombre_completo: "",
    curp: "",
    edad: "",
    indigena: false,
    migrante: false,
    derechohabiencia: "",
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
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as SessionInfo;
      const nivel = parsed.nivel ?? 0;

      if (nivel >= 3) {
        router.replace("/estatal");
        return;
      }
      if (nivel >= 2) {
        router.replace("/region");
        return;
      }

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
    } catch {
      router.replace("/inicial");
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
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "curp") {
        const edadCalculada = calcularEdadDesdeCurp(value);
        if (edadCalculada !== null) {
          next.edad = String(edadCalculada);
        }
      }
      return next;
    });
  };

  const computeGestacionDataFromFum = (fumValue: string) => {
    if (!fumValue) {
      return {
        fpp: "",
        semanas_gestacion: "",
      };
    }

    const base = new Date(`${fumValue}T00:00:00Z`);
    if (Number.isNaN(base.getTime())) {
      return {
        fpp: "",
        semanas_gestacion: "",
      };
    }

    const fppDate = new Date(base);
    fppDate.setUTCDate(fppDate.getUTCDate() + 280);

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffInWeeks = Math.max(0, (todayUtc.getTime() - base.getTime()) / (1000 * 60 * 60 * 24 * 7));

    return {
      fpp: fppDate.toISOString().slice(0, 10),
      semanas_gestacion: diffInWeeks.toFixed(1),
    };
  };

  const computeGananciaPonderalMaxFromImc = (imcValue: string) => {
    if (!imcValue) return "";

    const imc = Number(imcValue);
    if (!Number.isFinite(imc)) return "";

    if (imc < 18.5) return "18.0";
    if (imc < 25) return "15.89";
    if (imc < 30) return "11.35";
    if (imc < 35) return "9.0";
    if (imc < 40) return "9.0";
    return "9.0";
  };

  const handleToggle = (field: string) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const toNumberOrNull = (value: string) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const edadNumero = Number(form.edad);
  const edadEnRangoAlerta = Number.isFinite(edadNumero) && edadNumero >= 10 && edadNumero <= 14;

  useEffect(() => {
    if (edadEnRangoAlerta && !edadAlertaConfirmada) {
      setShowEdadAlertaModal(true);
      return;
    }

    if (!edadEnRangoAlerta) {
      setShowEdadAlertaModal(false);
      setEdadAlertaConfirmada(false);
    }
  }, [edadEnRangoAlerta, edadAlertaConfirmada]);

  // Validar y abrir modal de confirmación
  // Validar y abrir modal de confirmación
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAttemptedSubmit(true);

    if (!form.nombre_completo.trim()) {
      setError("El nombre completo es obligatorio");
      return;
    }
    
    // Validación de nombre: Solo letras y espacios
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nameRegex.test(form.nombre_completo.trim())) {
      setError("El nombre completo no debe contener números ni caracteres especiales");
      return;
    }

    if (!form.edad.trim()) {
      setError("La edad es obligatoria");
      return;
    }
    
    // Validación de edad
    const edadNum = Number(form.edad);
    if (isNaN(edadNum) || edadNum <= 0 || edadNum > 100 || !Number.isInteger(edadNum)) {
      setError("La edad ingresada no es válida (debe ser un número entero entre 1 y 100)");
      return;
    }

    if (!form.derechohabiencia.trim()) {
      setError("La derechohabiencia es obligatoria");
      return;
    }
    if (edadEnRangoAlerta && !edadAlertaConfirmada) {
      setShowEdadAlertaModal(true);
      return;
    }
    if (form.curp && form.curp.trim()) {
      const curpRegex = /^[A-ZÑ]{4}\d{6}[HMX][A-ZÑ]{5}[A-Z0-9][A-Z0-9]$/;
      if (!curpRegex.test(form.curp)) {
        setError("El formato de la CURP es inválido");
        return;
      }
    }
    
    // Validación de teléfono paciente
    if (form.telefono && form.telefono.trim()) {
      const telRegex = /^\d{10}$/;
      if (!telRegex.test(form.telefono.trim())) {
        setError("El teléfono del paciente debe contener exactamente 10 dígitos numéricos");
        return;
      }
    }

    // Validación de madrina obstétrica
    if (form.madrina_nombre && form.madrina_nombre.trim() && !nameRegex.test(form.madrina_nombre.trim())) {
      setError("El nombre de la madrina obstétrica no debe contener números ni caracteres especiales");
      return;
    }
    if (form.madrina_telefono && form.madrina_telefono.trim()) {
      const telRegex = /^\d{10}$/;
      if (!telRegex.test(form.madrina_telefono.trim())) {
        setError("El teléfono de la madrina obstétrica debe contener exactamente 10 dígitos numéricos");
        return;
      }
    }

    if (!form.localidad.trim()) {
      setError("La localidad es obligatoria");
      return;
    }
    if (!form.colonia.trim()) {
      setError("La colonia es obligatoria");
      return;
    }
    if (!form.direccion.trim()) {
      setError("La dirección es obligatoria");
      return;
    }
    if (!form.fecha_ingreso_cpn.trim()) {
      setError("La fecha de ingreso es obligatoria");
      return;
    }
    if (!form.fum.trim()) {
      setError("La FUM es obligatoria");
      return;
    }

    // Validación numérica de antecedentes gineco-obstétricos
    const checkInt = (val: string, label: string) => {
      if (!val.trim()) return `El campo ${label} es obligatorio`;
      const num = Number(val);
      if (isNaN(num) || !Number.isInteger(num) || num < 0) {
        return `El campo ${label} debe ser un número entero válido (0 o mayor)`;
      }
      return null;
    };

    const errGestas = checkInt(form.gestas, "Gestas");
    if (errGestas) { setError(errGestas); return; }
    
    const errPartos = checkInt(form.partos, "Partos");
    if (errPartos) { setError(errPartos); return; }
    
    const errCesareas = checkInt(form.cesareas, "Cesáreas");
    if (errCesareas) { setError(errCesareas); return; }
    
    const errAbortos = checkInt(form.abortos, "Abortos");
    if (errAbortos) { setError(errAbortos); return; }

    // Validación de medidas (IMC y ganancia)
    if (form.imc_inicial && form.imc_inicial.trim()) {
      const val = Number(form.imc_inicial);
      if (isNaN(val) || val <= 0) {
        setError("El IMC inicial debe ser un número válido mayor a 0");
        return;
      }
    }

    if (form.ganancia_ponderal_max && form.ganancia_ponderal_max.trim()) {
      const val = Number(form.ganancia_ponderal_max);
      if (isNaN(val) || val < 0) {
        setError("La ganancia ponderal debe ser un número válido (0 o mayor)");
        return;
      }
    }

    if (!form.clues_id.trim()) {
      setError("La CLUES es obligatoria");
      return;
    }

    setShowConfirmModal(true);
  };

  // Ejecutar el guardado real tras confirmación
  const executeSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          edad: toNumberOrNull(form.edad),
          sdg_ingreso: toNumberOrNull(form.sdg_ingreso),
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
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
            Captura completa de datos para catalogo de pacientes asi como tamizajes iniciales primer contacto
          </p>
        </header>

        {/* Modal de Error */}
        {error && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-900 shadow-2xl p-6">
              <div className="flex items-center gap-4 text-rose-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-xl font-bold">Error en el registro</h2>
              </div>
              <p className="text-slate-200 mb-6">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="w-full rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition-colors"
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        )}
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
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.nombre_completo.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.nombre_completo}
                  onChange={(e) => handleChange("nombre_completo", e.target.value)}
                  required
                />
                {attemptedSubmit && !form.nombre_completo.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ El nombre es obligatorio</p>
                )}
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
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    !form.curp
                      ? "border-white/10"
                      : form.curp.length === 18 && /^[A-ZÑ]{4}\d{6}[HMX][A-ZÑ]{5}[A-Z0-9][A-Z0-9]$/.test(form.curp)
                      ? "border-emerald-500/50 focus:border-emerald-500"
                      : "border-rose-500/50 focus:border-rose-500"
                  }`}
                  value={form.curp}
                  onChange={(e) => handleChange("curp", e.target.value.toUpperCase())}
                  maxLength={18}
                  placeholder="18 caracteres"
                />
                {form.curp && form.curp.length > 0 && (
                  <p className={`text-xs mt-1 font-medium ${
                    form.curp.length === 18 && /^[A-ZÑ]{4}\d{6}[HMX][A-ZÑ]{5}[A-Z0-9][A-Z0-9]$/.test(form.curp)
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}>
                    {form.curp.length < 18
                      ? `Incompleta: ${form.curp.length}/18 caracteres`
                      : /^[A-ZÑ]{4}\d{6}[HMX][A-ZÑ]{5}[A-Z0-9][A-Z0-9]$/.test(form.curp)
                      ? "✓ CURP válida. Edad calculada automáticamente."
                      : "✗ Formato de CURP inválido"}
                  </p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Edad *</span>
                <input
                  type="number"
                  min={10}
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.edad.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.edad}
                  onChange={(e) => handleChange("edad", e.target.value)}
                />
                {attemptedSubmit && !form.edad.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La edad es obligatoria</p>
                )}
              </label>
              <div className="flex flex-wrap items-center gap-6 pt-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/40 bg-white/10 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                    checked={form.indigena}
                    onChange={() => handleToggle("indigena")}
                  />
                  <span className="text-slate-100 select-none">Población indígena</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/40 bg-white/10 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                    checked={form.migrante}
                    onChange={() => handleToggle("migrante")}
                  />
                  <span className="text-slate-100 select-none">Población migrante</span>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Derechohabiencia *</span>
                <select
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.derechohabiencia.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.derechohabiencia}
                  onChange={(e) => handleChange("derechohabiencia", e.target.value)}
                  required
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccionar...</option>
                  <option value="IMB" className="bg-slate-900 text-white">IMB</option>
                  <option value="IMSS" className="bg-slate-900 text-white">IMSS</option>
                  <option value="ISSSTE" className="bg-slate-900 text-white">ISSSTE</option>
                  <option value="Otro" className="bg-slate-900 text-white">Otro</option>
                </select>
                {attemptedSubmit && !form.derechohabiencia.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La derechohabiencia es obligatoria</p>
                )}
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
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.clues_id.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.clues_id}
                  onChange={(e) => handleChange("clues_id", e.target.value.toUpperCase())}
                  required
                  readOnly
                  disabled
                />
                {attemptedSubmit && !form.clues_id.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La CLUES es obligatoria</p>
                )}
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
                <span className="text-slate-100">Localidad *</span>
                <input
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.localidad.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.localidad}
                  onChange={(e) => handleChange("localidad", e.target.value)}
                />
                {attemptedSubmit && !form.localidad.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La localidad es obligatoria</p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Colonia *</span>
                <input
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.colonia.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.colonia}
                  onChange={(e) => handleChange("colonia", e.target.value)}
                />
                {attemptedSubmit && !form.colonia.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La colonia es obligatoria</p>
                )}
              </label>

              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-100">Dirección *</span>
                <input
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.direccion.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                />
                {attemptedSubmit && !form.direccion.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La dirección es obligatoria</p>
                )}
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
                <span className="text-slate-100">Fecha ingreso CPN *</span>
                <input
                  type="date"
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.fecha_ingreso_cpn.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.fecha_ingreso_cpn}
                  onChange={(e) => handleChange("fecha_ingreso_cpn", e.target.value)}
                />
                {attemptedSubmit && !form.fecha_ingreso_cpn.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La fecha de ingreso es obligatoria</p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">FUM *</span>
                <input
                  type="date"
                  className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                    attemptedSubmit && !form.fum.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-white/10"
                  }`}
                  value={form.fum}
                  onChange={(e) => {
                    const value = e.target.value;
                    const gestacionData = computeGestacionDataFromFum(value);
                    setForm((prev) => ({
                      ...prev,
                      fum: value,
                      fpp: gestacionData.fpp,
                      semanas_gestacion: gestacionData.semanas_gestacion,
                    }));
                  }}
                />
                {attemptedSubmit && !form.fum.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La FUM es obligatoria</p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Semanas gestación</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.semanas_gestacion}
                  readOnly
                  placeholder="Se calcula desde la FUM"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">FPP</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.fpp}
                  readOnly
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
                  onChange={(e) => {
                    const value = e.target.value;
                    const gananciaPonderalMax = computeGananciaPonderalMaxFromImc(value);
                    setForm((prev) => ({
                      ...prev,
                      imc_inicial: value,
                      ganancia_ponderal_max: gananciaPonderalMax,
                    }));
                  }}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Ganancia ponderal máx Kg.</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.ganancia_ponderal_max}
                  readOnly
                  placeholder="Se calcula desde IMC inicial"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-100">Hospital de referencia</span>
                <select
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white transition-all focus:border-emerald-500 focus:ring-emerald-500"
                  value={form.hospital_referencia}
                  onChange={(e) => handleChange("hospital_referencia", e.target.value)}
                >
                  <option value="" className="bg-slate-900 text-slate-400">Seleccionar hospital...</option>
                  {hospitalesDisponibles.map((hosp) => (
                    <option key={hosp.clues} value={hosp.nombre} className="bg-slate-900 text-white">
                      {hosp.nombre}
                    </option>
                  ))}
                </select>
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
                    Portadora o contacto de enfermedad sujeta a vigilancia epidemiológica (Tuberculosis, VIH, Sifilis, Chagas. )
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
                { key: "gestas", label: "Gestas", required: true },
                { key: "partos", label: "Partos", required: true },
                { key: "cesareas", label: "Cesáreas", required: true },
                { key: "abortos", label: "Abortos", required: true },
              ].map((item) => (
                <label key={item.key} className="space-y-1 text-sm">
                  <span className="text-slate-100">
                    {item.label} {item.required ? "*" : ""}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white transition-all ${
                      attemptedSubmit && item.required && !(form as any)[item.key].trim()
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                        : "border-white/10"
                    }`}
                    value={(form as any)[item.key]}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                  />
                  {attemptedSubmit && item.required && !(form as any)[item.key].trim() && (
                    <p className="text-xs text-rose-400 mt-1 font-medium">✗ Requerido</p>
                  )}
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

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur-sm">
            {/* Encabezado */}
            <div className="border-b border-white/10 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80 mb-1">Confirmación</p>
              <h2 id="confirm-modal-title" className="text-lg font-semibold text-white">
                ¿Confirmar registro de paciente?
              </h2>
              <p className="text-sm text-slate-300/70 mt-0.5">
                Revisa los datos antes de guardar. Esta acción creará el expediente.
              </p>
            </div>

            {/* Resumen de datos */}
            <div className="px-6 py-4 space-y-3">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="col-span-2">
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Nombre completo</dt>
                  <dd className="text-white font-medium mt-0.5">{form.nombre_completo || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">CURP</dt>
                  <dd className="text-white font-mono mt-0.5">{form.curp || "No capturado"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Folio</dt>
                  <dd className="text-emerald-300 font-medium mt-0.5">{form.folio || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Unidad / CLUES</dt>
                  <dd className="text-white mt-0.5">{form.unidad || "—"} / {form.clues_id || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Edad</dt>
                  <dd className="text-white mt-0.5">{form.edad ? `${form.edad} años` : "No capturada"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">FUM</dt>
                  <dd className="text-white mt-0.5">{form.fum || "No capturada"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Semanas gestación</dt>
                  <dd className="text-white mt-0.5">{form.semanas_gestacion ? `${form.semanas_gestacion} sdg` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Fecha ingreso CPN</dt>
                  <dd className="text-white mt-0.5">{form.fecha_ingreso_cpn || "No capturada"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Riesgo social</dt>
                  <dd className="text-white mt-0.5">{form.tipo_riesgo_social}</dd>
                </div>
              </dl>

              {(puntajeFactorAntecedentes + puntajeFactorTamizajes) > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-200/80 uppercase tracking-wide">Factor de riesgo</p>
                  <p className="text-sm text-amber-100 mt-0.5">
                    Puntaje antecedentes: <strong>{puntajeFactorAntecedentes}</strong> ·
                    Tamizajes: <strong>{puntajeFactorTamizajes}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={executeSave}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition-colors"
              >
                Confirmar y guardar
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Revisar captura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA POR EDAD 10-14 */}
      {showEdadAlertaModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="edad-alerta-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border-2 border-rose-400/60 bg-gradient-to-br from-rose-900/95 to-rose-800/95 shadow-2xl">
            <div className="border-b border-white/15 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-100/90">Alerta prioritaria</p>
              <h2 id="edad-alerta-modal-title" className="mt-1 text-xl font-semibold text-white">
                Paciente de 10 a 14 años
              </h2>
            </div>

            <div className="px-6 py-5 space-y-3 text-rose-50">
              <p className="text-sm text-rose-100/90">
                Se detectó edad de <strong>{form.edad || "—"} años</strong>. Considera las siguientes acciones:
              </p>

              <ul className="space-y-2 text-sm">
                <li className="rounded-lg border border-rose-300/35 bg-rose-950/35 px-3 py-2">Aviso al MP</li>
                <li className="rounded-lg border border-rose-300/35 bg-rose-950/35 px-3 py-2">Ofrecer Aborto Seguro</li>
                <li className="rounded-lg border border-rose-300/35 bg-rose-950/35 px-3 py-2">Enviar a Segundo nivel</li>
              </ul>

              <p className="rounded-lg border border-amber-400/50 bg-amber-900/40 px-3 py-2 text-xs text-amber-200 font-medium">
                ⚠️ Este caso se considerará de alto riesgo al capturar la <strong>primera consulta</strong> y, con ese registro, se enviará automáticamente al panel estatal.
              </p>
            </div>

            <div className="border-t border-white/15 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setEdadAlertaConfirmada(true);
                  setShowEdadAlertaModal(false);
                }}
                className="w-full rounded-lg bg-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-950 hover:bg-rose-200 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
