import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pacienteId = searchParams.get("paciente_id");
  if (!pacienteId) {
    return NextResponse.json({ message: "paciente_id es requerido" }, { status: 400 });
  }

  try {
    const rows = await query(
            `SELECT id, paciente_id, prueba_vih, prueba_vdrl, prueba_hepatitis_c,
              prueba_vih_t3, prueba_vdrl_t3, prueba_hepatitis_c_t3,
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
  try {
    const body = await request.json();
    const pacienteId = body.paciente_id;
    if (!pacienteId) {
      return NextResponse.json({ message: "paciente_id es requerido" }, { status: 400 });
    }

    const payload = {
      paciente_id: pacienteId,
      prueba_vih: body.prueba_vih || null,
      prueba_vdrl: body.prueba_vdrl || null,
      prueba_hepatitis_c: body.prueba_hepatitis_c || null,
      prueba_vih_t3: body.prueba_vih_t3 || null,
      prueba_vdrl_t3: body.prueba_vdrl_t3 || null,
      prueba_hepatitis_c_t3: body.prueba_hepatitis_c_t3 || null,
      diabetes_glicemia: body.diabetes_glicemia || null,
      violencia: body.violencia || null,
      created_by: body.created_by || null,
      updated_by: body.updated_by || null,
    };

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
