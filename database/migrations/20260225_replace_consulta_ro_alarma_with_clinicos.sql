-- Migración: reemplazar campos RO/alarma por campos clínicos estructurados en consultas

ALTER TABLE consultas_prenatales
  DROP COLUMN reclasificacion_ro,
  DROP COLUMN alarma_obstetrica,
  ADD COLUMN estado_conciencia ENUM('alteraciones', 'conciente') NULL AFTER ivu_repeticion,
  ADD COLUMN hemorragia ENUM('visible o abundante', 'no visible o moderada', 'no visible o escasa') NULL AFTER estado_conciencia,
  ADD COLUMN respiracion ENUM('alterada', 'normal') NULL AFTER hemorragia,
  ADD COLUMN color_piel ENUM('cianotica', 'palida', 'normal') NULL AFTER respiracion;
