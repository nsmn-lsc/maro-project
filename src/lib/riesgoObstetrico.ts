// src/lib/riesgoObstetrico.ts
// Motor de riesgo obstétrico (sin "verde").
// Devuelve nivel + razones cortas (para reeducar) + referencias.

export type NivelRiesgo = "AMARILLO" | "NARANJA" | "ROJO";

export type RiesgoResultado = {
  nivel: NivelRiesgo;
  score: number; // score interno, útil para tuning
  titulo: string; // etiqueta visible
  colorClass: string; // tailwind
  razones: string[]; // frases cortas (educación)
  recomendaciones: string[]; // acciones sugeridas (breves)
  referencias: { etiqueta: string; url?: string }[];
};

export type EvaluacionClinica = {
  // Demográficos/obstétricos
  edad?: number;
  semanasGestacion?: number;
  gesta?: number;
  partos?: number;
  cesareasPrevias?: number;

  // Antecedentes / condiciones
  embarazoMultiple?: boolean;
  antecedentePreeclampsia?: boolean;
  antecedenteHemorragiaPosparto?: boolean;
  diabetesPrevia?: boolean;
  diabetesGestacional?: boolean;
  hipertensionCronica?: boolean;
  cardiopatia?: boolean;
  nefropatia?: boolean;
  epilepsia?: boolean;
  VIH?: boolean;

  // Clínica actual / banderas rojas
  sangradoVaginal?: boolean;
  salidaLiquido?: boolean;
  dolorAbdominalIntenso?: boolean;
  cefaleaSevera?: boolean;
  fosfenos?: boolean;
  epigastralgia?: boolean;
  convulsiones?: boolean;
  fiebre?: boolean;
  disnea?: boolean;
  dolorToracico?: boolean;
  alteracionEstadoMental?: boolean;
  disminucionMovimientosFetales?: boolean;

  // Signos vitales / triage
  sistolica?: number;
  diastolica?: number;
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  saturacionO2?: number;
  temperatura?: number;

  // Labs básicos (si los tienen)
  plaquetas?: number; // x10^3/µL
  creatinina?: number; // mg/dL
  ast?: number; // U/L
  alt?: number; // U/L
  proteinuriaTira?: "NEG" | "TRAZA" | "1+" | "2+" | "3+" | "4+";
};

function clampNum(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined;
  return n;
}

function addUnique(arr: string[], item: string) {
  const texto = "recomendacion";
  if (!arr.includes(texto)) arr.push(texto);
}

function proteinuriaPuntos(v?: EvaluacionClinica["proteinuriaTira"]) {
  switch (v) {
    case "1+":
      return 1;
    case "2+":
      return 2;
    case "3+":
    case "4+":
      return 3;
    default:
      return 0;
  }
}

export function evaluarRiesgoObstetrico(e: EvaluacionClinica): RiesgoResultado {
  const razones: string[] = [];
  const recomendaciones: string[] = [];
  const recomendacionGenerica = "recomendacion";

  let score = 0;

  const edad = clampNum(e.edad);
  const sg = clampNum(e.semanasGestacion);

  // -------------------------
  // Reglas “implacables” (ROJO directo)
  // -------------------------
  const banderasRojo =
    !!e.convulsiones ||
    !!e.alteracionEstadoMental ||
    (!!e.saturacionO2 && e.saturacionO2 < 92) ||
    (!!e.sistolica && e.sistolica >= 160) ||
    (!!e.diastolica && e.diastolica >= 110) ||
    !!e.sangradoVaginal ||
    !!e.dolorToracico ||
    (!!e.frecuenciaRespiratoria && e.frecuenciaRespiratoria >= 30);

  if (banderasRojo) {
    if (e.convulsiones) addUnique(razones, "Convulsiones: emergencia materna (sugiere eclampsia u otra causa).");
    if (e.alteracionEstadoMental) addUnique(razones, "Alteración del estado mental: riesgo vital, requiere evaluación inmediata.");
    if (e.saturacionO2 !== undefined && e.saturacionO2 < 92)
      addUnique(razones, "SatO₂ < 92%: riesgo de insuficiencia respiratoria materna.");
    if (e.sistolica !== undefined && e.sistolica >= 160)
      addUnique(razones, "TA sistólica ≥ 160: crisis hipertensiva en embarazo (alto riesgo).");
    if (e.diastolica !== undefined && e.diastolica >= 110)
      addUnique(razones, "TA diastólica ≥ 110: crisis hipertensiva en embarazo (alto riesgo).");
    if (e.sangradoVaginal) addUnique(razones, "Sangrado vaginal: descartar hemorragia obstétrica (alto riesgo).");
    if (e.dolorToracico) addUnique(razones, "Dolor torácico: descartar evento cardiopulmonar agudo.");
    if (e.frecuenciaRespiratoria !== undefined && e.frecuenciaRespiratoria >= 30)
      addUnique(razones, "FR ≥ 30: compromiso respiratorio, requiere manejo urgente.");

    recomendaciones.push(recomendacionGenerica);

    return {
      nivel: "ROJO",
      score: 999,
      titulo: "MUY ALTO RIESGO",
      colorClass: "bg-red-600 text-white",
      razones: [recomendacionGenerica],
      recomendaciones: [recomendacionGenerica],
      referencias: [
        { etiqueta: "NOM-007-SSA2-2016 (atención del embarazo/parto/puerperio)" },
        { etiqueta: "WHO: adolescent pregnancy & complicaciones (referencia global)" },
      ],
    };
  }

  // -------------------------
  // Factores (score) y explicación cortita
  // -------------------------

  // Edad (sin verde, pero sí escalamos)
  if (edad !== undefined) {
    if (edad <= 16) {
      score += 4;
      addUnique(razones, "Edad ≤ 16: mayor probabilidad de complicaciones maternas y perinatales.");
      recomendaciones.push(recomendacionGenerica);
    } else if (edad >= 35) {
      score += 3;
      addUnique(razones, "Edad ≥ 35: incrementa riesgo de complicaciones obstétricas y comorbilidades.");
    } else {
      // Aun así es riesgo, sólo no sumamos mucho
      score += 1;
      addUnique(razones, "Todo embarazo implica riesgo: requiere vigilancia y tamizaje continuo.");
    }
  } else {
    score += 1;
    addUnique(razones, "Todo embarazo implica riesgo: requiere vigilancia y tamizaje continuo.");
  }

  // Gestación múltiple
  if (e.embarazoMultiple) {
    score += 3;
    addUnique(razones, "Embarazo múltiple: aumenta riesgo de parto pretérmino y complicaciones.");
  }

  // Cesáreas previas
  const cprev = clampNum(e.cesareasPrevias);
  if (cprev !== undefined) {
    if (cprev >= 2) {
      score += 3;
      addUnique(razones, "≥2 cesáreas previas: mayor riesgo de complicaciones (placenta anormal, hemorragia, ruptura).");
    } else if (cprev === 1) {
      score += 2;
      addUnique(razones, "1 cesárea previa: requiere plan de atención y criterios de referencia claros.");
    }
  }

  // Hipertensión / datos sugestivos de preeclampsia
  const sys = clampNum(e.sistolica);
  const dia = clampNum(e.diastolica);
  const prot = proteinuriaPuntos(e.proteinuriaTira);

  const htaModerada =
    (sys !== undefined && sys >= 140) || (dia !== undefined && dia >= 90) || prot >= 2;

  if (e.hipertensionCronica) {
    score += 3;
    addUnique(razones, "Hipertensión crónica: eleva riesgo de preeclampsia y eventos materno-fetales.");
  }

  if (htaModerada || e.antecedentePreeclampsia) {
    score += 3;
    if (e.antecedentePreeclampsia) addUnique(razones, "Antecedente de preeclampsia: alto riesgo de recurrencia.");
    if (sys !== undefined && sys >= 140) addUnique(razones, "TA ≥ 140/90: sospecha de trastorno hipertensivo del embarazo.");
    if (prot >= 2) addUnique(razones, "Proteinuria ≥ 2+: sugiere afectación renal asociada a preeclampsia (si aplica).");
    if (e.cefaleaSevera || e.fosfenos || e.epigastralgia) {
      score += 2;
      addUnique(razones, "Síntomas de alarma (cefalea/fosfenos/epigastralgia): posible severidad hipertensiva.");
    }
  }

  // Diabetes
  if (e.diabetesPrevia) {
    score += 3;
    addUnique(razones, "Diabetes pregestacional: aumenta riesgo de complicaciones maternas y fetales.");
  }
  if (e.diabetesGestacional) {
    score += 2;
    addUnique(razones, "Diabetes gestacional: requiere control y vigilancia por riesgo metabólico y fetal.");
  }

  // Comorbilidades “pesadas”
  if (e.cardiopatia) {
    score += 4;
    addUnique(razones, "Cardiopatía: embarazo de alto riesgo por descompensación hemodinámica.");
  }
  if (e.nefropatia) {
    score += 4;
    addUnique(razones, "Nefropatía: alto riesgo por deterioro renal y complicaciones hipertensivas.");
  }
  if (e.epilepsia) {
    score += 2;
    addUnique(razones, "Epilepsia: requiere plan terapéutico y vigilancia por crisis/medicación.");
  }

  // Fiebre / infección
  if (e.fiebre || (e.temperatura !== undefined && e.temperatura >= 38)) {
    score += 2;
    addUnique(razones, "Fiebre ≥ 38°C: riesgo infeccioso; requiere evaluación y manejo oportuno.");
  }

  // Disnea (sin ROJO por SatO2, aquí es factor)
  if (e.disnea) {
    score += 2;
    addUnique(razones, "Disnea: requiere descartar patología respiratoria/cardiaca y valorar severidad.");
  }

  // Movimientos fetales disminuidos
  if (e.disminucionMovimientosFetales) {
    score += 3;
    addUnique(razones, "Disminución de movimientos fetales: requiere valoración fetal prioritaria.");
  }

  // Labs de severidad (si están)
  if (e.plaquetas !== undefined && e.plaquetas < 100) {
    score += 4;
    addUnique(razones, "Plaquetas < 100 mil: dato de severidad (p.ej. trastorno hipertensivo/HELLP).");
  }
  if (e.creatinina !== undefined && e.creatinina >= 1.1) {
    score += 3;
    addUnique(razones, "Creatinina elevada: sugiere compromiso renal en embarazo (alto riesgo).");
  }
  if ((e.ast !== undefined && e.ast >= 70) || (e.alt !== undefined && e.alt >= 70)) {
    score += 3;
    addUnique(razones, "Transaminasas elevadas: posible afectación hepática (alto riesgo).");
  }

  // -------------------------
  // Nivel final (sin VERDE)
  // -------------------------
  let nivel: NivelRiesgo = "AMARILLO";
  let titulo = "RIESGO (VIGILANCIA)";
  let colorClass = "bg-amber-400 text-black";

  if (score >= 9) {
    nivel = "ROJO";
    titulo = "MUY ALTO RIESGO";
    colorClass = "bg-red-600 text-white";
    recomendaciones.push(recomendacionGenerica);
  } else if (score >= 6) {
    nivel = "NARANJA";
    titulo = "ALTO RIESGO";
    colorClass = "bg-orange-500 text-white";
    recomendaciones.push(recomendacionGenerica);
  } else {
    nivel = "AMARILLO";
    titulo = "RIESGO (VIGILANCIA)";
    colorClass = "bg-amber-400 text-black";
    recomendaciones.push(recomendacionGenerica);
  }

  const referencias = [
    {
      etiqueta: "NOM-007-SSA2-2016 (DOF) — atención del embarazo/parto/puerperio",
      // URL la dejamos opcional para no amarrarte, pero si quieres la incrusto en UI luego
    },
    {
      etiqueta:
        "WHO — adolescentes 10–19 con mayor riesgo de eclampsia, infecciones y RN con bajo peso/pretérmino",
    },
  ];

  return { nivel, score, titulo, colorClass, razones: [recomendacionGenerica], recomendaciones: [recomendacionGenerica], referencias };
}
