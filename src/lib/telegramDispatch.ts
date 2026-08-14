import { query } from "@/lib/db";
import type { ResultSetHeader } from "mysql2/promise";
import {
  formatRiesgoTelegramMessage,
  getTelegramMaxRetries,
  isTelegramAlertsEnabled,
  sendTelegramMessage,
} from "@/lib/telegramAlerts";

type AlertaTelegramRow = {
  id: number;
  paciente_id: number;
  consulta_id: number;
  folio: string | null;
  unidad: string | null;
  puntaje_total: number;
  intentos: number;
  estado: "pendiente" | "enviado" | "error";
};

export type DispatchResult = {
  ok: boolean;
  message?: string;
  totalProcesados: number;
  enviados: number;
  fallidos: number;
  omitidos: number;
  duracionMs: number;
  limit: number;
  maxRetries: number;
};

export function parseTelegramDispatchLimit(value: string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), 100);
}

export async function dispatchPendingTelegramAlerts(limit: number): Promise<DispatchResult> {
  const startTime = performance.now();
  const maxRetries = getTelegramMaxRetries();

  if (!isTelegramAlertsEnabled()) {
    return {
      ok: true,
      message: "TELEGRAM_ALERTS_ENABLED=false",
      totalProcesados: 0,
      enviados: 0,
      fallidos: 0,
      omitidos: 0,
      duracionMs: Math.round(performance.now() - startTime),
      limit,
      maxRetries,
    };
  }

  // Seleccionar alertas pendientes o con error reintentable (intentos < maxRetries)
  const pendingRows = await query<AlertaTelegramRow[]>(
    `SELECT id, paciente_id, consulta_id, folio, unidad, puntaje_total, intentos, estado
     FROM alertas_telegram
     WHERE (estado = 'pendiente' OR (estado = 'error' AND intentos < ?))
     ORDER BY created_at ASC
     LIMIT ${limit}`,
    [maxRetries]
  );

  let totalProcesados = 0;
  let enviados = 0;
  let fallidos = 0;
  let omitidos = 0;

  for (const row of pendingRows) {
    const currentAttempts = Number(row.intentos) || 0;

    // Bloqueo optimista y control de concurrencia: incrementar intento atómicamente
    const claimResult = await query<ResultSetHeader>(
      `UPDATE alertas_telegram
       SET intentos = intentos + 1
       WHERE id = ? AND intentos = ? AND (estado = 'pendiente' OR (estado = 'error' AND intentos < ?))`,
      [row.id, currentAttempts, maxRetries]
    );

    if (!claimResult?.affectedRows) {
      omitidos += 1;
      continue;
    }

    totalProcesados += 1;

    const msg = formatRiesgoTelegramMessage({
      folio: row.folio,
      unidad: row.unidad,
      puntajeTotal: Number(row.puntaje_total) || 0,
    });

    const sendResult = await sendTelegramMessage(msg);
    const attemptsAfterClaim = currentAttempts + 1;

    if (sendResult.ok) {
      const advertencia = sendResult.description?.startsWith("Envío parcial")
        ? sendResult.description
        : null;
      if (advertencia) {
        console.warn("[telegram-dispatch] Envío parcial:", { alertaId: row.id, advertencia });
      }

      await query(
        `UPDATE alertas_telegram
         SET estado = 'enviado', enviado_en = NOW(), error_ultimo = ?
         WHERE id = ?`,
        [advertencia, row.id]
      );
      enviados += 1;
      continue;
    }

    // Si falló el envío a la API de Telegram:
    const terminal = attemptsAfterClaim >= maxRetries;
    await query(
      `UPDATE alertas_telegram
       SET estado = ?, error_ultimo = ?
       WHERE id = ?`,
      [
        terminal ? "error" : "pendiente",
        sendResult.description || "Error en conexión con API de Telegram",
        row.id,
      ]
    );
    fallidos += 1;
  }

  const duracionMs = Math.round(performance.now() - startTime);

  return {
    ok: true,
    totalProcesados,
    enviados,
    fallidos,
    omitidos,
    duracionMs,
    limit,
    maxRetries,
  };
}