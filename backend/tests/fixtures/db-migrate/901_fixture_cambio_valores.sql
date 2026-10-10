-- Fixture de prueba del ejecutor (db-migrate). No es una migración real.
-- Intercambia las descripciones de los roles 1 y 2: modifica valores sin cambiar el número
-- de filas. La suma de verificación por tabla debe detectarlo.
UPDATE r
SET description = o.description
FROM dbo.roles AS r
JOIN (VALUES (1, 2), (2, 1)) AS m (a, b) ON r.id = m.a
JOIN dbo.roles AS o ON o.id = m.b
WHERE r.id IN (1, 2);
GO
