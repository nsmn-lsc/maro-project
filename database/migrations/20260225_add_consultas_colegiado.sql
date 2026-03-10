-- Migración: marcar consultas enviadas a colegiado en módulo estatal

ALTER TABLE consultas_prenatales
  ADD COLUMN colegiado TINYINT(1) NOT NULL DEFAULT 0 AFTER riesgo_25_plus,
  ADD COLUMN fecha_colegiado DATETIME NULL AFTER colegiado;

ALTER TABLE consultas_prenatales
  ADD INDEX idx_consultas_colegiado (colegiado),
  ADD INDEX idx_consultas_fecha_colegiado (fecha_colegiado);
