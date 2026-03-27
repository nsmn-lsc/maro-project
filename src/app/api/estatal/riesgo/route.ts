import { NextResponse } from "next/server";
import { query } from "@/lib/db";

async function hasColumn(tableName: "consultas_prenatales" | "cat_pacientes", columnName: string) {
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseInt(searchParams.get("limit") || "200", 10);
  const limit = Number.isNaN(parsed) ? 200 : Math.min(Math.max(parsed, 1), 1000);

  try {
    const [
      hasPuntajeTotal,
      hasPuntajeConsulta,
      hasRiesgo25,
      hasColegiado,
      hasAntecedentes,
      hasTamizajes,
      hasRiesgoIngreso,
      hasImcInicial,
      hasCardiopatia,
      hasNefropatia,
      hasHepatopatia,
      hasCoagulopatia,
    ] = await Promise.all([
      hasColumn("consultas_prenatales", "puntaje_total_consulta"),
      hasColumn("consultas_prenatales", "puntaje_consulta_parametros"),
      hasColumn("consultas_prenatales", "riesgo_25_plus"),
      hasColumn("consultas_prenatales", "colegiado"),
      hasColumn("cat_pacientes", "factor_riesgo_antecedentes"),
      hasColumn("cat_pacientes", "factor_riesgo_tamizajes"),
      hasColumn("cat_pacientes", "riesgo_obstetrico_ingreso"),
      hasColumn("cat_pacientes", "imc_inicial"),
      hasColumn("cat_pacientes", "factor_cardiopatia"),
      hasColumn("cat_pacientes", "factor_nefropatia"),
      hasColumn("cat_pacientes", "factor_hepatopatia"),
      hasColumn("cat_pacientes", "factor_coagulopatias"),
    ]);

    const antecedentesExpr = hasAntecedentes
      ? "COALESCE(cp.factor_riesgo_antecedentes, 0)"
      : "0";
    const tamizajesExpr = hasTamizajes
      ? "COALESCE(cp.factor_riesgo_tamizajes, 0)"
      : "0";
    const ingresoExpr = hasRiesgoIngreso
      ? "COALESCE(cp.riesgo_obstetrico_ingreso, 0)"
      : "0";

    const puntajeTotalExpr = hasPuntajeTotal
      ? "COALESCE(c.puntaje_total_consulta, 0)"
      : hasPuntajeConsulta
        ? `(${antecedentesExpr} + ${tamizajesExpr} + COALESCE(c.puntaje_consulta_parametros, 0))`
        : `(${antecedentesExpr} + ${tamizajesExpr} + ${ingresoExpr})`;

    const puntajeConsultaExpr = hasPuntajeConsulta
      ? "COALESCE(c.puntaje_consulta_parametros, 0)"
      : "0";

    const puntajeRealExpr = `(${antecedentesExpr} + ${tamizajesExpr} + ${puntajeConsultaExpr})`;

    const cardiopatiaExpr = hasCardiopatia ? "COALESCE(cp.factor_cardiopatia, 0)" : "0";
    const nefropatiaExpr = hasNefropatia ? "COALESCE(cp.factor_nefropatia, 0)" : "0";
    const hepatopatiaExpr = hasHepatopatia ? "COALESCE(cp.factor_hepatopatia, 0)" : "0";
    const coagulopatiaExpr = hasCoagulopatia ? "COALESCE(cp.factor_coagulopatias, 0)" : "0";
    const imcCriticoExpr = hasImcInicial ? "CASE WHEN COALESCE(cp.imc_inicial, 0) >= 31 THEN 1 ELSE 0 END" : "0";
    const edadCriticaExpr = "CASE WHEN COALESCE(cp.edad, 0) BETWEEN 10 AND 14 THEN 1 ELSE 0 END";
    const criterioClinicoExpr = `CASE
      WHEN (
        ${edadCriticaExpr} = 1
        OR ${imcCriticoExpr} = 1
        OR ${cardiopatiaExpr} = 1
        OR ${nefropatiaExpr} = 1
        OR ${hepatopatiaExpr} = 1
        OR ${coagulopatiaExpr} = 1
      ) AND ${puntajeRealExpr} <= 25
      THEN 1 ELSE 0
    END`;
    const motivoAlertaExpr = `CASE
      WHEN ${criterioClinicoExpr} = 1 THEN TRIM(BOTH ', ' FROM CONCAT(
        CASE WHEN ${edadCriticaExpr} = 1 THEN 'Edad 10-14, ' ELSE '' END,
        CASE WHEN ${imcCriticoExpr} = 1 THEN CONCAT('IMC >=31 (', ROUND(COALESCE(cp.imc_inicial, 0), 1), '), ') ELSE '' END,
        CASE WHEN ${cardiopatiaExpr} = 1 THEN 'Cardiopatia, ' ELSE '' END,
        CASE WHEN ${hepatopatiaExpr} = 1 THEN 'Hepatopatia, ' ELSE '' END,
        CASE WHEN ${coagulopatiaExpr} = 1 THEN 'Coagulopatia, ' ELSE '' END,
        CASE WHEN ${nefropatiaExpr} = 1 THEN 'Nefropatia, ' ELSE '' END
      ))
      ELSE NULL
    END`;

    const riesgo25Expr = hasRiesgo25
      ? "COALESCE(c.riesgo_25_plus, 0)"
      : `CASE WHEN ${puntajeTotalExpr} >= 25 THEN 1 ELSE 0 END`;

    const colegiadoExpr = hasColegiado
      ? "COALESCE(c.colegiado, 0)"
      : "0";

    const whereRiesgo = hasRiesgo25
      ? "COALESCE(c.riesgo_25_plus, 0) = 1"
      : `${puntajeTotalExpr} >= 25`;

    const rows = await query(
      `SELECT
          cp.id AS paciente_id,
          cp.folio,
          cp.nombre_completo,
          cp.region,
          cp.municipio,
          cp.unidad,
          cp.clues_id,
          c.id AS consulta_id,
          c.fecha_consulta,
          ${puntajeTotalExpr} AS puntaje_total_consulta,
          ${puntajeRealExpr} AS puntaje_real_sin_forzar,
          ${puntajeConsultaExpr} AS puntaje_consulta_parametros,
          ${riesgo25Expr} AS riesgo_25_plus,
          ${criterioClinicoExpr} AS alerta_por_criterio_clinico,
          ${motivoAlertaExpr} AS motivo_alerta,
          ${colegiadoExpr} AS colegiado,
          c.created_at AS consulta_creada,
         cp.edad
       FROM consultas_prenatales c
       INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
       INNER JOIN (
         SELECT paciente_id, MAX(id) AS last_consulta_id
         FROM consultas_prenatales
         GROUP BY paciente_id
       ) last_c ON last_c.last_consulta_id = c.id
       WHERE ${whereRiesgo}
       ORDER BY puntaje_total_consulta DESC, c.fecha_consulta DESC, c.id DESC
       LIMIT ${limit}`
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error obteniendo concentrado estatal de riesgo", error);
    try {
      const hasColegiadoFallback = await hasColumn("consultas_prenatales", "colegiado");
      const colegiadoFallbackExpr = hasColegiadoFallback
        ? "COALESCE(c.colegiado, 0)"
        : "0";

      const fallbackRows = await query(
        `SELECT
            cp.id AS paciente_id,
            cp.folio,
            cp.nombre_completo,
            cp.region,
            cp.municipio,
            cp.unidad,
            cp.clues_id,
            c.id AS consulta_id,
            c.fecha_consulta,
            COALESCE(c.puntaje_total_consulta, 0) AS puntaje_total_consulta,
            (
              COALESCE(cp.factor_riesgo_antecedentes, 0)
              + COALESCE(cp.factor_riesgo_tamizajes, 0)
              + COALESCE(c.puntaje_consulta_parametros, 0)
            ) AS puntaje_real_sin_forzar,
            COALESCE(c.puntaje_consulta_parametros, 0) AS puntaje_consulta_parametros,
            COALESCE(c.riesgo_25_plus, CASE WHEN COALESCE(c.puntaje_total_consulta, 0) >= 25 THEN 1 ELSE 0 END) AS riesgo_25_plus,
            CASE
              WHEN (
                COALESCE(cp.edad, 0) BETWEEN 10 AND 14
                OR COALESCE(cp.imc_inicial, 0) >= 31
                OR COALESCE(cp.factor_cardiopatia, 0) = 1
                OR COALESCE(cp.factor_hepatopatia, 0) = 1
                OR COALESCE(cp.factor_coagulopatias, 0) = 1
                OR COALESCE(cp.factor_nefropatia, 0) = 1
              )
              AND (
                COALESCE(cp.factor_riesgo_antecedentes, 0)
                + COALESCE(cp.factor_riesgo_tamizajes, 0)
                + COALESCE(c.puntaje_consulta_parametros, 0)
              ) <= 25
              THEN 1 ELSE 0
            END AS alerta_por_criterio_clinico,
            CASE
              WHEN (
                COALESCE(cp.edad, 0) BETWEEN 10 AND 14
                OR COALESCE(cp.imc_inicial, 0) >= 31
                OR COALESCE(cp.factor_cardiopatia, 0) = 1
                OR COALESCE(cp.factor_hepatopatia, 0) = 1
                OR COALESCE(cp.factor_coagulopatias, 0) = 1
                OR COALESCE(cp.factor_nefropatia, 0) = 1
              )
              AND (
                COALESCE(cp.factor_riesgo_antecedentes, 0)
                + COALESCE(cp.factor_riesgo_tamizajes, 0)
                + COALESCE(c.puntaje_consulta_parametros, 0)
              ) <= 25
              THEN TRIM(BOTH ', ' FROM CONCAT(
                CASE WHEN COALESCE(cp.edad, 0) BETWEEN 10 AND 14 THEN 'Edad 10-14, ' ELSE '' END,
                CASE WHEN COALESCE(cp.imc_inicial, 0) >= 31 THEN CONCAT('IMC >=31 (', ROUND(COALESCE(cp.imc_inicial, 0), 1), '), ') ELSE '' END,
                CASE WHEN COALESCE(cp.factor_cardiopatia, 0) = 1 THEN 'Cardiopatia, ' ELSE '' END,
                CASE WHEN COALESCE(cp.factor_hepatopatia, 0) = 1 THEN 'Hepatopatia, ' ELSE '' END,
                CASE WHEN COALESCE(cp.factor_coagulopatias, 0) = 1 THEN 'Coagulopatia, ' ELSE '' END,
                CASE WHEN COALESCE(cp.factor_nefropatia, 0) = 1 THEN 'Nefropatia, ' ELSE '' END
              ))
              ELSE NULL
            END AS motivo_alerta,
            ${colegiadoFallbackExpr} AS colegiado,
            c.created_at AS consulta_creada,
            cp.edad
          FROM consultas_prenatales c
         INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
         ORDER BY c.fecha_consulta DESC, c.id DESC
         LIMIT ${limit}`
      );

      return NextResponse.json(fallbackRows);
    } catch (fallbackError: any) {
      console.error("Error en fallback de concentrado estatal", fallbackError);
      return NextResponse.json(
        {
          message: "Error al obtener registros de riesgo estatal",
          details: fallbackError?.message || error?.message || "Error interno",
        },
        { status: 500 }
      );
    }
  }
}
