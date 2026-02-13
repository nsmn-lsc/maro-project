-- Tabla de detecciones en primer contacto
CREATE TABLE IF NOT EXISTS detecciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id BIGINT UNSIGNED NOT NULL,
  prueba_vih ENUM('Reactiva','No reactiva') DEFAULT NULL,
  prueba_vdrl ENUM('Reactiva','No reactiva') DEFAULT NULL,
  prueba_hepatitis_c ENUM('Reactiva','No reactiva') DEFAULT NULL,
  prueba_vih_t3 ENUM('Reactiva','No reactiva') DEFAULT NULL,
  prueba_vdrl_t3 ENUM('Reactiva','No reactiva') DEFAULT NULL,
  prueba_hepatitis_c_t3 ENUM('Reactiva','No reactiva') DEFAULT NULL,
  diabetes_glicemia ENUM('Normal','Resistencia a la insulina','Diabetes') DEFAULT NULL,
  violencia ENUM('Positiva','Negativa') DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  CONSTRAINT fk_detecciones_paciente FOREIGN KEY (paciente_id) REFERENCES cat_pacientes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
