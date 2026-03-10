-- Rollback: restaurar reclasificacion_ro y alarma_obstetrica
-- Reversa de: 20260225_replace_consulta_ro_alarma_with_clinicos.sql

ALTER TABLE consultas_prenatales
  DROP COLUMN estado_conciencia,
  DROP COLUMN hemorragia,
  DROP COLUMN respiracion,
  DROP COLUMN color_piel,
  ADD COLUMN reclasificacion_ro TINYINT NULL AFTER ivu_repeticion,
  ADD COLUMN alarma_obstetrica TEXT NULL AFTER reclasificacion_ro;
