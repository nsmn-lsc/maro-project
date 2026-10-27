-- Migración: Acciones ampliadas (fechas, respuestas, estatus) y observaciones por nivel en colegiados
-- Archivo: database/migrations/20261026_colegiados_acciones_y_observaciones.sql

-- 1. Ampliar tabla colegiados_acciones con fecha de acción, fecha de respuesta, respuesta y estatus
ALTER TABLE colegiados_acciones
  ADD COLUMN fecha_accion DATE NULL AFTER orden,
  ADD COLUMN fecha_respuesta DATE NULL AFTER descripcion,
  ADD COLUMN respuesta_accion VARCHAR(500) NULL AFTER fecha_respuesta,
  ADD COLUMN estatus ENUM('pendiente', 'completada', 'incompleta', 'no_realizada') NOT NULL DEFAULT 'pendiente' AFTER respuesta_accion;

-- 2. Migrar retroactivamente datos previos si existieran
UPDATE colegiados_acciones
SET estatus = CASE WHEN cumplido = 1 THEN 'completada' ELSE 'pendiente' END,
    fecha_accion = COALESCE(DATE(created_at), CURDATE()),
    fecha_respuesta = CASE WHEN cumplido = 1 THEN DATE(COALESCE(fecha_cumplimiento, updated_at, created_at)) ELSE NULL END
WHERE fecha_accion IS NULL;

-- 3. Crear tabla colegiados_nivel_observaciones para almacenar las 4 observaciones por nivel de atención
CREATE TABLE IF NOT EXISTS colegiados_nivel_observaciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  nivel_atencion ENUM('primer_nivel', 'segundo_nivel', 'tercer_nivel') NOT NULL,
  obs_zonales TEXT NULL,
  obs_regionales TEXT NULL,
  obs_estatal_salud_mujeres TEXT NULL,
  obs_atencion_medica TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plan_nivel_obs (plan_id, nivel_atencion),
  CONSTRAINT fk_colegiados_nivel_obs_plan FOREIGN KEY (plan_id) REFERENCES colegiados_planes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
