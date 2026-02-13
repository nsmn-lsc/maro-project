-- Tabla de acciones preventivas por paciente
CREATE TABLE IF NOT EXISTS acciones_preventivas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id BIGINT UNSIGNED NOT NULL,
  td DATE NULL,
  tdpa DATE NULL,
  influenza DATE NULL,
  covid DATE NULL,
  otras DATE NULL,
  estomatologia DATE NULL,
  nutricion DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  CONSTRAINT fk_acciones_paciente FOREIGN KEY (paciente_id) REFERENCES cat_pacientes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
