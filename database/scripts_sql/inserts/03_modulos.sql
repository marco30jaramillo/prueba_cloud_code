-- ============================================================
-- Mi Valecito - inserts/03_modulos.sql
-- Catálogo de módulos del dashboard.
-- Origen: backend/modules.csv (8 filas).
-- Idempotente: solo inserta las filas cuyo id no existe; no modifica las existentes,
-- para no pisar cambios hechos desde la aplicación.
-- Los iconos se escriben como bytes UTF-16LE y no como literal, para que el resultado no
-- dependa de la codificación con que la herramienta lea este archivo ni de la
-- intercalación de la base:
--   1  👤  0x3DD864DC
--   2  👥  0x3DD865DC
--   3  📋  0x3DD8CBDC
--   4  🛡️  0x3DD8E1DE0FFE
--   5  🧾  0x3ED8FEDD
--   6  ➕  0x9527
--   7  💼  0x3DD8BCDC
--   8  🏪  0x3CD8EADF
-- Prerrequisito: esquemas/01_esquema_inicial.sql.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

INSERT INTO dbo.modules (id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull)
SELECT v.id, v.name, v.description, v.buttonLabel, v.href, v.icon, v.showInNav, v.permRead, v.permWrite, v.permFull
FROM (VALUES
    (1, N'Mi Perfil', N'Ver y editar información de tu perfil', N'Ver Perfil', N'/dashboard/profile', CONVERT(NVARCHAR(50), 0x3DD864DC), 1, N'profile:view-own', N'profile:view-own|profile:edit-own', N'profile:view-own|profile:edit-own'),
    (2, N'Gestionar Usuarios', N'Ver y administrar todos los usuarios del sistema', N'Ver Usuarios', N'/dashboard/users', CONVERT(NVARCHAR(50), 0x3DD865DC), 1, N'auth:view-users', N'auth:view-users|auth:create-user|auth:update-user|admin:manage-users', N'auth:view-users|auth:create-user|auth:update-user|auth:delete-user|admin:manage-users|admin:manage-roles'),
    (3, N'Auditoría', N'Registro de eventos y acciones del sistema', N'Ver Auditoría', N'/dashboard/audit', CONVERT(NVARCHAR(50), 0x3DD8CBDC), 1, N'admin:view-audit|admin:view-stats', N'admin:view-audit|admin:view-stats', N'admin:view-audit|admin:view-stats'),
    (4, N'Roles y Permisos', N'Gestionar roles, permisos y accesos del sistema', N'Gestionar', N'/dashboard/roles', CONVERT(NVARCHAR(50), 0x3DD8E1DE0FFE), 1, N'admin:view-roles', N'admin:view-roles|admin:manage-roles', N'admin:view-roles|admin:manage-roles'),
    (5, N'Mis Vales', N'Consulta tus vales y deudas pendientes', N'Ver mis vales', N'/dashboard/mis-vales', CONVERT(NVARCHAR(50), 0x3ED8FEDD), 1, N'vale:ver-propio', N'vale:ver-propio', N'vale:ver-propio'),
    (6, N'Nueva Venta', N'Registrar una compra al fiado para un cliente', N'Registrar vale', N'/dashboard/vale-nuevo', CONVERT(NVARCHAR(50), 0x9527), 1, N'vale:crear', N'vale:crear|abono:crear', N'vale:crear|abono:crear|vale:anular'),
    (7, N'Cartera', N'Cartera activa: vales pendientes y cobros de la tienda', N'Ver cartera', N'/dashboard/cartera', CONVERT(NVARCHAR(50), 0x3DD8BCDC), 1, N'vale:ver-tienda|abono:ver', N'vale:ver-tienda|abono:ver|abono:crear', N'vale:ver-tienda|abono:ver|abono:crear|vale:anular|abono:anular|cartera:reportes'),
    (8, N'Mi Tienda', N'Gestionar la información y el equipo de la tienda', N'Mi tienda', N'/dashboard/tienda', CONVERT(NVARCHAR(50), 0x3CD8EADF), 1, N'tienda:ver', N'tienda:ver', N'tienda:ver|tienda:administrar')
) AS v (id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull)
WHERE NOT EXISTS (SELECT 1 FROM dbo.modules AS t WHERE t.id = v.id);

PRINT CONCAT(N'dbo.modules: ', @@ROWCOUNT, N' filas insertadas');
GO

-- Efecto de alters/001_fix_module_icons.sql, incorporado: si los módulos 5 a 8 ya existían
-- con el icono dañado (cargado sin prefijo N), se corrige. La comparación es binaria para
-- no depender de la intercalación de la base.
UPDATE dbo.modules SET icon = CONVERT(NVARCHAR(50), 0x3ED8FEDD) WHERE id = 5 AND CONVERT(VARBINARY(100), icon) <> 0x3ED8FEDD;  -- 🧾
UPDATE dbo.modules SET icon = CONVERT(NVARCHAR(50), 0x9527) WHERE id = 6 AND CONVERT(VARBINARY(100), icon) <> 0x9527;  -- ➕
UPDATE dbo.modules SET icon = CONVERT(NVARCHAR(50), 0x3DD8BCDC) WHERE id = 7 AND CONVERT(VARBINARY(100), icon) <> 0x3DD8BCDC;  -- 💼
UPDATE dbo.modules SET icon = CONVERT(NVARCHAR(50), 0x3CD8EADF) WHERE id = 8 AND CONVERT(VARBINARY(100), icon) <> 0x3CD8EADF;  -- 🏪

PRINT N'dbo.modules: iconos de los módulos 5 a 8 verificados';
GO
