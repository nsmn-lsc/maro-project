-- Migración: Creación de tabla para Ultrasonidos Obstétricos asociados a la paciente
-- Archivo: database/migrations/20260904_create_pacientes_ultrasonidos.sql

CREATE TABLE IF NOT EXISTS pacientes_ultrasonidos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id BIGINT UNSIGNED NOT NULL,
  consulta_id BIGINT UNSIGNED DEFAULT NULL,
  tipo ENUM('USG 1er trimestre','USG 2o trimestre','USG 3er trimestre','USG cromosomopatías','USG estructural','USG Doppler Arterias Uterinas') NOT NULL,
  fecha_toma_usg DATE NOT NULL COMMENT 'Fecha real en que se realizó el estudio de ultrasonido',
  descripcion VARCHAR(100) DEFAULT NULL COMMENT 'Hallazgos (máximo 100 caracteres)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha/hora automática de registro en el sistema',
  created_by BIGINT UNSIGNED DEFAULT NULL COMMENT 'ID del usuario que creó el registro',
  CONSTRAINT fk_usg_paciente FOREIGN KEY (paciente_id) REFERENCES cat_pacientes (id) ON DELETE CASCADE,
  INDEX idx_usg_paciente (paciente_id),
  INDEX idx_usg_fecha_toma (fecha_toma_usg),
  INDEX idx_usg_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
