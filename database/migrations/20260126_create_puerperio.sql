-- Tabla de seguimiento de puerperio
-- Fecha: 2026-01-26

CREATE TABLE IF NOT EXISTS puerperio (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id BIGINT UNSIGNED,
  folio VARCHAR(50),
  complicaciones TEXT,
  MMEG BOOLEAN DEFAULT FALSE,
  fecha_atencion_evento DATE,
  dias_puerperio INT,
  valoracion_riesgo VARCHAR(50),
  apeo_fecha DATE,
  apeo_metodo VARCHAR(100),
  datos_alarma TEXT,
  diagnostico VARCHAR(200),
  plan TEXT,
  fecha_siguiente_consulta DATE,
  referencia TEXT,
  usuaria_seguimiento BOOLEAN DEFAULT FALSE,
  fecha_atencion_sna_tna DATE,
  fecha_contrareferencia DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  CONSTRAINT fk_puerperio_paciente FOREIGN KEY (paciente_id) REFERENCES cat_pacientes(id) ON DELETE CASCADE,
  INDEX idx_puerperio_paciente (paciente_id),
  INDEX idx_puerperio_folio (folio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
