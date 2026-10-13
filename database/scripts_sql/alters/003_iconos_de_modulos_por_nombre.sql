-- ============================================================
-- Mi Valecito - alters/003_iconos_de_modulos_por_nombre.sql
-- Requerimiento 008 (marca): dbo.modules.icon deja de guardar emojis (que se ven distinto según
-- el dispositivo) y pasa a guardar el NOMBRE de un icono del set propio (marca/iconos/<nombre>.svg).
-- La web y la app dibujan el SVG a partir de ese nombre.
-- Idempotente: solo cambia las filas cuyo icono aún no es el nombre esperado. Los módulos que no
-- están en esta lista (creados desde la aplicación) no se tocan.
-- ============================================================

UPDATE dbo.modules SET icon = N'cliente'  WHERE id = 1 AND icon <> N'cliente';
UPDATE dbo.modules SET icon = N'equipo'   WHERE id = 2 AND icon <> N'equipo';
UPDATE dbo.modules SET icon = N'nota'     WHERE id = 3 AND icon <> N'nota';
UPDATE dbo.modules SET icon = N'escudo'   WHERE id = 4 AND icon <> N'escudo';
UPDATE dbo.modules SET icon = N'vale'     WHERE id = 5 AND icon <> N'vale';
UPDATE dbo.modules SET icon = N'agregar'  WHERE id = 6 AND icon <> N'agregar';
UPDATE dbo.modules SET icon = N'cartera'  WHERE id = 7 AND icon <> N'cartera';
UPDATE dbo.modules SET icon = N'tienda'   WHERE id = 8 AND icon <> N'tienda';
GO
