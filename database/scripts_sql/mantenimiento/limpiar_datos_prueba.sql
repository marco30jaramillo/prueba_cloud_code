-- ============================================================
-- Mi Valecito - mantenimiento/limpiar_datos_prueba.sql
-- Deja una base LOCAL de desarrollo como recién creada: sin usuarios, tiendas, vales,
-- abonos, tokens ni auditoría, y solo con los catálogos de fábrica (roles, permisos, módulos).
-- Sirve, por ejemplo, para volver a usar POST /auth/bootstrap-superuser.
--
-- DESTRUCTIVO. Solo corre en MiValecito_Dev o MiValecito_Cmp, y nunca en Azure SQL:
-- la guarda del inicio aborta sin borrar nada en cualquier otro caso.
--
-- No va en esquemas/ ni en inserts/ a propósito: `npm run db:setup` ejecuta todo lo que
-- hay en esas carpetas. Este script se corre a mano, cuando se quiere vaciar la base.
--
-- Qué hace, en una sola transacción (si algo falla, no se borra nada):
--   1. Vacía, en orden hijo -> padre (las llaves foráneas son NO ACTION):
--      abonos, vales, tienda_usuarios, tiendas, tokens_granted, tokens_revoked,
--      audit_logs, users.
--   2. Borra los roles que no son de fábrica, por nombre (ver inserts/02_roles.sql).
--   3. Comprueba el resultado antes de confirmar.
-- No toca dbo.permissions ni dbo.modules, ni las filas de los cinco roles de fábrica.
--
-- Identidades: ninguna tabla usa IDENTITY (los id son UNIQUEIDENTIFIER, o INT asignado
-- por el script de inserts o por la aplicación), así que no hay nada que reiniciar.
--
-- Idempotente: sobre una base ya limpia reporta 0 filas borradas.
-- Prerrequisito: esquemas/01_esquema_inicial.sql y esquemas/02_esquema_vales.sql.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Todo va en un solo lote: si la guarda falla, THROW corta el lote y no queda ninguna
-- sentencia de borrado por ejecutar, aunque quien lo corra no se detenga en el error.
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- ── Guarda: solo bases locales de desarrollo ──
DECLARE @base    SYSNAME = DB_NAME();
DECLARE @edicion INT     = CAST(SERVERPROPERTY('EngineEdition') AS INT);
DECLARE @mensaje NVARCHAR(2000);

-- EngineEdition: 5 = Azure SQL Database, 6 = Azure Synapse, 8 = Azure SQL Managed Instance.
IF @edicion IN (5, 6, 8)
   OR @@SERVERNAME LIKE N'%.database.windows.net%'
   OR @base NOT IN (N'MiValecito_Dev', N'MiValecito_Cmp')
BEGIN
    SET @mensaje = CONCAT(
        N'limpiar_datos_prueba.sql solo corre en MiValecito_Dev o MiValecito_Cmp de un SQL Server local. ',
        N'Base actual: ', @base, N'; servidor: ', @@SERVERNAME, N'; EngineEdition: ', @edicion,
        N'. No se borró nada.');
    THROW 51000, @mensaje, 1;
END;

PRINT CONCAT(N'Limpiando datos de prueba en ', @base, N' (servidor ', @@SERVERNAME, N')');

-- Roles de fábrica: los mismos nombres de inserts/02_roles.sql.
DECLARE @rolesFabrica TABLE (name NVARCHAR(100) NOT NULL PRIMARY KEY);
INSERT INTO @rolesFabrica (name)
VALUES (N'superuser'), (N'administrador'), (N'vendedor'), (N'cliente'), (N'tendero');

BEGIN TRANSACTION;

-- ── Guarda: un rol de fábrica no debe mencionar en canManage un rol que se va a borrar ──
-- roles.canManage es una lista de nombres separada por "|". Si un rol de fábrica apuntara
-- a un rol sobrante, limpiarlo sería modificar el catálogo de fábrica: se aborta y se
-- decide a mano. (modules y permissions no guardan nombres de rol en ninguna columna.)
IF EXISTS (
    SELECT 1
    FROM dbo.roles AS f
    JOIN dbo.roles AS s
      ON CHARINDEX(N'|' + s.name + N'|', N'|' + f.canManage + N'|') > 0
    WHERE f.name IN (SELECT name FROM @rolesFabrica)
      AND s.name NOT IN (SELECT name FROM @rolesFabrica)
)
BEGIN
    SET @mensaje = N'Un rol de fábrica referencia en canManage un rol que no es de fábrica. Revisar dbo.roles antes de limpiar. No se borró nada.';
    THROW 51001, @mensaje, 1;
END;

-- ── Vaciado, hijo -> padre ──
DELETE FROM dbo.abonos;
PRINT CONCAT(N'dbo.abonos: ', @@ROWCOUNT, N' filas borradas');

DELETE FROM dbo.vales;
PRINT CONCAT(N'dbo.vales: ', @@ROWCOUNT, N' filas borradas');

DELETE FROM dbo.tienda_usuarios;
PRINT CONCAT(N'dbo.tienda_usuarios: ', @@ROWCOUNT, N' filas borradas');

DELETE FROM dbo.tiendas;
PRINT CONCAT(N'dbo.tiendas: ', @@ROWCOUNT, N' filas borradas');

DELETE FROM dbo.tokens_granted;
PRINT CONCAT(N'dbo.tokens_granted: ', @@ROWCOUNT, N' filas borradas');

DELETE FROM dbo.tokens_revoked;
PRINT CONCAT(N'dbo.tokens_revoked: ', @@ROWCOUNT, N' filas borradas');

DELETE FROM dbo.audit_logs;
PRINT CONCAT(N'dbo.audit_logs: ', @@ROWCOUNT, N' filas borradas');

DELETE FROM dbo.users;
PRINT CONCAT(N'dbo.users: ', @@ROWCOUNT, N' filas borradas');

-- ── Roles que no son de fábrica (por nombre, no por id) ──
DELETE FROM dbo.roles
WHERE name NOT IN (SELECT name FROM @rolesFabrica);
PRINT CONCAT(N'dbo.roles: ', @@ROWCOUNT, N' roles que no son de fábrica borrados');

-- ── Comprobación antes de confirmar ──
DECLARE @restantes INT = (SELECT COUNT(*) FROM dbo.abonos)
                       + (SELECT COUNT(*) FROM dbo.vales)
                       + (SELECT COUNT(*) FROM dbo.tienda_usuarios)
                       + (SELECT COUNT(*) FROM dbo.tiendas)
                       + (SELECT COUNT(*) FROM dbo.tokens_granted)
                       + (SELECT COUNT(*) FROM dbo.tokens_revoked)
                       + (SELECT COUNT(*) FROM dbo.audit_logs)
                       + (SELECT COUNT(*) FROM dbo.users);
DECLARE @roles        INT = (SELECT COUNT(*) FROM dbo.roles);
DECLARE @rolesDeFabrica INT = (SELECT COUNT(*) FROM dbo.roles WHERE name IN (SELECT name FROM @rolesFabrica));
DECLARE @permisos     INT = (SELECT COUNT(*) FROM dbo.permissions);
DECLARE @modulos      INT = (SELECT COUNT(*) FROM dbo.modules);

IF @restantes <> 0 OR @roles <> @rolesDeFabrica
BEGIN
    SET @mensaje = CONCAT(N'La comprobación final falló (filas restantes: ', @restantes,
        N'; roles: ', @roles, N'; de fábrica: ', @rolesDeFabrica, N'). Se revierte todo.');
    THROW 51002, @mensaje, 1;
END;

COMMIT TRANSACTION;

IF @rolesDeFabrica <> 5
    PRINT CONCAT(N'AVISO: hay ', @rolesDeFabrica, N' roles de fábrica y se esperaban 5. Correr inserts/02_roles.sql.');

PRINT CONCAT(N'Limpieza terminada. Roles: ', @roles,
    N'; permisos: ', @permisos,
    N'; módulos: ', @modulos);
GO
