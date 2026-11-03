-- Migración: Crear tabla de seguimiento de pacientes de alto riesgo por usuario regional (> 25 pts)
-- Archivo: database/migrations/20261030_create_seguimiento_riesgo_regional.sql

CREATE TABLE IF NOT EXISTS `seguimiento_riesgo_regional` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `paciente_id` BIGINT UNSIGNED NOT NULL,
  `region` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_consulta_externa` DATE NOT NULL,
  `fecha_laboratorios` DATE NOT NULL,
  `acciones_generales` VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` BIGINT UNSIGNED DEFAULT NULL,
  `updated_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_seguimiento_paciente` (`paciente_id`),
  KEY `idx_seguimiento_region` (`region`),
  KEY `idx_seguimiento_fechas` (`fecha_consulta_externa`, `fecha_laboratorios`),
  CONSTRAINT `fk_seguimiento_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `cat_pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
