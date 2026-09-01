-- 20260901_add_resolucion_embarazo.sql
-- Objetivo:
--   Agregar campos para gestionar la resolución del embarazo y transición a puerperio:
--   1. cat_pacientes: estado_embarazo, fecha_resolucion, tipo_resolucion, lugar_atencion_parto
--   2. consultas_prenatales: tipo_evento, fecha_evento, complicacion_resolucion
--
-- Seguridad & Idempotencia:
--   - Se utiliza procedimiento almacenado temporal para validar existencia previa de columnas e índices.

DELIMITER //

CREATE PROCEDURE AddResolucionEmbarazoColumns()
BEGIN
    -- =========================================================================
    -- 1. TABLA: cat_pacientes
    -- =========================================================================
    
    -- Campo 'estado_embarazo'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'estado_embarazo'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN estado_embarazo ENUM('activo', 'puerperio', 'concluido') NOT NULL DEFAULT 'activo' 
        COMMENT 'Estado obstétrico: activo (embarazo en curso), puerperio (resuelto), concluido (alta)'
        AFTER riesgo_obstetrico_ingreso;
    END IF;

    -- Campo 'fecha_resolucion'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'fecha_resolucion'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN fecha_resolucion DATE DEFAULT NULL 
        COMMENT 'Fecha real en que ocurrió la resolución obstétrica (parto / cesárea)'
        AFTER estado_embarazo;
    END IF;

    -- Campo 'tipo_resolucion'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'tipo_resolucion'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN tipo_resolucion ENUM('sin_complicaciones', 'con_complicaciones', 'interrupcion') DEFAULT NULL 
        COMMENT 'Tipo de resolución obstétrica'
        AFTER fecha_resolucion;
    END IF;

    -- Campo 'lugar_atencion_parto'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND COLUMN_NAME = 'lugar_atencion_parto'
    ) THEN
        ALTER TABLE cat_pacientes 
        ADD COLUMN lugar_atencion_parto VARCHAR(255) DEFAULT NULL 
        COMMENT 'Unidad u hospital donde fue atendido el evento obstétrico'
        AFTER tipo_resolucion;
    END IF;

    -- Índice en cat_pacientes (estado_embarazo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'cat_pacientes' 
          AND INDEX_NAME = 'idx_pacientes_estado_embarazo'
    ) THEN
        ALTER TABLE cat_pacientes ADD INDEX idx_pacientes_estado_embarazo (estado_embarazo);
    END IF;

    -- =========================================================================
    -- 2. TABLA: consultas_prenatales
    -- =========================================================================

    -- Campo 'tipo_evento'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND COLUMN_NAME = 'tipo_evento'
    ) THEN
        ALTER TABLE consultas_prenatales 
        ADD COLUMN tipo_evento ENUM('embarazo', 'resolucion_sin_complicaciones', 'resolucion_con_complicaciones') NOT NULL DEFAULT 'embarazo' 
        COMMENT 'Tipo de evento de la consulta'
        AFTER diagnostico;
    END IF;

    -- Campo 'fecha_evento'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND COLUMN_NAME = 'fecha_evento'
    ) THEN
        ALTER TABLE consultas_prenatales 
        ADD COLUMN fecha_evento DATE DEFAULT NULL 
        COMMENT 'Fecha del evento obstétrico si se registró resolución'
        AFTER tipo_evento;
    END IF;

    -- Campo 'complicacion_resolucion'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND COLUMN_NAME = 'complicacion_resolucion'
    ) THEN
        ALTER TABLE consultas_prenatales 
        ADD COLUMN complicacion_resolucion VARCHAR(255) DEFAULT NULL 
        COMMENT 'Descripción de complicación obstétrica al momento de resolución'
        AFTER fecha_evento;
    END IF;

    -- Índice en consultas_prenatales (tipo_evento)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'consultas_prenatales' 
          AND INDEX_NAME = 'idx_consultas_tipo_evento'
    ) THEN
        ALTER TABLE consultas_prenatales ADD INDEX idx_consultas_tipo_evento (tipo_evento);
    END IF;

END //

DELIMITER ;

-- Ejecutar
CALL AddResolucionEmbarazoColumns();

-- Limpiar procedimiento temporal
DROP PROCEDURE AddResolucionEmbarazoColumns;
