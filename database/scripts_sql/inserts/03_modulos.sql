-- ============================================================
-- Mi Valecito - inserts/03_modulos.sql
-- Catálogo de módulos del dashboard.
-- Origen: backend/modules.csv (8 filas).
-- Idempotente: solo inserta las filas cuyo id no existe; no modifica las existentes,
-- para no pisar cambios hechos desde la aplicación.
-- El icono es el NOMBRE de un icono del set de marca (marca/iconos/<nombre>.svg), no un emoji.
-- Las bases antiguas que aún guardan emojis se actualizan con alters/003_iconos_de_modulos_por_nombre.sql.
-- Qué da cada nivel (lectura = consultar, escritura = operar, total = anular o administrar):
-- ver alters/005_permisos_por_modulo_y_rol_encargado.sql, que lleva las bases existentes a lo mismo.
-- Prerrequisito: esquemas/01_esquema_inicial.sql.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

INSERT INTO dbo.modules (id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull)
SELECT v.id, v.name, v.description, v.buttonLabel, v.href, v.icon, v.showInNav, v.permRead, v.permWrite, v.permFull
FROM (VALUES
    (1, N'Mi Perfil', N'Ver y editar información de tu perfil', N'Ver Perfil', N'/dashboard/profile', N'cliente', 1, N'profile:view-own', N'profile:view-own|profile:edit-own', N'profile:view-own|profile:edit-own'),
    (2, N'Gestionar Usuarios', N'Ver y administrar todos los usuarios del sistema', N'Ver Usuarios', N'/dashboard/users', N'equipo', 1, N'auth:view-users', N'auth:view-users|auth:update-user', N'auth:view-users|auth:update-user|admin:manage-users'),
    (3, N'Auditoría', N'Registro de eventos y acciones del sistema', N'Ver Auditoría', N'/dashboard/audit', N'nota', 1, N'admin:view-audit', N'admin:view-audit', N'admin:view-audit|admin:view-stats'),
    (4, N'Roles y Permisos', N'Gestionar roles, permisos y accesos del sistema', N'Gestionar', N'/dashboard/roles', N'escudo', 1, N'admin:view-roles', N'admin:view-roles|admin:manage-roles', N'admin:view-roles|admin:manage-roles'),
    (5, N'Mis Vales', N'Consulta tus vales y deudas pendientes', N'Ver mis vales', N'/dashboard/mis-vales', N'vale', 1, N'vale:ver-propio|abono:ver', N'vale:ver-propio|abono:ver', N'vale:ver-propio|abono:ver'),
    (6, N'Nueva Venta', N'Registrar una compra al fiado para un cliente', N'Registrar vale', N'/dashboard/vale-nuevo', N'agregar', 1, N'tienda:ver|vale:ver-tienda', N'tienda:ver|vale:ver-tienda|vale:crear', N'tienda:ver|vale:ver-tienda|vale:crear|vale:anular'),
    (7, N'Cartera', N'Cartera activa: vales pendientes y cobros de la tienda', N'Ver cartera', N'/dashboard/cartera', N'cartera', 1, N'tienda:ver|vale:ver-tienda|abono:ver', N'tienda:ver|vale:ver-tienda|abono:ver|abono:crear', N'tienda:ver|vale:ver-tienda|abono:ver|abono:crear|abono:anular'),
    (8, N'Mi Tienda', N'Gestionar la información y el equipo de la tienda', N'Mi tienda', N'/dashboard/tienda', N'tienda', 1, N'tienda:ver', N'tienda:ver|equipo:gestionar', N'tienda:ver|equipo:gestionar|tienda:administrar')
) AS v (id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull)
WHERE NOT EXISTS (SELECT 1 FROM dbo.modules AS t WHERE t.id = v.id);

PRINT CONCAT(N'dbo.modules: ', @@ROWCOUNT, N' filas insertadas');
GO
