-- ============================================================
-- Mi Valecito - esquemas/00_crear_base_y_usuario.sql
-- Crea la base local MiValecito_Dev (si no existe) y la cuenta de la aplicación
-- mivalecito_app, con privilegio mínimo: db_datareader y db_datawriter, sin DDL.
--
-- SOLO PARA SQL SERVER LOCAL. No se ejecuta en Azure SQL ni por el MCP: lo corre una
-- persona, con su usuario de Windows, desde PowerShell:
--
--   $env:MIVALECITO_APP_PASSWORD = Read-Host 'Contraseña para mivalecito_app' -MaskInput
--   sqlcmd -E -S localhost -C -b -f 65001 -i "database\scripts_sql\esquemas\00_crear_base_y_usuario.sql"
--   Remove-Item Env:MIVALECITO_APP_PASSWORD
--
-- La contraseña entra por la variable de entorno MIVALECITO_APP_PASSWORD, que sqlcmd
-- sustituye en $(MIVALECITO_APP_PASSWORD). No se escribe en este archivo ni se pasa con -v.
-- Requisitos de la contraseña: 12 caracteres o más, sin comillas simples ni paréntesis, y
-- que cumpla la política de contraseñas de Windows (CHECK_POLICY = ON).
--
-- Idempotente: se puede repetir. Si el login ya existe NO se le cambia la contraseña; para
-- cambiarla se usa ALTER LOGIN a mano.
-- ============================================================

SET NOCOUNT ON;
GO

IF CONVERT(INT, SERVERPROPERTY('EngineEdition')) IN (5, 6, 8)
BEGIN
    RAISERROR(N'Este script es solo para SQL Server local; no se ejecuta en Azure SQL.', 16, 1);
    SET NOEXEC ON;
END
GO

IF DB_ID(N'MiValecito_Dev') IS NULL
BEGIN
    CREATE DATABASE [MiValecito_Dev];
    PRINT N'Base MiValecito_Dev creada';
END
ELSE
    PRINT N'Base MiValecito_Dev ya existe';
GO

IF SUSER_ID(N'mivalecito_app') IS NULL
BEGIN
    DECLARE @clave NVARCHAR(128) = N'$(MIVALECITO_APP_PASSWORD)';

    IF LEN(@clave) < 12
    BEGIN
        RAISERROR(N'MIVALECITO_APP_PASSWORD debe tener 12 caracteres o más.', 16, 1);
        RETURN;
    END

    -- CREATE LOGIN no admite variables: se arma la sentencia escapando la contraseña.
    DECLARE @sentencia NVARCHAR(MAX) =
        N'CREATE LOGIN [mivalecito_app] WITH PASSWORD = ' + QUOTENAME(@clave, N'''')
        + N', DEFAULT_DATABASE = [MiValecito_Dev], CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC (@sentencia);
    PRINT N'Login mivalecito_app creado';
END
ELSE
    PRINT N'Login mivalecito_app ya existe (no se cambia su contraseña)';
GO

USE [MiValecito_Dev];
GO

IF DATABASE_PRINCIPAL_ID(N'mivalecito_app') IS NULL
BEGIN
    CREATE USER [mivalecito_app] FOR LOGIN [mivalecito_app] WITH DEFAULT_SCHEMA = [dbo];
    PRINT N'Usuario mivalecito_app creado en MiValecito_Dev';
END
ELSE IF NOT EXISTS (SELECT 1 FROM sys.database_principals
                    WHERE name = N'mivalecito_app' AND sid = SUSER_SID(N'mivalecito_app'))
BEGIN
    -- El usuario quedó huérfano (el login se volvió a crear): se vuelve a enlazar.
    ALTER USER [mivalecito_app] WITH LOGIN = [mivalecito_app];
    PRINT N'Usuario mivalecito_app enlazado de nuevo a su login';
END
ELSE
    PRINT N'Usuario mivalecito_app ya existe en MiValecito_Dev';
GO

IF IS_ROLEMEMBER(N'db_datareader', N'mivalecito_app') = 0
    ALTER ROLE [db_datareader] ADD MEMBER [mivalecito_app];

IF IS_ROLEMEMBER(N'db_datawriter', N'mivalecito_app') = 0
    ALTER ROLE [db_datawriter] ADD MEMBER [mivalecito_app];

PRINT N'mivalecito_app: db_datareader y db_datawriter';
GO

-- Comprobación: roles de la cuenta. No debe aparecer db_owner ni db_ddladmin.
SELECT r.name AS rol
FROM sys.database_role_members AS m
JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id
JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id
WHERE u.name = N'mivalecito_app'
ORDER BY r.name;
GO

SET NOEXEC OFF;
GO
