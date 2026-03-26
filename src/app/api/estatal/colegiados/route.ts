import { NextResponse } from "next/server";
import { query } from "@/lib/db";

async function hasColumn(columnName: string) {
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM consultas_prenatales LIKE '${columnName}'`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET() {
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
       ORDER BY fecha_colegiado DESC, c.id DESC
       LIMIT 1000`
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error obteniendo casos colegiados", error);
    return NextResponse.json(
      { message: "Error al obtener casos colegiados", details: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const [hasColegiado, hasFechaColegiado] = await Promise.all([
      hasColumn("colegiado"),
      hasColumn("fecha_colegiado"),
    ]);

    if (!hasColegiado) {
      return NextResponse.json(
        { message: "La columna colegiado no existe. Ejecuta migraciones pendientes." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const consultaId = Number(body?.consulta_id);
    const pacienteId = Number(body?.paciente_id);

    let targetConsultaId: number | null = null;
    let targetPacienteId: number | null = null;

    if (Number.isFinite(consultaId) && consultaId > 0) {
      const consultaRows: any = await query(
        `SELECT id, paciente_id, COALESCE(colegiado, 0) AS colegiado
         FROM consultas_prenatales
         WHERE id = ?
         LIMIT 1`,
        [consultaId]
      );

      if (!consultaRows?.[0]) {
        return NextResponse.json({ message: "Consulta no encontrada" }, { status: 404 });
      }

      targetConsultaId = Number(consultaRows[0].id) || null;
      targetPacienteId = Number(consultaRows[0].paciente_id) || null;

      if (Number(consultaRows[0].colegiado) === 1) {
        return NextResponse.json({ ok: true, consulta_id: targetConsultaId, already_colegiado: true });
      }
    }

    if (!targetConsultaId && Number.isFinite(pacienteId) && pacienteId > 0) {
      const lastConsultaRows: any = await query(
        `SELECT id, paciente_id
         FROM consultas_prenatales
         WHERE paciente_id = ?
         ORDER BY fecha_consulta DESC, id DESC
         LIMIT 1`,
        [pacienteId]
      );

      targetConsultaId = Number(lastConsultaRows?.[0]?.id) || null;
      targetPacienteId = Number(lastConsultaRows?.[0]?.paciente_id) || null;
    }

    if (!targetConsultaId) {
      return NextResponse.json(
        { message: "consulta_id o paciente_id válido es requerido" },
        { status: 400 }
      );
    }

    if (!targetPacienteId) {
      return NextResponse.json(
        { message: "No se pudo determinar el paciente para colegiar" },
        { status: 400 }
      );
    }

    const existingColegiadoRows: any = await query(
      `SELECT id
       FROM consultas_prenatales
       WHERE paciente_id = ? AND COALESCE(colegiado, 0) = 1
       ORDER BY COALESCE(fecha_colegiado, updated_at) DESC, id DESC
       LIMIT 1`,
      [targetPacienteId]
    );

    const existingColegiadoId = Number(existingColegiadoRows?.[0]?.id) || null;
    if (existingColegiadoId && existingColegiadoId !== targetConsultaId) {
      return NextResponse.json(
        {
          message: "Este paciente ya tiene un caso colegiado y no puede colegiarse nuevamente.",
          consulta_id_existente: existingColegiadoId,
        },
        { status: 409 }
      );
    }

    const setFecha = hasFechaColegiado ? ", fecha_colegiado = NOW()" : "";

    const result: any = await query(
      `UPDATE consultas_prenatales
       SET colegiado = 1${setFecha}
       WHERE id = ?`,
      [targetConsultaId]
    );

    if (!result?.affectedRows) {
      return NextResponse.json({ message: "Consulta no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, consulta_id: targetConsultaId });
  } catch (error: any) {
    console.error("Error colegiando caso", error);
    return NextResponse.json(
      { message: "Error al colegiar caso", details: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
