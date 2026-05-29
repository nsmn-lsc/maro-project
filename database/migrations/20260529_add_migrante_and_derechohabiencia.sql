-- 20260529_add_migrante_and_derechohabiencia.sql
-- Objetivo:
--   Agregar los campos de tipificación social y médica del paciente:
--   1. 'migrante' (Booleano) para control de población en tránsito.
--   2. 'derechohabiencia' (Enum) con las opciones IMB, IMSS, ISSSTE, Otro.
--
-- Motivo:
--   - Permitir capturar si la paciente pertenece a población migrante en tránsito.
--   - Identificar de forma obligatoria la derechohabiencia médica de la paciente 
--     mediante una lista desplegable con las opciones oficiales del estado.
--
-- Seguridad & Idempotencia:
--   - Se utiliza un procedimiento almacenado dinámico para verificar la existencia 
--     de las columnas antes de ejecutar el ALTER TABLE, evitando fallos si el script
--     se vuelve a ejecutar o si alguna columna ya fue agregada manualmente.

DELIMITER //

CREATE PROCEDURE AddColumnsIfNotExist()
BEGIN
    -- 1. Agregar campo 'migrante' si no existe en la tabla cat_pacientes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'migrante'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN migrante TINYINT(1) DEFAULT '0' 
        AFTER indigena;
    END IF;

    -- 2. Agregar campo 'derechohabiencia' si no existe en la tabla cat_pacientes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'derechohabiencia'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN derechohabiencia ENUM('IMB', 'IMSS', 'ISSSTE', 'Otro') 
        COLLATE utf8mb4_unicode_ci DEFAULT NULL 
        AFTER migrante;
    END IF;
END //

DELIMITER ;

-- Ejecutar el procedimiento
CALL AddColumnsIfNotExist();

-- Eliminar el procedimiento temporal
DROP PROCEDURE AddColumnsIfNotExist;
