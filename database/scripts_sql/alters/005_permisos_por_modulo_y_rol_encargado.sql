-- ============================================================
-- Mi Valecito - alters/005_permisos_por_modulo_y_rol_encargado.sql
-- Permisos por módulo como única fuente, y nuevo rol «encargado» (KAN-75).
--
-- Regla: lo que un rol puede hacer sale de sus módulos y del nivel de cada uno
-- (lectura = consultar, escritura = operar, total = anular o administrar). Los permisos
-- directos del rol quedan solo para la sesión (auth:*); el backend rechaza agregar otros.
--
-- Corrige:
--  - El tendero tenía tienda:administrar por «Mi tienda» en total: veía, editaba y se
--    asignaba a tiendas ajenas. Ahora tiene «Mi tienda» en escritura (equipo de SU tienda).
--  - Los permisos directos duplicaban los de los módulos: quitar un módulo no quitaba el
--    permiso (el vendedor cobraba con Cartera en lectura).
--  - «Nueva venta» en escritura daba abono:crear; cobrar es de Cartera en escritura.
--  - El administrador editaba roles (podía darse acceso total): ahora solo los consulta.
--    Recupera el cobro en Cartera (escritura).
--
-- Nuevo rol encargado: atiende la tienda en nombre del dueño. Vende y cobra; no anula
-- vales ni abonos y no gestiona el equipo. Más que el vendedor, menos que el dueño.
--
-- Pisa la configuración de los roles del sistema (superuser, administrador, tendero,
-- encargado, vendedor, cliente) y de los 8 módulos. No toca roles creados desde la app.
-- Idempotente: se puede repetir sin cambiar el resultado.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ── Catálogo de permisos ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.permissions WHERE name = N'equipo:gestionar')
    INSERT INTO dbo.permissions (id, name, description, category)
    SELECT COALESCE(MAX(id), 0) + 1, N'equipo:gestionar',
           N'Agregar, crear y quitar vendedores y encargados de su propia tienda', N'tienda'
    FROM dbo.permissions;

UPDATE dbo.permissions SET description = N'Anular un vale de la tienda'
WHERE name = N'vale:anular';

UPDATE dbo.permissions SET description = N'Crear, editar y desactivar cualquier tienda y asignar su equipo'
WHERE name = N'tienda:administrar';
GO

-- ── Módulos: qué da cada nivel ───────────────────────────────
UPDATE dbo.modules SET
    permRead  = N'profile:view-own',
    permWrite = N'profile:view-own|profile:edit-own',
    permFull  = N'profile:view-own|profile:edit-own'
WHERE id = 1;   -- Mi perfil

UPDATE dbo.modules SET
    permRead  = N'auth:view-users',
    permWrite = N'auth:view-users|auth:update-user',
    permFull  = N'auth:view-users|auth:update-user|admin:manage-users'
WHERE id = 2;   -- Gestionar usuarios

UPDATE dbo.modules SET
    permRead  = N'admin:view-audit',
    permWrite = N'admin:view-audit',
    permFull  = N'admin:view-audit|admin:view-stats'
WHERE id = 3;   -- Auditoría

UPDATE dbo.modules SET
    permRead  = N'admin:view-roles',
    permWrite = N'admin:view-roles|admin:manage-roles',
    permFull  = N'admin:view-roles|admin:manage-roles'
WHERE id = 4;   -- Roles y permisos

UPDATE dbo.modules SET
    permRead  = N'vale:ver-propio|abono:ver',
    permWrite = N'vale:ver-propio|abono:ver',
    permFull  = N'vale:ver-propio|abono:ver'
WHERE id = 5;   -- Mis vales

UPDATE dbo.modules SET
    permRead  = N'tienda:ver|vale:ver-tienda',
    permWrite = N'tienda:ver|vale:ver-tienda|vale:crear',
    permFull  = N'tienda:ver|vale:ver-tienda|vale:crear|vale:anular'
WHERE id = 6;   -- Nueva venta

UPDATE dbo.modules SET
    permRead  = N'tienda:ver|vale:ver-tienda|abono:ver',
    permWrite = N'tienda:ver|vale:ver-tienda|abono:ver|abono:crear',
    permFull  = N'tienda:ver|vale:ver-tienda|abono:ver|abono:crear|abono:anular'
WHERE id = 7;   -- Cartera

UPDATE dbo.modules SET
    permRead  = N'tienda:ver',
    permWrite = N'tienda:ver|equipo:gestionar',
    permFull  = N'tienda:ver|equipo:gestionar|tienda:administrar'
WHERE id = 8;   -- Mi tienda
GO

-- ── Roles del sistema ────────────────────────────────────────
UPDATE dbo.roles SET
    permissions = N'system:full-access',
    canManage   = N'superuser|administrador|tendero|encargado|vendedor|cliente',
    modules     = N'1:full|2:full|3:full|4:full|5:full|6:full|7:full|8:full'
WHERE name = N'superuser';

UPDATE dbo.roles SET
    permissions = N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password',
    canManage   = N'tendero|encargado|vendedor|cliente',
    modules     = N'1:full|2:full|3:read|4:read|6:write|7:write|8:full'
WHERE name = N'administrador';

UPDATE dbo.roles SET
    description = N'Tendero - Dueño de su tienda: vales, cobros, cartera y equipo',
    permissions = N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password',
    canManage   = N'cliente',
    modules     = N'1:full|6:full|7:full|8:write'
WHERE name = N'tendero';

UPDATE dbo.roles SET
    description = N'Vendedor - Registra vales en la tienda y consulta su cartera',
    permissions = N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password',
    canManage   = N'',
    modules     = N'1:write|6:write|7:read'
WHERE name = N'vendedor';

UPDATE dbo.roles SET
    permissions = N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|auth:register',
    canManage   = N'',
    modules     = N'1:write|5:read'
WHERE name = N'cliente';

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = N'encargado')
    INSERT INTO dbo.roles (id, name, description, permissions, canManage, modules)
    SELECT COALESCE(MAX(id), 0) + 1, N'encargado',
           N'Encargado - Atiende la tienda por el dueño: vende y cobra, sin anular ni gestionar el equipo',
           N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password',
           N'cliente',
           N'1:write|6:write|7:write|8:read'
    FROM dbo.roles;

UPDATE dbo.roles SET
    description = N'Encargado - Atiende la tienda por el dueño: vende y cobra, sin anular ni gestionar el equipo',
    permissions = N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password',
    canManage   = N'cliente',
    modules     = N'1:write|6:write|7:write|8:read'
WHERE name = N'encargado';
GO
