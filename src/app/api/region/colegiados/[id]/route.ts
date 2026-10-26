import { NextResponse } from "next/server";
import type mysql from "mysql2/promise";
import { getPool, query } from "@/lib/db";
import { requireApiAuth, assertPacienteScope } from "@/lib/apiAuth";
import {
  NIVELES_ATENCION,
  type NivelAtencion,
  type NivelObservaciones,
  normalizarAccionesColegiadas,
  fusionarObservacionesConRBAC,
} from "@/lib/colegiados";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ESTATUS_VALIDOS = ["borrador", "completo"] as const;

const tableCache = new Map<string, boolean>();
const columnCache = new Map<string, boolean>();

async function hasTable(tableName: string) {
  if (tableCache.has(tableName)) return tableCache.get(tableName)!;
  try {
    const rows = await query<any[]>(`SHOW TABLES LIKE '${tableName}'`);
    const exists = Array.isArray(rows) && rows.length > 0;
    tableCache.set(tableName, exists);
    return exists;
  } catch {
    return false;
  }
}

async function hasColumn(tableName: string, columnName: string) {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnCache.has(cacheKey)) return columnCache.get(cacheKey)!;
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`);
    const exists = Array.isArray(rows) && rows.length > 0;
    columnCache.set(cacheKey, exists);
    return exists;
  } catch {
    return false;
  }
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function getConsultaColegiada(consultaId: number) {
  const rows = await query<any[]>(
    `SELECT
        c.id AS consulta_id,
        c.paciente_id,
        cp.region,
        cp.municipio,
        cp.unidad,
        cp.clues_id,
        cp.fecha_ingreso_cpn,
        cp.sdg_ingreso,
        cp.semanas_gestacion,
        cp.factor_riesgo_antecedentes,
        cp.factor_riesgo_tamizajes,
        c.fecha_consulta,
        c.puntaje_total_consulta,
        c.puntaje_consulta_parametros,
        c.riesgo_25_plus,
        COALESCE(c.colegiado, 0) AS colegiado,
        c.fecha_colegiado,
        c.diagnostico,
        c.plan,
        c.notas
     FROM consultas_prenatales c
     INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
     WHERE c.id = ?
     LIMIT 1`,
    [consultaId]
  );

  return rows?.[0] || null;
}

async function getPlanYAcciones(consultaId: number) {
  const planRows = await query<any[]>(
    `SELECT id, consulta_id, paciente_id, estatus, observaciones, created_at, updated_at
     FROM colegiados_planes
     WHERE consulta_id = ?
     LIMIT 1`,
    [consultaId]
  );

  const plan = planRows?.[0] || null;
  const observacionesNivel: Record<NivelAtencion, NivelObservaciones> = {
    primer_nivel: { nivel_atencion: "primer_nivel", obs_zonales: null, obs_regionales: null, obs_estatal_salud_mujeres: null, obs_atencion_medica: null },
    segundo_nivel: { nivel_atencion: "segundo_nivel", obs_zonales: null, obs_regionales: null, obs_estatal_salud_mujeres: null, obs_atencion_medica: null },
    tercer_nivel: { nivel_atencion: "tercer_nivel", obs_zonales: null, obs_regionales: null, obs_estatal_salud_mujeres: null, obs_atencion_medica: null },
  };

  if (!plan) {
    return {
      plan: null,
      acciones: [],
      observacionesNivel,
    };
  }

  const [hasFechaAccion, hasObsTable] = await Promise.all([
    hasColumn("colegiados_acciones", "fecha_accion"),
    hasTable("colegiados_nivel_observaciones"),
  ]);

  const selectAccionesSql = hasFechaAccion
    ? `SELECT id, plan_id, nivel_atencion, orden, fecha_accion, descripcion, fecha_respuesta, respuesta_accion, estatus, cumplido, fecha_cumplimiento, created_at, updated_at
       FROM colegiados_acciones
       WHERE plan_id = ?
       ORDER BY FIELD(nivel_atencion, 'primer_nivel', 'segundo_nivel', 'tercer_nivel'), orden ASC, id ASC`
    : `SELECT id, plan_id, nivel_atencion, orden, NULL AS fecha_accion, descripcion, NULL AS fecha_respuesta, NULL AS respuesta_accion,
              CASE WHEN cumplido = 1 THEN 'completada' ELSE 'pendiente' END AS estatus,
              cumplido, fecha_cumplimiento, created_at, updated_at
       FROM colegiados_acciones
       WHERE plan_id = ?
       ORDER BY FIELD(nivel_atencion, 'primer_nivel', 'segundo_nivel', 'tercer_nivel'), orden ASC, id ASC`;

  const acciones = await query<any[]>(selectAccionesSql, [plan.id]);

  if (hasObsTable) {
    const obsRows = await query<any[]>(
      `SELECT nivel_atencion, obs_zonales, obs_regionales, obs_estatal_salud_mujeres, obs_atencion_medica
       FROM colegiados_nivel_observaciones
       WHERE plan_id = ?`,
      [plan.id]
    );

    if (Array.isArray(obsRows)) {
      for (const row of obsRows) {
        const nivel = row.nivel_atencion as NivelAtencion;
        if (nivel && observacionesNivel[nivel]) {
          observacionesNivel[nivel] = {
            nivel_atencion: nivel,
            obs_zonales: row.obs_zonales ?? null,
            obs_regionales: row.obs_regionales ?? null,
            obs_estatal_salud_mujeres: row.obs_estatal_salud_mujeres ?? null,
            obs_atencion_medica: row.obs_atencion_medica ?? null,
          };
        }
      }
    }
  }

  return {
    plan,
    acciones,
    observacionesNivel,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authResult = await requireApiAuth(_request, 2);
    if (!authResult.ok) return authResult.response;

    const { auth } = authResult;
    const params = await context.params;
    const consultaId = parseId(params.id);

    if (!consultaId) {
      return NextResponse.json({ message: "ID de consulta inválido" }, { status: 400 });
    }

    const consulta = await getConsultaColegiada(consultaId);

    if (!consulta) {
      return NextResponse.json({ message: "Consulta no encontrada" }, { status: 404 });
    }

    // Validar que el paciente pertenezca a la región del usuario
    const hasScope = await assertPacienteScope(consulta.paciente_id, auth);
    if (!hasScope) {
      return NextResponse.json(
        { message: "No tienes acceso a este paciente" },
        { status: 403 }
      );
    }

    if (Number(consulta.colegiado) !== 1) {
      return NextResponse.json(
        { message: "La consulta aún no está marcada como colegiada" },
        { status: 409 }
      );
    }

    const { plan, acciones, observacionesNivel } = await getPlanYAcciones(consultaId);

    return NextResponse.json({
      consulta,
      plan: plan || {
        id: null,
        consulta_id: consulta.consulta_id,
        paciente_id: consulta.paciente_id,
        estatus: "borrador",
        observaciones: null,
        created_at: null,
        updated_at: null,
      },
      acciones,
      observacionesNivel,
    });
  } catch (error: any) {
    console.error("Error obteniendo plan colegiado regional", error);
    return NextResponse.json(
      { message: "Error al obtener plan colegiado", details: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  let connection: mysql.PoolConnection | null = null;

  try {
    const authResult = await requireApiAuth(request, 2);
    if (!authResult.ok) return authResult.response;

    const { auth } = authResult;
    const params = await context.params;
    const consultaId = parseId(params.id);

    if (!consultaId) {
      return NextResponse.json({ message: "ID de consulta inválido" }, { status: 400 });
    }

    const consulta = await getConsultaColegiada(consultaId);

    if (!consulta) {
      return NextResponse.json({ message: "Consulta no encontrada" }, { status: 404 });
    }

    // Validar que el paciente pertenezca a la región del usuario
    const hasScope = await assertPacienteScope(consulta.paciente_id, auth);
    if (!hasScope) {
      return NextResponse.json(
        { message: "No tienes acceso a este paciente" },
        { status: 403 }
      );
    }

    if (Number(consulta.colegiado) !== 1) {
      return NextResponse.json(
        { message: "La consulta aún no está marcada como colegiada" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const acciones = normalizarAccionesColegiadas(Array.isArray(body?.acciones) ? body.acciones : []);
    const observaciones = body?.observaciones ? String(body.observaciones).trim() : null;
    const estatusInput = String(body?.estatus || "").trim();
    const estatus = ESTATUS_VALIDOS.includes(estatusInput as (typeof ESTATUS_VALIDOS)[number])
      ? estatusInput
      : (acciones.length > 0 ? "completo" : "borrador");

    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const planRows = await connection.execute(
      `SELECT id
       FROM colegiados_planes
       WHERE consulta_id = ?
       LIMIT 1`,
      [consultaId]
    );

    const currentPlanRows = planRows[0] as any[];
    let planId = Number(currentPlanRows?.[0]?.id) || null;

    if (!planId) {
      const insertResult = await connection.execute(
        `INSERT INTO colegiados_planes (consulta_id, paciente_id, estatus, observaciones)
         VALUES (?, ?, ?, ?)`,
        [consultaId, consulta.paciente_id, estatus, observaciones]
      );
      const insertHeader = insertResult[0] as mysql.ResultSetHeader;
      planId = Number(insertHeader.insertId) || null;
    } else {
      await connection.execute(
        `UPDATE colegiados_planes
         SET estatus = ?, observaciones = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [estatus, observaciones, planId]
      );
    }

    // 1. Guardar acciones
    await connection.execute(
      `DELETE FROM colegiados_acciones WHERE plan_id = ?`,
      [planId]
    );

    const hasFechaAccion = await hasColumn("colegiados_acciones", "fecha_accion");

    for (const accion of acciones) {
      if (hasFechaAccion) {
        await connection.execute(
          `INSERT INTO colegiados_acciones (
            plan_id, nivel_atencion, orden, fecha_accion, descripcion, fecha_respuesta, respuesta_accion, estatus, cumplido, fecha_cumplimiento
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            planId,
            accion.nivel_atencion,
            accion.orden,
            accion.fecha_accion,
            accion.descripcion,
            accion.fecha_respuesta,
            accion.respuesta_accion,
            accion.estatus,
            accion.cumplido,
            accion.fecha_cumplimiento,
          ]
        );
      } else {
        await connection.execute(
          `INSERT INTO colegiados_acciones (
            plan_id, nivel_atencion, orden, descripcion, cumplido, fecha_cumplimiento
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            planId,
            accion.nivel_atencion,
            accion.orden,
            accion.descripcion,
            accion.cumplido,
            accion.fecha_cumplimiento,
          ]
        );
      }
    }

    // 2. Guardar observaciones por nivel aplicando RBAC regional
    const hasObsTable = await hasTable("colegiados_nivel_observaciones");
    if (hasObsTable && planId) {
      const incomingObsMap = (body?.observaciones_nivel || body?.observacionesNivel || {}) as Record<string, any>;

      const [existingRows]: any = await connection.execute(
        `SELECT nivel_atencion, obs_zonales, obs_regionales, obs_estatal_salud_mujeres, obs_atencion_medica
         FROM colegiados_nivel_observaciones
         WHERE plan_id = ?`,
        [planId]
      );

      const existingMap = new Map<NivelAtencion, NivelObservaciones>();
      if (Array.isArray(existingRows)) {
        for (const row of existingRows) {
          existingMap.set(row.nivel_atencion as NivelAtencion, {
            nivel_atencion: row.nivel_atencion,
            obs_zonales: row.obs_zonales ?? null,
            obs_regionales: row.obs_regionales ?? null,
            obs_estatal_salud_mujeres: row.obs_estatal_salud_mujeres ?? null,
            obs_atencion_medica: row.obs_atencion_medica ?? null,
          });
        }
      }

      for (const nivel of NIVELES_ATENCION) {
        const merged = fusionarObservacionesConRBAC({
          nivelUsuario: authResult.auth.nivel,
          nivelAtencion: nivel,
          incoming: incomingObsMap[nivel],
          existing: existingMap.get(nivel) || null,
        });

        await connection.execute(
          `INSERT INTO colegiados_nivel_observaciones (
            plan_id, nivel_atencion, obs_zonales, obs_regionales, obs_estatal_salud_mujeres, obs_atencion_medica
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            obs_zonales = VALUES(obs_zonales),
            obs_regionales = VALUES(obs_regionales),
            obs_estatal_salud_mujeres = VALUES(obs_estatal_salud_mujeres),
            obs_atencion_medica = VALUES(obs_atencion_medica),
            updated_at = CURRENT_TIMESTAMP`,
          [
            planId,
            merged.nivel_atencion,
            merged.obs_zonales,
            merged.obs_regionales,
            merged.obs_estatal_salud_mujeres,
            merged.obs_atencion_medica,
          ]
        );
      }
    }

    await connection.commit();

    const { plan, acciones: accionesGuardadas, observacionesNivel: obsGuardadas } = await getPlanYAcciones(consultaId);

    return NextResponse.json({
      ok: true,
      consulta,
      plan,
      acciones: accionesGuardadas,
      observacionesNivel: obsGuardadas,
    });
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }

    const message = error?.message || "Error interno";
    const status = message.includes("acción") || message.includes("Solo se permiten") || message.includes("inválido")
      ? 400
      : 500;

    console.error("Error guardando plan colegiado regional", error);
    return NextResponse.json(
      { message: "Error al guardar plan colegiado", details: message },
      { status }
    );
  } finally {
    connection?.release();
  }
}
