/*
  Mi Valecito - alters/002_activacion_de_cuentas.sql
  Requerimiento 003 (KAN-69): activacion de cuentas por correo.

  Agrega a dbo.users:
    activatedAt         DATETIME2(3)   NULL   Nulo = cuenta pendiente de activacion.
    activationTokenHash NVARCHAR(128)  NULL   Hash del token del enlace (nunca el token).
    activationExpiresAt DATETIME2(3)   NULL   Vencimiento de la cuenta pendiente.
  Rellena activatedAt = createdAt en las cuentas existentes (CA-21): ninguna queda pendiente.
  Crea el indice filtrado IX_users_activationToken sobre activationTokenHash.

  Idempotente: cada paso comprueba antes de actuar; correrlo dos veces no cambia nada la
  segunda. Sin DROP, ALTER COLUMN, DELETE ni GRANT.
  El script principal esquemas/01_esquema_inicial.sql ya crea la tabla con estas columnas.
  Compatible con SQL Server y Azure SQL Database.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.users', N'activatedAt') IS NULL
    ALTER TABLE dbo.users ADD activatedAt DATETIME2(3) NULL;

IF COL_LENGTH(N'dbo.users', N'activationTokenHash') IS NULL
    ALTER TABLE dbo.users ADD activationTokenHash NVARCHAR(128) NULL;

IF COL_LENGTH(N'dbo.users', N'activationExpiresAt') IS NULL
    ALTER TABLE dbo.users ADD activationExpiresAt DATETIME2(3) NULL;
GO

-- Cuentas existentes: ya estaban en uso, quedan activadas desde su alta.
-- Una cuenta pendiente siempre tiene activationExpiresAt: el filtro evita activarla si el
-- script se vuelve a correr a mano.
UPDATE dbo.users SET activatedAt = createdAt WHERE activatedAt IS NULL AND activationExpiresAt IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_users_activationToken' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE INDEX IX_users_activationToken ON dbo.users (activationTokenHash) WHERE activationTokenHash IS NOT NULL;
GO
