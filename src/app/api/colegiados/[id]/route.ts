import { NextResponse } from "next/server";
import type mysql from "mysql2/promise";
import { getPool, query } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AccionPayload = {
  nivel_atencion?: string;
  orden?: number;
  descripcion?: string;
  cumplido?: boolean | number;
  fecha_cumplimiento?: string | null;
};

const NIVELES_VALIDOS = ["primer_nivel", "segundo_nivel", "tercer_nivel"] as const;
const ESTATUS_VALIDOS = ["borrador", "completo"] as const;

function parseId(value: string) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function isNivelValido(value: string): value is (typeof NIVELES_VALIDOS)[number] {
  return NIVELES_VALIDOS.includes(value as (typeof NIVELES_VALIDOS)[number]);
}

function normalizarAcciones(input: unknown[]) {
  const acciones = input.map((raw, index) => {
    const accion = (raw || {}) as AccionPayload;
    const nivel = String(accion.nivel_atencion || "").trim();
    const descripcion = String(accion.descripcion || "").trim();

    if (!isNivelValido(nivel)) {
      throw new Error(`Nivel de atención inválido en la acción ${index + 1}`);
    }

    if (!descripcion) {
      throw new Error(`La descripción es requerida en la acción ${index + 1}`);
    }

    if (descripcion.length > 500) {
      throw new Error(`La descripción excede 500 caracteres en la acción ${index + 1}`);
    }

    return {
      nivel_atencion: nivel,
      orden: Number(accion.orden) || 0,
      descripcion,
      cumplido: accion.cumplido ? 1 : 0,
      fecha_cumplimiento: accion.cumplido
        ? (accion.fecha_cumplimiento ? String(accion.fecha_cumplimiento) : new Date().toISOString().slice(0, 19).replace("T", " "))
        : null,
    };
  });

  const grouped = new Map<string, number>();
  for (const accion of acciones) {
    grouped.set(accion.nivel_atencion, (grouped.get(accion.nivel_atencion) || 0) + 1);
  }

  for (const nivel of NIVELES_VALIDOS) {
    if ((grouped.get(nivel) || 0) > 5) {
      throw new Error(`Solo se permiten 5 acciones en ${nivel.replace("_", " ")}`);
    }
  }

  const counters = new Map<string, number>();
  return acciones.map((accion) => {
    const nextOrder = (counters.get(accion.nivel_atencion) || 0) + 1;
    counters.set(accion.nivel_atencion, nextOrder);
    return {
      ...accion,
      orden: nextOrder,
    };
  });
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
  if (!plan) {
    return {
      plan: null,
      acciones: [],
    };
  }

  const acciones = await query<any[]>(
    `SELECT id, plan_id, nivel_atencion, orden, descripcion, cumplido, fecha_cumplimiento, created_at, updated_at
     FROM colegiados_acciones
     WHERE plan_id = ?
     ORDER BY FIELD(nivel_atencion, 'primer_nivel', 'segundo_nivel', 'tercer_nivel'), orden ASC, id ASC`,
    [plan.id]
  );

  return {
    plan,
    acciones,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const consultaId = parseId(params.id);

    if (!consultaId) {
      return NextResponse.json({ message: "ID de consulta inválido" }, { status: 400 });
    }

    const consulta = await getConsultaColegiada(consultaId);

    if (!consulta) {
      return NextResponse.json({ message: "Consulta no encontrada" }, { status: 404 });
    }

    if (Number(consulta.colegiado) !== 1) {
      return NextResponse.json(
        { message: "La consulta aún no está marcada como colegiada" },
        { status: 409 }
      );
    }

    const { plan, acciones } = await getPlanYAcciones(consultaId);

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
    });
  } catch (error: any) {
    console.error("Error obteniendo plan colegiado", error);
    return NextResponse.json(
      { message: "Error al obtener plan colegiado", details: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  let connection: mysql.PoolConnection | null = null;

  try {
    const params = await context.params;
    const consultaId = parseId(params.id);

    if (!consultaId) {
      return NextResponse.json({ message: "ID de consulta inválido" }, { status: 400 });
    }

    const consulta = await getConsultaColegiada(consultaId);

    if (!consulta) {
      return NextResponse.json({ message: "Consulta no encontrada" }, { status: 404 });
    }

    if (Number(consulta.colegiado) !== 1) {
      return NextResponse.json(
        { message: "La consulta aún no está marcada como colegiada" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const acciones = normalizarAcciones(Array.isArray(body?.acciones) ? body.acciones : []);
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

    await connection.execute(
      `DELETE FROM colegiados_acciones WHERE plan_id = ?`,
      [planId]
    );

    for (const accion of acciones) {
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

    await connection.commit();

    const { plan, acciones: accionesGuardadas } = await getPlanYAcciones(consultaId);

    return NextResponse.json({
      ok: true,
      consulta,
      plan,
      acciones: accionesGuardadas,
    });
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }

    const message = error?.message || "Error interno";
    const status = message.includes("acción") || message.includes("Solo se permiten") || message.includes("inválido")
      ? 400
      : 500;

    console.error("Error guardando plan colegiado", error);
    return NextResponse.json(
      { message: "Error al guardar plan colegiado", details: message },
      { status }
    );
  } finally {
    connection?.release();
  }
}