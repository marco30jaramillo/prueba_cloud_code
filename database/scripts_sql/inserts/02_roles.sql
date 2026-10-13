-- ============================================================
-- Mi Valecito - inserts/02_roles.sql
-- Catálogo de roles, con sus permisos, roles que gestionan y módulos.
-- Origen: backend/roles.csv (5 filas) + encargado y permisos por módulo (alters/005).
-- Los permisos directos son solo los de sesión (auth:*); el resto lo dan los módulos.
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
    (1, N'superuser', N'Super Usuario - Acceso integral a todas las funciones', N'system:full-access', N'superuser|administrador|tendero|encargado|vendedor|cliente', N'1:full|2:full|3:full|4:full|5:full|6:full|7:full|8:full'),
    (2, N'administrador', N'Administrador de app - Gestiona tiendas y usuarios', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password', N'tendero|encargado|vendedor|cliente', N'1:full|2:full|3:read|4:read|6:write|7:write|8:full'),
    (3, N'vendedor', N'Vendedor - Registra vales en la tienda y consulta su cartera', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password', N'', N'1:write|6:write|7:read'),
    (4, N'cliente', N'Cliente - Consulta sus propios vales', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|auth:register', N'', N'1:write|5:read'),
    (5, N'tendero', N'Tendero - Dueño de su tienda: vales, cobros, cartera y equipo', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password', N'cliente', N'1:full|6:full|7:full|8:write'),
    (6, N'encargado', N'Encargado - Atiende la tienda por el dueño: vende y cobra, sin anular ni gestionar el equipo', N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password', N'cliente', N'1:write|6:write|7:write|8:read')
) AS v (id, name, description, permissions, canManage, modules)
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles AS t WHERE t.id = v.id);

PRINT CONCAT(N'dbo.roles: ', @@ROWCOUNT, N' filas insertadas');
GO
