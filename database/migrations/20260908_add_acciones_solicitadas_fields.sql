-- Migración: Campos para Acciones Solicitadas / Interconsultas en la tabla consultas_prenatales
-- Archivo: database/migrations/20260908_add_acciones_solicitadas_fields.sql

ALTER TABLE consultas_prenatales
  ADD COLUMN accion_ginecologia TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Valoración por Ginecología y Obstetricia' AFTER area_referencia,
  ADD COLUMN accion_medicina_interna TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Valoración por Medicina Interna' AFTER accion_ginecologia,
  ADD COLUMN accion_nutricion TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Valoración por Nutrición' AFTER accion_medicina_interna,
  ADD COLUMN accion_psicologia TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Valoración por Psicología' AFTER accion_nutricion,
  ADD COLUMN accion_psiquiatria TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Valoración por Psiquiatría' AFTER accion_psicologia,
  ADD COLUMN accion_odontologia TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Valoración por Odontología' AFTER accion_psiquiatria,
  ADD COLUMN accion_laboratorio_gabinete TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Solicitud de Estudios de Laboratorio y Gabinete' AFTER accion_odontologia,
  ADD COLUMN accion_otra_especialidad TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Valoración por otra especialidad' AFTER accion_laboratorio_gabinete,
  ADD COLUMN otra_especialidad_texto VARCHAR(20) DEFAULT NULL COMMENT 'Nombre de otra especialidad solicitada (máx 20 car)' AFTER accion_otra_especialidad;
