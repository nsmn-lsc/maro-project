-- ============================================================
-- Migración ROLLBACK: Revertir cambios de factor_riesgo_antecedentes
-- Fecha: 2026-02-05
-- ============================================================

USE maro_db;

-- Eliminar índice y columnas
ALTER TABLE cat_pacientes 
  DROP INDEX idx_factor_riesgo_antecedentes,
  DROP COLUMN factor_riesgo_antecedentes,
  DROP COLUMN fecha_actualizacion_riesgo;

-- Verificar que se eliminaron
DESCRIBE cat_pacientes;
