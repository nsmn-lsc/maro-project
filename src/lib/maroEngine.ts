// lib/maroEngine.ts
/* =========================================================
   MARO ENGINE – Coordinación Estatal
   - Riesgo calculado (NARANJA/ROJO)
   - Congruencia clínica (OK/INCOMPLETO/INCONGRUENTE)
   - Candados de cierre (auditable)
   - Persistencia local (localStorage)
========================================================= */

export type RiesgoMARO = "NARANJA" | "ROJO";
export type ResultadoCongruencia = "OK" | "INCOMPLETO" | "INCONGRUENTE";

export type Decision = {
  nivel: "PRIMER" | "SEGUNDO" | "REGIONAL" | "ESTATAL";
  decision: string;
  fecha: string; // ISO
  responsable: string;
  observaciones?: string;
};

export type ResumenMARO = {
  edad: number;
  edad_gestacional: number;
  imc: number | null;
  antecedentes_clave: string[];
  signos_vitales: {
    ta: string; // "140/90"
    fc: number;
  };
  factores_riesgo: string[];
};

export type PlanAccion = {
  tipo: "LOCAL";
  estudios_solicitados: string[];
  fecha_revaloracion: string | null; // ISO
  interconsulta_programada: boolean;
};

export type PlanReferencia = {
  hospital_receptor: string;
  enlace: string;
  medio_traslado: "AMBULANCIA" | "OTRO";
  hora_aceptacion: string; // ISO
};

export type IntervencionEstatal = {
  tipo:
    | "REVALORACION_INMEDIATA"
    | "COLEGIACION_CLINICA"
    | "ESCALAMIENTO_REFERENCIA"
    | "OBSERVACION_SISTEMICA";
  instrucciones: string;
  responsable_estatal: string;
  fecha: string; // ISO
};

export type CasoEstatal = {
  folio: string;
  unidad_origen: string;
  region: string;
  nivel_actual: 1 | 2;
  created_at: string; // ISO
  closed_at?: string;
  estado: "SIN_CIERRE" | "EN_SEGUIMIENTO" | "ESCALADO" | "CERRADO";

  resumen: ResumenMARO;
  diagnosticos: string[];
  estudios_realizados: string[];

  timeline: Decision[];

  plan_accion?: PlanAccion;
  plan_referencia?: PlanReferencia;

  estatal?: {
    responsable_estatal: string;
    intervenciones: IntervencionEstatal[];
  };
};

export function nowISO() {
  return new Date().toISOString();
}

export function generarFolio(prefix = "XX") {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${fecha}-${rand}`;
}

export function calcTiempoMin(fromISO: string, toISO: string) {
  const a = new Date(fromISO).getTime();
  const b = new Date(toISO).getTime();
  const d = Math.max(0, b - a);
  return Math.round(d / 60000);
}

/* =========================
   Riesgo MARO (reglas mínimas)
   - ROJO: criterios fuertes
   - NARANJA: lo demás en alto riesgo
========================= */
function parseTA(ta: string): { sys: number | null; dia: number | null } {
  const m = ta.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!m) return { sys: null, dia: null };
  return { sys: Number(m[1]), dia: Number(m[2]) };
}

export function evaluarRiesgoMARO(resumen: ResumenMARO): RiesgoMARO {
  const { sys, dia } = parseTA(resumen.signos_vitales.ta);
  const fc = resumen.signos_vitales.fc;

  // ROJO: hipertensión severa, ta muy alta, o combinación de signos/alto riesgo
  const htSevera = (sys != null && sys >= 160) || (dia != null && dia >= 110);
  const taAlta = (sys != null && sys >= 150) || (dia != null && dia >= 100);

  const imcMuyAlto = resumen.imc != null && resumen.imc >= 40;
  const imcDesconocido = resumen.imc == null;

  const extremosEdad = resumen.edad < 16 || resumen.edad >= 40;

  // Heurística mínima para este proyecto: si hay HTA + (IMC >=40 o IMC desconocido o extremos edad) => ROJO
  if (htSevera) return "ROJO";
  if (taAlta && (imcMuyAlto || imcDesconocido || extremosEdad)) return "ROJO";

  // También: FC muy alta con TA alta sugiere descompensación
  if (taAlta && fc >= 120) return "ROJO";

  return "NARANJA";
}

/* =========================
   Congruencia clínica (anti-fallas)
   - Detecta diagnósticos discordantes y estudios faltantes
========================= */
export function evaluarCongruenciaMARO(resumen: ResumenMARO, caso: CasoEstatal): {
  diagnosticos: string[];
  estudios_realizados: string[];
  estudios_obligatorios_faltantes: string[];
  resultado: ResultadoCongruencia;
  notas: string[];
} {
  const dx = caso.diagnosticos.map((d) => d.toLowerCase());
  const est = caso.estudios_realizados.map((e) => e.toLowerCase());

  const notas: string[] = [];
  const faltantes: string[] = [];

  const riesgo = evaluarRiesgoMARO(resumen);

  // 1) IMC no capturado: al menos INCOMPLETO; en ROJO lo consideramos INCONGRUENTE (porque subestima)
  if (resumen.imc == null) {
    notas.push("IMC no capturado: alto riesgo puede estar subestimado.");
  }

  // 2) Diagnóstico inconsistente básico: HTA vs preeclampsia (sin criterios/estudios)
  const mencionaHTA = dx.some((d) => d.includes("hipert"));
  const mencionaPree = dx.some((d) => d.includes("preecl"));
  if (mencionaPree && !mencionaHTA) {
    notas.push("Dx menciona preeclampsia sin marco de HTA registrado.");
  }

  // 3) Estudios obligatorios mínimos por perfil:
  //   - HTA / sospecha preeclampsia: proteinuria
  if (mencionaHTA || mencionaPree) {
    if (!est.some((e) => e.includes("protein"))) faltantes.push("Proteinuria / relación proteína-creatinina (si aplica)");
    if (!est.some((e) => e.includes("creatin"))) faltantes.push("Creatinina");
    if (!est.some((e) => e.includes("acido") && e.includes("uric"))) faltantes.push("Ácido úrico");
  }

  //   - IMC >= 40 o IMC desconocido con HTA: curva/diabetes gestacional (tamiz) + perfil tiroideo (si se acordó como bandera de falla)
  const imcMuyAlto = resumen.imc != null && resumen.imc >= 40;
  const imcDesconocido = resumen.imc == null;

  if ((imcMuyAlto || imcDesconocido) && (mencionaHTA || mencionaPree)) {
    if (!est.some((e) => e.includes("tolerancia") || e.includes("curva") || e.includes("gluc"))) {
      faltantes.push("Curva de tolerancia / tamiz de diabetes gestacional (según protocolo local)");
      notas.push("Perfil metabólico no documentado en paciente con IMC alto/HTA.");
    }
    if (!est.some((e) => e.includes("tiro") || e.includes("tsh") || e.includes("t4"))) {
      faltantes.push("Pruebas tiroideas (TSH / T4L) por bandera de riesgo sistémico");
      notas.push("Función tiroidea no documentada en paciente con IMC alto/HTA.");
    }
  }

  // 4) Resultado final
  let resultado: ResultadoCongruencia = "OK";

  if (faltantes.length > 0) resultado = "INCOMPLETO";
  if (riesgo === "ROJO" && (faltantes.length > 0 || resumen.imc == null)) resultado = "INCONGRUENTE";

  // 5) Si hay diagnósticos múltiples contradictorios “sin precisión” lo marcamos INCONGRUENTE en ROJO
  const dxVagos =
    dx.filter((d) => d.includes("hta + embarazo") || d.includes("hipertension del embarazo") || d.includes("hipertension + embarazo")).length >= 1;
  if (riesgo === "ROJO" && dxVagos && (mencionaHTA || mencionaPree)) {
    notas.push("Dx no estandarizado (HTA/preeclampsia/HTA gestacional mezclado). Requiere definición operativa.");
    resultado = "INCONGRUENTE";
  }

  return {
    diagnosticos: caso.diagnosticos,
    estudios_realizados: caso.estudios_realizados,
    estudios_obligatorios_faltantes: uniq(faltantes),
    resultado,
    notas,
  };
}

function uniq(arr: string[]) {
  const s = new Set<string>();
  for (const a of arr) s.add(a);
  return Array.from(s);
}

/* =========================
   Candados de cierre
========================= */
export function reglasBloqueoCierre(
  riesgo: RiesgoMARO,
  congr: { resultado: ResultadoCongruencia; estudios_obligatorios_faltantes: string[]; notas: string[] },
  caso: CasoEstatal
): { bloqueado: boolean; motivos: string[] } {
  const motivos: string[] = [];

  // Cierre bloqueado si ROJO y congruencia no OK
  if (riesgo === "ROJO" && congr.resultado !== "OK") {
    motivos.push("MARO ROJO: congruencia debe ser OK para cierre.");
  }

  // Cierre bloqueado si faltantes
  if (congr.estudios_obligatorios_faltantes.length > 0) {
    motivos.push(`Faltan estudios obligatorios: ${congr.estudios_obligatorios_faltantes.join(", ")}`);
  }

  // Cierre bloqueado si no hay plan de acción en riesgo alto
  if (riesgo !== "NARANJA") {
    // (por diseño actual solo NARANJA/ROJO; en ROJO exigimos plan)
    if (!caso.plan_accion && !caso.plan_referencia) {
      motivos.push("No hay plan de acción (local o referencia) registrado.");
    }
  }

  // Cierre bloqueado si ROJO y no hay evidencia de urgencia (plan referencia o intervención)
  if (riesgo === "ROJO") {
    const tieneInterv = (caso.estatal?.intervenciones?.length ?? 0) > 0;
    const tieneRef = !!caso.plan_referencia;
    if (!tieneInterv && !tieneRef) {
      motivos.push("MARO ROJO: requiere intervención estatal o referencia documentada.");
    }
  }

  return { bloqueado: motivos.length > 0, motivos };
}

/* =========================
   Persistencia local (para correr ya)
========================= */
const LS_KEY = "maro_estatal_casos_v1";

export const persistencia = {
  load(): CasoEstatal[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as CasoEstatal[];
    } catch {
      return [];
    }
  },
  save(casos: CasoEstatal[]) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(casos));
    } catch {
      // noop
    }
  },
};

/* =========================
   Casos demo (para que compile y se vea)
========================= */
export function obtenerCasosDemo(): CasoEstatal[] {
  const baseTime = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const caso1: CasoEstatal = {
    folio: generarFolio("CL"),
    unidad_origen: "Cinta Larga",
    region: "Cinta Larga",
    nivel_actual: 2,
    created_at: baseTime,
    estado: "SIN_CIERRE",
    resumen: {
      edad: 29,
      edad_gestacional: 26,
      imc: 48,
      antecedentes_clave: ["Obesidad mórbida", "HTA previa/gestacional (por definir)"],
      signos_vitales: { ta: "150/100", fc: 110 },
      factores_riesgo: ["HTA + embarazo", "IMC >= 40"],
    },
    diagnosticos: ["Hipertensión + embarazo", "Sospecha preeclampsia (no estandarizado)"],
    estudios_realizados: ["BH", "EGO"],
    timeline: [
      { nivel: "PRIMER", decision: "Referencia a 2° nivel por HTA", fecha: new Date(Date.now() - 2.8 * 60 * 60 * 1000).toISOString(), responsable: "UMF Cinta Larga" },
      { nivel: "SEGUNDO", decision: "Observación", fecha: new Date(Date.now() - 2.4 * 60 * 60 * 1000).toISOString(), responsable: "HG Cinta Larga" },
      { nivel: "REGIONAL", decision: "Permanecer 2° nivel", fecha: new Date(Date.now() - 2.2 * 60 * 60 * 1000).toISOString(), responsable: "Regional" },
    ],
    estatal: { responsable_estatal: "Coordinación Estatal", intervenciones: [] },
  };

  const caso2: CasoEstatal = {
    folio: generarFolio("UMF"),
    unidad_origen: "UMF Sierra",
    region: "Sierra",
    nivel_actual: 1,
    created_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    estado: "EN_SEGUIMIENTO",
    resumen: {
      edad: 17,
      edad_gestacional: 18,
      imc: null,
      antecedentes_clave: ["Adolescente"],
      signos_vitales: { ta: "130/85", fc: 92 },
      factores_riesgo: ["Extremo de edad", "IMC no capturado"],
    },
    diagnosticos: ["Embarazo adolescente"],
    estudios_realizados: ["BH"],
    timeline: [{ nivel: "PRIMER", decision: "Seguimiento local", fecha: new Date(Date.now() - 65 * 60 * 1000).toISOString(), responsable: "UMF Sierra" }],
    estatal: { responsable_estatal: "Coordinación Estatal", intervenciones: [] },
    plan_accion: {
      tipo: "LOCAL",
      estudios_solicitados: ["IMC", "Glucosa", "VDRL/VIH según protocolo"],
      fecha_revaloracion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      interconsulta_programada: false,
    },
  };

  return [caso1, caso2];
}
