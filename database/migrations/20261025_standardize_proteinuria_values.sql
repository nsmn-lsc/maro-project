-- Migración: Estandarización de valores de proteinuria en consultas_prenatales
-- Archivo: database/migrations/20261025_standardize_proteinuria_values.sql
-- Valores estandarizados: NULL, 'Negativa', '(+) 30 mg/dL', '(++) 100 mg/dL', '(+++) >300 mg/dL'

ALTER TABLE consultas_prenatales
  MODIFY COLUMN proteinuria VARCHAR(50) DEFAULT NULL
  COMMENT 'Proteinuria estandarizada: Negativa | (+) 30 mg/dL | (++) 100 mg/dL | (+++) >300 mg/dL';

-- 1. Limpiar vacíos o equivalentes a sin evaluar
UPDATE consultas_prenatales
SET proteinuria = NULL
WHERE proteinuria IS NOT NULL
  AND LOWER(TRIM(proteinuria)) IN ('', 'sin evaluar', 'n/a', 'na', 's/d', '-', '—');

-- 2. Estandarizar negativos
UPDATE consultas_prenatales
SET proteinuria = 'Negativa'
WHERE proteinuria IS NOT NULL
  AND LOWER(TRIM(proteinuria)) IN ('neg', 'neg.', 'negativa', 'negativo', 'no', 'ausente', 'normal', '0', '0 mg/dl');

-- 3. Estandarizar (+++) >300 mg/dL
UPDATE consultas_prenatales
SET proteinuria = '(+++) >300 mg/dL'
WHERE proteinuria IS NOT NULL
  AND proteinuria <> '(+++) >300 mg/dL'
  AND (
    proteinuria LIKE '%+++%'
    OR LOWER(proteinuria) LIKE '%3+%'
    OR LOWER(proteinuria) LIKE '%4+%'
    OR LOWER(proteinuria) LIKE '%>300%'
    OR LOWER(proteinuria) LIKE '%> 300%'
    OR LOWER(TRIM(proteinuria)) IN ('300', '300 mg/dl', '300mg/dl')
  );

-- 4. Estandarizar (++) 100 mg/dL
UPDATE consultas_prenatales
SET proteinuria = '(++) 100 mg/dL'
WHERE proteinuria IS NOT NULL
  AND proteinuria NOT IN ('Negativa', '(+++) >300 mg/dL', '(++) 100 mg/dL')
  AND (
    proteinuria LIKE '%++%'
    OR LOWER(proteinuria) LIKE '%2+%'
    OR LOWER(TRIM(proteinuria)) IN ('100', '100 mg/dl', '100mg/dl')
    OR LOWER(proteinuria) LIKE '%100 mg%'
  );

-- 5. Estandarizar (+) 30 mg/dL
UPDATE consultas_prenatales
SET proteinuria = '(+) 30 mg/dL'
WHERE proteinuria IS NOT NULL
  AND proteinuria NOT IN ('Negativa', '(+++) >300 mg/dL', '(++) 100 mg/dL', '(+) 30 mg/dL')
  AND (
    proteinuria LIKE '%+%'
    OR LOWER(TRIM(proteinuria)) IN ('tr', 'traza', 'trazas', 'positiva', 'positivo', 'si', 'sí', '30', '30 mg/dl', '30mg/dl')
    OR LOWER(proteinuria) LIKE '%30 mg%'
  );
