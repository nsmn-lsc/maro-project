# Implementación de avisos por Telegram (riesgo >= 25)

## Objetivo
Implementar una versión de alertas por Telegram cuando una consulta guardada tenga puntaje total mayor o igual a 25, enviando únicamente:
- Folio
- Unidad
- Puntaje total

No se enviarán datos sensibles (nombre, teléfono, dirección, diagnósticos, etc.).

---

## Alcance funcional (MVP)
1. Detectar en backend cuando se guarda una consulta con `puntaje_total_consulta >= 25`.
2. Crear un evento de alerta en una tabla de cola (outbox).
3. Procesar eventos pendientes y enviarlos a Telegram.
4. Guardar bitácora de estado de envío (pendiente, enviado, error).
5. Evitar duplicados por la misma consulta.

---

## Arquitectura recomendada

### Patrón
Usar patrón **Outbox / Cola en BD**:
- La API que guarda la consulta **solo registra el evento** en BD.
- Un proceso separado (worker o endpoint interno por cron) envía el mensaje.

### Ventajas
- No bloquea el guardado clínico si Telegram falla.
- Permite reintentos controlados.
- Deja trazabilidad completa de envíos.

---

## Variables de entorno
Agregar en `.env` (o equivalente del entorno de despliegue):

- `TELEGRAM_ALERTS_ENABLED=true`
- `TELEGRAM_BOT_TOKEN=<token_del_bot>`
- `TELEGRAM_CHAT_ID=<chat_id_destino>`
- `TELEGRAM_SEND_TIMEOUT_MS=7000`
- `TELEGRAM_MAX_RETRIES=5`

Notas:
- `TELEGRAM_CHAT_ID` puede ser grupo o canal, según operación estatal.
- Si `TELEGRAM_ALERTS_ENABLED=false`, no se envía nada (feature flag).

---

## Diseño de base de datos

### 1) Tabla de eventos
Crear una migración, por ejemplo:
`database/migrations/20260224_create_alertas_telegram.sql`

SQL sugerido:

```sql
CREATE TABLE IF NOT EXISTS alertas_telegram (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tipo VARCHAR(50) NOT NULL,
  paciente_id BIGINT NOT NULL,
  consulta_id BIGINT NOT NULL,
  folio VARCHAR(100) NULL,
  unidad VARCHAR(255) NULL,
  puntaje_total INT NOT NULL,
  payload_json JSON NULL,
  estado ENUM('pendiente','enviado','error') NOT NULL DEFAULT 'pendiente',
  intentos INT NOT NULL DEFAULT 0,
  error_ultimo TEXT NULL,
  enviado_en DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_alerta_consulta_tipo (consulta_id, tipo),
  INDEX idx_estado_created (estado, created_at),
  INDEX idx_paciente (paciente_id)
);
```

### 2) Tipo de alerta
Para este caso usar:
- `tipo = 'RIESGO_25_PLUS'`

---

## Cambios en backend (cuando se implemente)

## 1) Encolado al guardar consulta
Ubicación esperada:
- API de guardado de consulta (ruta `POST` correspondiente de consultas)

Lógica:
1. Guardar consulta normalmente.
2. Calcular/leer `puntaje_total_consulta` final.
3. Si `puntaje_total_consulta >= 25`, insertar en `alertas_telegram` con:
   - `tipo = RIESGO_25_PLUS`
   - `paciente_id`, `consulta_id`
   - `folio`, `unidad`, `puntaje_total`
   - `payload_json` mínimo (solo campos permitidos)
4. Usar `INSERT IGNORE` o `ON DUPLICATE KEY` para no duplicar alertas.

## 2) Formateador de mensaje
Crear helper (ejemplo):
- `src/lib/telegramAlerts.ts`

Mensaje sugerido:

```text
🚨 Alerta obstétrica estatal
Folio: {folio}
Unidad: {unidad}
Puntaje total: {puntaje_total}
Fecha: {dd-mm-yyyy HH:mm}
```

Reglas:
- No incluir nombre de paciente ni datos personales.
- Limpiar/escapar caracteres especiales para Telegram Markdown o enviar en texto plano.

## 3) Cliente de Telegram
Implementar función de envío vía Bot API:
- Endpoint: `https://api.telegram.org/bot<TOKEN>/sendMessage`
- Método: `POST`
- Body: `chat_id`, `text`, opcional `disable_notification`.

Manejo de errores:
- Timeout configurable.
- Reintentos por evento (hasta `TELEGRAM_MAX_RETRIES`).

## 4) Worker / proceso de despacho
Opciones:
- Opción A (simple): endpoint interno protegido que procesa N pendientes por ejecución.
- Opción B: script/worker ejecutado por cron cada minuto.

Flujo:
1. Tomar eventos `estado='pendiente'`.
2. Enviar mensaje.
3. Si éxito: `estado='enviado'`, `enviado_en=NOW()`.
4. Si falla: `intentos += 1`, guardar `error_ultimo`, mantener `pendiente` hasta agotar intentos.
5. Al superar intentos máximos: marcar `error`.

---

## Seguridad y cumplimiento
1. Enmascaramiento de datos:
   - Solo enviar folio, unidad y puntaje.
2. Control de acceso:
   - Endpoint/worker interno no expuesto públicamente sin autenticación.
3. Auditoría:
   - Registrar estado de envío y errores.
4. Secretos:
   - Nunca hardcodear token del bot.

---

## Checklist de implementación futura
- [ ] Crear migración `alertas_telegram`.
- [ ] Ejecutar migraciones en entorno local y productivo.
- [ ] Agregar variables de entorno Telegram.
- [ ] Implementar helper de formateo y envío.
- [ ] Integrar encolado en guardado de consultas (umbral >= 25).
- [ ] Implementar worker/cron de despacho.
- [ ] Agregar reintentos y manejo de errores.
- [ ] Validar que no haya duplicados por consulta.
- [ ] Probar en chat de QA antes de producción.
- [ ] Activar feature flag en producción.

---

## Pruebas recomendadas

### Unitarias
- Formato del mensaje (solo folio, unidad, puntaje).
- Regla de umbral (24 no alerta, 25 sí alerta).
- Detección de duplicados.

### Integración
- Guardar consulta con puntaje >= 25 crea evento pendiente.
- Worker procesa evento y cambia estado a enviado.
- Error de Telegram incrementa intentos y registra error.

### Operativas
- Validar recepción en chat estatal real.
- Verificar que mensajes no incluyan datos sensibles.

---

## Operación diaria sugerida
- Monitorear conteo de alertas con estado `error`.
- Reproceso manual de alertas fallidas (opcional: endpoint de reproceso).
- Revisar rotación de token si se detecta compromiso.

---

## Riesgos y mitigaciones
1. **Caída temporal de Telegram**
   - Mitigación: outbox + reintentos + no bloquear guardado.
2. **Duplicidad de mensajes**
   - Mitigación: índice único por `consulta_id + tipo`.
3. **Exposición de datos**
   - Mitigación: plantilla fija sin datos sensibles.
4. **Token comprometido**
   - Mitigación: variables de entorno + rotación inmediata.

---

## Fase 2 (opcional, más adelante)
- Destinatarios dinámicos por región/estado.
- Confirmación de lectura (si operación lo requiere).
- Integración multi-canal (Telegram + WhatsApp + SMS).
- Dashboard de alertas para seguimiento estatal.
