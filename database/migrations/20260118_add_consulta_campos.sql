-- Campos adicionales para consultas prenatales
ALTER TABLE consultas_prenatales
  ADD COLUMN fondo_uterino_acorde_sdg BOOLEAN DEFAULT FALSE AFTER altura_uterina,
  ADD COLUMN ivu_repeticion BOOLEAN DEFAULT FALSE AFTER fondo_uterino_acorde_sdg,
  ADD COLUMN reclasificacion_ro TINYINT NULL AFTER ivu_repeticion,
  ADD COLUMN alarma_obstetrica TEXT NULL AFTER reclasificacion_ro,
  ADD COLUMN diagnostico TEXT NULL AFTER alarma_obstetrica,
  ADD COLUMN plan TEXT NULL AFTER diagnostico,
  ADD COLUMN fecha_referencia DATE NULL AFTER plan,
  ADD COLUMN area_referencia VARCHAR(200) NULL AFTER fecha_referencia;
