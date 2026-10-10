-- Fixture de prueba del ejecutor (db-migrate). No es una migración real.
-- Crea una vista: cambia el esquema, no los datos. Dos lotes separados por GO
-- (CREATE VIEW debe ser la primera sentencia de su lote).
SET NOCOUNT ON;
PRINT N'fixture: creando vista de prueba';
GO

CREATE OR ALTER VIEW dbo.vw_fixture_migrate AS SELECT 1 AS uno;
GO
