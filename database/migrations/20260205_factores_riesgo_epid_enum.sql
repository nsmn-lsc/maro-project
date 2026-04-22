-- ============================================================
-- Migración: Convertir factores_riesgo_epid de TEXT a ENUM
-- Fecha: 2026-02-05
-- Autor: Sistema MARO
-- Descripción: Convierte campo de texto libre a ENUM con 3 opciones
--              ninguno = 0 puntos
--              es_contacto = 4 puntos
--              es_portadora = 6 puntos
-- ============================================================

-- 1. Renombrar campo antiguo como respaldo
ALTER TABLE cat_pacientes
  CHANGE COLUMN factores_riesgo_epid factores_riesgo_epid_old TEXT NULL 
  COMMENT 'Campo antiguo TEXT - mantener por respaldo';

-- 2. Agregar nuevo campo ENUM
ALTER TABLE cat_pacientes
  ADD COLUMN factores_riesgo_epid ENUM('ninguno', 'es_contacto', 'es_portadora') 
  DEFAULT 'ninguno' 
  COMMENT 'Factores epidemiológicos: ninguno=0pts, es_contacto=4pts, es_portadora=6pts'
  AFTER factores_riesgo_epid_old;

-- 3. Verificar estructura actualizada
DESCRIBE cat_pacientes;

-- ============================================================
-- ROLLBACK (en caso de necesitar revertir):
-- ============================================================
-- ALTER TABLE cat_pacientes DROP COLUMN factores_riesgo_epid;
-- ALTER TABLE cat_pacientes CHANGE COLUMN factores_riesgo_epid_old factores_riesgo_epid TEXT NULL;
