"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ContadorRiesgo from "@/app/components/ContadorRiesgo";
import { useSaveFactorRiesgoPaciente } from "@/lib/hooks/useSaveFactorRiesgoPaciente";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  // Regla de sanidad: Si la edad resultante es mayor a 60 años (biológicamente improbable para obstetricia)
  // e inicialmente se asignó el siglo XX (1900s), y al sumarle 100 años no queda en el futuro:
  const hoyAnio = new Date().getFullYear();
  if (hoyAnio - year > 60 && year >= 1900 && year < 2000 && (year + 100) <= hoyAnio) {
    year += 100;
  }

  // Fallback para evitar años en el futuro (ej. CURPs atípicas con letra pero año de 1900s)
  if (year > hoyAnio) {
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
  const [showEdadMayor35Modal, setShowEdadMayor35Modal] = useState(false);
  const [edadMayor35Confirmada, setEdadMayor35Confirmada] = useState(false);

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
    factor_endocrinopatia: false,
    factor_neumopatia: false,
    factor_its: false,
    factor_cirugias_pelvico_uterinas: false,
    factor_discapacidad: false,
    tiene_otros_antecedentes: false,
    otros_antecedentes: "",

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
    ant_embarazo_ectopico: false,

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

  const factoresSegundoNivelActivos = useMemo(() => {
    const list: string[] = [];
    if (form.factor_diabetes) list.push("Diabetes");
    if (form.factor_hipertension) list.push("Hipertensión");
    if (form.factor_obesidad) list.push("Obesidad");
    if (form.factor_cardiopatia) list.push("Cardiopatía");
    if (form.factor_hepatopatia) list.push("Hepatopatía");
    if (form.factor_enf_autoinmune) list.push("Enfermedad autoinmune");
    if (form.factor_nefropatia) list.push("Nefropatía");
    if (form.factor_coagulopatias) list.push("Coagulopatías");
    if (form.factor_enf_psiquiatrica) list.push("Enfermedad psiquiátrica");
    if (form.factor_endocrinopatia) list.push("Endocrinopatía");
    if (form.factor_neumopatia) list.push("Neumopatía");
    if (form.ant_hemorragia) list.push("Antecedente de hemorragia");
    if (form.ant_sepsis) list.push("Antecedente de sepsis");
    if (form.ant_bajo_peso_macrosomia) list.push("Antecedente de bajo peso / macrosomía");
    if (form.ant_muerte_perinatal) list.push("Antecedente de muerte perinatal");
    if (form.ant_embarazo_ectopico) list.push("Antecedente de embarazo ectópico");
    return list;
  }, [
    form.factor_diabetes,
    form.factor_hipertension,
    form.factor_obesidad,
    form.factor_cardiopatia,
    form.factor_hepatopatia,
    form.factor_enf_autoinmune,
    form.factor_nefropatia,
    form.factor_coagulopatias,
    form.factor_enf_psiquiatrica,
    form.factor_endocrinopatia,
    form.factor_neumopatia,
    form.ant_hemorragia,
    form.ant_sepsis,
    form.ant_bajo_peso_macrosomia,
    form.ant_muerte_perinatal,
    form.ant_embarazo_ectopico,
  ]);

  const tieneAlertaSegundoNivel = factoresSegundoNivelActivos.length > 0;

  const tamizajesReactivosActivos = useMemo(() => {
    const list: string[] = [];
    if (form.prueba_vih === "Reactiva") list.push("VIH Reactiva");
    if (form.prueba_vdrl === "Reactiva") list.push("VDRL Reactiva");
    if (form.prueba_hepatitis_c === "Reactiva") list.push("Hepatitis C Reactiva");
    return list;
  }, [form.prueba_vih, form.prueba_vdrl, form.prueba_hepatitis_c]);

  const tieneAlertaNotificacion = tamizajesReactivosActivos.length > 0;

  const getRecomendaciones = () => {
    const recs: string[] = [];
    
    if (
      form.factor_diabetes ||
      form.diabetes_glicemia === "Diabetes" ||
      form.diabetes_glicemia === "Resistencia a la insulina"
    ) {
      recs.push("No acumulativos en cada consulta + Manejo conjunto con Segundo Nivel de Atencion");
    }
    if (form.tipo_riesgo_social === "Medio" || form.tipo_riesgo_social === "Alto") {
      recs.push("Fortalecer red social, vinculación con acción comunitaria");
    }
    if (form.factor_discapacidad) {
      recs.push("Fortalecer red social, manejo conjunto con segundo nivel de atención");
    }
    if (form.edad && (parseInt(form.edad) < 19 || parseInt(form.edad) > 35)) {
      recs.push("Vigilancia estrecha por edad de riesgo");
    }
    if (form.factor_obesidad) {
      recs.push("Asesoría nutricional y control estricto de ganancia de peso");
    }
    if (form.imc_inicial && form.imc_inicial.trim() !== "") {
      const imc = parseFloat(form.imc_inicial);
      if (!isNaN(imc) && (imc < 18.5 || imc >= 30)) {
        recs.push("Referir a segundo nivel de atencion servicio de nutricion");
      }
    }
    if (form.ganancia_ponderal_max && String(form.ganancia_ponderal_max).trim() !== "") {
      recs.push("Vigilar ganancia de peso en cada consulta");
    }
    return recs;
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
        sdg_ingreso: "",
      };
    }

    const base = new Date(`${fumValue}T00:00:00Z`);
    if (Number.isNaN(base.getTime())) {
      return {
        fpp: "",
        semanas_gestacion: "",
        sdg_ingreso: "",
      };
    }

    const fppDate = new Date(base);
    fppDate.setUTCDate(fppDate.getUTCDate() + 280);

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const totalDays = Math.max(0, Math.floor((todayUtc.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)));
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;

    return {
      fpp: fppDate.toISOString().slice(0, 10),
      semanas_gestacion: `${weeks}.${days}`,
      sdg_ingreso: String(weeks),
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
  const edadMayor35Alerta = Number.isFinite(edadNumero) && edadNumero > 35;

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

  useEffect(() => {
    if (edadMayor35Alerta && !edadMayor35Confirmada) {
      setShowEdadMayor35Modal(true);
      return;
    }

    if (!edadMayor35Alerta) {
      setShowEdadMayor35Modal(false);
      setEdadMayor35Confirmada(false);
    }
  }, [edadMayor35Alerta, edadMayor35Confirmada]);

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
    if (edadMayor35Alerta && !edadMayor35Confirmada) {
      setShowEdadMayor35Modal(true);
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

    const numG = Number(form.gestas);
    const numP = Number(form.partos);
    const numC = Number(form.cesareas);
    const numA = Number(form.abortos);
    if (numG < 1) {
      setError("El campo Gestas debe ser al menos 1 (incluye el embarazo actual en curso).");
      return;
    }
    if (numP + numC + numA + 1 !== numG) {
      setError(
        `Inconsistencia en la fórmula obstétrica: Las Gestas totales (${numG}) deben ser iguales a Partos (${numP}) + Cesáreas (${numC}) + Abortos (${numA}) + 1 (embarazo actual en curso) = ${numP + numC + numA + 1}.`
      );
      return;
    }

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
          ant_embarazo_ectopico: form.ant_embarazo_ectopico,
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
          factor_endocrinopatia: form.factor_endocrinopatia,
          factor_neumopatia: form.factor_neumopatia,
          factor_its: form.factor_its,
          factor_cirugias_pelvico_uterinas: form.factor_cirugias_pelvico_uterinas,
          factor_discapacidad: form.factor_discapacidad,
          otros_antecedentes: form.tiene_otros_antecedentes ? (form.otros_antecedentes?.trim().slice(0, 50) || null) : null,
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
      className="min-h-screen relative text-slate-900 dark:text-white transition-colors duration-300"
    >
      {/* Background decorativo fixed con imagen visible en tema claro y oscuro */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none z-0 dark:hidden"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(241, 245, 249, 0.72), rgba(204, 251, 241, 0.55)), url(/maro-hero.png)",
        }}
      />
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none z-0 hidden dark:block"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(6, 78, 59, 0.65)), url(/maro-hero.png)",
        }}
      />

      <div className="relative z-10 w-full max-w-none px-6 lg:px-16 py-10 lg:py-14 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-emerald-600 dark:text-emerald-300">Pacientes</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold lg:text-4xl text-slate-900 dark:text-white tracking-tight">Nuevo paciente</h1>
              <span className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full font-mono font-bold">
                {session.clues ? `CLUES ${session.clues}` : "Sesión"}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl">
              Captura completa de datos para catálogo de pacientes así como tamizajes iniciales primer contacto
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Modal de Error */}
        {error && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-900 shadow-2xl p-6">
              <div className="flex items-center gap-4 text-rose-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-xl font-bold">Error en el registro</h2>
              </div>
              <p className="text-slate-700 dark:text-slate-200 mb-6">{error}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* PANEL DE RECOMENDACIONES CLÍNICAS */}
          <aside className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-5 space-y-4 shadow-xl lg:sticky lg:top-6 transition-colors">
            <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <i className="fa-solid fa-clipboard-check text-emerald-600 dark:text-emerald-400"></i>
              <span>Recomendaciones</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-b border-slate-200 dark:border-white/10 pb-3">
              Guías y acciones sugeridas en tiempo real según el perfil clínico de la paciente.
            </p>

            {/* ALERTA DE SEGUNDO NIVEL POR FACTORES DE RIESGO SELECCIONADOS */}
            {tieneAlertaSegundoNivel && (
              <div className="rounded-xl border border-amber-500/40 dark:border-amber-400/50 bg-amber-50 dark:bg-amber-500/20 p-3.5 space-y-2 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-triangle-exclamation text-sm text-amber-600 dark:text-amber-400"></i>
                  <span>Alerta de Referencia</span>
                </div>
                <p className="text-xs font-semibold text-amber-950 dark:text-amber-100 leading-snug">
                  Referencia a segundo nivel de atención con paraclínicos desde la primera consulta
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {factoresSegundoNivelActivos.map((factor, index) => (
                    <span
                      key={index}
                      className="text-[10px] bg-amber-100 dark:bg-amber-400/20 border border-amber-300 dark:border-amber-300/40 text-amber-900 dark:text-amber-200 font-medium px-2 py-0.5 rounded-full"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ALERTA DE REFERENCIA POR ANTECEDENTE DE PREECLAMPSIA */}
            {form.ant_preeclampsia && (
              <div className="rounded-xl border border-amber-500/40 dark:border-amber-400/50 bg-amber-50 dark:bg-amber-500/20 p-3.5 space-y-2 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-triangle-exclamation text-sm text-amber-600 dark:text-amber-400"></i>
                  <span>Alerta de Referencia</span>
                </div>
                <p className="text-xs font-semibold text-amber-950 dark:text-amber-100 leading-snug">
                  Referencia a segundo nivel de atención con paraclínicos desde la primera consulta + Vigilar ganancia ponderal + Vigilar proteinuria, T.A. a partir de las 20 SDG
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-400/20 border border-amber-300 dark:border-amber-300/40 text-amber-900 dark:text-amber-200 font-medium px-2 py-0.5 rounded-full">
                    Antecedente de preeclampsia
                  </span>
                </div>
              </div>
            )}

            {/* ALERTA DE NOTIFICACION POR TAMIZAJES REACTIVOS */}
            {tieneAlertaNotificacion && (
              <div className="rounded-xl border border-rose-500/40 dark:border-rose-400/60 bg-rose-50 dark:bg-rose-500/20 p-3.5 space-y-2 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-bullhorn text-sm text-rose-600 dark:text-rose-400"></i>
                  <span>Alerta de Notificación</span>
                </div>
                <p className="text-xs font-semibold text-rose-950 dark:text-rose-100 leading-snug">
                  Informar inmediatamente a enlace zonal y epidemiología regional, seguimiento normativo hasta descarte o confirmación
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {tamizajesReactivosActivos.map((tamizaje, index) => (
                    <span
                      key={index}
                      className="text-[10px] bg-rose-100 dark:bg-rose-400/20 border border-rose-300 dark:border-rose-300/40 text-rose-900 dark:text-rose-200 font-medium px-2 py-0.5 rounded-full"
                    >
                      {tamizaje}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ALERTA DE NOTIFICACION POR VIOLENCIA */}
            {form.violencia === "Positiva" && (
              <div className="rounded-xl border border-rose-500/40 dark:border-rose-400/60 bg-rose-50 dark:bg-rose-500/20 p-3.5 space-y-2 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-shield-halved text-sm text-rose-600 dark:text-rose-400"></i>
                  <span>Alerta de Notificación</span>
                </div>
                <p className="text-xs font-semibold text-rose-950 dark:text-rose-100 leading-snug">
                  Integrar ruta de atencion para violencia; Notificación de caso a enlace zonal
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[10px] bg-rose-100 dark:bg-rose-400/20 border border-rose-300 dark:border-rose-300/40 text-rose-900 dark:text-rose-200 font-medium px-2 py-0.5 rounded-full">
                    Tamizaje de violencia positiva
                  </span>
                </div>
              </div>
            )}

            {/* ALERTA DE DISCAPACIDAD */}
            {form.factor_discapacidad && (
              <div className="rounded-xl border border-sky-500/40 dark:border-sky-400/60 bg-sky-50 dark:bg-sky-500/20 p-3.5 space-y-2 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-wheelchair text-sm text-sky-600 dark:text-sky-400"></i>
                  <span>Alerta de Discapacidad</span>
                </div>
                <p className="text-xs font-semibold text-sky-950 dark:text-sky-100 leading-snug">
                  Fortalecer red social, manejo conjunto con segundo nivel de atención
                </p>
              </div>
            )}

            {getRecomendaciones().length === 0 ? (
              !tieneAlertaSegundoNivel &&
              !form.ant_preeclampsia &&
              !tieneAlertaNotificacion &&
              form.violencia !== "Positiva" &&
              !form.factor_discapacidad && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed">
                  No hay recomendaciones activas basadas en los datos capturados actualmente.
                </p>
              )
            ) : (
              <ul className="space-y-3">
                {getRecomendaciones().map((rec, index) => (
                  <li key={index} className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {/* SUMATORIA Y CONTADOR DE RIESGOS INLINE */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Puntaje y Hallazgos</h4>
              <ContadorRiesgo 
                formData={form} 
                isInline={true}
                onPuntajeChange={(puntosAntecedentes, puntosTamizajes) => {
                  setPuntajeFactorAntecedentes(puntosAntecedentes);
                  setPuntajeFactorTamizajes(puntosTamizajes);
                }}
              />
            </div>
          </aside>

          <form
            onSubmit={handleSubmit}
            className="lg:col-span-8 xl:col-span-9 space-y-6"
          >
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl dark:shadow-2xl transition-colors">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-id-card text-emerald-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Identificación</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Datos personales y de contacto</p>
                </div>
              </div>
              <span className="text-xs text-emerald-800 dark:text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">Obligatorio *</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Nombre completo *</span>
                <input
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.nombre_completo.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
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
                <span className="text-slate-700 dark:text-slate-100 font-medium">Folio {loadingFolio && "(generando...)"}</span>
                <input
                  className="w-full rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                  value={form.folio}
                  readOnly
                  disabled
                  placeholder={loadingFolio ? "Generando folio..." : "Se generará automáticamente"}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Generado automáticamente: CLUES-###</p>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">CURP</span>
                <input
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    !form.curp
                      ? "border-slate-300 dark:border-white/10"
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
                      ? (form.edad && (Number(form.edad) > 55 || Number(form.edad) < 10))
                        ? "text-amber-400 font-bold"
                        : "text-emerald-400"
                      : "text-rose-400"
                  }`}>
                    {form.curp.length < 18
                      ? `Incompleta: ${form.curp.length}/18 caracteres`
                      : /^[A-ZÑ]{4}\d{6}[HMX][A-ZÑ]{5}[A-Z0-9][A-Z0-9]$/.test(form.curp)
                      ? (form.edad && (Number(form.edad) > 55 || Number(form.edad) < 10))
                        ? `⚠️ CURP válida, pero la edad calculada (${form.edad} años) es inusual para embarazo. Verifique los datos.`
                        : "✓ CURP válida. Edad calculada automáticamente."
                      : "✗ Formato de CURP inválido"}
                  </p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-100 font-medium">Edad *</span>
                  {form.edad && Number(form.edad) > 35 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-400/50 text-amber-800 dark:text-amber-300">
                      ⚠️ Edad de riesgo (+4 pts)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={10}
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.edad.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : form.edad && Number(form.edad) > 35
                      ? "border-amber-400/80 dark:border-amber-400/60 focus:border-amber-500"
                      : "border-slate-300 dark:border-white/10"
                  }`}
                  value={form.edad}
                  onChange={(e) => handleChange("edad", e.target.value)}
                />
                {form.edad && Number(form.edad) > 35 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                    <i className="fa-solid fa-circle-exclamation text-xs"></i>
                    <span>Edad de riesgo obstétrico detectada (&gt; 35 años).</span>
                  </p>
                )}
                {attemptedSubmit && !form.edad.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La edad es obligatoria</p>
                )}
              </label>
              <div className="flex flex-wrap items-center gap-3 pt-6">
                {[
                  { key: "indigena", label: "Población indígena", icon: "fa-solid fa-users" },
                  { key: "migrante", label: "Población migrante", icon: "fa-solid fa-person-walking-luggage" },
                ].map((item) => {
                  const isChecked = Boolean((form as any)[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggle(item.key)}
                      className={`group flex items-center gap-2.5 h-10 rounded-lg px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                        isChecked
                          ? "bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500/50 dark:border-emerald-400/60 text-emerald-950 dark:text-emerald-100 font-semibold shadow-sm ring-1 ring-emerald-500/40 dark:ring-emerald-400/30"
                          : "bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <div
                        className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                          isChecked
                            ? "bg-emerald-500 shadow-sm shadow-emerald-500/40"
                            : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                            isChecked ? "translate-x-3 bg-white" : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                          }`}
                        />
                      </div>
                      <i className={`${item.icon} ${isChecked ? "text-emerald-600 dark:text-emerald-300" : "text-slate-400"}`}></i>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Derechohabiencia *</span>
                <select
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.derechohabiencia.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
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
                <span className="text-slate-700 dark:text-slate-100 font-medium">Región</span>
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  placeholder={session.region || ""}
                  readOnly
                  disabled
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Controlado por la sesión</p>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">CLUES *</span>
                <input
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.clues_id.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Controlado por la sesión</p>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Unidad</span>
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.unidad}
                  onChange={(e) => handleChange("unidad", e.target.value)}
                  readOnly
                  disabled
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Controlado por la sesión</p>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Municipio</span>
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.municipio}
                  onChange={(e) => handleChange("municipio", e.target.value)}
                  readOnly
                  disabled
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Controlado por la sesión</p>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Localidad *</span>
                <input
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.localidad.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
                  }`}
                  value={form.localidad}
                  onChange={(e) => handleChange("localidad", e.target.value)}
                />
                {attemptedSubmit && !form.localidad.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La localidad es obligatoria</p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Colonia *</span>
                <input
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.colonia.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
                  }`}
                  value={form.colonia}
                  onChange={(e) => handleChange("colonia", e.target.value)}
                />
                {attemptedSubmit && !form.colonia.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La colonia es obligatoria</p>
                )}
              </label>

              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Dirección *</span>
                <input
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.direccion.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
                  }`}
                  value={form.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                />
                {attemptedSubmit && !form.direccion.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La dirección es obligatoria</p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Teléfono</span>
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.telefono}
                  onChange={(e) => handleChange("telefono", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl dark:shadow-2xl transition-colors">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-notes-medical text-cyan-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Ingreso CPN y riesgo</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Datos clínicos iniciales</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Fecha ingreso CPN *</span>
                <input
                  type="date"
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.fecha_ingreso_cpn.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
                  }`}
                  value={form.fecha_ingreso_cpn}
                  onChange={(e) => handleChange("fecha_ingreso_cpn", e.target.value)}
                />
                {attemptedSubmit && !form.fecha_ingreso_cpn.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La fecha de ingreso es obligatoria</p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">FUM *</span>
                <input
                  type="date"
                  className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                    attemptedSubmit && !form.fum.trim()
                      ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                      : "border-slate-300 dark:border-white/10"
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
                      sdg_ingreso: gestacionData.sdg_ingreso,
                    }));
                  }}
                />
                {attemptedSubmit && !form.fum.trim() && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">✗ La FUM es obligatoria</p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Semanas gestación</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.semanas_gestacion}
                  readOnly
                  placeholder="Se calcula desde la FUM"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">FPP</span>
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.fpp}
                  readOnly
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Tipo de riesgo social</span>
                <select
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.tipo_riesgo_social}
                  onChange={(e) => handleChange("tipo_riesgo_social", e.target.value)}
                >
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">IMC inicial</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
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
                <span className="text-slate-700 dark:text-slate-100 font-medium">Ganancia ponderal máx Kg.</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.ganancia_ponderal_max}
                  readOnly
                  placeholder="Se calcula desde IMC inicial"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Hospital de referencia</span>
                <select
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all focus:border-emerald-500 focus:ring-emerald-500"
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
                <span className="text-slate-700 dark:text-slate-100 font-medium">Tipo de localidad</span>
                <select
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.tipo_localidad}
                  onChange={(e) => handleChange("tipo_localidad", e.target.value)}
                >
                  <option value="Urbana">Urbana</option>
                  <option value="Rural">Rural</option>
                </select>
              </label>
            </div>

            {/* FACTORES DE RIESGO: Comorbilidades y toxicomanías (Rediseño Híbrido: Grupos + Chips) */}
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setMostrarFactoresRiesgo(!mostrarFactoresRiesgo)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-100 font-medium bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <i className={`fa-solid ${mostrarFactoresRiesgo ? "fa-chevron-down" : "fa-chevron-right"} text-xs text-slate-400`}></i>
                    <i className="fa-solid fa-clipboard-list text-base text-indigo-400"></i>
                    <span>Factores de riesgo (Comorbilidades y antecedentes)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const totalSeleccionados = [
                        form.factor_diabetes, form.factor_hipertension, form.factor_obesidad,
                        form.factor_cardiopatia, form.factor_hepatopatia, form.factor_enf_autoinmune,
                        form.factor_nefropatia, form.factor_coagulopatias, form.factor_neuropatia,
                        form.factor_enf_psiquiatrica, form.factor_alcoholismo, form.factor_tabaquismo,
                        form.factor_drogas_ilicitas, form.factor_endocrinopatia, form.factor_neumopatia,
                        form.factor_its, form.factor_cirugias_pelvico_uterinas, form.factor_discapacidad,
                      ].filter(Boolean).length;
                      return totalSeleccionados > 0 ? (
                        <span className="text-[11px] bg-amber-100 dark:bg-amber-500/20 border border-amber-400/60 text-amber-900 dark:text-amber-200 font-bold px-2.5 py-0.5 rounded-full">
                          {totalSeleccionados} {totalSeleccionados === 1 ? 'seleccionado' : 'seleccionados'}
                        </span>
                      ) : null;
                    })()}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {mostrarFactoresRiesgo ? 'Ocultar' : 'Mostrar'}
                    </span>
                  </div>
                </button>
              </div>
              
              {mostrarFactoresRiesgo && (
                <div className="space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                  {/* 1. SECCIÓN PRINCIPAL: COMORBILIDADES MÉDICAS (ANCHO COMPLETO CON GRID UNIFORME DE 4 COLUMNAS) */}
                  {(() => {
                    const comorbilidades = [
                      { key: "factor_endocrinopatia", label: "Endocrinopatía", puntos: 12, nivel: "critico" },
                      { key: "factor_neumopatia", label: "Neumopatía", puntos: 12, nivel: "critico" },
                      { key: "factor_cardiopatia", label: "Cardiopatía", puntos: 12, nivel: "critico" },
                      { key: "factor_coagulopatias", label: "Coagulopatías", puntos: 12, nivel: "critico" },
                      { key: "factor_nefropatia", label: "Nefropatía", puntos: 12, nivel: "critico" },
                      { key: "factor_hepatopatia", label: "Hepatopatía", puntos: 12, nivel: "critico" },
                      { key: "factor_enf_autoinmune", label: "Enf. autoinmune", puntos: 12, nivel: "critico" },
                      { key: "factor_diabetes", label: "Diabetes", puntos: 4, nivel: "moderado" },
                      { key: "factor_hipertension", label: "Hipertensión", puntos: 4, nivel: "moderado" },
                      { key: "factor_neuropatia", label: "Neuropatía", puntos: 4, nivel: "moderado" },
                      { key: "factor_enf_psiquiatrica", label: "Enf. psiquiátrica", puntos: 4, nivel: "moderado" },
                      { key: "factor_obesidad", label: "Obesidad", puntos: 4, nivel: "moderado" },
                    ];
                    const activos = comorbilidades.filter((i) => (form as any)[i.key]).length;

                    return (
                      <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-white/5 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-100 font-medium uppercase tracking-wider">
                            <i className="fa-solid fa-stethoscope text-sm text-cyan-400"></i>
                            <span>Comorbilidades Médicas y Sistémicas</span>
                          </div>
                          {activos > 0 && (
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-400/60 px-2.5 py-0.5 rounded-full">
                              {activos} activa{activos > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                          {comorbilidades.map((item) => {
                            const isChecked = Boolean((form as any)[item.key]);
                            const isCritico = item.nivel === "critico";

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleToggle(item.key)}
                                className={`group relative flex items-center justify-between gap-2.5 h-11 rounded-lg px-3 text-xs font-medium transition-all duration-150 cursor-pointer border ${
                                  isChecked
                                    ? isCritico
                                      ? "bg-rose-50 dark:bg-rose-500/20 border-rose-500/50 dark:border-rose-400/60 text-rose-950 dark:text-rose-100 font-semibold shadow-sm ring-1 ring-rose-500/40 dark:ring-rose-400/30"
                                      : "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-400/60 text-indigo-950 dark:text-indigo-100 font-semibold shadow-sm ring-1 ring-indigo-500/40 dark:ring-indigo-400/30"
                                    : "bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Micro Switch Toggle */}
                                  <div
                                    className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                                      isChecked
                                        ? isCritico
                                          ? "bg-rose-500 shadow-sm shadow-rose-500/40"
                                          : "bg-indigo-500 shadow-sm shadow-indigo-500/40"
                                        : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                                    }`}
                                  >
                                    <div
                                      className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                                        isChecked
                                          ? "translate-x-3 bg-white"
                                          : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                                      }`}
                                    />
                                  </div>
                                  <span className="truncate font-medium">{item.label}</span>
                                </div>
                                <span
                                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                                    isChecked
                                      ? isCritico
                                        ? "bg-rose-100 dark:bg-rose-400/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-300/40"
                                        : "bg-indigo-100 dark:bg-indigo-400/25 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-300/40"
                                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20 group-hover:text-slate-900 dark:group-hover:text-white"
                                  }`}
                                >
                                  +{item.puntos}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. FILA INFERIOR: 3 TARJETAS COMPLEMENTARIAS ALINEADAS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {[
                      {
                        titulo: "Toxicomanías y Hábitos",
                        icono: "fa-solid fa-smoking text-amber-400",
                        items: [
                          { key: "factor_drogas_ilicitas", label: "Otras drogas", puntos: 6, nivel: "alto" },
                          { key: "factor_alcoholismo", label: "Alcoholismo", puntos: 4, nivel: "moderado" },
                          { key: "factor_tabaquismo", label: "Tabaquismo", puntos: 2, nivel: "leve" },
                        ],
                      },
                      {
                        titulo: "Antecedentes Gineco-Infecciosos",
                        icono: "fa-solid fa-microscope text-indigo-400",
                        items: [
                          { key: "factor_cirugias_pelvico_uterinas", label: "Cirugías pélvico uterinas", puntos: 4, nivel: "moderado" },
                          { key: "factor_its", label: "ITS", puntos: 4, nivel: "moderado" },
                        ],
                      },
                      {
                        titulo: "Condición y Apoyo Especial",
                        icono: "fa-solid fa-wheelchair text-rose-400",
                        items: [
                          { key: "factor_discapacidad", label: "Discapacidad", puntos: 12, nivel: "critico" },
                        ],
                      },
                    ].map((grupo) => {
                      const grupoActivos = grupo.items.filter((item) => (form as any)[item.key]).length;

                      return (
                        <div
                          key={grupo.titulo}
                          className="rounded-xl border border-slate-300 dark:border-white/10 bg-white/5 p-4 space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-2.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-100 font-medium uppercase tracking-wider">
                                <i className={`${grupo.icono} text-sm`}></i>
                                <span>{grupo.titulo}</span>
                              </div>
                              {grupoActivos > 0 && (
                                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-400/60 px-2.5 py-0.5 rounded-full">
                                  {grupoActivos} activo{grupoActivos > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>

                            <div className="space-y-2">
                              {grupo.items.map((item) => {
                                const isChecked = Boolean((form as any)[item.key]);
                                const isCritico = item.nivel === "critico";
                                const isAlto = item.nivel === "alto";

                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleToggle(item.key)}
                                    className={`group w-full relative flex items-center justify-between gap-2.5 h-11 rounded-lg px-3 text-xs font-medium transition-all duration-150 cursor-pointer border ${
                                      isChecked
                                        ? isCritico
                                          ? "bg-rose-50 dark:bg-rose-500/20 border-rose-500/50 dark:border-rose-400/60 text-rose-950 dark:text-rose-100 font-semibold shadow-sm ring-1 ring-rose-500/40 dark:ring-rose-400/30"
                                          : isAlto
                                          ? "bg-amber-50 dark:bg-amber-500/20 border-amber-500/50 dark:border-amber-400/60 text-amber-950 dark:text-amber-100 font-semibold shadow-sm ring-1 ring-amber-500/40 dark:ring-amber-400/30"
                                          : "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-400/60 text-indigo-950 dark:text-indigo-100 font-semibold shadow-sm ring-1 ring-indigo-500/40 dark:ring-indigo-400/30"
                                        : "bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {/* Micro Switch Toggle */}
                                      <div
                                        className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                                          isChecked
                                            ? isCritico
                                              ? "bg-rose-500 shadow-sm shadow-rose-500/40"
                                              : isAlto
                                              ? "bg-amber-500 shadow-sm shadow-amber-500/40"
                                              : "bg-indigo-500 shadow-sm shadow-indigo-500/40"
                                            : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                                        }`}
                                      >
                                        <div
                                          className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                                            isChecked
                                              ? "translate-x-3 bg-white"
                                              : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                                          }`}
                                        />
                                      </div>
                                      <span className="truncate font-medium">{item.label}</span>
                                    </div>
                                    <span
                                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                                        isChecked
                                          ? isCritico
                                            ? "bg-rose-100 dark:bg-rose-400/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-300/40"
                                            : isAlto
                                            ? "bg-amber-100 dark:bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-300/40"
                                            : "bg-indigo-100 dark:bg-indigo-400/25 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-300/40"
                                          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20 group-hover:text-slate-900 dark:group-hover:text-white"
                                      }`}
                                    >
                                      +{item.puntos}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. OTROS ANTECEDENTES (SWITCH + CAMPO DE TEXTO MÁXIMO 50 CARACTERES) */}
                  <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <i className="fa-solid fa-file-pen text-base text-indigo-500 dark:text-indigo-400"></i>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-100 font-medium uppercase tracking-wider">
                            Otros Antecedentes
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            ¿La paciente presenta algún otro antecedente no especificado arriba?
                          </p>
                        </div>
                      </div>

                      {/* Switch de activación */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.tiene_otros_antecedentes}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            tiene_otros_antecedentes: !prev.tiene_otros_antecedentes,
                            otros_antecedentes: !prev.tiene_otros_antecedentes ? prev.otros_antecedentes : "",
                          }))
                        }
                        className={`group shrink-0 flex items-center gap-2 rounded-full p-1 pr-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                          form.tiene_otros_antecedentes
                            ? "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-400/60 text-indigo-950 dark:text-indigo-100 font-semibold shadow-sm ring-1 ring-indigo-500/40 dark:ring-indigo-400/30"
                            : "bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div
                          className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                            form.tiene_otros_antecedentes
                              ? "bg-indigo-500 shadow-sm shadow-indigo-500/40"
                              : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                              form.tiene_otros_antecedentes
                                ? "translate-x-3 bg-white"
                                : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                            }`}
                          />
                        </div>
                        <span className="text-[11px] font-semibold">
                          {form.tiene_otros_antecedentes ? "Activado" : "Desactivado"}
                        </span>
                      </button>
                    </div>

                    {form.tiene_otros_antecedentes && (
                      <div className="pt-3 border-t border-slate-300 dark:border-white/10 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-100 font-medium">
                          Descripción del antecedente <span className="text-slate-500 dark:text-slate-400 text-xs font-normal">(máximo 50 caracteres)</span>
                        </label>
                        <input
                          type="text"
                          maxLength={50}
                          value={form.otros_antecedentes}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              otros_antecedentes: e.target.value.slice(0, 50),
                            }))
                          }
                          placeholder="Ej. Alergia severa a penicilina, hipotiroidismo..."
                          className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                        />
                        <div className="flex items-center justify-between text-xs px-0.5">
                          <span className="text-slate-500 dark:text-slate-400">
                            Registro descriptivo complementario para el expediente
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              50 - (form.otros_antecedentes || "").length <= 5
                                ? "text-rose-600 dark:text-rose-400"
                                : 50 - (form.otros_antecedentes || "").length <= 15
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {50 - (form.otros_antecedentes || "").length} caracteres restantes ({(form.otros_antecedentes || "").length}/50)
                          </span>
                        </div>
                      </div>
                    )}
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
                  className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-100 font-medium bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <i className={`fa-solid ${mostrarFactoresEpid ? "fa-chevron-down" : "fa-chevron-right"} text-xs text-slate-400`}></i>
                    <i className="fa-solid fa-virus text-base text-rose-500 dark:text-rose-400"></i>
                    <span>Factores epidemiológicos</span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {mostrarFactoresEpid ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>
              </div>
              
              {mostrarFactoresEpid && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-slate-600 dark:text-slate-300 px-1 font-normal">
                    Portadora o contacto de enfermedad sujeta a vigilancia epidemiológica (Tuberculosis, VIH, Sífilis, Chagas, etc.)
                  </p>
                  
                  {/* FILA HORIZONTAL DE 3 COLUMNAS COMPACTAS CON MICRO-SWITCH */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { value: "ninguno", label: "Ninguno", icono: "fa-solid fa-circle-check" },
                      { value: "es_contacto", label: "Es contacto", icono: "fa-solid fa-triangle-exclamation" },
                      { value: "es_portadora", label: "Es portadora", icono: "fa-solid fa-biohazard" },
                    ].map((opt) => {
                      const isSelected = form.factores_riesgo_epid === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('factores_riesgo_epid', opt.value)}
                          className={`group flex items-center gap-2.5 h-11 rounded-lg px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                            isSelected
                              ? opt.value === "es_portadora"
                                ? "bg-rose-50 dark:bg-rose-500/20 border-rose-500/50 dark:border-rose-400/60 text-rose-950 dark:text-rose-100 font-semibold shadow-sm ring-1 ring-rose-500/40 dark:ring-rose-400/30"
                                : opt.value === "es_contacto"
                                ? "bg-amber-50 dark:bg-amber-500/20 border-amber-500/50 dark:border-amber-400/60 text-amber-950 dark:text-amber-100 font-semibold shadow-sm ring-1 ring-amber-500/40 dark:ring-amber-400/30"
                                : "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-400/60 text-indigo-950 dark:text-indigo-100 font-semibold shadow-sm ring-1 ring-indigo-500/40 dark:ring-indigo-400/30"
                              : "bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <div
                            className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                              isSelected
                                ? opt.value === "es_portadora"
                                  ? "bg-rose-500 shadow-sm shadow-rose-500/40"
                                  : opt.value === "es_contacto"
                                  ? "bg-amber-500 shadow-sm shadow-amber-500/40"
                                  : "bg-indigo-500 shadow-sm shadow-indigo-500/40"
                                : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                                isSelected ? "translate-x-3 bg-white" : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                              }`}
                            />
                          </div>
                          <i className={`${opt.icono} text-xs ${
                            isSelected
                              ? opt.value === "es_portadora"
                                ? "text-rose-600 dark:text-rose-300"
                                : opt.value === "es_contacto"
                                ? "text-amber-600 dark:text-amber-300"
                                : "text-indigo-600 dark:text-indigo-300"
                              : "text-slate-400"
                          }`}></i>
                          <span className="truncate font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl dark:shadow-2xl transition-colors">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-400/30 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-person-pregnant text-pink-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Antecedentes gineco-obstétricos</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Paridad y riesgos previos</p>
                </div>
              </div>
            </div>

            {/* Nota aclaratoria sobre la fórmula obstétrica */}
            <div className="rounded-xl border border-sky-200 dark:border-sky-500/20 bg-sky-50/80 dark:bg-sky-500/10 p-3.5 text-xs text-sky-950 dark:text-sky-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-sky-950 dark:text-sky-100">
                <i className="fa-solid fa-circle-info text-sky-600 dark:text-sky-400 text-sm shrink-0"></i>
                <span>Nota sobre la Fórmula Obstétrica (G - P - C - A):</span>
              </div>
              <p className="leading-relaxed pl-5">
                El total de <strong>Gestas</strong> incluye el <strong>embarazo actual en curso (+1)</strong> más todos los eventos previos resueltos (Partos, Cesáreas y Abortos).
                Por ejemplo, si la paciente tuvo 2 embarazos previos y acude por este nuevo registro, sus Gestas deben ser <strong>3</strong>.
                Regla de congruencia: <code className="font-mono font-bold bg-sky-100 dark:bg-sky-900/50 px-1.5 py-0.5 rounded text-[11px]">Gestas = Partos + Cesáreas + Abortos + 1</code>.
              </p>
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
                  <span className="text-slate-700 dark:text-slate-100 font-medium">
                    {item.label} {item.required ? "*" : ""}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={`w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white transition-all ${
                      attemptedSubmit && item.required && !(form as any)[item.key].trim()
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-500/5"
                        : "border-slate-300 dark:border-white/10"
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

            {/* Verificador visual en tiempo real de fórmula obstétrica (G = P + C + A + 1) */}
            {form.gestas.trim() !== "" && (form.partos.trim() !== "" || form.cesareas.trim() !== "" || form.abortos.trim() !== "") && (() => {
              const g = Number(form.gestas) || 0;
              const p = Number(form.partos) || 0;
              const c = Number(form.cesareas) || 0;
              const a = Number(form.abortos) || 0;
              const totalEsperado = p + c + a + 1;
              const esValido = g === totalEsperado && g >= 1;

              return (
                <div className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-center justify-between gap-3 transition-all ${
                  esValido
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400/40 text-emerald-950 dark:text-emerald-200"
                    : "bg-amber-50 dark:bg-amber-500/15 border-amber-400/50 text-amber-950 dark:text-amber-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${esValido ? "fa-circle-check text-emerald-600 dark:text-emerald-400" : "fa-triangle-exclamation text-amber-600 dark:text-amber-400"}`}></i>
                    <span>
                      Fórmula Obstétrica: <strong>P ({p}) + C ({c}) + A ({a}) + 1 (actual) = {totalEsperado}</strong>
                      {esValido ? ` (Correcto: coincide con Gestas totales: ${g})` : ` ≠ Gestas capturadas (${g})`}
                    </span>
                  </div>
                  {!esValido && (
                    <span className="font-bold text-amber-800 dark:text-amber-300 shrink-0">
                      ⚠️ Incongruencia en Gestas
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "ant_preeclampsia", label: "Antecedente de preeclampsia", puntos: 4 },
                { key: "ant_hemorragia", label: "Antecedente de hemorragia", puntos: 4 },
                { key: "ant_sepsis", label: "Antecedente de sepsis", puntos: 6 },
                { key: "ant_bajo_peso_macrosomia", label: "RN bajo peso / macrosomía", puntos: 6 },
                { key: "ant_muerte_perinatal", label: "Muerte perinatal", puntos: 6 },
                { key: "ant_embarazo_ectopico", label: "Embarazo ectópico", puntos: 6 },
              ].map((item) => {
                const isChecked = Boolean((form as any)[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`group flex items-center justify-between gap-2.5 h-11 rounded-lg px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                      isChecked
                        ? item.puntos === 6
                          ? "bg-amber-50 dark:bg-amber-500/20 border-amber-500/50 dark:border-amber-400/60 text-amber-950 dark:text-amber-100 font-semibold shadow-sm ring-1 ring-amber-500/40 dark:ring-amber-400/30"
                          : "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500/50 dark:border-indigo-400/60 text-indigo-950 dark:text-indigo-100 font-semibold shadow-sm ring-1 ring-indigo-500/40 dark:ring-indigo-400/30"
                        : "bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Micro Switch Toggle */}
                      <div
                        className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                          isChecked
                            ? item.puntos === 6
                              ? "bg-amber-500 shadow-sm shadow-amber-500/40"
                              : "bg-indigo-500 shadow-sm shadow-indigo-500/40"
                            : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                            isChecked ? "translate-x-3 bg-white" : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                          }`}
                        />
                      </div>
                      <span className="truncate font-medium">{item.label}</span>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                        isChecked
                          ? item.puntos === 6
                            ? "bg-amber-100 dark:bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-300/40"
                            : "bg-indigo-100 dark:bg-indigo-400/25 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-300/40"
                          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20 group-hover:text-slate-900 dark:group-hover:text-white"
                      }`}
                    >
                      +{item.puntos}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl dark:shadow-2xl transition-colors">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-vials text-indigo-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Tamizajes iniciales</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Detecciones del primer contacto</p>
                </div>
              </div>
              <span className="text-xs text-emerald-800 dark:text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">Primer contacto</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-900 dark:text-emerald-50">
                <i className="fa-solid fa-circle-info mt-0.5 text-base text-emerald-600 dark:text-emerald-300 shrink-0"></i>
                <p className="text-sm">Captura las pruebas de VIH, VDRL, Hepatitis C, glicemia y violencia realizadas en el primer contacto con la paciente.</p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[
                {
                  key: "prueba_vih",
                  label: "Prueba VIH",
                  icono: "fa-solid fa-virus",
                  valorActivo: "Reactiva",
                  valorInactivo: "No reactiva",
                  labelActivo: "Reactiva (+4)",
                  labelInactivo: "No reactiva",
                  tipo: "binario",
                },
                {
                  key: "prueba_vdrl",
                  label: "Prueba VDRL (Sífilis)",
                  icono: "fa-solid fa-vial-virus",
                  valorActivo: "Reactiva",
                  valorInactivo: "No reactiva",
                  labelActivo: "Reactiva (+4)",
                  labelInactivo: "No reactiva",
                  tipo: "binario",
                },
                {
                  key: "prueba_hepatitis_c",
                  label: "Prueba Hepatitis C",
                  icono: "fa-solid fa-disease",
                  valorActivo: "Reactiva",
                  valorInactivo: "No reactiva",
                  labelActivo: "Reactiva (+4)",
                  labelInactivo: "No reactiva",
                  tipo: "binario",
                },
                {
                  key: "diabetes_glicemia",
                  label: "Diabetes / Glicemia",
                  icono: "fa-solid fa-droplet",
                  tipo: "tri-state",
                },
                {
                  key: "violencia",
                  label: "Violencia",
                  icono: "fa-solid fa-shield-halved",
                  valorActivo: "Positiva",
                  valorInactivo: "Negativa",
                  labelActivo: "Positiva (+4)",
                  labelInactivo: "Negativa",
                  tipo: "binario",
                },
              ].map((item) => {
                if (item.tipo === "tri-state") {
                  const val = form.diabetes_glicemia;
                  const isResistencia = val === "Resistencia a la insulina";
                  const isDiabetes = val === "Diabetes";
                  const isNormal = !val || val === "Normal";

                  const handleCycle = () => {
                    if (isNormal) {
                      handleChange("diabetes_glicemia", "Resistencia a la insulina");
                    } else if (isResistencia) {
                      handleChange("diabetes_glicemia", "Diabetes");
                    } else {
                      handleChange("diabetes_glicemia", "Normal");
                    }
                  };

                  return (
                    <div key={item.key} className="relative group/tooltip">
                      <button
                        type="button"
                        onClick={handleCycle}
                        title="Switch de 3 posiciones: Haz clic para alternar entre Normal (0 pts) → Resistencia a la insulina (+4 pts) → Diabetes (+6 pts)"
                        className={`w-full group flex items-center justify-between gap-2.5 h-12 rounded-lg px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                          isDiabetes
                            ? "bg-rose-50 dark:bg-rose-500/20 border-rose-500/50 dark:border-rose-400/60 text-rose-950 dark:text-rose-100 font-semibold shadow-sm ring-1 ring-rose-500/40 dark:ring-rose-400/30"
                            : isResistencia
                            ? "bg-amber-50 dark:bg-amber-500/20 border-amber-500/50 dark:border-amber-400/60 text-amber-950 dark:text-amber-100 font-semibold shadow-sm ring-1 ring-amber-500/40 dark:ring-amber-400/30"
                            : "bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Micro Switch Toggle de 3 posiciones */}
                          <div
                            className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                              isDiabetes
                                ? "bg-rose-500 shadow-sm shadow-rose-500/40"
                                : isResistencia
                                ? "bg-amber-500 shadow-sm shadow-amber-500/40"
                                : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                                isDiabetes
                                  ? "translate-x-3 bg-white"
                                  : isResistencia
                                  ? "translate-x-1.5 bg-white"
                                  : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                              }`}
                            />
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <span className={`truncate font-semibold flex items-center gap-1.5 ${
                              isDiabetes
                                ? "text-rose-950 dark:text-rose-100"
                                : isResistencia
                                ? "text-amber-950 dark:text-amber-100"
                                : "text-slate-700 dark:text-slate-100 font-medium"
                            }`}>
                              <i className={`${item.icono} text-xs ${
                                isDiabetes
                                  ? "text-rose-600 dark:text-rose-300"
                                  : isResistencia
                                  ? "text-amber-600 dark:text-amber-300"
                                  : "text-slate-400"
                              }`}></i>
                              <span>{item.label}</span>
                            </span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                            isDiabetes
                              ? "bg-rose-100 dark:bg-rose-400/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-300/40"
                              : isResistencia
                              ? "bg-amber-100 dark:bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-300/40"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20 group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}
                        >
                          {isDiabetes
                            ? "Diabetes (+6)"
                            : isResistencia
                            ? "Resistencia (+4)"
                            : "Normal"}
                        </span>
                      </button>

                      {/* Tooltip flotante al hacer hover */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[260px] opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 z-30">
                        <div className="rounded-lg bg-slate-900/95 dark:bg-slate-800 text-white text-[11px] p-2.5 shadow-xl border border-slate-700 dark:border-white/20 space-y-1 text-center">
                          <p className="font-bold flex items-center justify-center gap-1.5 text-cyan-300">
                            <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                            <span>Switch de 3 posiciones</span>
                          </p>
                          <p className="text-[10px] text-slate-300 leading-tight">
                            Clic para rotar entre los 3 estados:
                          </p>
                          <div className="flex items-center justify-center gap-1 text-[10px] font-mono pt-0.5">
                            <span className={isNormal ? "text-emerald-400 font-bold underline" : "text-slate-400"}>Normal (0)</span>
                            <span className="text-slate-500">→</span>
                            <span className={isResistencia ? "text-amber-400 font-bold underline" : "text-slate-400"}>Resistencia (+4)</span>
                            <span className="text-slate-500">→</span>
                            <span className={isDiabetes ? "text-rose-400 font-bold underline" : "text-slate-400"}>Diabetes (+6)</span>
                          </div>
                        </div>
                        {/* Triángulo inferior del tooltip */}
                        <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-800 border-r border-b border-slate-700 dark:border-white/20 rotate-45 mx-auto -mt-1" />
                      </div>
                    </div>
                  );
                }

                const isChecked = (form as any)[item.key] === item.valorActivo;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      handleChange(
                        item.key,
                        (isChecked ? item.valorInactivo : item.valorActivo) || ""
                      )
                    }
                    className={`group flex items-center justify-between gap-2.5 h-12 rounded-lg px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                      isChecked
                        ? "bg-rose-50 dark:bg-rose-500/20 border-rose-500/50 dark:border-rose-400/60 text-rose-950 dark:text-rose-100 font-semibold shadow-sm ring-1 ring-rose-500/40 dark:ring-rose-400/30"
                        : "bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Micro Switch Toggle */}
                      <div
                        className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                          isChecked
                            ? "bg-rose-500 shadow-sm shadow-rose-500/40"
                            : "bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20 group-hover:bg-slate-300 dark:group-hover:bg-white/25"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                            isChecked
                              ? "translate-x-3 bg-white"
                              : "translate-x-0 bg-slate-400 dark:bg-white/70 group-hover:bg-slate-500 dark:group-hover:bg-white"
                          }`}
                        />
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <span className={`truncate font-semibold flex items-center gap-1.5 ${
                          isChecked ? "text-rose-950 dark:text-rose-100" : "text-slate-700 dark:text-slate-100 font-medium"
                        }`}>
                          <i className={`${item.icono} text-xs ${isChecked ? "text-rose-600 dark:text-rose-300" : "text-slate-400"}`}></i>
                          <span>{item.label}</span>
                        </span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                        isChecked
                          ? "bg-rose-100 dark:bg-rose-400/25 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-300/40"
                          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20 group-hover:text-slate-900 dark:group-hover:text-white"
                      }`}
                    >
                      {isChecked ? `${item.labelActivo}` : item.labelInactivo}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 p-6 space-y-4 shadow-xl dark:shadow-2xl transition-colors">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-truck-medical text-amber-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Red de apoyo y traslado</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Contacto de madrina y traslado</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Nombre de madrina</span>
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.madrina_nombre}
                  onChange={(e) => handleChange("madrina_nombre", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Teléfono de madrina</span>
                <input
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
                  value={form.madrina_telefono}
                  onChange={(e) => handleChange("madrina_telefono", e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700 dark:text-slate-100 font-medium">Mecanismo de traslado</span>
                <select
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3 py-2 text-slate-900 dark:text-white"
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
              className="rounded-lg border border-slate-300 dark:border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => router.push("/dashboard")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>


      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 shadow-2xl text-slate-900 dark:text-white transition-colors">
            {/* Encabezado */}
            <div className="border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 font-bold">Resumen de registro</p>
              <h2 id="confirm-modal-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                ¿Confirmar registro de paciente?
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Verifica los datos antes de guardar el expediente en el sistema.
              </p>
            </div>

            {/* Resumen de datos */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3 text-sm">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Nombre completo</dt>
                  <dd className="text-slate-900 dark:text-white font-medium mt-0.5">{form.nombre_completo || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">CURP</dt>
                  <dd className="text-slate-900 dark:text-white font-mono mt-0.5">{form.curp || "No capturado"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Folio</dt>
                  <dd className="text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">{form.folio || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Unidad / CLUES</dt>
                  <dd className="text-slate-900 dark:text-white mt-0.5">{form.unidad || "—"} / {form.clues_id || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Edad</dt>
                  <dd className="text-slate-900 dark:text-white mt-0.5">{form.edad ? `${form.edad} años` : "No capturada"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">FUM</dt>
                  <dd className="text-slate-900 dark:text-white mt-0.5">{form.fum || "No capturada"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Semanas gestación</dt>
                  <dd className="text-slate-900 dark:text-white mt-0.5">{form.semanas_gestacion ? `${form.semanas_gestacion} sdg` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Fecha ingreso CPN</dt>
                  <dd className="text-slate-900 dark:text-white mt-0.5">{form.fecha_ingreso_cpn || "No capturada"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Riesgo social</dt>
                  <dd className="text-slate-900 dark:text-white mt-0.5">{form.tipo_riesgo_social}</dd>
                </div>
              </dl>

              {(puntajeFactorAntecedentes + puntajeFactorTamizajes) > 0 && (
                <div className="rounded-lg border border-amber-500/40 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-800 dark:text-amber-200/80 uppercase tracking-wide font-bold">Factor de riesgo</p>
                  <p className="text-sm text-amber-950 dark:text-amber-100 mt-0.5">
                    Puntaje antecedentes: <strong>{puntajeFactorAntecedentes}</strong> ·
                    Tamizajes: <strong>{puntajeFactorTamizajes}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 border-t border-slate-200 dark:border-white/10 px-6 py-4">
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
                className="flex-1 rounded-lg border border-slate-300 dark:border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
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
                className="w-full rounded-lg bg-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-950 hover:bg-rose-200 transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA POR EDAD > 35 (EDAD DE RIESGO) */}
      {showEdadMayor35Modal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="edad-mayor-35-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-950/95 via-slate-900/95 to-amber-900/95 shadow-2xl">
            <div className="border-b border-white/15 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200/90 font-bold">Alerta Obstétrica</p>
                <h2 id="edad-mayor-35-modal-title" className="mt-1 text-xl font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-400"></i>
                  <span>Edad de riesgo ({form.edad || "—"} años)</span>
                </h2>
              </div>
              <span className="text-xs font-mono font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40 px-2.5 py-1 rounded-full">
                +4 pts riesgo
              </span>
            </div>

            <div className="px-6 py-5 space-y-3 text-amber-50">
              <p className="text-sm text-amber-100/90">
                Se detectó edad de <strong>{form.edad || "—"} años</strong>.
              </p>

              <ul className="space-y-2 text-sm">
                <li className="rounded-lg border border-amber-300/30 bg-amber-950/40 px-3 py-2 flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Vigilancia estrecha por edad extrema de riesgo (+4 puntos en semáforo de factores).</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-white/15 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setEdadMayor35Confirmada(true);
                  setShowEdadMayor35Modal(false);
                }}
                className="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
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
