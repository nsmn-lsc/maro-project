export type NivelRiesgoMaro = "BAJO" | "ALTO" | "MUY ALTO";
export type NivelRiesgoFiltroKey = "muy_alto" | "alto" | "bajo" | "todos";

export interface ResumenEstadisticasPadrón {
  total_pacientes: number;
  pacientes_riesgo: number;
  promedio_global: number;
  promedio_riesgo_25: number;
  conteo_bajo: number;
  conteo_alto: number;
  conteo_muy_alto: number;
}

/**
 * Clasifica a un paciente en uno de los 3 niveles de riesgo MARO:
 * - BAJO: < 4 pts
 * - ALTO: 4 a 24 pts
 * - MUY ALTO: >= 25 pts (o alerta clínica / riesgo_25_plus)
 */
export function clasificarNivelRiesgo(
  puntaje: number | null | undefined,
  alertaClinica = false,
  riesgo25Plus = false
): NivelRiesgoMaro {
  const score = typeof puntaje === "number" && Number.isFinite(puntaje) ? puntaje : 0;

  if (score >= 25 || alertaClinica || riesgo25Plus) {
    return "MUY ALTO";
  }

  if (score >= 4 && score < 25) {
    return "ALTO";
  }

  return "BAJO";
}

/**
 * Genera la cláusula SQL de filtrado según el nivel de riesgo solicitado
 */
export function buildWhereNivelRiesgo(nivel: string | null | undefined): string {
  const norm = (nivel || "muy_alto").toLowerCase().trim();

  if (norm === "alto") {
    return `WHERE (COALESCE(c.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 4 AND COALESCE(c.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) <= 24 AND (c.riesgo_25_plus = 0 OR c.riesgo_25_plus IS NULL))`;
  }

  if (norm === "bajo") {
    return `WHERE (COALESCE(c.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) < 4 AND (c.riesgo_25_plus = 0 OR c.riesgo_25_plus IS NULL))`;
  }

  if (norm === "todos") {
    return "";
  }

  // Por defecto: muy_alto (>= 25 o riesgo_25_plus)
  return `WHERE (COALESCE(c.riesgo_25_plus, 0) = 1 OR COALESCE(c.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25)`;
}

/**
 * Calcula las métricas y agregaciones del padrón de pacientes en memoria
 */
export function calcularEstadisticasPadrón(
  pacientes: Array<{ puntaje: number; alertaClinica?: boolean; riesgo25Plus?: boolean }>
): ResumenEstadisticasPadrón {
  if (!pacientes || pacientes.length === 0) {
    return {
      total_pacientes: 0,
      pacientes_riesgo: 0,
      promedio_global: 0,
      promedio_riesgo_25: 0,
      conteo_bajo: 0,
      conteo_alto: 0,
      conteo_muy_alto: 0,
    };
  }

  let sumaTotal = 0;
  let sumaRiesgo25 = 0;
  let conteoBajo = 0;
  let conteoAlto = 0;
  let conteoMuyAlto = 0;

  for (const p of pacientes) {
    const score = Number.isFinite(p.puntaje) ? p.puntaje : 0;
    sumaTotal += score;

    const nivel = clasificarNivelRiesgo(score, p.alertaClinica, p.riesgo25Plus);
    if (nivel === "MUY ALTO") {
      conteoMuyAlto++;
      if (score >= 25) {
        sumaRiesgo25 += score;
      }
    } else if (nivel === "ALTO") {
      conteoAlto++;
    } else {
      conteoBajo++;
    }
  }

  const total = pacientes.length;
  const promedioGlobal = Math.round((sumaTotal / total) * 10) / 10;
  const pacientesCon25Omas = pacientes.filter((p) => p.puntaje >= 25).length;
  const promedioRiesgo25 =
    pacientesCon25Omas > 0 ? Math.round((sumaRiesgo25 / pacientesCon25Omas) * 10) / 10 : 0;

  return {
    total_pacientes: total,
    pacientes_riesgo: conteoMuyAlto,
    promedio_global: promedioGlobal,
    promedio_riesgo_25: promedioRiesgo25,
    conteo_bajo: conteoBajo,
    conteo_alto: conteoAlto,
    conteo_muy_alto: conteoMuyAlto,
  };
}
