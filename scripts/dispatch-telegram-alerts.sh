#!/usr/bin/env bash
# ==============================================================================
# MARO Hub - Dispatcher de Alertas Telegram
# Ejecuta el procesamiento por lotes y reintentos automáticos de alertas obstétricas.
# ==============================================================================
set -euo pipefail

# Directorio del proyecto (configurable por entorno)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.local"

# Cargar variables de entorno si el archivo existe
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DISPATCH_URL="${TELEGRAM_DISPATCH_URL:-http://localhost:3000/api/internal/workers/telegram-dispatcher?limit=25}"
LOG_FILE="${TELEGRAM_DISPATCH_LOG_FILE:-/tmp/maro-telegram-dispatch.log}"
RESPONSE_TMP="/tmp/maro_telegram_dispatch_response.json"

if [[ -z "${TELEGRAM_WORKER_TOKEN:-}" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] Variable TELEGRAM_WORKER_TOKEN no configurada." >> "$LOG_FILE"
  exit 1
fi

HTTP_CODE=$(curl -sS -m 25 -o "$RESPONSE_TMP" -w "%{http_code}" \
  -X POST "$DISPATCH_URL" \
  -H "Authorization: Bearer ${TELEGRAM_WORKER_TOKEN}" \
  -H "Content-Type: application/json")

RESPONSE_BODY=$(cat "$RESPONSE_TMP" 2>/dev/null || echo "{}")

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OK] status=${HTTP_CODE} response=${RESPONSE_BODY}" >> "$LOG_FILE"
  exit 0
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] status=${HTTP_CODE} response=${RESPONSE_BODY}" >> "$LOG_FILE"
  exit 1
fi
