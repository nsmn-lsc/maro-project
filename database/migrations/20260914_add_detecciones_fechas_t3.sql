-- Migración: Agregar fechas de toma independientes para detecciones del 3er trimestre
ALTER TABLE detecciones
  ADD COLUMN fecha_deteccion_t3 DATE DEFAULT NULL COMMENT 'Fecha general de toma de detecciones 3T (legacy/fallback)' AFTER prueba_hepatitis_c_t3,
  ADD COLUMN fecha_vih_t3 DATE DEFAULT NULL COMMENT 'Fecha de toma de la prueba VIH 3T' AFTER fecha_deteccion_t3,
  ADD COLUMN fecha_vdrl_t3 DATE DEFAULT NULL COMMENT 'Fecha de toma de la prueba VDRL 3T' AFTER fecha_vih_t3,
  ADD COLUMN fecha_hepatitis_c_t3 DATE DEFAULT NULL COMMENT 'Fecha de toma de la prueba Hepatitis C 3T' AFTER fecha_vdrl_t3;
