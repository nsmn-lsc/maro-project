-- 20260421_backfill_usuarios_clues_id_from_username.sql
-- Objetivo:
--   Corregir usuarios de nivel CLUES con clues_id NULL usando su username,
--   siempre que ese username exista en cat_unidades.clues.
--
-- Motivo:
--   Sin clues_id, el login CLUES falla al no poder resolver la unidad.
--
-- Seguridad:
--   - Solo actualiza usuarios CLUES activos.
--   - Solo actualiza cuando clues_id esta NULL o vacio.
--   - Solo actualiza si existe coincidencia valida en cat_unidades.

START TRANSACTION;

UPDATE usuarios u
INNER JOIN cat_unidades c
  ON c.clues = u.username
SET u.clues_id = u.username
WHERE u.nivel = 'CLUES'
  AND u.activo = TRUE
  AND (u.clues_id IS NULL OR u.clues_id = '');

COMMIT;

-- Verificacion sugerida post-migracion:
-- SELECT COUNT(*) AS clues_sin_catalogo
-- FROM usuarios u
-- LEFT JOIN cat_unidades c ON c.clues = u.clues_id
-- WHERE u.nivel = 'CLUES' AND u.activo = TRUE AND c.clues IS NULL;
