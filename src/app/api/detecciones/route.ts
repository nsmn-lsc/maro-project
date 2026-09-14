import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { assertPacienteScope, requireApiAuth } from "@/lib/apiAuth";

async function hasColumn(columnName: string) {
  try {
    const rows = await query<any[]>(
      `SELECT COUNT(*) as count 
         FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
          AND table_name = 'detecciones' 
          AND column_name = ?`,
      [columnName]
    );
    return rows[0]?.count > 0;
  } catch {
    return false;
  }
}

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
    const [hasFechaGeneral, hasFechaVih, hasFechaVdrl, hasFechaHep] = await Promise.all([
      hasColumn("fecha_deteccion_t3"),
      hasColumn("fecha_vih_t3"),
      hasColumn("fecha_vdrl_t3"),
      hasColumn("fecha_hepatitis_c_t3"),
    ]);

    const extraFields = [
      hasFechaGeneral ? "fecha_deteccion_t3" : null,
      hasFechaVih ? "fecha_vih_t3" : null,
      hasFechaVdrl ? "fecha_vdrl_t3" : null,
      hasFechaHep ? "fecha_hepatitis_c_t3" : null,
    ].filter(Boolean);

    const selectExtra = extraFields.length > 0 ? `, ${extraFields.join(", ")}` : "";

    const rows = await query(
      `SELECT id, paciente_id, prueba_vih, prueba_vdrl, prueba_hepatitis_c,
              prueba_vih_t3, prueba_vdrl_t3, prueba_hepatitis_c_t3${selectExtra},
              diabetes_glicemia, violencia, created_at
         FROM detecciones
        WHERE paciente_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [pacienteId]
    );

    return NextResponse.json(rows[0] || null);
  } catch (error: any) {
    console.error("Error obteniendo detecciones", error);
    return NextResponse.json({ message: "Error al obtener detecciones" }, { status: 500 });
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

    const payload: Record<string, any> = {
      paciente_id: pacienteIdNum,
      prueba_vih: body.prueba_vih || null,
      prueba_vdrl: body.prueba_vdrl || null,
      prueba_hepatitis_c: body.prueba_hepatitis_c || null,
      prueba_vih_t3: body.prueba_vih_t3 || null,
      prueba_vdrl_t3: body.prueba_vdrl_t3 || null,
      prueba_hepatitis_c_t3: body.prueba_hepatitis_c_t3 || null,
      diabetes_glicemia: body.diabetes_glicemia || null,
      violencia: body.violencia || null,
      created_by: auth.userId,
      updated_by: auth.userId,
    };

    if (await hasColumn("fecha_deteccion_t3")) {
      payload.fecha_deteccion_t3 = body.fecha_deteccion_t3 || null;
    }
    if (await hasColumn("fecha_vih_t3")) {
      payload.fecha_vih_t3 = body.fecha_vih_t3 || null;
    }
    if (await hasColumn("fecha_vdrl_t3")) {
      payload.fecha_vdrl_t3 = body.fecha_vdrl_t3 || null;
    }
    if (await hasColumn("fecha_hepatitis_c_t3")) {
      payload.fecha_hepatitis_c_t3 = body.fecha_hepatitis_c_t3 || null;
    }

    const placeholders = Object.keys(payload)
      .map(() => "?")
      .join(", ");

    const values = Object.values(payload);

    const result: any = await query(
      `INSERT INTO detecciones (${Object.keys(payload).join(", ")}) VALUES (${placeholders})`,
      values
    );

    return NextResponse.json({ id: result.insertId, ...payload }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando detecciones", error);
    return NextResponse.json({ message: "Error al crear detecciones" }, { status: 500 });
  }
}
