-- ============================================================
-- Mi Valecito - consultas/conciliar_activacion.sql
-- Conciliacion de la activacion de cuentas (requerimiento 003). Solo lectura.
--
-- Un resultado, una fila:
--   totalUsuarios         usuarios en dbo.users.
--   activados             con activatedAt no nulo.
--   pendientes            con activatedAt nulo (cuenta pendiente de activacion).
--   pendientesVencidos    pendientes con activationExpiresAt anterior a la hora actual (UTC).
--   pendientesConMovimientos  pendientes que figuran como clienteId, registradoPor o
--                         anuladoPor en vales; registradoPor o anuladoPor en abonos;
--                         tiendas.createdBy; o tienda_usuarios.assignedBy (decision D-1).
--                         Pertenecer a una tienda (tienda_usuarios.userId) NO cuenta.
--   columnasActivacion    1 si la base ya tiene las columnas del alter 002; 0 si no.
--
-- Despues del alter 002: pendientes = 0 y activados = totalUsuarios (CA-21).
-- Antes del alter las columnas no existen: la consulta lo detecta y devuelve
-- activados = totalUsuarios, pendientes = 0 y columnasActivacion = 0, sin fallar.
-- ============================================================

SET NOCOUNT ON;
GO

DECLARE @tieneColumnas BIT =
    CASE WHEN COL_LENGTH(N'dbo.users', N'activatedAt') IS NOT NULL
          AND COL_LENGTH(N'dbo.users', N'activationExpiresAt') IS NOT NULL
         THEN 1 ELSE 0 END;

IF @tieneColumnas = 0
BEGIN
    SELECT
        COUNT(*)              AS totalUsuarios,
        COUNT(*)              AS activados,
        CAST(0 AS INT)        AS pendientes,
        CAST(0 AS INT)        AS pendientesVencidos,
        CAST(0 AS INT)        AS pendientesConMovimientos,
        CAST(0 AS BIT)        AS columnasActivacion
    FROM dbo.users;
END
ELSE
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'
    WITH pendientes AS (
        SELECT u.id, u.activationExpiresAt
        FROM dbo.users AS u
        WHERE u.activatedAt IS NULL
    )
    SELECT
        (SELECT COUNT(*) FROM dbo.users)                                         AS totalUsuarios,
        (SELECT COUNT(*) FROM dbo.users WHERE activatedAt IS NOT NULL)           AS activados,
        (SELECT COUNT(*) FROM pendientes)                                        AS pendientes,
        (SELECT COUNT(*) FROM pendientes
          WHERE activationExpiresAt IS NOT NULL
            AND activationExpiresAt < SYSUTCDATETIME())                          AS pendientesVencidos,
        (SELECT COUNT(*) FROM pendientes AS p
          WHERE EXISTS (SELECT 1 FROM dbo.vales AS v
                         WHERE v.clienteId = p.id OR v.registradoPor = p.id OR v.anuladoPor = p.id)
             OR EXISTS (SELECT 1 FROM dbo.abonos AS a
                         WHERE a.registradoPor = p.id OR a.anuladoPor = p.id)
             OR EXISTS (SELECT 1 FROM dbo.tiendas AS t WHERE t.createdBy = p.id)
             OR EXISTS (SELECT 1 FROM dbo.tienda_usuarios AS tu WHERE tu.assignedBy = p.id)
        )                                                                        AS pendientesConMovimientos,
        CAST(1 AS BIT)                                                           AS columnasActivacion;';
    EXEC sys.sp_executesql @sql;
END;
GO
