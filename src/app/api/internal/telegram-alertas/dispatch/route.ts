import { NextRequest, NextResponse } from "next/server";
import { getTelegramWorkerToken } from "@/lib/telegramAlerts";
import { requireApiAuth } from "@/lib/apiAuth";
import {
  dispatchPendingTelegramAlerts,
  parseTelegramDispatchLimit,
} from "@/lib/telegramDispatch";

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
    const configuredToken = getTelegramWorkerToken();
    if (configuredToken) {
      if (!isAuthorized(request)) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
      }
    } else {
      const authResult = await requireApiAuth(request, 3);
      if (!authResult.ok) return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseTelegramDispatchLimit(searchParams.get("limit"));
    const result = await dispatchPendingTelegramAlerts(limit);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error despachando alertas Telegram", error);
    return NextResponse.json(
      {
        message: "Error al despachar alertas",
        details: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
