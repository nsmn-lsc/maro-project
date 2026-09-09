-- Migración: Renombrar la columna bh a hemoglobina en la tabla consultas_prenatales
-- Archivo: database/migrations/20260909_rename_bh_to_hemoglobina.sql

ALTER TABLE consultas_prenatales
  CHANGE COLUMN bh hemoglobina VARCHAR(50) DEFAULT NULL COMMENT 'Hemoglobina (g/dL)';
