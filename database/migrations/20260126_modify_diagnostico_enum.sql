-- Modificar campo diagnostico de TEXT a ENUM con opciones específicas
-- Fecha: 2026-01-26

ALTER TABLE consultas_prenatales
  MODIFY COLUMN diagnostico ENUM('seguimiento_embarazo', 'puerperio') NULL;
