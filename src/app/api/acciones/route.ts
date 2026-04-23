import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { assertPacienteScope, requireApiAuth } from "@/lib/apiAuth";

export async function GET(request: Request) {
  const authResult = await requireApiAuth(request, 1);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const { searchParams } = new URL(request.url);
  const pacienteId = searchParams.get("paciente_id");
  if (!pacienteId) {
    return NextResponse.json({ message: "paciente_id es requerido" }, { status: 400 });
  }

  const pacienteIdNum = Number(pacienteId);
  if (!Number.isFinite(pacienteIdNum) || pacienteIdNum <= 0) {
    return NextResponse.json({ message: "paciente_id inválido" }, { status: 400 });
  }

  const allowed = await assertPacienteScope(pacienteIdNum, auth);
  if (!allowed) {
    return NextResponse.json({ message: "Sin permisos para este paciente" }, { status: 403 });
  }

  try {
    const rows = await query(
      `SELECT id, paciente_id, td, tdpa, influenza, covid, otras, estomatologia, nutricion, created_at
         FROM acciones_preventivas
        WHERE paciente_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [pacienteId]
    );

    return NextResponse.json(rows[0] || null);
  } catch (error: any) {
    console.error("Error obteniendo acciones preventivas", error);
    return NextResponse.json({ message: "Error al obtener acciones preventivas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireApiAuth(request, 1);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  try {
    const body = await request.json();
    const pacienteId = body.paciente_id;
    if (!pacienteId) {
      return NextResponse.json({ message: "paciente_id es requerido" }, { status: 400 });
    }

    const pacienteIdNum = Number(pacienteId);
    if (!Number.isFinite(pacienteIdNum) || pacienteIdNum <= 0) {
      return NextResponse.json({ message: "paciente_id inválido" }, { status: 400 });
    }

    const allowed = await assertPacienteScope(pacienteIdNum, auth);
    if (!allowed) {
      return NextResponse.json({ message: "Sin permisos para este paciente" }, { status: 403 });
    }

    const payload = {
      paciente_id: pacienteIdNum,
      td: body.td || null,
      tdpa: body.tdpa || null,
      influenza: body.influenza || null,
      covid: body.covid || null,
      otras: body.otras || null,
      estomatologia: body.estomatologia || null,
      nutricion: body.nutricion || null,
      created_by: auth.userId,
      updated_by: auth.userId,
    };

    const placeholders = Object.keys(payload)
      .map(() => "?")
      .join(", ");

    const values = Object.values(payload);

    const result: any = await query(
      `INSERT INTO acciones_preventivas (${Object.keys(payload).join(", ")}) VALUES (${placeholders})`,
      values
    );

    return NextResponse.json({ id: result.insertId, ...payload }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando acciones preventivas", error);
    return NextResponse.json({ message: "Error al crear acciones preventivas" }, { status: 500 });
  }
}
