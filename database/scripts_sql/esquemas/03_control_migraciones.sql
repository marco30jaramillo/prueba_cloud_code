-- ============================================================
-- Mi Valecito - esquemas/03_control_migraciones.sql
-- Tabla de control de migraciones: registra cada script aplicado por el ejecutor
-- (nombre, suma de verificación, modo, versión del release, cuenta y fecha).
--
-- Contrato con el ejecutor (backend/scripts/db-migrate.js):
--   nombre         ruta relativa del script, p. ej. alters/001_fix_module_icons.sql (único)
--   checksum       SHA-256 en hexadecimal (64 caracteres), con fin de línea normalizado
--   modo           aplicado | baseline | inicializacion
--   version_release versión del release que lo aplicó, p. ej. v1.0.0 (puede ser NULL)
--   aplicado_por   cuenta que lo aplicó (SUSER_SNAME())
--   aplicado_at    fecha y hora UTC
--
-- Idempotente: comprueba la existencia de la tabla y de cada restricción. Compatible con
-- SQL Server y Azure SQL. La cuenta de la aplicación no necesita acceso a esta tabla.
-- ============================================================

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'migraciones_aplicadas' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.migraciones_aplicadas (
        id              INT IDENTITY(1,1) NOT NULL,
        nombre          NVARCHAR(260)     NOT NULL,
        [checksum]      CHAR(64)          NOT NULL,
        modo            NVARCHAR(20)      NOT NULL,
        version_release NVARCHAR(30)      NULL,
        aplicado_por    NVARCHAR(128)     NOT NULL
            CONSTRAINT DF_migraciones_aplicadas_aplicado_por DEFAULT SUSER_SNAME(),
        aplicado_at     DATETIME2         NOT NULL
            CONSTRAINT DF_migraciones_aplicadas_aplicado_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_migraciones_aplicadas        PRIMARY KEY (id),
        CONSTRAINT UQ_migraciones_aplicadas_nombre UNIQUE (nombre),
        CONSTRAINT CK_migraciones_aplicadas_modo   CHECK (modo IN (N'aplicado', N'baseline', N'inicializacion'))
    );
    PRINT N'Tabla dbo.migraciones_aplicadas creada';
END
ELSE
    PRINT N'Tabla dbo.migraciones_aplicadas ya existe';
GO
