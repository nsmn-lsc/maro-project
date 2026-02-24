# Checklist de despliegue — Alertas Telegram

## Antes del despliegue
- [ ] Bot de Telegram creado y validado en QA.
- [ ] Chat estatal definido y `chat_id` confirmado.
- [ ] Variables de entorno cargadas en QA y producción.
- [ ] Migración `alertas_telegram` aplicada en QA.
- [ ] Prueba de guardado con puntaje 25+ genera evento pendiente.
- [ ] Prueba de worker cambia estado a `enviado`.
- [ ] Verificación de no datos sensibles en el mensaje.

---

## Variables por ambiente
- [ ] `TELEGRAM_ALERTS_ENABLED`
- [ ] `TELEGRAM_BOT_TOKEN`
- [ ] `TELEGRAM_CHAT_ID`
- [ ] `TELEGRAM_SEND_TIMEOUT_MS`
- [ ] `TELEGRAM_MAX_RETRIES`

Recomendación inicial:
- Timeout: 7000 ms
- Reintentos máximos: 5

---

## Despliegue en QA
1. Aplicar migraciones.
2. Desplegar backend con encolado + sender.
3. Habilitar `TELEGRAM_ALERTS_ENABLED=true`.
4. Crear consulta de prueba con puntaje >= 25.
5. Confirmar:
   - registro en tabla de alertas,
   - envío al chat,
   - estado `enviado`.

Criterio de aprobación QA:
- 3 de 3 escenarios de prueba correctos:
  - puntaje 24 (sin alerta),
  - puntaje 25 (con alerta),
  - error simulado de Telegram (reintento/bitácora).

---

## Despliegue en producción
1. Aplicar migraciones en ventana programada.
2. Desplegar versión de app.
3. Habilitar cron/worker.
4. Activar flag de alertas.
5. Ejecutar caso de humo controlado.

Verificaciones inmediatas (primeros 30 min):
- [ ] No hay errores 500 nuevos en APIs de consulta.
- [ ] Eventos pendientes se procesan.
- [ ] Mensajes llegan al chat correcto.
- [ ] No aparece información sensible en notificaciones.

---

## Monitoreo post-despliegue (24 h)
- [ ] Conteo de `pendiente` no crece sin control.
- [ ] Conteo de `error` dentro de umbral aceptable.
- [ ] Tiempo medio de envío dentro de objetivo.
- [ ] Confirmación operativa estatal de recepción útil.

Umbrales sugeridos:
- Error rate < 5%
- Pendientes sin procesar > 10 min = alerta técnica

---

## Rollback
Condiciones para rollback:
- Fallas persistentes que impactan guardado de consultas.
- Riesgo de fuga de datos por formato de mensaje.

Pasos de rollback:
1. Desactivar `TELEGRAM_ALERTS_ENABLED=false`.
2. Pausar cron/worker.
3. Mantener consultas clínicas operando sin envío de alertas.
4. Corregir incidente en QA antes de reactivar.

---

## Evidencias mínimas a guardar
- Captura/log de evento encolado.
- Captura/log de envío exitoso.
- Prueba de no inclusión de PII.
- Registro de validación por operación estatal.
