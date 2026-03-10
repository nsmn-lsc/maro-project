import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  formatRiesgoTelegramMessage,
  getTelegramMaxRetries,
  getTelegramWorkerToken,
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

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), 100);
}

function isAuthorized(request: NextRequest): boolean {
  const configuredToken = getTelegramWorkerToken();
  if (!configuredToken) {
    return true;
  }

  const header = request.headers.get("x-internal-token") || "";
  return header === configuredToken;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (!isTelegramAlertsEnabled()) {
      return NextResponse.json({
        ok: true,
        message: "TELEGRAM_ALERTS_ENABLED=false",
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
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

      // Compare-and-set claim to reduce race conditions between parallel workers.
      const claimResult: any = await query(
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
        await query(
          `UPDATE alertas_telegram
           SET estado = 'enviado', enviado_en = NOW(), error_ultimo = NULL
           WHERE id = ?`,
          [row.id]
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

    return NextResponse.json({
      ok: true,
      processed,
      sent,
      failed,
      skipped,
      limit,
      maxRetries,
    });
  } catch (error: any) {
    console.error("Error despachando alertas Telegram", error);
    return NextResponse.json(
      { message: "Error al despachar alertas", details: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
