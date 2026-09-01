-- 20260901_add_resolucion_embarazo_rollback.sql
-- Objetivo:
--   Revertir de forma segura los cambios agregados en 20260901_add_resolucion_embarazo.sql.

DELIMITER //

CREATE PROCEDURE RollbackResolucionEmbarazoColumns()
BEGIN
    -- 1. Revertir consultas_prenatales
    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND INDEX_NAME = 'idx_consultas_tipo_evento'
    ) THEN
        ALTER TABLE consultas_prenatales DROP INDEX idx_consultas_tipo_evento;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND COLUMN_NAME = 'complicacion_resolucion'
    ) THEN
        ALTER TABLE consultas_prenatales DROP COLUMN complicacion_resolucion;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND COLUMN_NAME = 'fecha_evento'
    ) THEN
        ALTER TABLE consultas_prenatales DROP COLUMN fecha_evento;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND COLUMN_NAME = 'tipo_evento'
    ) THEN
        ALTER TABLE consultas_prenatales DROP COLUMN tipo_evento;
    END IF;

    -- 2. Revertir cat_pacientes
    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND INDEX_NAME = 'idx_pacientes_estado_embarazo'
    ) THEN
        ALTER TABLE cat_pacientes DROP INDEX idx_pacientes_estado_embarazo;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'lugar_atencion_parto'
    ) THEN
        ALTER TABLE cat_pacientes DROP COLUMN lugar_atencion_parto;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'tipo_resolucion'
    ) THEN
        ALTER TABLE cat_pacientes DROP COLUMN tipo_resolucion;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'fecha_resolucion'
    ) THEN
        ALTER TABLE cat_pacientes DROP COLUMN fecha_resolucion;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'estado_embarazo'
    ) THEN
        ALTER TABLE cat_pacientes DROP COLUMN estado_embarazo;
    END IF;

END //

DELIMITER ;

-- Ejecutar
CALL RollbackResolucionEmbarazoColumns();

-- Limpiar
DROP PROCEDURE RollbackResolucionEmbarazoColumns;
