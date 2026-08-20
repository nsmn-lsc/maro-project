-- Migración: Backfill de sdg_ingreso en cat_pacientes para registros existentes
--
-- OBJETIVO: Asegurar que todos los registros históricos tengan calculado su 'sdg_ingreso' (Semanas de Gestación al Ingreso).
--
-- LÓGICA DE RECÁLCULO:
-- 1. Si existe 'fecha_ingreso_cpn' y 'fum': FLOOR(DATEDIFF(fecha_ingreso_cpn, fum) / 7)
-- 2. Si no, si existe 'created_at' y 'fum': FLOOR(DATEDIFF(DATE(created_at), fum) / 7)
-- 3. Si no, si existe 'semanas_gestacion': FLOOR(semanas_gestacion)
--
-- REVERSIBILIDAD: 100% segura. Solo actualiza registros donde 'sdg_ingreso' es NULL.

UPDATE cat_pacientes
SET sdg_ingreso = CASE
  WHEN fecha_ingreso_cpn IS NOT NULL AND fum IS NOT NULL AND DATEDIFF(fecha_ingreso_cpn, fum) >= 0 
    THEN FLOOR(DATEDIFF(fecha_ingreso_cpn, fum) / 7)
  WHEN created_at IS NOT NULL AND fum IS NOT NULL AND DATEDIFF(DATE(created_at), fum) >= 0 
    THEN FLOOR(DATEDIFF(DATE(created_at), fum) / 7)
  WHEN semanas_gestacion IS NOT NULL 
    THEN FLOOR(semanas_gestacion)
  ELSE NULL
END
WHERE sdg_ingreso IS NULL AND fum IS NOT NULL;
