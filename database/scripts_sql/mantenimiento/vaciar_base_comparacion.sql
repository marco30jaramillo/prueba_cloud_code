-- ============================================================
-- Mi Valecito - mantenimiento/vaciar_base_comparacion.sql
-- Deja la base de comparacion MiValecito_Cmp SIN ningun objeto de usuario (sin tablas,
-- vistas, llaves foraneas, procedimientos, funciones, secuencias, sinonimos, tipos ni
-- esquemas propios). Sirve para probar `db-migrate.js --modo inicializar` desde cero.
--
-- DESTRUCTIVO. La guarda del inicio aborta con THROW, sin borrar nada, si la base actual no
-- se llama exactamente MiValecito_Cmp (nunca MiValecito_Dev) o si el motor es Azure SQL.
--
-- No va en esquemas/ ni en inserts/: el ejecutor nunca lee mantenimiento/. Se corre a mano.
--
-- Una sola transaccion y un solo lote (sin GO: el THROW de la guarda detiene todo). Si algo
-- falla, SET XACT_ABORT revierte y no se borra nada. Al final comprueba 0 tablas de usuario.
-- Despues de correrlo, la base queda sin tabla de control: `inicializar` la crea.
-- Idempotente: sobre una base ya vacia no hace nada.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'MiValecito_Cmp'
    THROW 50001, N'vaciar_base_comparacion.sql solo corre en MiValecito_Cmp. Abortado sin borrar nada.', 1;
IF CAST(SERVERPROPERTY('EngineEdition') AS INT) = 5
    THROW 50002, N'vaciar_base_comparacion.sql no corre en Azure SQL Database. Abortado sin borrar nada.', 1;

BEGIN TRANSACTION;

DECLARE @sql NVARCHAR(MAX);

-- 1. Llaves foraneas
SET @sql = N'';
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name)
            + N' DROP CONSTRAINT ' + QUOTENAME(f.name) + N';' + CHAR(10)
FROM sys.foreign_keys f JOIN sys.tables t ON t.object_id = f.parent_object_id;
IF @sql <> N'' EXEC sys.sp_executesql @sql;

-- 2. Vistas, procedimientos y funciones
SET @sql = N'';
SELECT @sql = @sql + N'DROP ' + CASE o.type WHEN 'V' THEN N'VIEW ' WHEN 'P' THEN N'PROCEDURE ' ELSE N'FUNCTION ' END
            + QUOTENAME(SCHEMA_NAME(o.schema_id)) + N'.' + QUOTENAME(o.name) + N';' + CHAR(10)
FROM sys.objects o
WHERE o.is_ms_shipped = 0 AND o.type IN ('V', 'P', 'FN', 'IF', 'TF');
IF @sql <> N'' EXEC sys.sp_executesql @sql;

-- 3. Tablas (los disparadores de tabla se van con ella)
SET @sql = N'';
SELECT @sql = @sql + N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N';' + CHAR(10)
FROM sys.tables t WHERE t.is_ms_shipped = 0;
IF @sql <> N'' EXEC sys.sp_executesql @sql;

-- 4. Secuencias y sinonimos
SET @sql = N'';
SELECT @sql = @sql + N'DROP ' + CASE o.type WHEN 'SO' THEN N'SEQUENCE ' ELSE N'SYNONYM ' END
            + QUOTENAME(SCHEMA_NAME(o.schema_id)) + N'.' + QUOTENAME(o.name) + N';' + CHAR(10)
FROM sys.objects o WHERE o.is_ms_shipped = 0 AND o.type IN ('SO', 'SN');
IF @sql <> N'' EXEC sys.sp_executesql @sql;

-- 5. Tipos definidos por el usuario
SET @sql = N'';
SELECT @sql = @sql + N'DROP TYPE ' + QUOTENAME(SCHEMA_NAME(ty.schema_id)) + N'.' + QUOTENAME(ty.name) + N';' + CHAR(10)
FROM sys.types ty WHERE ty.is_user_defined = 1;
IF @sql <> N'' EXEC sys.sp_executesql @sql;

-- 6. Esquemas propios (distintos de dbo, guest, INFORMATION_SCHEMA, sys y los de roles fijos)
SET @sql = N'';
SELECT @sql = @sql + N'DROP SCHEMA ' + QUOTENAME(s.name) + N';' + CHAR(10)
FROM sys.schemas s
WHERE s.schema_id > 4 AND s.schema_id < 16384
  AND s.name NOT IN (N'guest', N'INFORMATION_SCHEMA', N'sys');
IF @sql <> N'' EXEC sys.sp_executesql @sql;

-- 7. Comprobacion antes de confirmar
IF EXISTS (SELECT 1 FROM sys.objects WHERE is_ms_shipped = 0)
    THROW 50003, N'Quedaron objetos de usuario; se revierte la transaccion.', 1;

COMMIT TRANSACTION;

SELECT DB_NAME() AS base,
       (SELECT COUNT(*) FROM sys.tables)                           AS tablas,
       (SELECT COUNT(*) FROM sys.objects WHERE is_ms_shipped = 0)  AS objetos_usuario;
