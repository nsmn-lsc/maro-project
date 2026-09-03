/**
 * API Route para la gestión de Ultrasonidos Obstétricos de la paciente
 * GET  /api/pacientes/[id]/ultrasonidos -> Consulta la lista cronológica de USGs de la paciente
 * POST /api/pacientes/[id]/ultrasonidos -> Registra un nuevo ultrasonido (tipo, fecha_toma_usg, descripcion)
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { assertPacienteScope, requireApiAuth } from "@/lib/apiAuth";
import { esTipoUltrasonidoValido, esFechaValida, sanitizarDescripcionUSG } from "@/lib/ultrasonidos";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(req, 1);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  try {
    const { id } = await context.params;
    const pacienteIdNum = Number(id);

    if (!Number.isFinite(pacienteIdNum) || pacienteIdNum <= 0) {
      return NextResponse.json(
        { error: "pacienteId debe ser un número entero válido" },
        { status: 400 }
      );
    }

    const allowed = await assertPacienteScope(pacienteIdNum, auth);
    if (!allowed) {
      return NextResponse.json(
        { error: "Sin permisos para consultar este paciente" },
        { status: 403 }
      );
    }

    // Consultar lista cronológica de ultrasonidos de la paciente
    const ultrasonidos = await query<any[]>(
      `SELECT id, paciente_id, consulta_id, tipo, fecha_toma_usg, descripcion, created_at, created_by
       FROM pacientes_ultrasonidos
       WHERE paciente_id = ?
       ORDER BY fecha_toma_usg DESC, created_at DESC`,
      [pacienteIdNum]
    );

    return NextResponse.json({
      ok: true,
      ultrasonidos: Array.isArray(ultrasonidos) ? ultrasonidos : [],
    });
  } catch (error: any) {
    console.error("Error en GET /api/pacientes/[id]/ultrasonidos:", error);
    return NextResponse.json(
      { error: "Error al consultar los ultrasonidos de la paciente", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(req, 1);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  try {
    const { id } = await context.params;
    const pacienteIdNum = Number(id);

    if (!Number.isFinite(pacienteIdNum) || pacienteIdNum <= 0) {
      return NextResponse.json(
        { error: "pacienteId debe ser un número entero válido" },
        { status: 400 }
      );
    }

    const allowed = await assertPacienteScope(pacienteIdNum, auth);
    if (!allowed) {
      return NextResponse.json(
        { error: "Sin permisos para actualizar este paciente" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tipo, fecha_toma_usg, descripcion, consulta_id } = body || {};

    if (!tipo || !esTipoUltrasonidoValido(tipo)) {
      return NextResponse.json(
        { error: "Debe proporcionar un tipo de ultrasonido válido del catálogo oficial" },
        { status: 400 }
      );
    }

    if (!fecha_toma_usg || !esFechaValida(fecha_toma_usg)) {
      return NextResponse.json(
        { error: "Debe proporcionar una fecha de toma del ultrasonido en formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const descSanitizada = sanitizarDescripcionUSG(descripcion);
    const consultaIdNum = Number(consulta_id);
    const validConsultaId = Number.isFinite(consultaIdNum) && consultaIdNum > 0 ? consultaIdNum : null;

    const result = await query<any>(
      `INSERT INTO pacientes_ultrasonidos (paciente_id, consulta_id, tipo, fecha_toma_usg, descripcion, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        pacienteIdNum,
        validConsultaId,
        tipo,
        fecha_toma_usg,
        descSanitizada || null,
        auth.userId || null,
      ]
    );

    return NextResponse.json({
      ok: true,
      id: result.insertId,
      message: "Ultrasonido registrado correctamente",
      ultrasonido: {
        id: result.insertId,
        paciente_id: pacienteIdNum,
        consulta_id: validConsultaId,
        tipo,
        fecha_toma_usg,
        descripcion: descSanitizada || null,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error en POST /api/pacientes/[id]/ultrasonidos:", error);
    return NextResponse.json(
      { error: "Error al registrar el ultrasonido", details: error?.message },
      { status: 500 }
    );
  }
}
