type TelegramSendResult = {
  ok: boolean;
  status: number;
  description?: string;
};

function getTelegramChatIds(): string[] {
  const csv = String(process.env.TELEGRAM_CHAT_IDS || "").trim();
  if (csv) {
    return csv
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const single = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  return single ? [single] : [];
}

function parseEnvInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function isTelegramAlertsEnabled(): boolean {
  return String(process.env.TELEGRAM_ALERTS_ENABLED || "").toLowerCase() === "true";
}

export function getTelegramMaxRetries(): number {
  return parseEnvInt(process.env.TELEGRAM_MAX_RETRIES, 5);
}

export function getTelegramTimeoutMs(): number {
  return parseEnvInt(process.env.TELEGRAM_SEND_TIMEOUT_MS, 7000);
}

export function getTelegramWorkerToken(): string {
  return String(process.env.TELEGRAM_WORKER_TOKEN || "").trim();
}

export function formatRiesgoTelegramMessage(input: {
  folio: string | null;
  unidad: string | null;
  puntajeTotal: number;
  fecha?: Date;
}): string {
  const fecha = input.fecha || new Date();
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  const hh = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");

  return [
    "ALERTA OBSTETRICA ESTATAL",
    `Folio: ${input.folio || "SIN_FOLIO"}`,
    `Unidad: ${input.unidad || "SIN_UNIDAD"}`,
    `Puntaje total: ${Number(input.puntajeTotal) || 0}`,
    `Fecha: ${dd}-${mm}-${yyyy} ${hh}:${min}`,
  ].join("\n");
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatIds = getTelegramChatIds();

  if (!token || chatIds.length === 0) {
    return {
      ok: false,
      status: 500,
      description: "Faltan TELEGRAM_BOT_TOKEN y/o TELEGRAM_CHAT_IDS (o TELEGRAM_CHAT_ID)",
    };
  }

  const timeoutMs = getTelegramTimeoutMs();
  const failures: string[] = [];
  let firstStatus = 200;

  for (const chatId of chatIds) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_notification: false,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      const ok = Boolean(response.ok && data?.ok);
      if (!ok) {
        firstStatus = response.status || 500;
        failures.push(`${chatId}: ${data?.description || "Error Telegram API"}`);
      }
    } catch (error: any) {
      const isAbort = error?.name === "AbortError";
      firstStatus = 408;
      failures.push(
        `${chatId}: ${isAbort ? `Timeout de envio (${timeoutMs}ms)` : String(error?.message || error)}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  if (failures.length > 0) {
    return {
      ok: false,
      status: firstStatus,
      description: `Fallos en ${failures.length}/${chatIds.length} destinos: ${failures.join(" | ")}`,
    };
  }

  return {
    ok: true,
    status: 200,
    description: `ok (${chatIds.length} destino(s))`,
  };
}
