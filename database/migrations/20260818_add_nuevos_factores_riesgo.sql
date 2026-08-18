-- ============================================================
-- Migración: Agregar nuevos factores de riesgo obstétrico a cat_pacientes
-- Fecha: 2026-08-18
-- Descripción:
--   - ant_embarazo_ectopico (6 puntos) en antecedentes gineco-obstétricos
--   - factor_endocrinopatia (12 puntos)
--   - factor_neumopatia (12 puntos)
--   - factor_its (4 puntos)
--   - factor_cirugias_pelvico_uterinas (4 puntos)
--   - factor_discapacidad (12 puntos)
--   - otros_antecedentes VARCHAR(50) (Texto opcional máx 50 caracteres)
--   - Actualizar comentario de factor_drogas_ilicitas a 6 puntos (Otras drogas)
--
-- Seguridad & Idempotencia:
--   - Procedimiento con verificación de columnas en information_schema
--   - Preserva todos los registros existentes sin pérdida de datos
--   - DEFAULT 0 / NULL para retrocompatibilidad
-- ============================================================

DELIMITER //

CREATE PROCEDURE AddNuevosFactoresRiesgo()
BEGIN
    -- 1. ant_embarazo_ectopico (6 puntos) en antecedentes gineco-obstétricos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'ant_embarazo_ectopico'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN ant_embarazo_ectopico TINYINT(1) DEFAULT '0' COMMENT 'Antecedente de embarazo ectópico (6 puntos)' 
        AFTER ant_muerte_perinatal;
    END IF;

    -- 2. factor_endocrinopatia
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'factor_endocrinopatia'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN factor_endocrinopatia TINYINT(1) DEFAULT '0' COMMENT 'Endocrinopatía (12 puntos)' 
        AFTER factor_drogas_ilicitas;
    END IF;

    -- 3. factor_neumopatia
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'factor_neumopatia'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN factor_neumopatia TINYINT(1) DEFAULT '0' COMMENT 'Neumopatía (12 puntos)' 
        AFTER factor_endocrinopatia;
    END IF;

    -- 4. factor_its
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'factor_its'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN factor_its TINYINT(1) DEFAULT '0' COMMENT 'Infecciones de Transmisión Sexual - ITS (4 puntos)' 
        AFTER factor_neumopatia;
    END IF;

    -- 5. factor_cirugias_pelvico_uterinas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'factor_cirugias_pelvico_uterinas'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN factor_cirugias_pelvico_uterinas TINYINT(1) DEFAULT '0' COMMENT 'Cirugías Pélvico Uterinas (4 puntos)' 
        AFTER factor_its;
    END IF;

    -- 6. factor_discapacidad
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'factor_discapacidad'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN factor_discapacidad TINYINT(1) DEFAULT '0' COMMENT 'Discapacidad (12 puntos)' 
        AFTER factor_cirugias_pelvico_uterinas;
    END IF;

    -- 7. otros_antecedentes (Texto libre opcional hasta 50 caracteres)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'otros_antecedentes'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN otros_antecedentes VARCHAR(50) DEFAULT NULL COMMENT 'Otros antecedentes (máximo 50 caracteres)' 
        AFTER factor_discapacidad;
    END IF;

    -- 8. Actualizar comentario de factor_drogas_ilicitas a 6 puntos
    ALTER TABLE cat_pacientes 
    MODIFY COLUMN factor_drogas_ilicitas TINYINT(1) DEFAULT '0' COMMENT 'Otras drogas (6 puntos)';
END //

DELIMITER ;

-- Ejecutar procedimiento de migración
CALL AddNuevosFactoresRiesgo();

-- Eliminar procedimiento temporal
DROP PROCEDURE AddNuevosFactoresRiesgo;
