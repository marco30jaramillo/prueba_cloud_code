-- ============================================================
-- Mi Valecito - mantenimiento/prueba_conciliacion_suma.sql
-- Prueba de que consultas/conciliacion_integral.sql detecta un cambio que CONSERVA el total
-- de montos: intercambia dos montos de abonos y comprueba que las claves suma:* cambian
-- mientras las total:* no. Termina SIEMPRE con ROLLBACK: no deja ningún dato.
--
-- Solo corre en MiValecito_Dev o MiValecito_Cmp; en cualquier otra base aborta sin tocar nada.
-- Si la base no tiene dos abonos, siembra (dentro de la misma transacción, que se revierte)
-- un usuario, una tienda, dos vales y dos abonos.
--
-- No va en esquemas/ ni en inserts/: db:setup ejecuta todo lo que hay en esas carpetas.
-- Las claves son las de consultas/conciliacion_integral.sql.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() NOT IN (N'MiValecito_Dev', N'MiValecito_Cmp')
BEGIN
    THROW 50001, N'prueba_conciliacion_suma.sql solo corre en MiValecito_Dev o MiValecito_Cmp. No se hizo nada.', 1;
END

-- pasada: 0 = antes de la transaccion, 1 = tras sembrar, 2 = tras el UPDATE, 3 = tras el ROLLBACK.
-- Variable de tabla: no se deshace con el ROLLBACK, a diferencia de una tabla temporal.
DECLARE @snap TABLE (pasada INT NOT NULL, clave NVARCHAR(128) NOT NULL, valor NVARCHAR(64) NULL);
DECLARE @tmp TABLE (clave NVARCHAR(128) NOT NULL, valor NVARCHAR(64) NULL);
DECLARE @sql NVARCHAR(MAX), @sembrado BIT = 0;
DECLARE @a1 UNIQUEIDENTIFIER, @a2 UNIQUEIDENTIFIER, @m1 DECIMAL(12, 2), @m2 DECIMAL(12, 2);

-- Consulta de conciliacion, armada una sola vez.
SELECT @sql = STRING_AGG(CONVERT(NVARCHAR(MAX),
        N'SELECT N''filas:' + s.name + N'.' + t.name + N''' AS clave, CONVERT(NVARCHAR(64), COUNT_BIG(*)) AS valor FROM '
        + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)
        + N' UNION ALL SELECT N''suma:' + s.name + N'.' + t.name + N''', CONVERT(NVARCHAR(64), COALESCE(SUM(CONVERT(BIGINT, BINARY_CHECKSUM(*))), 0)) FROM '
        + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)), N' UNION ALL ')
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
  AND NOT (s.name = N'dbo' AND t.name = N'migraciones_aplicadas');
SET @sql = @sql
    + N' UNION ALL SELECT N''total:vales_monto'', CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(montoTotal), 0))) FROM dbo.vales'
    + N' UNION ALL SELECT N''total:vales_saldo'', CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(saldoPendiente), 0))) FROM dbo.vales'
    + N' UNION ALL SELECT N''total:abonos_monto_no_anulados'', CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(monto), 0))) FROM dbo.abonos WHERE anulado = 0'
    + N' UNION ALL SELECT N''total:cartera'', CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(saldoPendiente), 0))) FROM dbo.vales WHERE estado IN (N''pendiente'', N''parcial'')';

-- Pasada 0: antes de abrir la transaccion
DELETE FROM @tmp; INSERT INTO @tmp EXEC sys.sp_executesql @sql;
INSERT INTO @snap SELECT 0, clave, valor FROM @tmp;

BEGIN TRANSACTION;
BEGIN TRY
    IF (SELECT COUNT(*) FROM dbo.abonos WHERE anulado = 0) < 2
    BEGIN
        SET @sembrado = 1;
        DECLARE @u UNIQUEIDENTIFIER = NEWID(), @t UNIQUEIDENTIFIER = NEWID(),
                @v1 UNIQUEIDENTIFIER = NEWID(), @v2 UNIQUEIDENTIFIER = NEWID();
        INSERT INTO dbo.users (id, email, password, name, role)
        VALUES (@u, N'prueba.conciliacion@example.invalid', N'sin-clave', N'Prueba conciliacion', N'cliente');
        INSERT INTO dbo.tiendas (id, nombre, createdBy) VALUES (@t, N'Tienda prueba conciliacion', @u);
        INSERT INTO dbo.vales (id, tiendaId, clienteId, registradoPor, descripcion, montoTotal, saldoPendiente, estado)
        VALUES (@v1, @t, @u, @u, N'Vale prueba 1', 100.00, 70.00, N'parcial'),
               (@v2, @t, @u, @u, N'Vale prueba 2', 250.00, 180.00, N'parcial');
        INSERT INTO dbo.abonos (valeId, monto, registradoPor)
        VALUES (@v1, 30.00, @u), (@v2, 70.00, @u);
    END

    -- Pasada 1: estado de partida de la prueba (con la siembra, si la hubo)
    DELETE FROM @tmp; INSERT INTO @tmp EXEC sys.sp_executesql @sql;
    INSERT INTO @snap SELECT 1, clave, valor FROM @tmp;

    -- Intercambia los montos de dos abonos no anulados con montos distintos: el total no cambia.
    SELECT TOP (1) @a1 = id, @m1 = monto FROM dbo.abonos WHERE anulado = 0 ORDER BY id;
    SELECT TOP (1) @a2 = id, @m2 = monto FROM dbo.abonos WHERE anulado = 0 AND id <> @a1 AND monto <> @m1 ORDER BY id;
    IF @a2 IS NULL
        THROW 50002, N'No hay dos abonos no anulados con montos distintos para intercambiar.', 1;
    UPDATE dbo.abonos SET monto = CASE id WHEN @a1 THEN @m2 WHEN @a2 THEN @m1 END
    WHERE id IN (@a1, @a2);

    -- Pasada 2: despues del UPDATE
    DELETE FROM @tmp; INSERT INTO @tmp EXEC sys.sp_executesql @sql;
    INSERT INTO @snap SELECT 2, clave, valor FROM @tmp;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH

ROLLBACK TRANSACTION;

-- Pasada 3: despues del ROLLBACK
DELETE FROM @tmp; INSERT INTO @tmp EXEC sys.sp_executesql @sql;
INSERT INTO @snap SELECT 3, clave, valor FROM @tmp;

-- ---- Resultado ----
SELECT @sembrado AS sembrado_y_revertido, @@TRANCOUNT AS transacciones_abiertas;

-- Comparacion 1 -> 2 (el UPDATE que conserva el total)
SELECT COALESCE(a.clave, b.clave) AS clave, a.valor AS antes, b.valor AS despues,
       CASE WHEN COALESCE(a.valor, N'') <> COALESCE(b.valor, N'') THEN N'CAMBIO' ELSE N'igual' END AS update_1_a_2,
       CASE WHEN COALESCE(a.clave, b.clave) LIKE N'total:%' AND a.valor = b.valor THEN N'PASS (total igual)'
            WHEN COALESCE(a.clave, b.clave) LIKE N'total:%' THEN N'FAIL (total cambio)'
            WHEN COALESCE(a.clave, b.clave) = N'suma:dbo.abonos' AND a.valor <> b.valor THEN N'PASS (suma cambio)'
            WHEN COALESCE(a.clave, b.clave) = N'suma:dbo.abonos' THEN N'FAIL (suma no cambio)'
            WHEN a.valor = b.valor THEN N'PASS (sin cambio)'
            ELSE N'FAIL' END AS veredicto
FROM (SELECT clave, valor FROM @snap WHERE pasada = 1) AS a
FULL JOIN (SELECT clave, valor FROM @snap WHERE pasada = 2) AS b ON a.clave = b.clave
ORDER BY COALESCE(a.clave, b.clave) COLLATE Latin1_General_BIN2;

-- Comparacion 0 -> 3 (el ROLLBACK restaura todo)
SELECT CASE WHEN COUNT(*) = 0 THEN N'PASS: tras el ROLLBACK la conciliacion es identica a la inicial'
            ELSE N'FAIL: la conciliacion tras el ROLLBACK difiere de la inicial' END AS rollback_restaura,
       COUNT(*) AS claves_distintas,
       (SELECT COUNT(*) FROM @snap WHERE pasada = 0) AS claves_comparadas
FROM (SELECT clave, valor FROM @snap WHERE pasada = 0) AS a
FULL JOIN (SELECT clave, valor FROM @snap WHERE pasada = 3) AS b ON a.clave = b.clave
WHERE COALESCE(a.valor, N'') <> COALESCE(b.valor, N'') OR a.clave IS NULL OR b.clave IS NULL;
