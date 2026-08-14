import { NextRequest, NextResponse } from "next/server";
import { getTelegramWorkerToken } from "@/lib/telegramAlerts";
import {
  dispatchPendingTelegramAlerts,
  parseTelegramDispatchLimit,
} from "@/lib/telegramDispatch";

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.trim().split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1].trim();
  }
  return null;
}

function isAuthorized(request: NextRequest): boolean {
  const configuredToken = getTelegramWorkerToken();
  if (!configuredToken) {
    // Si no está configurado un token en el entorno, bloquear por seguridad en producción
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = extractBearerToken(authHeader);
  const workerTokenHeader = request.headers.get("x-worker-token");
  const internalTokenHeader = request.headers.get("x-internal-token");

  const providedToken = bearerToken || workerTokenHeader || internalTokenHeader;

  return providedToken === configuredToken;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Token de autenticación de worker inválido o ausente.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseTelegramDispatchLimit(searchParams.get("limit"));

    const result = await dispatchPendingTelegramAlerts(limit);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("[telegram-dispatcher-worker] Error en ejecución:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Error al procesar el lote de alertas de Telegram",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
