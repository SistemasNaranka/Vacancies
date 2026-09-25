-- =============================================================
-- Purge de postulaciones con más de 6 meses (RF-10, RN-06, Decisión 6)
-- Ejecución MANUAL. No forma parte del servidor del MVP.
--
-- Uso:
--   sqlite3 data/app.db < scripts/purge.sql
-- =============================================================

-- PASO 1 (recomendado): revisar qué se va a borrar
SELECT id, full_name, email, cv_filename, created_at
FROM applications
WHERE created_at < datetime('now', '-6 months');

-- PASO 2: eliminar los registros (los cargos desaparecen en cascada)
BEGIN;
DELETE FROM applications
WHERE created_at < datetime('now', '-6 months');
COMMIT;

-- PASO 3: eliminar los PDFs correspondientes.
-- Los nombres de archivo NO se derivan de los datos, así que comparar
-- contra los que siguen vivos en la BD. Ejemplos (bash):
--
--   # PDFs activos en la BD
--   sqlite3 data/app.db "SELECT cv_filename FROM applications;" > activos.txt
--
--   # listar PDFs huérfanos (los que ya no están en activos.txt)
--   for f in uploads/*.pdf; do
--     grep -q "$(basename "$f")" activos.txt || echo "$f"
--   done
--
--   # revisar la lista y borrar:
--   ... | xargs rm --
--
-- NOTA: con WAL activo, respaldar data/app.db* y uploads/ antes de purgar.
