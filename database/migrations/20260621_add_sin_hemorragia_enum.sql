-- Migración para añadir la opción "sin hemorragia" al campo hemorragia de la tabla consultas_prenatales
ALTER TABLE consultas_prenatales 
MODIFY COLUMN hemorragia ENUM('visible o abundante', 'no visible o moderada', 'no visible o escasa', 'sin hemorragia') NULL;
