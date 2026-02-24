# Casos QA — Alertas Telegram (sin datos sensibles)

## Objetivo
Validar que el sistema dispare avisos por Telegram únicamente para puntajes totales >= 25 y que el contenido del mensaje solo incluya folio, unidad y puntaje total.

---

## Datos de prueba sugeridos
- Paciente A: consulta con puntaje 24.
- Paciente B: consulta con puntaje 25.
- Paciente C: consulta con puntaje 35.

Todos con folio y unidad válidos.

---

## Caso 1 — No alertar con puntaje menor a 25
### Precondiciones
- Alertas habilitadas.
- Worker activo.

### Pasos
1. Guardar consulta con puntaje 24.
2. Revisar tabla `alertas_telegram`.
3. Revisar chat de Telegram.

### Resultado esperado
- No se crea evento de tipo `RIESGO_25_PLUS`.
- No llega mensaje.

---

## Caso 2 — Alertar exactamente en 25
### Pasos
1. Guardar consulta con puntaje 25.
2. Verificar evento pendiente.
3. Esperar ejecución de worker.
4. Verificar estado final.
5. Verificar contenido del mensaje.

### Resultado esperado
- Se crea 1 evento.
- Estado final `enviado`.
- Mensaje contiene solo:
  - Folio
  - Unidad
  - Puntaje total
- No contiene nombre, teléfono, dirección, diagnóstico ni notas.

---

## Caso 3 — Alertar en puntaje alto (>25)
### Pasos
1. Guardar consulta con puntaje 35.
2. Validar recepción.

### Resultado esperado
- Se envía exactamente 1 mensaje.
- Datos mostrados correctos.

---

## Caso 4 — Idempotencia (sin duplicados)
### Pasos
1. Intentar reprocesar la misma consulta elegible.
2. Revisar registros de alertas.

### Resultado esperado
- Solo existe una alerta por combinación consulta + tipo.
- No hay mensajes duplicados.

---

## Caso 5 — Error de Telegram y reintentos
### Precondición
- Simular token inválido o fallo de red.

### Pasos
1. Guardar consulta con puntaje >= 25.
2. Ejecutar worker.
3. Revisar `intentos` y `error_ultimo`.

### Resultado esperado
- Se incrementan intentos.
- Se guarda detalle de error.
- Al superar límite, estado cambia a `error`.

---

## Caso 6 — Seguridad de contenido
### Pasos
1. Revisar plantilla final enviada.
2. Buscar campos sensibles prohibidos.

### Resultado esperado
- Solo están presentes folio, unidad y puntaje total.
- Cumple lineamiento de no PII.

---

## Caso 7 — Rendimiento básico
### Pasos
1. Insertar múltiples eventos pendientes (por ejemplo 20).
2. Ejecutar worker.
3. Medir tiempo de drenado.

### Resultado esperado
- Procesamiento estable sin bloquear APIs clínicas.
- Sin errores masivos.

---

## Aprobación final QA
Se aprueba si:
- 100% de casos críticos pasan (1, 2, 4, 6).
- No hay exposición de datos sensibles.
- Reintentos y estados funcionan como se diseñó.
