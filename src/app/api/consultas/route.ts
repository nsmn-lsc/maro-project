import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { dispatchPendingTelegramAlerts } from "@/lib/telegramDispatch";
import { isTelegramAlertsEnabled } from "@/lib/telegramAlerts";

const TELEGRAM_RIESGO_TIPO = "RIESGO_25_PLUS";

async function hasColumn(columnName: string) {
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM consultas_prenatales LIKE '${columnName}'`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

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
    const [hasColegiado, hasFechaColegiado] = await Promise.all([
      hasColumn("colegiado"),
      hasColumn("fecha_colegiado"),
    ]);

    const colegiadoExpr = hasColegiado ? "COALESCE(colegiado, 0)" : "0";
    const fechaColegiadoExpr = hasFechaColegiado ? "fecha_colegiado" : "NULL";

    const rows = await query(
            `SELECT id, paciente_id, fecha_consulta,
              ta_sistolica, ta_diastolica, frecuencia_cardiaca, indice_choque, frecuencia_respiratoria, temperatura,
              fondo_uterino_acorde_sdg, ivu_repeticion, estado_conciencia, hemorragia, respiracion, color_piel,
              puntaje_consulta_parametros, puntaje_total_consulta, riesgo_25_plus,
              ${colegiadoExpr} AS colegiado, ${fechaColegiadoExpr} AS fecha_colegiado,
              diagnostico, plan, fecha_referencia, area_referencia,
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
      `SELECT factor_riesgo_antecedentes, factor_riesgo_tamizajes, folio, unidad, edad,
              imc_inicial, factor_cardiopatia, factor_nefropatia, factor_hepatopatia, factor_coagulopatias
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
    const tieneAntecedenteRiesgoMayor = [
      paciente.factor_cardiopatia,
      paciente.factor_nefropatia,
      paciente.factor_hepatopatia,
      paciente.factor_coagulopatias,
    ].some((value) => Number(value) === 1);
    const edadPaciente = Number(paciente.edad);
    const tieneEdadCritica = Number.isFinite(edadPaciente) && edadPaciente >= 10 && edadPaciente <= 14;
    const imcPaciente = Number(paciente.imc_inicial);
    const tieneImcCritico = Number.isFinite(imcPaciente) && imcPaciente >= 31;

    const puntajeCalculado = puntajeAntecedentes + puntajeTamizajes + puntajeConsultaParametros;
    const puntajeTotalConsulta = (tieneAntecedenteRiesgoMayor || tieneEdadCritica || tieneImcCritico)
      ? Math.max(25, puntajeCalculado)
      : puntajeCalculado;
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
      estado_conciencia: body.estado_conciencia || null,
      hemorragia: body.hemorragia || null,
      respiracion: body.respiracion || null,
      color_piel: body.color_piel || null,
      puntaje_consulta_parametros: puntajeConsultaParametros,
      puntaje_total_consulta: puntajeTotalConsulta,
      riesgo_25_plus: riesgo25Plus,
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

    const consultaId = Number(result?.insertId) || null;
    const puntajeTotal = Number(puntajeTotalConsulta) || 0;

    if (consultaId && riesgo25Plus === 1 && isTelegramAlertsEnabled()) {
      const folio = paciente?.folio || null;
      const unidad = paciente?.unidad || null;

      try {
        await query(
          `INSERT INTO alertas_telegram (
            tipo, paciente_id, consulta_id, folio, unidad, puntaje_total, payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id = id`,
          [
            TELEGRAM_RIESGO_TIPO,
            pacienteId,
            consultaId,
            folio,
            unidad,
            puntajeTotal,
            JSON.stringify({ folio, unidad, puntaje_total: puntajeTotal }),
          ]
        );

        // Dispara un intento inmediato para reducir la latencia respecto al cron.
        setTimeout(() => {
          void dispatchPendingTelegramAlerts(1).catch((dispatchError: unknown) => {
            console.error("No se pudo despachar alerta Telegram inmediatamente", {
              consultaId,
              pacienteId,
              error: dispatchError instanceof Error ? dispatchError.message : String(dispatchError),
            });
          });
        }, 0);
      } catch (enqueueError: any) {
        // El guardado clinico no debe fallar por problemas de la cola de alertas.
        console.error("No se pudo encolar alerta Telegram", {
          consultaId,
          pacienteId,
          error: enqueueError?.message || enqueueError,
        });
      }
    }

    return NextResponse.json({ id: result.insertId, ...payload }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando consulta", error);
    return NextResponse.json({ message: "Error al crear consulta" }, { status: 500 });
  }
}
