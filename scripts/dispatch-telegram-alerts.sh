#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/apps/maro-dev"
ENV_FILE="${APP_DIR}/.env.local"
DISPATCH_URL="${TELEGRAM_DISPATCH_URL:-http://localhost:3000/api/internal/telegram-alertas/dispatch?limit=20}"
LOG_FILE="${TELEGRAM_DISPATCH_LOG_FILE:-/var/log/maro-telegram-dispatch.log}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${TELEGRAM_WORKER_TOKEN:-}" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR missing TELEGRAM_WORKER_TOKEN" >> "$LOG_FILE"
  exit 1
fi

HTTP_CODE=$(curl -sS -m 20 -o /tmp/maro_telegram_dispatch_response.json -w "%{http_code}" \
  -X POST "$DISPATCH_URL" \
  -H "x-internal-token: ${TELEGRAM_WORKER_TOKEN}")

if [[ "$HTTP_CODE" != "200" ]]; then
  BODY=$(cat /tmp/maro_telegram_dispatch_response.json 2>/dev/null || true)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR status=${HTTP_CODE} body=${BODY}" >> "$LOG_FILE"
  exit 1
fi

BODY=$(cat /tmp/maro_telegram_dispatch_response.json 2>/dev/null || true)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK status=${HTTP_CODE} body=${BODY}" >> "$LOG_FILE"
