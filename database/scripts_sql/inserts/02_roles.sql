-- ============================================================
-- Mi Valecito - inserts/02_roles.sql
-- Catálogo de roles, con sus permisos, roles que gestionan y módulos.
-- Origen: backend/roles.csv (5 filas).
-- Idempotente: solo inserta las filas cuyo id no existe; no modifica las existentes,
-- para no pisar cambios hechos desde la aplicación.
-- Prerrequisito: esquemas/01_esquema_inicial.sql.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

INSERT INTO dbo.roles (id, name, description, permissions, canManage, modules)
SELECT v.id, v.name, v.description, v.permissions, v.canManage, v.modules
FROM (VALUES
    (1, N'superuser', N'Super Usuario - Acceso integral a todas las funciones', N'system:full-access', N'superuser|administrador|tendero|vendedor|cliente', N'1:full|2:full|3:full|4:full|5:full|6:full|7:full|8:full'),
    (2, N'administrador', N'Administrador de app - Gestiona tiendas y usuarios', N'admin:manage-users|admin:manage-roles|admin:view-roles|admin:view-stats|admin:view-audit|profile:view-all|profile:view-clients|profile:view-vendors|auth:view-users|auth:create-user|auth:update-user|auth:delete-user|tienda:administrar|tienda:ver|cartera:ver|vale:crear|vale:ver-tienda|abono:crear|abono:ver', N'tendero|vendedor|cliente', N'1:full|2:write|3:read|4:read|6:write|7:read|8:full'),
    (3, N'vendedor', N'Vendedor - Registra vales y abonos en la tienda', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|profile:view-own|profile:edit-own|vale:crear|abono:crear|abono:ver|vale:ver-tienda|tienda:ver', N'', N'1:write|6:write'),
    (4, N'cliente', N'Cliente - Consulta sus propios vales', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|auth:register|profile:view-own|profile:edit-own|vale:ver-propio|abono:ver', N'', N'1:read|5:read'),
    (5, N'tendero', N'Tendero - Opera su tienda: vales, cobros y cartera', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|auth:create-user|profile:view-own|profile:edit-own|profile:view-clients|vale:crear|vale:ver-tienda|vale:anular|abono:crear|abono:ver|abono:anular|tienda:ver|cartera:ver|cartera:reportes', N'cliente', N'1:full|6:full|7:full|8:full')
) AS v (id, name, description, permissions, canManage, modules)
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles AS t WHERE t.id = v.id);

PRINT CONCAT(N'dbo.roles: ', @@ROWCOUNT, N' filas insertadas');
GO
