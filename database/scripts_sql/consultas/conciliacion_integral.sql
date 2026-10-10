-- ============================================================
-- Mi Valecito - consultas/conciliacion_integral.sql
-- Conciliación integral antes/después de una promoción de base de datos. SOLO LECTURA.
--
-- Devuelve UN conjunto de resultados de pares (clave NVARCHAR(128), valor NVARCHAR(64)),
-- ordenado por clave (orden binario, determinista):
--   filas:<esquema.tabla>  conteo de filas de cada tabla de usuario
--   suma:<esquema.tabla>   SUM(CONVERT(BIGINT, BINARY_CHECKSUM(*))) de la tabla, como texto (CHECKSUM_AGG no sirve: es un XOR y no detecta el intercambio de un valor entre dos filas)
--   total:vales_monto, total:vales_saldo, total:abonos_monto_no_anulados, total:cartera
-- Se excluye dbo.migraciones_aplicadas (cambia con cada migración).
--
-- Definiciones de saldo iguales a consultas/conciliar_saldos.sql: abonos no anulados
-- (anulado = 0) y cartera = saldoPendiente de los vales en estado pendiente o parcial.
--
-- Nota: BINARY_CHECKSUM(*) es una suma de verificación de 32 bits; detecta cambios de
-- valores, no es una garantía criptográfica. Una tabla vacía da suma 0.
-- Usa SQL dinámico solo para leer; vive en consultas/, que el ejecutor no revisa.
-- Se ejecuta con ejecutar_script (no con `consultar`, que admite un único SELECT).
-- ============================================================

SET NOCOUNT ON;

DECLARE @r TABLE (clave NVARCHAR(128) NOT NULL, valor NVARCHAR(64) NULL);
DECLARE @tabla NVARCHAR(300), @sql NVARCHAR(MAX);

DECLARE c CURSOR LOCAL FAST_FORWARD FOR
    SELECT QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)
    FROM sys.tables AS t
    JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
      AND NOT (s.name = N'dbo' AND t.name = N'migraciones_aplicadas')
    ORDER BY s.name, t.name;
OPEN c;
FETCH NEXT FROM c INTO @tabla;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'SELECT N''filas:' + REPLACE(REPLACE(REPLACE(@tabla, N'[', N''), N']', N''), N'''', N'''''') + N''', '
             + N'CONVERT(NVARCHAR(64), COUNT_BIG(*)) FROM ' + @tabla + N' '
             + N'UNION ALL SELECT N''suma:' + REPLACE(REPLACE(REPLACE(@tabla, N'[', N''), N']', N''), N'''', N'''''') + N''', '
             + N'CONVERT(NVARCHAR(64), COALESCE(SUM(CONVERT(BIGINT, BINARY_CHECKSUM(*))), 0)) FROM ' + @tabla + N';';
    INSERT INTO @r (clave, valor)
    EXEC sys.sp_executesql @sql;
    FETCH NEXT FROM c INTO @tabla;
END
CLOSE c;
DEALLOCATE c;

-- Totales de saldo (mismas definiciones que conciliar_saldos.sql)
INSERT INTO @r (clave, valor)
SELECT N'total:vales_monto',
       CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(v.montoTotal), 0)))
FROM dbo.vales AS v;

INSERT INTO @r (clave, valor)
SELECT N'total:vales_saldo',
       CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(v.saldoPendiente), 0)))
FROM dbo.vales AS v;

INSERT INTO @r (clave, valor)
SELECT N'total:abonos_monto_no_anulados',
       CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(a.monto), 0)))
FROM dbo.abonos AS a
WHERE a.anulado = 0;

INSERT INTO @r (clave, valor)
SELECT N'total:cartera',
       CONVERT(NVARCHAR(64), CONVERT(DECIMAL(18, 2), COALESCE(SUM(v.saldoPendiente), 0)))
FROM dbo.vales AS v
WHERE v.estado IN (N'pendiente', N'parcial');

SELECT clave, COALESCE(valor, N'0') AS valor
FROM @r
ORDER BY clave COLLATE Latin1_General_BIN2;
