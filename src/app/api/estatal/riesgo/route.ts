import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/apiAuth";
import { buildWhereNivelRiesgo } from "@/lib/estatal-riesgo";

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
  const limit = Number.isNaN(parsed) ? 200 : Math.min(Math.max(parsed, 1), 2500);
  const includeStats = searchParams.get("include_stats") === "1";
  const nivelRiesgo = searchParams.get("nivel_riesgo");

  const whereNivel = buildWhereNivelRiesgo(nivelRiesgo);

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
          COALESCE(c.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) AS puntaje_total_consulta,
          (
            COALESCE(cp.factor_riesgo_antecedentes, 0)
            + COALESCE(cp.factor_riesgo_tamizajes, 0)
            + COALESCE(c.puntaje_consulta_parametros, 0)
          ) AS puntaje_real_sin_forzar,
          COALESCE(c.puntaje_consulta_parametros, 0) AS puntaje_consulta_parametros,
          COALESCE(c.riesgo_25_plus, CASE WHEN COALESCE(c.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 THEN 1 ELSE 0 END) AS riesgo_25_plus,
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
       FROM cat_pacientes cp
       LEFT JOIN (
         SELECT c.*
         FROM consultas_prenatales c
         INNER JOIN (
           SELECT paciente_id, MAX(id) AS last_consulta_id
           FROM consultas_prenatales
           GROUP BY paciente_id
         ) last_c ON last_c.last_consulta_id = c.id
       ) c ON c.paciente_id = cp.id
       ${whereNivel}
       ORDER BY puntaje_total_consulta DESC, c.fecha_consulta DESC, cp.id DESC
       LIMIT ${limit}`
    );

    if (includeStats) {
      const statsRows = await query<any[]>(`
        SELECT 
          COUNT(*) AS total_pacientes,
          ROUND(AVG(COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0)), 1) AS promedio_global,
          SUM(CASE WHEN COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 OR lc.riesgo_25_plus = 1 THEN 1 ELSE 0 END) AS pacientes_riesgo,
          ROUND(AVG(CASE WHEN COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 THEN COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) END), 1) AS promedio_riesgo_25,
          SUM(CASE WHEN (COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) < 4) AND (lc.riesgo_25_plus = 0 OR lc.riesgo_25_plus IS NULL) THEN 1 ELSE 0 END) AS conteo_bajo,
          SUM(CASE WHEN (COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 4 AND COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) <= 24) AND (lc.riesgo_25_plus = 0 OR lc.riesgo_25_plus IS NULL) THEN 1 ELSE 0 END) AS conteo_alto,
          SUM(CASE WHEN COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 OR lc.riesgo_25_plus = 1 THEN 1 ELSE 0 END) AS conteo_muy_alto,
          SUM(CASE WHEN (COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 OR lc.riesgo_25_plus = 1) AND lc.colegiado = 1 THEN 1 ELSE 0 END) AS criticos_colegiados,
          SUM(CASE WHEN (COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 OR lc.riesgo_25_plus = 1) AND (lc.colegiado = 0 OR lc.colegiado IS NULL) THEN 1 ELSE 0 END) AS criticos_pendientes,
          SUM(CASE WHEN (COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 OR lc.riesgo_25_plus = 1) AND (
            COALESCE(cp.edad, 0) BETWEEN 10 AND 14
            OR COALESCE(cp.imc_inicial, 0) >= 31
            OR COALESCE(cp.factor_cardiopatia, 0) = 1
            OR COALESCE(cp.factor_hepatopatia, 0) = 1
            OR COALESCE(cp.factor_coagulopatias, 0) = 1
            OR COALESCE(cp.factor_nefropatia, 0) = 1
          ) THEN 1 ELSE 0 END) AS criticos_alerta_clinica,
          SUM(CASE WHEN (COALESCE(lc.puntaje_total_consulta, cp.factor_riesgo_antecedentes + cp.factor_riesgo_tamizajes, 0) >= 25 OR lc.riesgo_25_plus = 1) AND (lc.colegiado = 0 OR lc.colegiado IS NULL) AND (
            (COALESCE(cp.edad, 0) BETWEEN 10 AND 14
            OR COALESCE(cp.imc_inicial, 0) >= 31
            OR COALESCE(cp.factor_cardiopatia, 0) = 1
            OR COALESCE(cp.factor_hepatopatia, 0) = 1
            OR COALESCE(cp.factor_coagulopatias, 0) = 1
            OR COALESCE(cp.factor_nefropatia, 0) = 1)
            AND (COALESCE(cp.factor_riesgo_antecedentes, 0) + COALESCE(cp.factor_riesgo_tamizajes, 0) + COALESCE(lc.puntaje_consulta_parametros, 0)) <= 25
          ) THEN 1 ELSE 0 END) AS criticos_criterio_clinico
        FROM cat_pacientes cp
        LEFT JOIN (
          SELECT c.*
          FROM consultas_prenatales c
          INNER JOIN (
            SELECT paciente_id, MAX(id) as last_id
            FROM consultas_prenatales
            GROUP BY paciente_id
          ) m ON m.last_id = c.id
        ) lc ON lc.paciente_id = cp.id
      `);
      const r = statsRows[0] || {};
      const stats = {
        total_pacientes: Number(r.total_pacientes) || 0,
        promedio_global: Number(r.promedio_global) || 0,
        pacientes_riesgo: Number(r.pacientes_riesgo) || 0,
        promedio_riesgo_25: Number(r.promedio_riesgo_25) || 0,
        conteo_bajo: Number(r.conteo_bajo) || 0,
        conteo_alto: Number(r.conteo_alto) || 0,
        conteo_muy_alto: Number(r.conteo_muy_alto) || 0,
        criticos_colegiados: Number(r.criticos_colegiados) || 0,
        criticos_pendientes: Number(r.criticos_pendientes) || 0,
        criticos_alerta_clinica: Number(r.criticos_alerta_clinica) || 0,
        criticos_criterio_clinico: Number(r.criticos_criterio_clinico) || 0,
      };
      return NextResponse.json({ registros: rows, stats });
    }

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

      if (includeStats) {
        return NextResponse.json({
          registros: fallbackRows,
          stats: {
            total_pacientes: fallbackRows.length,
            promedio_global: 0,
            pacientes_riesgo: fallbackRows.length,
            promedio_riesgo_25: 0,
          },
        });
      }

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
