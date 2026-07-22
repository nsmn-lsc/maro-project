-- Migración: Corregir formato de semanas_gestacion de decimal matemático a notación médica SDG (semanas.días)
-- 
-- PROBLEMA: El sistema almacenaba semanas de gestación como decimal matemático (ej: 10.9, 30.7)
--           pero la notación médica correcta es semanas.días donde días va de 0 a 6.
--           Ejemplo: 10 semanas y 6 días = 10.6 (no 10.9)
--
-- SOLUCIÓN: Recalcular desde la FUM usando la fecha de creación del registro como referencia,
--           ya que el valor original se calculó como "hoy - FUM" al momento de registrar al paciente.
--
-- REVERSIBILIDAD: 100% reversible — el dato fuente (fum) no se modifica.
-- RIESGO: Bajo — solo afecta visualización, no puntajes de riesgo.

-- Paso 1: Crear columna backup
ALTER TABLE cat_pacientes ADD COLUMN semanas_gestacion_backup DECIMAL(4,1) DEFAULT NULL;

-- Paso 2: Copiar valores actuales al backup
UPDATE cat_pacientes SET semanas_gestacion_backup = semanas_gestacion WHERE semanas_gestacion IS NOT NULL;

-- Paso 3: Recalcular semanas_gestacion con notación médica (semanas.días)
-- Usa DATE(created_at) como referencia porque el cálculo original usaba "hoy" al momento de crear el registro
UPDATE cat_pacientes
SET semanas_gestacion = FLOOR(DATEDIFF(DATE(created_at), fum) / 7) + (DATEDIFF(DATE(created_at), fum) % 7) * 0.1
WHERE fum IS NOT NULL 
  AND semanas_gestacion IS NOT NULL
  AND DATEDIFF(DATE(created_at), fum) >= 0;

-- Verificación: confirmar que no hay valores con días > 6
-- SELECT COUNT(*) AS total,
--        SUM(CASE WHEN (semanas_gestacion * 10) % 10 > 6 THEN 1 ELSE 0 END) AS dias_invalidos
-- FROM cat_pacientes WHERE semanas_gestacion IS NOT NULL;
