-- Planes y acciones de seguimiento para casos enviados a colegiado

CREATE TABLE IF NOT EXISTS colegiados_planes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  consulta_id BIGINT UNSIGNED NOT NULL,
  paciente_id BIGINT UNSIGNED NOT NULL,
  estatus ENUM('borrador','completo') NOT NULL DEFAULT 'borrador',
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_colegiados_planes_consulta UNIQUE (consulta_id),
  CONSTRAINT fk_colegiados_planes_consulta FOREIGN KEY (consulta_id) REFERENCES consultas_prenatales(id),
  CONSTRAINT fk_colegiados_planes_paciente FOREIGN KEY (paciente_id) REFERENCES cat_pacientes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS colegiados_acciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  nivel_atencion ENUM('primer_nivel','segundo_nivel','tercer_nivel') NOT NULL,
  orden TINYINT UNSIGNED NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  cumplido TINYINT(1) NOT NULL DEFAULT 0,
  fecha_cumplimiento DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_colegiados_acciones_orden UNIQUE (plan_id, nivel_atencion, orden),
  CONSTRAINT fk_colegiados_acciones_plan FOREIGN KEY (plan_id) REFERENCES colegiados_planes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_colegiados_planes_paciente ON colegiados_planes(paciente_id);
CREATE INDEX idx_colegiados_acciones_plan_nivel ON colegiados_acciones(plan_id, nivel_atencion);