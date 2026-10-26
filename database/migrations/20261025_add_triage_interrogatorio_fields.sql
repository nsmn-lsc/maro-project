-- Migración: Campos de Interrogatorio en Triage Obstétrico para consultas_prenatales
-- Archivo: database/migrations/20261025_add_triage_interrogatorio_fields.sql

ALTER TABLE consultas_prenatales
  ADD COLUMN interrogatorio_sangrado_transvaginal ENUM('abundante', 'escaso_moderado', 'ausente') DEFAULT NULL COMMENT 'Interrogatorio Triage: Sangrado transvaginal (Abundante / Escaso-Moderado / Ausente)' AFTER color_piel,
  ADD COLUMN interrogatorio_crisis_convulsivas ENUM('presente', 'negadas') DEFAULT NULL COMMENT 'Interrogatorio Triage: Crisis convulsivas (Presente / Negadas)' AFTER interrogatorio_sangrado_transvaginal,
  ADD COLUMN interrogatorio_cefalea ENUM('presente', 'no_pulsatil', 'ausente') DEFAULT NULL COMMENT 'Interrogatorio Triage: Cefalea (Presente / Ausente-Presente No pulsátil / Ausente)' AFTER interrogatorio_crisis_convulsivas,
  ADD COLUMN interrogatorio_acufenos_fosfenos ENUM('presente', 'ausentes') DEFAULT NULL COMMENT 'Interrogatorio Triage: Acúfenos/Fosfenos (Presente / Ausentes)' AFTER interrogatorio_cefalea,
  ADD COLUMN interrogatorio_epigastralgia_amaurosis ENUM('presente', 'ausente') DEFAULT NULL COMMENT 'Interrogatorio Triage: Epigastralgia/Amaurosis (Presente / Ausente)' AFTER interrogatorio_acufenos_fosfenos,
  ADD COLUMN interrogatorio_sindrome_febril ENUM('presente', 'ausente') DEFAULT NULL COMMENT 'Interrogatorio Triage: Síndrome febril (Presente / Ausente)' AFTER interrogatorio_epigastralgia_amaurosis,
  ADD COLUMN interrogatorio_liquido_amniotico ENUM('claro_verdoso', 'ausente') DEFAULT NULL COMMENT 'Interrogatorio Triage: Salida de líquido amniótico (Claro/verdoso / Ausente)' AFTER interrogatorio_sindrome_febril,
  ADD COLUMN interrogatorio_movilidad_fetal ENUM('ausente', 'presente') DEFAULT NULL COMMENT 'Interrogatorio Triage: Movilidad fetal (Ausente / Presente)' AFTER interrogatorio_liquido_amniotico;
