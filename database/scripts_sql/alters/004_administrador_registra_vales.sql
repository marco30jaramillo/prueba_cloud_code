-- ============================================================
-- Mi Valecito - alters/004_administrador_registra_vales.sql
-- El administrador puede registrar vales y abonos en cualquier tienda (soporte).
-- El superusuario ya lo puede (system:full-access). El acceso a todas las tiendas lo da el código
-- (backend/src/routes/vales.js, tiendaAcceso); aquí solo se le conceden permisos y módulos.
-- Idempotente: cada paso agrega su valor solo si el rol aún no lo tiene. No quita nada.
-- ============================================================

UPDATE dbo.roles SET permissions = permissions + N'|vale:crear'
WHERE name = N'administrador' AND (N'|' + permissions + N'|') NOT LIKE N'%|vale:crear|%';

UPDATE dbo.roles SET permissions = permissions + N'|vale:ver-tienda'
WHERE name = N'administrador' AND (N'|' + permissions + N'|') NOT LIKE N'%|vale:ver-tienda|%';

UPDATE dbo.roles SET permissions = permissions + N'|abono:crear'
WHERE name = N'administrador' AND (N'|' + permissions + N'|') NOT LIKE N'%|abono:crear|%';

UPDATE dbo.roles SET permissions = permissions + N'|abono:ver'
WHERE name = N'administrador' AND (N'|' + permissions + N'|') NOT LIKE N'%|abono:ver|%';

-- Módulo 6 (6:write) solo si el rol aún no tiene acceso a ese módulo.
UPDATE dbo.roles SET modules = modules + N'|6:write'
WHERE name = N'administrador' AND (N'|' + modules) NOT LIKE N'%|6:%';

-- Módulo 7 (7:read) solo si el rol aún no tiene acceso a ese módulo.
UPDATE dbo.roles SET modules = modules + N'|7:read'
WHERE name = N'administrador' AND (N'|' + modules) NOT LIKE N'%|7:%';

GO
