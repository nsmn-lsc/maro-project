import { NextResponse } from "next/server";
import { query } from "@/lib/db";

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function calcularPuntajeConsultaParametros(input: {
  ta_sistolica: number | null;
  ta_diastolica: number | null;
  frecuencia_cardiaca: number | null;
  indice_choque: number | null;
  temperatura: number | null;
}): number {
  const puntajeTaSistolica = input.ta_sistolica === null
    ? 0
    : (input.ta_sistolica <= 89 || input.ta_sistolica >= 160)
      ? 4
      : (input.ta_sistolica >= 140 && input.ta_sistolica <= 159)
        ? 2
        : 0;

  const puntajeTaDiastolica = input.ta_diastolica === null
    ? 0
    : (input.ta_diastolica <= 50 || input.ta_diastolica >= 110)
      ? 4
      : (input.ta_diastolica >= 90 && input.ta_diastolica <= 109)
        ? 2
        : 0;

  const puntajeFrecuenciaCardiaca = input.frecuencia_cardiaca === null
    ? 0
    : (input.frecuencia_cardiaca < 60 || input.frecuencia_cardiaca > 100)
      ? 4
      : 0;

  const puntajeIndiceChoque = input.indice_choque === null
    ? 0
    : input.indice_choque > 0.8
      ? 4
      : (input.indice_choque >= 0.7 && input.indice_choque <= 0.8)
        ? 2
        : 0;

  const puntajeTemperatura = input.temperatura === null
    ? 0
    : (input.temperatura < 36 || input.temperatura > 39)
      ? 4
      : (input.temperatura >= 37.5 && input.temperatura <= 38.9)
        ? 2
        : 0;

  return (
    puntajeTaSistolica +
    puntajeTaDiastolica +
    puntajeFrecuenciaCardiaca +
    puntajeIndiceChoque +
    puntajeTemperatura
  );
}

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
              puntaje_consulta_parametros, puntaje_total_consulta, riesgo_25_plus,
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

    const taSistolica = toNumberOrNull(body.ta_sistolica);
    const taDiastolica = toNumberOrNull(body.ta_diastolica);
    const frecuenciaCardiaca = toNumberOrNull(body.frecuencia_cardiaca);
    const indiceChoque = toNumberOrNull(body.indice_choque);
    const temperatura = toNumberOrNull(body.temperatura);

    const puntajeConsultaParametros = calcularPuntajeConsultaParametros({
      ta_sistolica: taSistolica,
      ta_diastolica: taDiastolica,
      frecuencia_cardiaca: frecuenciaCardiaca,
      indice_choque: indiceChoque,
      temperatura,
    });

    const pacienteRows: any = await query(
      `SELECT factor_riesgo_antecedentes, factor_riesgo_tamizajes
         FROM cat_pacientes
        WHERE id = ?
        LIMIT 1`,
      [pacienteId]
    );

    const paciente = pacienteRows?.[0];
    if (!paciente) {
      return NextResponse.json({ message: "Paciente no encontrado" }, { status: 404 });
    }

    const puntajeAntecedentes = Number(paciente.factor_riesgo_antecedentes) || 0;
    const puntajeTamizajes = Number(paciente.factor_riesgo_tamizajes) || 0;
    const puntajeTotalConsulta = puntajeAntecedentes + puntajeTamizajes + puntajeConsultaParametros;
    const riesgo25Plus = puntajeTotalConsulta >= 25 ? 1 : 0;

    const payload = {
      paciente_id: pacienteId,
      fecha_consulta: body.fecha_consulta || null,
      ta_sistolica: taSistolica,
      ta_diastolica: taDiastolica,
      frecuencia_cardiaca: frecuenciaCardiaca,
      indice_choque: indiceChoque,
      frecuencia_respiratoria: body.frecuencia_respiratoria ?? null,
      temperatura,
      fondo_uterino_acorde_sdg: body.fondo_uterino_acorde_sdg ? 1 : 0,
      ivu_repeticion: body.ivu_repeticion ? 1 : 0,
      reclasificacion_ro: body.reclasificacion_ro ?? null,
      puntaje_consulta_parametros: puntajeConsultaParametros,
      puntaje_total_consulta: puntajeTotalConsulta,
      riesgo_25_plus: riesgo25Plus,
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
