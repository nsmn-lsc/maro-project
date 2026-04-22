-- ============================================================
-- Migración: Convertir factores_riesgo de TEXT a campos booleanos individuales
-- Fecha: 2026-02-05
-- Descripción: Migrar de campo texto libre a checkboxes individuales
--              con puntuaciones específicas para evaluación de riesgo
-- ============================================================

-- 1. Agregar nuevos campos booleanos con sus puntuaciones
ALTER TABLE cat_pacientes
  ADD COLUMN factor_diabetes BOOLEAN DEFAULT FALSE COMMENT 'Diabetes (4 puntos)',
  ADD COLUMN factor_hipertension BOOLEAN DEFAULT FALSE COMMENT 'Hipertensión (4 puntos)',
  ADD COLUMN factor_obesidad BOOLEAN DEFAULT FALSE COMMENT 'Obesidad (4 puntos)',
  ADD COLUMN factor_cardiopatia BOOLEAN DEFAULT FALSE COMMENT 'Cardiopatía (4 puntos)',
  ADD COLUMN factor_hepatopatia BOOLEAN DEFAULT FALSE COMMENT 'Hepatopatía (4 puntos)',
  ADD COLUMN factor_enf_autoinmune BOOLEAN DEFAULT FALSE COMMENT 'Enfermedad autoinmune (4 puntos)',
  ADD COLUMN factor_nefropatia BOOLEAN DEFAULT FALSE COMMENT 'Nefropatía (4 puntos)',
  ADD COLUMN factor_coagulopatias BOOLEAN DEFAULT FALSE COMMENT 'Coagulopatías (4 puntos)',
  ADD COLUMN factor_neuropatia BOOLEAN DEFAULT FALSE COMMENT 'Neuropatía (4 puntos)',
  ADD COLUMN factor_enf_psiquiatrica BOOLEAN DEFAULT FALSE COMMENT 'Enfermedad psiquiátrica (4 puntos)',
  ADD COLUMN factor_alcoholismo BOOLEAN DEFAULT FALSE COMMENT 'Alcoholismo (4 puntos)',
  ADD COLUMN factor_tabaquismo BOOLEAN DEFAULT FALSE COMMENT 'Tabaquismo (2 puntos)',
  ADD COLUMN factor_drogas_ilicitas BOOLEAN DEFAULT FALSE COMMENT 'Drogas ilícitas (4 puntos)';

-- 2. Renombrar campo antiguo para mantener respaldo temporal
ALTER TABLE cat_pacientes
  CHANGE COLUMN factores_riesgo factores_riesgo_old TEXT NULL COMMENT 'Campo antiguo - respaldo temporal';

-- 3. Verificar estructura
DESCRIBE cat_pacientes;

-- ============================================================
-- ROLLBACK (si es necesario):
-- ============================================================
-- ALTER TABLE cat_pacientes
--   DROP COLUMN factor_diabetes,
--   DROP COLUMN factor_hipertension,
--   DROP COLUMN factor_obesidad,
--   DROP COLUMN factor_cardiopatia,
--   DROP COLUMN factor_hepatopatia,
--   DROP COLUMN factor_enf_autoinmune,
--   DROP COLUMN factor_nefropatia,
--   DROP COLUMN factor_coagulopatias,
--   DROP COLUMN factor_neuropatia,
--   DROP COLUMN factor_enf_psiquiatrica,
--   DROP COLUMN factor_alcoholismo,
--   DROP COLUMN factor_tabaquismo,
--   DROP COLUMN factor_drogas_ilicitas;
--
-- ALTER TABLE cat_pacientes
--   CHANGE COLUMN factores_riesgo_old factores_riesgo TEXT NULL;
