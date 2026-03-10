# Cron job para despacho de alertas Telegram

## Objetivo
Automatizar el envio de eventos `pendiente` en `alertas_telegram` ejecutando el worker cada minuto.

## 1) Script de despacho
Archivo incluido:
- `scripts/dispatch-telegram-alerts.sh`

Este script:
- Carga variables desde `.env.local`.
- Usa `TELEGRAM_WORKER_TOKEN` para autenticar.
- Usa `TELEGRAM_CHAT_IDS` (lista CSV) o fallback `TELEGRAM_CHAT_ID`.
- Ejecuta `POST /api/internal/telegram-alertas/dispatch`.
- Registra resultado en `/var/log/maro-telegram-dispatch.log`.

Variables de destino recomendadas:
```env
TELEGRAM_CHAT_IDS=123456789,-1001112223333,987654321
```

## 2) Dar permisos de ejecucion
```bash
chmod +x /opt/apps/maro-dev/scripts/dispatch-telegram-alerts.sh
```

## 3) Probar manualmente antes del cron
```bash
/opt/apps/maro-dev/scripts/dispatch-telegram-alerts.sh
```

## 4) Crear cron (cada minuto)
```bash
crontab -e
```

Agregar linea:
```cron
* * * * * /opt/apps/maro-dev/scripts/dispatch-telegram-alerts.sh
```

## 5) Verificar ejecucion
```bash
tail -f /var/log/maro-telegram-dispatch.log
```

## 6) Monitoreo SQL recomendado
```sql
SELECT estado, COUNT(*) AS total
FROM alertas_telegram
GROUP BY estado;
```

```sql
SELECT id, estado, intentos, error_ultimo, enviado_en, created_at
FROM alertas_telegram
ORDER BY id DESC
LIMIT 20;
```

## Notas
- Si `TELEGRAM_ALERTS_ENABLED=false`, el worker responde sin procesar eventos.
- `TELEGRAM_CHAT_IDS` tiene prioridad sobre `TELEGRAM_CHAT_ID`.
- Rotar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WORKER_TOKEN` antes de produccion final.
