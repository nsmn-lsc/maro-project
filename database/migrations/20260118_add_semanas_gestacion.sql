-- Agrega semanas_gestacion a cat_pacientes
ALTER TABLE cat_pacientes
  ADD COLUMN semanas_gestacion DECIMAL(4,1) NULL AFTER fpp;
