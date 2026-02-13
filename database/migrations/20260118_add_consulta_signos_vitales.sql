-- Signos vitales en consultas prenatales
ALTER TABLE consultas_prenatales
  ADD COLUMN ta_sistolica SMALLINT NULL AFTER fecha_consulta,
  ADD COLUMN ta_diastolica SMALLINT NULL AFTER ta_sistolica,
  ADD COLUMN frecuencia_cardiaca SMALLINT NULL AFTER ta_diastolica,
  ADD COLUMN indice_choque DECIMAL(5,2) NULL AFTER frecuencia_cardiaca,
  ADD COLUMN frecuencia_respiratoria SMALLINT NULL AFTER indice_choque,
  ADD COLUMN temperatura DECIMAL(4,1) NULL AFTER frecuencia_respiratoria;
