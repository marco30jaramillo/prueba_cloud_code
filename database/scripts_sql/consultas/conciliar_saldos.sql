-- ============================================================
-- Mi Valecito - consultas/conciliar_saldos.sql
-- Conciliación de saldos. Solo lectura: no modifica nada.
--
-- Resultado 1 - Vales descuadrados. Debe devolver 0 filas. Un vale aparece si:
--   * su saldoPendiente no es montoTotal menos la suma de sus abonos no anulados (RN-04), o
--   * su estado no corresponde a su saldo (RN-05): pendiente = saldo igual al monto,
--     parcial = saldo entre cero y el monto, pagado = saldo cero.
--   Un vale anulado conserva su estado; solo se le revisa el saldo.
--
-- Resultado 2 - Cartera por tienda: saldo registrado de los vales pendientes y parciales
--   contra el saldo recalculado desde los abonos. La columna diferencia debe ser 0.
--
-- Los literales de estado van en minúsculas, igual que en CK_vales_estado, para que la
-- consulta no dependa de la intercalación de la base.
-- ============================================================

SET NOCOUNT ON;
GO

-- Resultado 1: vales descuadrados (se esperan 0 filas)
WITH abonado AS (
    SELECT a.valeId, SUM(a.monto) AS totalAbonado, COUNT(*) AS abonosActivos
    FROM dbo.abonos AS a
    WHERE a.anulado = 0
    GROUP BY a.valeId
),
revision AS (
    SELECT
        v.id AS valeId,
        v.tiendaId,
        v.clienteId,
        v.estado,
        v.montoTotal,
        COALESCE(ab.totalAbonado, 0) AS totalAbonado,
        COALESCE(ab.abonosActivos, 0) AS abonosActivos,
        v.saldoPendiente AS saldoRegistrado,
        v.montoTotal - COALESCE(ab.totalAbonado, 0) AS saldoCalculado,
        CASE
            WHEN v.estado = N'anulado' THEN v.estado
            WHEN v.saldoPendiente = 0 THEN N'pagado'
            WHEN v.saldoPendiente < v.montoTotal THEN N'parcial'
            ELSE N'pendiente'
        END AS estadoEsperado
    FROM dbo.vales AS v
    LEFT JOIN abonado AS ab ON ab.valeId = v.id
)
SELECT
    r.valeId,
    r.tiendaId,
    r.clienteId,
    r.estado,
    r.estadoEsperado,
    r.montoTotal,
    r.totalAbonado,
    r.abonosActivos,
    r.saldoRegistrado,
    r.saldoCalculado,
    r.saldoRegistrado - r.saldoCalculado AS diferencia,
    CASE
        WHEN r.saldoRegistrado <> r.saldoCalculado AND r.estado <> r.estadoEsperado THEN N'saldo y estado'
        WHEN r.saldoRegistrado <> r.saldoCalculado THEN N'saldo'
        ELSE N'estado'
    END AS descuadre
FROM revision AS r
WHERE r.saldoRegistrado <> r.saldoCalculado
   OR r.estado <> r.estadoEsperado
ORDER BY r.tiendaId, r.valeId;
GO

-- Resultado 2: cartera por tienda (la columna diferencia debe ser 0)
WITH abonado AS (
    SELECT a.valeId, SUM(a.monto) AS totalAbonado
    FROM dbo.abonos AS a
    WHERE a.anulado = 0
    GROUP BY a.valeId
)
SELECT
    t.id AS tiendaId,
    t.nombre AS tienda,
    COUNT(v.id) AS valesEnCartera,
    COALESCE(SUM(v.montoTotal), 0) AS montoTotal,
    COALESCE(SUM(COALESCE(ab.totalAbonado, 0)), 0) AS totalAbonado,
    COALESCE(SUM(v.saldoPendiente), 0) AS carteraRegistrada,
    COALESCE(SUM(v.montoTotal - COALESCE(ab.totalAbonado, 0)), 0) AS carteraCalculada,
    COALESCE(SUM(v.saldoPendiente), 0)
        - COALESCE(SUM(v.montoTotal - COALESCE(ab.totalAbonado, 0)), 0) AS diferencia
FROM dbo.tiendas AS t
LEFT JOIN dbo.vales AS v
       ON v.tiendaId = t.id
      AND v.estado IN (N'pendiente', N'parcial')
LEFT JOIN abonado AS ab ON ab.valeId = v.id
GROUP BY t.id, t.nombre
ORDER BY t.nombre, t.id;
GO
