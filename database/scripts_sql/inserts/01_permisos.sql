-- ============================================================
-- Mi Valecito - inserts/01_permisos.sql
-- Catálogo de permisos.
-- Origen: backend/permissions.csv (33 filas).
-- Idempotente: solo inserta las filas cuyo id no existe; no modifica las existentes,
-- para no pisar cambios hechos desde la aplicación.
-- Prerrequisito: esquemas/01_esquema_inicial.sql.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

INSERT INTO dbo.permissions (id, name, description, category)
SELECT v.id, v.name, v.description, v.category
FROM (VALUES
    (1, N'auth:register', N'register', N'auth'),
    (2, N'auth:login', N'login', N'auth'),
    (3, N'auth:logout', N'logout', N'auth'),
    (4, N'auth:validate', N'validate', N'auth'),
    (5, N'auth:forgot-password', N'forgot password', N'auth'),
    (6, N'auth:reset-password', N'reset password', N'auth'),
    (7, N'auth:bootstrap-superuser', N'bootstrap superuser', N'auth'),
    (8, N'auth:create-user', N'create user', N'auth'),
    (9, N'auth:update-user', N'update user', N'auth'),
    (10, N'auth:delete-user', N'delete user', N'auth'),
    (11, N'auth:view-users', N'view users', N'auth'),
    (12, N'profile:view-own', N'view own profile', N'profile'),
    (13, N'profile:edit-own', N'edit own profile', N'profile'),
    (14, N'profile:view-all', N'view all profiles', N'profile'),
    (15, N'profile:view-clients', N'view client profiles', N'profile'),
    (16, N'profile:view-vendors', N'view vendor profiles', N'profile'),
    (17, N'admin:manage-users', N'manage users', N'admin'),
    (18, N'admin:manage-roles', N'manage roles', N'admin'),
    (19, N'admin:view-stats', N'view stats', N'admin'),
    (20, N'admin:view-audit', N'view audit', N'admin'),
    (21, N'system:full-access', N'full system access', N'system'),
    (22, N'admin:view-roles', N'view roles and permissions config', N'admin'),
    (23, N'vale:crear', N'Registrar un nuevo vale para un cliente', N'vale'),
    (24, N'vale:ver-tienda', N'Ver todos los vales activos de la tienda', N'vale'),
    (25, N'vale:ver-propio', N'Cliente: consultar sus propios vales', N'vale'),
    (26, N'vale:anular', N'Anular un vale (solo tendero propietario)', N'vale'),
    (27, N'abono:crear', N'Registrar un abono a un vale', N'abono'),
    (28, N'abono:ver', N'Ver historial de abonos de un vale', N'abono'),
    (29, N'abono:anular', N'Anular un abono mal registrado', N'abono'),
    (30, N'tienda:ver', N'Consultar informacion de la tienda', N'tienda'),
    (31, N'tienda:administrar', N'Crear y gestionar tiendas', N'tienda'),
    (32, N'cartera:ver', N'Ver resumen de cartera pendiente', N'cartera'),
    (33, N'cartera:reportes', N'Generar reportes de deuda y mora', N'cartera')
) AS v (id, name, description, category)
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions AS t WHERE t.id = v.id);

PRINT CONCAT(N'dbo.permissions: ', @@ROWCOUNT, N' filas insertadas');
GO
