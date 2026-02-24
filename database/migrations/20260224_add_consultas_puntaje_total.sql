-- Migración: Persistencia de puntajes por consulta prenatal
-- Objetivo:
-- 1) Guardar puntaje de parámetros capturados en consulta
-- 2) Guardar puntaje total por consulta (antecedentes + tamizajes + consulta)
-- 3) Marcar si cruza umbral >= 25 para consumo por otros niveles

ALTER TABLE consultas_prenatales
  ADD COLUMN puntaje_consulta_parametros INT NOT NULL DEFAULT 0 AFTER reclasificacion_ro,
  ADD COLUMN puntaje_total_consulta INT NOT NULL DEFAULT 0 AFTER puntaje_consulta_parametros,
  ADD COLUMN riesgo_25_plus TINYINT(1) NOT NULL DEFAULT 0 AFTER puntaje_total_consulta;

-- Índices para consulta frecuente por umbral/riesgo
ALTER TABLE consultas_prenatales
  ADD INDEX idx_consultas_puntaje_total (puntaje_total_consulta),
  ADD INDEX idx_consultas_riesgo_25_plus (riesgo_25_plus),
  ADD INDEX idx_consultas_riesgo_fecha (riesgo_25_plus, fecha_consulta);
