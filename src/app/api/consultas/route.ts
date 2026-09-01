import { NextResponse } from "next/server";
import type mysql from "mysql2/promise";
import { getPool, query } from "@/lib/db";
import { assertPacienteScope, requireApiAuth } from "@/lib/apiAuth";
import { dispatchPendingTelegramAlerts } from "@/lib/telegramDispatch";
import { isTelegramAlertsEnabled } from "@/lib/telegramAlerts";

const TELEGRAM_RIESGO_TIPO = "RIESGO_25_PLUS";

const columnCache = new Map<string, boolean>();

async function hasColumn(columnName: string) {
  if (columnCache.has(columnName)) {
    return columnCache.get(columnName)!;
  }
  try {
    const rows = await query<any[]>(`SHOW COLUMNS FROM consultas_prenatales LIKE '${columnName}'`);
    const exists = Array.isArray(rows) && rows.length > 0;
    columnCache.set(columnName, exists);
    return exists;
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
  frecuencia_respiratoria: number | null;
  indice_choque: number | null;
  temperatura: number | null;
  fondo_uterino_acorde_sdg?: boolean | 0 | 1 | null;
  ivu_repeticion?: boolean | 0 | 1 | null;
  color_piel?: string | null;
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

  const puntajeFrecuenciaRespiratoria = input.frecuencia_respiratoria === null
    ? 0
    : (input.frecuencia_respiratoria < 16 || input.frecuencia_respiratoria > 20)
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

  const puntajeFondoUterino = input.fondo_uterino_acorde_sdg ? 4 : 0;
  const puntajeIvu = input.ivu_repeticion ? 15 : 0;
  const puntajeColorPiel = input.color_piel === "cianotica" ? 4 : 0;

  return (
    puntajeTaSistolica +
    puntajeTaDiastolica +
    puntajeFrecuenciaCardiaca +
    puntajeFrecuenciaRespiratoria +
    puntajeIndiceChoque +
    puntajeTemperatura +
    puntajeFondoUterino +
    puntajeIvu +
    puntajeColorPiel
  );
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
    return NextResponse.json({ message: "Sin permisos para consultar este paciente" }, { status: 403 });
  }

  try {
    const [hasColegiado, hasFechaColegiado] = await Promise.all([
      hasColumn("colegiado"),
      hasColumn("fecha_colegiado"),
    ]);

    const colegiadoExpr = hasColegiado ? "COALESCE(colegiado, 0)" : "0";
    const fechaColegiadoExpr = hasFechaColegiado ? "fecha_colegiado" : "NULL";

    const rows = await query(
            `SELECT id, paciente_id, fecha_consulta, sdg,
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
  const authResult = await requireApiAuth(request, 1);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  let connection: mysql.PoolConnection | null = null;

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
      return NextResponse.json({ message: "Sin permisos para registrar consulta en este paciente" }, { status: 403 });
    }

    const taSistolica = toNumberOrNull(body.ta_sistolica);
    const taDiastolica = toNumberOrNull(body.ta_diastolica);
    const frecuenciaCardiaca = toNumberOrNull(body.frecuencia_cardiaca);
    const frecuenciaRespiratoria = toNumberOrNull(body.frecuencia_respiratoria);
    const indiceChoque = toNumberOrNull(body.indice_choque);
    const temperatura = toNumberOrNull(body.temperatura);

    const puntajeConsultaParametros = calcularPuntajeConsultaParametros({
      ta_sistolica: taSistolica,
      ta_diastolica: taDiastolica,
      frecuencia_cardiaca: frecuenciaCardiaca,
      frecuencia_respiratoria: frecuenciaRespiratoria,
      indice_choque: indiceChoque,
      temperatura,
      fondo_uterino_acorde_sdg: body.fondo_uterino_acorde_sdg,
      ivu_repeticion: body.ivu_repeticion,
      color_piel: body.color_piel,
    });

    const pacienteRows: any = await query(
      `SELECT factor_riesgo_antecedentes, factor_riesgo_tamizajes, folio, unidad, edad,
              imc_inicial, factor_cardiopatia, factor_nefropatia, factor_hepatopatia, factor_coagulopatias, fum,
              estado_embarazo, fecha_resolucion
         FROM cat_pacientes
        WHERE id = ?
        LIMIT 1`,
      [pacienteId]
    );

    const paciente = pacienteRows?.[0];
    if (!paciente) {
      return NextResponse.json({ message: "Paciente no encontrado" }, { status: 404 });
    }

    // Si el embarazo ya concluyó (está en puerperio o concluido), no se permite nueva consulta prenatal
    if (paciente.estado_embarazo === "puerperio" || paciente.estado_embarazo === "concluido") {
      return NextResponse.json(
        {
          message:
            "El ciclo prenatal de esta paciente ha concluido (se encuentra en puerperio). Las consultas subsecuentes deben registrarse en el módulo de Puerperio.",
        },
        { status: 400 }
      );
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

    // Calcular SDG en la fecha de la consulta basándonos en FUM del paciente
    let sdgInsertVal: number | null = null;
    const fechaConsulta = body.fecha_consulta || null;
    if (paciente.fum && fechaConsulta) {
      try {
        const fumDate = new Date(paciente.fum);
        const consDate = new Date(fechaConsulta);
        if (!isNaN(fumDate.getTime()) && !isNaN(consDate.getTime())) {
          const fumUtc = Date.UTC(fumDate.getUTCFullYear(), fumDate.getUTCMonth(), fumDate.getUTCDate());
          const consUtc = Date.UTC(consDate.getUTCFullYear(), consDate.getUTCMonth(), consDate.getUTCDate());
          const diffInMs = consUtc - fumUtc;
          if (diffInMs >= 0) {
            sdgInsertVal = Math.round(diffInMs / (1000 * 60 * 60 * 24 * 7));
          }
        }
      } catch (err) {
        console.error("Error al calcular SDG para la nueva consulta:", err);
      }
    }

    const tipoEvento = body.tipo_evento || (body.diagnostico === "puerperio" ? "resolucion_sin_complicaciones" : "embarazo");
    const fechaEvento = body.fecha_evento || (tipoEvento !== "embarazo" ? (body.fecha_consulta || null) : null);
    const complicacionResolucion = body.complicacion_resolucion || null;

    const payload = {
      paciente_id: pacienteId,
      fecha_consulta: body.fecha_consulta || null,
      sdg: sdgInsertVal,
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
      tipo_evento: tipoEvento,
      fecha_evento: fechaEvento,
      complicacion_resolucion: complicacionResolucion,
      plan: body.plan || null,
      fecha_referencia: body.fecha_referencia || null,
      area_referencia: body.area_referencia || null,
      notas: body.notas || null,
      created_by: auth.userId,
      updated_by: auth.userId,
    };

    const placeholders = Object.keys(payload)
      .map(() => "?")
      .join(", ");

    const values = Object.values(payload);

    // Iniciar transacción ACID
    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const [result]: any = await connection.execute(
      `INSERT INTO consultas_prenatales (${Object.keys(payload).join(", ")}) VALUES (${placeholders})`,
      values
    );

    const consultaId = Number(result?.insertId) || null;
    const puntajeTotal = Number(puntajeTotalConsulta) || 0;

    // Si la consulta registra una resolución de embarazo, actualizar el estado de la paciente e inicializar puerperio
    if (tipoEvento === "resolucion_sin_complicaciones" || tipoEvento === "resolucion_con_complicaciones") {
      const tipoRes = tipoEvento === "resolucion_con_complicaciones" ? "con_complicaciones" : "sin_complicaciones";
      const fechaRes = fechaEvento || body.fecha_consulta || new Date().toISOString().slice(0, 10);
      const lugarAtencion = body.lugar_atencion_parto || null;

      await connection.execute(
        `UPDATE cat_pacientes
         SET estado_embarazo = 'puerperio',
             fecha_resolucion = ?,
             tipo_resolucion = ?,
             lugar_atencion_parto = ?
         WHERE id = ?`,
        [fechaRes, tipoRes, lugarAtencion, pacienteId]
      );

      const [puerperioRows]: any = await connection.execute(
        `SELECT id FROM puerperio WHERE paciente_id = ? LIMIT 1`,
        [pacienteId]
      );

      if (!puerperioRows || puerperioRows.length === 0) {
        await connection.execute(
          `INSERT INTO puerperio (
            paciente_id, folio, fecha_atencion_evento, complicaciones, MMEG, valoracion_riesgo, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pacienteId,
            paciente.folio || null,
            fechaRes,
            complicacionResolucion,
            tipoEvento === "resolucion_con_complicaciones" ? 1 : 0,
            tipoEvento === "resolucion_con_complicaciones" ? "Alto" : "Bajo",
            auth.userId,
          ]
        );
      }
    }

    let alertEnqueued = false;
    if (consultaId && riesgo25Plus === 1) {
      const folio = paciente?.folio || null;
      const unidad = paciente?.unidad || null;

      await connection.execute(
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
      alertEnqueued = true;
    }

    await connection.commit();

    // Disparar despacho asíncrono si la alerta quedó encolada y el servicio está habilitado
    if (alertEnqueued && isTelegramAlertsEnabled()) {
      setTimeout(() => {
        void dispatchPendingTelegramAlerts(1).catch((dispatchError: unknown) => {
          console.error("No se pudo despachar alerta Telegram inmediatamente", {
            consultaId,
            pacienteId,
            error: dispatchError instanceof Error ? dispatchError.message : String(dispatchError),
          });
        });
      }, 0);
    }

    return NextResponse.json({ id: consultaId, ...payload }, { status: 201 });
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error creando consulta (transacción revertida):", error);
    return NextResponse.json({ message: "Error al crear consulta", details: error?.message || "Error interno" }, { status: 500 });
  } finally {
    connection?.release();
  }
}
