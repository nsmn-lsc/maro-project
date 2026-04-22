-- ============================================================
-- Migración: Agregar campo factor_riesgo_antecedentes a tabla cat_pacientes
-- Fecha: 2026-02-05
-- Descripción: Almacena la sumatoria de puntos de factores de riesgo
--              por antecedentes para seguimiento y evaluación clínica
-- ============================================================

-- 1. Agregar campos a tabla cat_pacientes
ALTER TABLE cat_pacientes
  ADD COLUMN factor_riesgo_antecedentes INT DEFAULT 0 
  COMMENT 'Sumatoria de puntos de factores de riesgo por antecedentes (0-100)',
  ADD COLUMN fecha_actualizacion_riesgo TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  COMMENT 'Última fecha de actualización del factor de riesgo';

-- 2. Crear índice para búsquedas rápidas
ALTER TABLE cat_pacientes
  ADD INDEX idx_factor_riesgo_antecedentes (factor_riesgo_antecedentes);

-- 3. Verificar estructura
DESCRIBE cat_pacientes;

-- 4. Ver ejemplo de datos
SELECT id, 
       nombre_completo, 
       factor_riesgo_antecedentes, 
       fecha_actualizacion_riesgo 
FROM cat_pacientes 
LIMIT 5;

-- ============================================================
-- ROLLBACK (en caso de necesitar revertir):
-- ============================================================
-- ALTER TABLE cat_pacientes 
--   DROP INDEX idx_factor_riesgo_antecedentes,
--   DROP COLUMN factor_riesgo_antecedentes,
--   DROP COLUMN fecha_actualizacion_riesgo;
