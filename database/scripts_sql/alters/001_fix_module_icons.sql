-- ============================================================
-- Mi Valecito — Fix 002: Reparar iconos de módulos corruptos
-- Ejecutar si los módulos 5-8 muestran ?? o ? en lugar de emoji.
-- Causa: INSERT previo sin prefijo N'...' en SQL Server.
-- Es idempotente: solo actualiza si el valor actual es incorrecto.
-- ============================================================

UPDATE dbo.modules SET icon = N'🧾' WHERE id = 5 AND icon <> N'🧾';
UPDATE dbo.modules SET icon = N'➕' WHERE id = 6 AND icon <> N'➕';
UPDATE dbo.modules SET icon = N'💼' WHERE id = 7 AND icon <> N'💼';
UPDATE dbo.modules SET icon = N'🏪' WHERE id = 8 AND icon <> N'🏪';

-- Verificar resultado
SELECT id, name, icon FROM dbo.modules WHERE id IN (5, 6, 7, 8) ORDER BY id;

PRINT '✅ Iconos reparados';
