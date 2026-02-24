# Plan por fases — Alertas Telegram (riesgo >= 25)

## Objetivo
Definir una ruta de implementación incremental para activar alertas inmediatas a nivel estatal cuando una consulta tenga puntaje total mayor o igual a 25.

---

## Fase 0 — Preparación (0.5 día)

### Entregables
- Bot de Telegram creado.
- Chat/grupo estatal identificado.
- Variables de entorno definidas para cada ambiente.

### Pasos
1. Crear bot con BotFather y resguardar token.
2. Crear/seleccionar chat destino estatal.
3. Obtener `chat_id`.
4. Definir variables:
   - `TELEGRAM_ALERTS_ENABLED`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `TELEGRAM_SEND_TIMEOUT_MS`
   - `TELEGRAM_MAX_RETRIES`
5. Registrar responsables operativos (quién recibe/monitorea alertas).

### Criterio de salida
- Existe token y chat válidos en entorno de pruebas.

---

## Fase 1 — Base técnica (1 día)

### Entregables
- Migración de tabla `alertas_telegram` aplicada.
- Estructura de estados de envío habilitada.

### Pasos
1. Crear migración de tabla outbox de alertas.
2. Agregar índice único por `consulta_id + tipo` para evitar duplicados.
3. Aplicar migración en local/QA.
4. Verificar inserción manual de registros pendientes.

### Criterio de salida
- Se pueden crear eventos pendientes y consultarlos en BD.

---

## Fase 2 — Encolado desde guardado de consulta (1 día)

### Entregables
- Al guardar consulta con puntaje >= 25, se crea evento pendiente.
- No se afectan consultas con puntaje < 25.

### Pasos
1. Ubicar ruta API de guardado de consultas.
2. Leer puntaje final (`puntaje_total_consulta`).
3. Si puntaje >= 25, encolar en `alertas_telegram` con:
   - folio
   - unidad
   - puntaje_total
4. Usar inserción idempotente para evitar duplicado.
5. Activar/desactivar por feature flag.

### Criterio de salida
- Cada consulta elegible crea solo 1 evento.

---

## Fase 3 — Envío Telegram (1 día)

### Entregables
- Cliente Telegram operativo.
- Mensaje formateado sin datos sensibles.

### Pasos
1. Implementar helper de envío `sendMessage` (Bot API).
2. Definir plantilla de mensaje:
   - Folio
   - Unidad
   - Puntaje total
   - Fecha/hora
3. Manejar timeout y errores de red.
4. Probar envío directo con payload simulado.

### Criterio de salida
- Mensajes llegan al chat de QA sin información sensible.

---

## Fase 4 — Worker/Despacho y reintentos (1 día)

### Entregables
- Proceso que consume pendientes y actualiza estado.
- Reintentos con límite.

### Pasos
1. Implementar job que toma eventos `pendiente`.
2. Enviar y marcar `enviado` en éxito.
3. En error, incrementar `intentos` y guardar `error_ultimo`.
4. Al exceder intentos máximos, marcar `error`.
5. Programar cron (cada 1 minuto recomendado).

### Criterio de salida
- Cola se drena automáticamente y queda trazabilidad.

---

## Fase 5 — Validación y salida a producción (0.5–1 día)

### Entregables
- Evidencia de pruebas.
- Activación controlada en producción.

### Pasos
1. Ejecutar pruebas funcionales y de resiliencia.
2. Validar no filtración de datos sensibles.
3. Activar feature flag en ventana controlada.
4. Monitorear primeras 24 horas.

### Criterio de salida
- Alertas estables con tasa alta de envío exitoso.

---

## Matriz rápida de responsables
- Desarrollo: API, encolado, worker, errores.
- DBA: migraciones e índices.
- Operación estatal: chat destino y validación de recepción.
- QA: pruebas funcionales/no funcionales.

---

## Riesgos críticos y mitigación
1. Telegram caído o lento → mantener outbox y reintentos.
2. Duplicados por reenvío → índice único e idempotencia.
3. Exposición accidental de PII → plantilla fija y pruebas de contenido.
4. Token expuesto → variables seguras + rotación inmediata.
