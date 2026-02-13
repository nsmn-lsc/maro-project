-- database/migrations/20260205_add_factor_riesgo_scores.sql
-- Migración para agregar columnas de puntuación de factores de riesgo

USE maro_hub;

-- Agregar columnas de puntuación a la tabla casos
ALTER TABLE casos 
ADD COLUMN IF NOT EXISTS score_factor_riesgo INT DEFAULT NULL COMMENT 'Puntuación numérica de factores de riesgo',
ADD COLUMN IF NOT EXISTS categoria_riesgo_factor ENUM('BAJO', 'MODERADO', 'ALTO') DEFAULT NULL COMMENT 'Categoría derivada del score de factores',
ADD COLUMN IF NOT EXISTS fecha_calculo_factor TIMESTAMP NULL COMMENT 'Última fecha de cálculo del factor de riesgo',
ADD INDEX idx_score_factor (score_factor_riesgo),
ADD INDEX idx_categoria_factor (categoria_riesgo_factor);

-- Agregar columna para almacenar el detalle de cálculo (JSON)
ALTER TABLE casos 
ADD COLUMN IF NOT EXISTS detalle_factor_riesgo JSON DEFAULT NULL COMMENT 'Detalles del cálculo de factor de riesgo en formato JSON';

-- Crear tabla auxiliar para historial de cálculos de factor de riesgo
CREATE TABLE IF NOT EXISTS historial_factor_riesgo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caso_id INT NOT NULL,
  
  -- Puntuación
  puntaje_total INT NOT NULL,
  categoria ENUM('BAJO', 'MODERADO', 'ALTO') NOT NULL,
  
  -- Detalles
  detalles JSON NOT NULL COMMENT 'Array de objetos con campo, valor, puntos, criterio',
  sugerencias JSON DEFAULT NULL COMMENT 'Array de sugerencias recomendadas',
  
  -- Auditoría
  calculado_por VARCHAR(100) DEFAULT 'SISTEMA',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE CASCADE,
  INDEX idx_caso (caso_id),
  INDEX idx_fecha (created_at),
  INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar abortos a tabla casos si no existe
ALTER TABLE casos 
ADD COLUMN IF NOT EXISTS abortos INT DEFAULT 0 COMMENT 'Número de abortos previos';
