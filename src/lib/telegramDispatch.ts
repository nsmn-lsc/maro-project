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

export function parseTelegramDispatchLimit(value: string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), 100);
}

export async function dispatchPendingTelegramAlerts(limit: number) {
  if (!isTelegramAlertsEnabled()) {
    return {
      ok: true,
      message: "TELEGRAM_ALERTS_ENABLED=false",
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      limit,
      maxRetries: getTelegramMaxRetries(),
    };
  }

  const maxRetries = getTelegramMaxRetries();
  const pendingRows = await query<AlertaTelegramRow[]>(
    `SELECT id, paciente_id, consulta_id, folio, unidad, puntaje_total, intentos, estado
     FROM alertas_telegram
     WHERE estado = 'pendiente' AND intentos < ?
     ORDER BY created_at ASC
     LIMIT ${limit}`,
    [maxRetries]
  );

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of pendingRows) {
    const currentAttempts = Number(row.intentos) || 0;

    const claimResult = await query<ResultSetHeader>(
      `UPDATE alertas_telegram
       SET intentos = intentos + 1
       WHERE id = ? AND estado = 'pendiente' AND intentos = ?`,
      [row.id, currentAttempts]
    );

    if (!claimResult?.affectedRows) {
      skipped += 1;
      continue;
    }

    processed += 1;

    const msg = formatRiesgoTelegramMessage({
      folio: row.folio,
      unidad: row.unidad,
      puntajeTotal: Number(row.puntaje_total) || 0,
    });

    const sendResult = await sendTelegramMessage(msg);
    const attemptsAfterClaim = currentAttempts + 1;

    if (sendResult.ok) {
      // Si hubo éxito parcial (algunos destinos fallaron), registrarlo para trazabilidad.
      const advertencia = sendResult.description?.startsWith("Envío parcial")
        ? sendResult.description
        : null;
      if (advertencia) {
        console.warn("[telegram-dispatch] Envío parcial", { alertaId: row.id, advertencia });
      }
      await query(
        `UPDATE alertas_telegram
         SET estado = 'enviado', enviado_en = NOW(), error_ultimo = ?
         WHERE id = ?`,
        [advertencia, row.id]
      );
      sent += 1;
      continue;
    }

    const terminal = attemptsAfterClaim >= maxRetries;
    await query(
      `UPDATE alertas_telegram
       SET estado = ?, error_ultimo = ?
       WHERE id = ?`,
      [terminal ? "error" : "pendiente", sendResult.description || "Error de envio", row.id]
    );
    failed += 1;
  }

  return {
    ok: true,
    processed,
    sent,
    failed,
    skipped,
    limit,
    maxRetries,
  };
}