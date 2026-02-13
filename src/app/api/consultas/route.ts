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
            `SELECT id, paciente_id, fecha_consulta,
              ta_sistolica, ta_diastolica, frecuencia_cardiaca, indice_choque, frecuencia_respiratoria, temperatura,
              fondo_uterino_acorde_sdg, ivu_repeticion, reclasificacion_ro,
              alarma_obstetrica, diagnostico, plan, fecha_referencia, area_referencia,
              notas, created_at
         FROM consultas_prenatales
        WHERE paciente_id = ?
        ORDER BY fecha_consulta DESC, id DESC`,
      [pacienteId]
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error obteniendo consultas", error);
    return NextResponse.json({ message: "Error al obtener consultas" }, { status: 500 });
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
      fecha_consulta: body.fecha_consulta || null,
      ta_sistolica: body.ta_sistolica ?? null,
      ta_diastolica: body.ta_diastolica ?? null,
      frecuencia_cardiaca: body.frecuencia_cardiaca ?? null,
      indice_choque: body.indice_choque ?? null,
      frecuencia_respiratoria: body.frecuencia_respiratoria ?? null,
      temperatura: body.temperatura ?? null,
      fondo_uterino_acorde_sdg: body.fondo_uterino_acorde_sdg ? 1 : 0,
      ivu_repeticion: body.ivu_repeticion ? 1 : 0,
      reclasificacion_ro: body.reclasificacion_ro ?? null,
      alarma_obstetrica: body.alarma_obstetrica || null,
      diagnostico: body.diagnostico || null,
      plan: body.plan || null,
      fecha_referencia: body.fecha_referencia || null,
      area_referencia: body.area_referencia || null,
      notas: body.notas || null,
      created_by: body.created_by || null,
      updated_by: body.updated_by || null,
    };

    const placeholders = Object.keys(payload)
      .map(() => "?")
      .join(", ");

    const values = Object.values(payload);

    const result: any = await query(
      `INSERT INTO consultas_prenatales (${Object.keys(payload).join(", ")}) VALUES (${placeholders})`,
      values
    );

    return NextResponse.json({ id: result.insertId, ...payload }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando consulta", error);
    return NextResponse.json({ message: "Error al crear consulta" }, { status: 500 });
  }
}
