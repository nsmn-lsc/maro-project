-- Schema para Base de Datos MARO Hub
-- Ejecutar este script en tu servidor MySQL

CREATE DATABASE IF NOT EXISTS maro_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE maro_hub;

-- Catalogo maestro de unidades por CLUES
CREATE TABLE IF NOT EXISTS cat_unidades (
  clues VARCHAR(20) PRIMARY KEY,
  unidad VARCHAR(255) NOT NULL,
  region VARCHAR(100) NOT NULL,
  municipio VARCHAR(150) NOT NULL,
  nivel TINYINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cat_unidades_region (region),
  INDEX idx_cat_unidades_municipio (municipio),
  INDEX idx_cat_unidades_nivel (nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de usuarios para autenticacion real
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  nivel ENUM('CLUES', 'REGION', 'ESTADO', 'ADMIN') NOT NULL,
  clues_id VARCHAR(20) NULL,
  region VARCHAR(100) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_clues FOREIGN KEY (clues_id) REFERENCES cat_unidades(clues) ON DELETE SET NULL,
  INDEX idx_usuarios_nivel_region (nivel, region),
  INDEX idx_usuarios_nivel_clues (nivel, clues_id),
  INDEX idx_usuarios_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de sesiones de usuario (datos de acceso)
CREATE TABLE IF NOT EXISTS sesiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  region VARCHAR(100) NOT NULL,
  municipio VARCHAR(100) NOT NULL,
  unidad VARCHAR(255) NOT NULL,
  clues VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region (region),
  INDEX idx_municipio (municipio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de casos MARO
CREATE TABLE IF NOT EXISTS casos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  sesion_id INT,
  
  -- Datos de origen
  region VARCHAR(100) NOT NULL,
  municipio VARCHAR(100) NOT NULL,
  unidad VARCHAR(255) NOT NULL,
  clues VARCHAR(50),
  nivel_atencion ENUM('Primer Nivel', 'Segundo Nivel', 'Tercer Nivel') NOT NULL,
  
  -- Datos del paciente
  paciente_iniciales VARCHAR(10) NOT NULL,
  edad INT,
  semanas_gestacion DECIMAL(4,1),
  trimestre TINYINT,
  gesta INT,
  partos INT,
  cesareas_previas INT,
  
  -- Estado del caso
  estatus ENUM(
    'BORRADOR',
    'PENDIENTE_COLEGIACION',
    'URGENCIA_REFERENCIA_2N',
    'SOLICITADO_A_COLEGIACION',
    'EN_ESPERA_DE_INFORMACION',
    'RECHAZADO_POR_COORDINACION',
    'ACEPTADO_PARA_COLEGIACION',
    'CON_RECOMENDACION',
    'CERRADO'
  ) DEFAULT 'BORRADOR',
  
  -- Nivel de riesgo calculado
  nivel_riesgo ENUM('AMARILLO', 'NARANJA', 'ROJO'),
  score_riesgo INT,
  
  -- Resumen clínico
  resumen_clinico TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE SET NULL,
  INDEX idx_folio (folio),
  INDEX idx_estatus (estatus),
  INDEX idx_nivel_riesgo (nivel_riesgo),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de evaluación clínica detallada
CREATE TABLE IF NOT EXISTS evaluaciones_clinicas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caso_id INT NOT NULL,
  
  -- Antecedentes
  embarazo_multiple BOOLEAN DEFAULT FALSE,
  antecedente_preeclampsia BOOLEAN DEFAULT FALSE,
  antecedente_hemorragia BOOLEAN DEFAULT FALSE,
  diabetes_previa BOOLEAN DEFAULT FALSE,
  diabetes_gestacional BOOLEAN DEFAULT FALSE,
  hipertension_cronica BOOLEAN DEFAULT FALSE,
  cardiopatia BOOLEAN DEFAULT FALSE,
  nefropatia BOOLEAN DEFAULT FALSE,
  epilepsia BOOLEAN DEFAULT FALSE,
  vih BOOLEAN DEFAULT FALSE,
  
  -- Síntomas actuales
  sangrado_vaginal BOOLEAN DEFAULT FALSE,
  salida_liquido BOOLEAN DEFAULT FALSE,
  dolor_abdominal_intenso BOOLEAN DEFAULT FALSE,
  cefalea_severa BOOLEAN DEFAULT FALSE,
  fosfenos BOOLEAN DEFAULT FALSE,
  epigastralgia BOOLEAN DEFAULT FALSE,
  convulsiones BOOLEAN DEFAULT FALSE,
  fiebre BOOLEAN DEFAULT FALSE,
  disnea BOOLEAN DEFAULT FALSE,
  dolor_toracico BOOLEAN DEFAULT FALSE,
  alteracion_estado_mental BOOLEAN DEFAULT FALSE,
  disminucion_movimientos_fetales BOOLEAN DEFAULT FALSE,
  
  -- Signos vitales
  sistolica INT,
  diastolica INT,
  frecuencia_cardiaca INT,
  frecuencia_respiratoria INT,
  saturacion_o2 DECIMAL(5,2),
  temperatura DECIMAL(4,2),
  
  -- Laboratorios
  plaquetas INT,
  creatinina DECIMAL(5,2),
  ast INT,
  alt INT,
  proteinuria_tira ENUM('NEG', 'TRAZA', '1+', '2+', '3+', '4+'),
  
  -- Mediciones físicas
  peso_kg DECIMAL(5,2),
  talla_cm DECIMAL(5,2),
  imc DECIMAL(5,2),
  fondo_uterino_cm DECIMAL(4,1),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE CASCADE,
  INDEX idx_caso (caso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de diagnósticos
CREATE TABLE IF NOT EXISTS diagnosticos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caso_id INT NOT NULL,
  diagnostico VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE CASCADE,
  INDEX idx_caso (caso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de estudios realizados
CREATE TABLE IF NOT EXISTS estudios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caso_id INT NOT NULL,
  estudio VARCHAR(255) NOT NULL,
  resultado TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE CASCADE,
  INDEX idx_caso (caso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de bitácora de eventos
CREATE TABLE IF NOT EXISTS bitacora (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caso_id INT NOT NULL,
  fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_rol ENUM('Médico', 'Coordinación', 'Experto') NOT NULL,
  actor_nombre VARCHAR(100) NOT NULL,
  accion ENUM(
    'CREA_CASO',
    'SOLICITA_COLEGIACION',
    'SOLICITA_INFO_ADICIONAL',
    'ATIENDE_INFO_ADICIONAL',
    'ACEPTA',
    'RECHAZA',
    'SESIONA',
    'EMITE_RECOMENDACION',
    'CIERRA'
  ) NOT NULL,
  descripcion TEXT NOT NULL,
  fundamento TEXT,
  
  FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE CASCADE,
  INDEX idx_caso (caso_id),
  INDEX idx_fecha (fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de recomendaciones
CREATE TABLE IF NOT EXISTS recomendaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caso_id INT NOT NULL,
  conducta TEXT NOT NULL,
  nivel_atencion ENUM('Primer Nivel', 'Segundo Nivel', 'Tercer Nivel') NOT NULL,
  urgencia VARCHAR(100),
  observaciones TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE CASCADE,
  INDEX idx_caso (caso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
