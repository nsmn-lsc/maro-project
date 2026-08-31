import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/apiAuth";

async function hasColumn(tableName: "consultas_prenatales" | "cat_pacientes", columnName: string) {
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const authResult = await requireApiAuth(request, 3);
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const parsed = parseInt(searchParams.get("limit") || "200", 10);
  const limit = Number.isNaN(parsed) ? 200 : Math.min(Math.max(parsed, 1), 1000);

  try {
    const rows = await query(
      `SELECT
          cp.id AS paciente_id,
          cp.folio,
          cp.nombre_completo,
          cp.region,
          cp.municipio,
          cp.localidad,
          cp.fecha_ingreso_cpn,
          cp.fpp,
          cp.imc_inicial,
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
          COALESCE(c.colegiado, 0) AS colegiado,
          c.created_at AS consulta_creada,
          cp.edad
       FROM consultas_prenatales c
       INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
       INNER JOIN (
         SELECT paciente_id, MAX(id) AS last_consulta_id
         FROM consultas_prenatales
         GROUP BY paciente_id
       ) last_c ON last_c.last_consulta_id = c.id
       WHERE COALESCE(c.riesgo_25_plus, 0) = 1 OR COALESCE(c.puntaje_total_consulta, 0) >= 25
       ORDER BY c.puntaje_total_consulta DESC, c.fecha_consulta DESC, c.id DESC
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
            cp.localidad,
            cp.fecha_ingreso_cpn,
            cp.fpp,
            cp.imc_inicial,
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
