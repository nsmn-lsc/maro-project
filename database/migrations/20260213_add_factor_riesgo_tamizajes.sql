-- ============================================================
-- Migración: Agregar campo factor_riesgo_tamizajes a tabla cat_pacientes
-- Fecha: 2026-02-13
-- Descripción: Almacena la sumatoria de puntos de factores de riesgo
--              por tamizajes iniciales para seguimiento y evaluación clínica
-- ============================================================

USE maro_db;

-- 1. Agregar campo a tabla cat_pacientes
ALTER TABLE cat_pacientes
  ADD COLUMN factor_riesgo_tamizajes INT DEFAULT 0 
  COMMENT 'Sumatoria de puntos de factores de riesgo por tamizajes iniciales (0-20)';

-- 2. Crear índice para búsquedas rápidas
ALTER TABLE cat_pacientes
  ADD INDEX idx_factor_riesgo_tamizajes (factor_riesgo_tamizajes);

-- 3. Verificar estructura
DESCRIBE cat_pacientes;

-- 4. Ver ejemplo de datos
SELECT id, 
       nombre_completo, 
       factor_riesgo_antecedentes,
       factor_riesgo_tamizajes, 
       fecha_actualizacion_riesgo 
FROM cat_pacientes 
LIMIT 5;

-- ============================================================
-- ROLLBACK (en caso de necesitar revertir):
-- ============================================================
-- ALTER TABLE cat_pacientes 
--   DROP INDEX idx_factor_riesgo_tamizajes,
--   DROP COLUMN factor_riesgo_tamizajes;

