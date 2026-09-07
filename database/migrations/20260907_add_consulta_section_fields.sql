-- Migración: Campos para la Sección 3 (Consulta) en la tabla consultas_prenatales
-- Archivo: database/migrations/20260907_add_consulta_section_fields.sql

ALTER TABLE consultas_prenatales
  ADD COLUMN IF NOT EXISTS longitud_cervical DECIMAL(5,2) DEFAULT NULL COMMENT 'Longitud cervical en mm' AFTER color_piel,
  ADD COLUMN IF NOT EXISTS fc_fetal VARCHAR(20) DEFAULT NULL COMMENT 'Frecuencia cardíaca fetal en lpm' AFTER longitud_cervical,
  ADD COLUMN IF NOT EXISTS bh VARCHAR(100) DEFAULT NULL COMMENT 'Biometría Hemática' AFTER edema;

-- Ajustar columnas para permitir valores de texto/enum flexibles en la UI
ALTER TABLE consultas_prenatales
  MODIFY COLUMN movimientos_fetales VARCHAR(20) DEFAULT NULL COMMENT 'Movimientos fetales (presentes / ausentes)',
  MODIFY COLUMN proteinuria VARCHAR(50) DEFAULT NULL COMMENT 'Proteinuria (Negativa / Tira reactiva / mg/dL)',
  MODIFY COLUMN edema VARCHAR(20) DEFAULT NULL COMMENT 'Edema (ausente / presente)';
