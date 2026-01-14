-- Comandos útiles para administración de la base de datos MARO Hub

-- ===========================================
-- CONSULTAS DE VERIFICACIÓN
-- ===========================================

-- Ver todas las tablas
SHOW TABLES;

-- Ver estructura de una tabla
DESCRIBE sesiones;
DESCRIBE casos;
DESCRIBE evaluaciones_clinicas;

-- Contar registros
SELECT 'Sesiones' as tabla, COUNT(*) as total FROM sesiones
UNION ALL
SELECT 'Casos', COUNT(*) FROM casos
UNION ALL
SELECT 'Evaluaciones', COUNT(*) FROM evaluaciones_clinicas
UNION ALL
SELECT 'Bitácora', COUNT(*) FROM bitacora;

-- ===========================================
-- CONSULTAS DE ANÁLISIS
-- ===========================================

-- Casos por nivel de riesgo
SELECT 
  nivel_riesgo, 
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM casos), 2) as porcentaje
FROM casos
WHERE nivel_riesgo IS NOT NULL
GROUP BY nivel_riesgo
ORDER BY 
  CASE nivel_riesgo
    WHEN 'ROJO' THEN 1
    WHEN 'NARANJA' THEN 2
    WHEN 'AMARILLO' THEN 3
  END;

-- Casos por región
SELECT region, COUNT(*) as total
FROM casos
GROUP BY region
ORDER BY total DESC;

-- Casos por estatus
SELECT estatus, COUNT(*) as total
FROM casos
GROUP BY estatus
ORDER BY total DESC;

-- Últimos 10 casos creados
SELECT 
  folio,
  paciente_iniciales,
  nivel_riesgo,
  estatus,
  created_at
FROM casos
ORDER BY created_at DESC
LIMIT 10;

-- Actividad reciente (últimas 20 acciones)
SELECT 
  b.fecha_hora,
  c.folio,
  b.actor_rol,
  b.accion,
  b.descripcion
FROM bitacora b
JOIN casos c ON b.caso_id = c.id
ORDER BY b.fecha_hora DESC
LIMIT 20;

-- Casos con evaluación clínica completa
SELECT 
  c.folio,
  c.paciente_iniciales,
  c.nivel_riesgo,
  e.sistolica,
  e.diastolica,
  e.imc
FROM casos c
JOIN evaluaciones_clinicas e ON c.id = e.caso_id
ORDER BY c.created_at DESC;

-- ===========================================
-- MANTENIMIENTO
-- ===========================================

-- Limpiar casos de prueba (CUIDADO: solo en desarrollo)
-- DELETE FROM casos WHERE folio LIKE 'TEST-%';

-- Resetear auto_increment (después de limpiar datos de prueba)
-- ALTER TABLE sesiones AUTO_INCREMENT = 1;
-- ALTER TABLE casos AUTO_INCREMENT = 1;

-- ===========================================
-- RESPALDO Y RESTAURACIÓN
-- ===========================================

-- Crear respaldo de la base de datos (ejecutar en terminal, no en MySQL)
-- mysqldump -u root -p maro_hub > backup_maro_hub_$(date +%Y%m%d_%H%M%S).sql

-- Restaurar desde respaldo (ejecutar en terminal)
-- mysql -u root -p maro_hub < backup_maro_hub_YYYYMMDD_HHMMSS.sql

-- ===========================================
-- OPTIMIZACIÓN
-- ===========================================

-- Analizar tablas
ANALYZE TABLE sesiones, casos, evaluaciones_clinicas, bitacora;

-- Optimizar tablas
OPTIMIZE TABLE sesiones, casos, evaluaciones_clinicas, bitacora;

-- Ver tamaño de las tablas
SELECT 
  table_name AS 'Tabla',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Tamaño (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'maro_hub'
ORDER BY (data_length + index_length) DESC;

-- ===========================================
-- USUARIOS Y PERMISOS
-- ===========================================

-- Crear usuario específico para la aplicación (recomendado para producción)
-- CREATE USER 'maro_app'@'localhost' IDENTIFIED BY 'password_seguro_aqui';
-- GRANT SELECT, INSERT, UPDATE ON maro_hub.* TO 'maro_app'@'localhost';
-- FLUSH PRIVILEGES;

-- Ver usuarios existentes
-- SELECT user, host FROM mysql.user;

-- Ver permisos de un usuario
-- SHOW GRANTS FOR 'maro_app'@'localhost';

-- ===========================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ===========================================

-- Insertar sesión de prueba
-- INSERT INTO sesiones (region, municipio, unidad, clues) 
-- VALUES ('Región Test', 'Municipio Test', 'Unidad Test', 'TEST001');

-- Insertar caso de prueba
-- INSERT INTO casos (
--   folio, region, municipio, unidad, nivel_atencion,
--   paciente_iniciales, edad, semanas_gestacion, trimestre,
--   estatus, nivel_riesgo, score_riesgo
-- ) VALUES (
--   'TEST-20260113-001', 'Región Test', 'Municipio Test', 'Unidad Test', 'Primer Nivel',
--   'TEST', 28, 32.0, 3,
--   'BORRADOR', 'NARANJA', 75
-- );

-- ===========================================
-- MONITOREO DE RENDIMIENTO
-- ===========================================

-- Queries lentas actualmente en ejecución
-- SELECT * FROM information_schema.processlist WHERE time > 5;

-- Estadísticas de índices
-- SELECT 
--   TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
-- FROM information_schema.STATISTICS
-- WHERE TABLE_SCHEMA = 'maro_hub'
-- ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
