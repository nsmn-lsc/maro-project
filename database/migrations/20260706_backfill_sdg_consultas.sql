-- Migración para calcular y rellenar las SDG (semanas de gestación) en consultas existentes
-- que no tengan este valor guardado, basándose en la fecha de consulta y el FUM de la paciente.

UPDATE consultas_prenatales c
INNER JOIN cat_pacientes cp ON cp.id = c.paciente_id
SET c.sdg = ROUND(DATEDIFF(c.fecha_consulta, cp.fum) / 7)
WHERE c.sdg IS NULL AND cp.fum IS NOT NULL;
