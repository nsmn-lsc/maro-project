-- Migracion: Outbox para alertas Telegram por riesgo >= 25
-- Objetivo:
-- 1) Registrar eventos de alerta desacoplados del guardado clinico
-- 2) Permitir reintentos y trazabilidad de envio
-- 3) Evitar duplicados por consulta y tipo de alerta

CREATE TABLE IF NOT EXISTS alertas_telegram (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tipo VARCHAR(50) NOT NULL,
  paciente_id BIGINT NOT NULL,
  consulta_id BIGINT NOT NULL,
  folio VARCHAR(100) NULL,
  unidad VARCHAR(255) NULL,
  puntaje_total INT NOT NULL,
  payload_json JSON NULL,
  estado ENUM('pendiente', 'enviado', 'error') NOT NULL DEFAULT 'pendiente',
  intentos INT NOT NULL DEFAULT 0,
  error_ultimo TEXT NULL,
  enviado_en DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_alerta_consulta_tipo (consulta_id, tipo),
  INDEX idx_alertas_estado_created (estado, created_at),
  INDEX idx_alertas_paciente (paciente_id),
  INDEX idx_alertas_consulta (consulta_id)
);
