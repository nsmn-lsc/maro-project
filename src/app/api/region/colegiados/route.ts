import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/apiAuth";

async function hasColumn(columnName: string) {
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM consultas_prenatales LIKE '${columnName}'`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const authResult = await requireApiAuth(request, 2);
  if (!authResult.ok) return authResult.response;

  const { auth } = authResult;

  if (!auth.region) {
    return NextResponse.json(
      { message: "No se pudo determinar la región del usuario" },
      { status: 403 }
    );
  }

  try {
    const [hasColegiado, hasFechaColegiado] = await Promise.all([
      hasColumn("colegiado"),
      hasColumn("fecha_colegiado"),
    ]);

    if (!hasColegiado) {
      return NextResponse.json([]);
    }

    const fechaColegiadoExpr = hasFechaColegiado
      ? "c.fecha_colegiado"
      : "c.updated_at";

    const regionNormalized = auth.region.trim().toUpperCase();

    const rows = await query(
      `SELECT
          c.id AS consulta_id,
          c.paciente_id,
          cp.folio,
          cp.nombre_completo,
          cp.region,
          cp.municipio,
          cp.unidad,
          cp.clues_id,
          c.fecha_consulta,
          c.puntaje_total_consulta,
          c.riesgo_25_plus,
          ${fechaColegiadoExpr} AS fecha_colegiado,
          plan.id AS plan_id,
          COALESCE(plan.estatus, 'borrador') AS plan_estatus,
          COALESCE(actions.total_acciones, 0) AS acciones_total,
          COALESCE(actions.acciones_cumplidas, 0) AS acciones_cumplidas,
          plan.updated_at AS plan_actualizado_en
       FROM consultas_prenatales c
       INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
       INNER JOIN (
         SELECT paciente_id, MAX(id) AS last_consulta_id
         FROM consultas_prenatales
         WHERE COALESCE(colegiado, 0) = 1
         GROUP BY paciente_id
       ) last_c ON last_c.last_consulta_id = c.id
       LEFT JOIN colegiados_planes plan ON plan.consulta_id = c.id
       LEFT JOIN (
         SELECT
           plan_id,
           COUNT(*) AS total_acciones,
           SUM(CASE WHEN COALESCE(cumplido, 0) = 1 THEN 1 ELSE 0 END) AS acciones_cumplidas
         FROM colegiados_acciones
         GROUP BY plan_id
       ) actions ON actions.plan_id = plan.id
       WHERE COALESCE(c.colegiado, 0) = 1
         AND UPPER(TRIM(cp.region)) = ?
       ORDER BY fecha_colegiado DESC, c.id DESC
       LIMIT 500`,
      [regionNormalized]
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error obteniendo casos colegiados regionales", error);
    return NextResponse.json(
      { message: "Error al obtener casos colegiados", details: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
