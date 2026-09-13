-- ============================================================
--  Importación de datos CSV → Azure SQL
--  Generado: 2026-09-13T14:41:14.065Z
--  Ejecutar contra: db_dev_mivalecito_001
--  Reejecutable: limpia y recarga (DELETE + MERGE)
-- ============================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

-- ── Limpieza previa (orden inverso a FK) ─────────────────────
PRINT 'Limpiando tablas...';
DELETE FROM dbo.audit_logs;
DELETE FROM dbo.tokens_revoked;
DELETE FROM dbo.tokens_granted;
DELETE FROM dbo.users;
DELETE FROM dbo.roles;
DELETE FROM dbo.modules;
DELETE FROM dbo.permissions;
PRINT 'Tablas limpias.';
GO

-- 1. Permissions (21 filas)
PRINT 'Insertando permissions...';

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 1 AS id, N'auth:register' AS name, N'register' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 2 AS id, N'auth:login' AS name, N'login' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 3 AS id, N'auth:logout' AS name, N'logout' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 4 AS id, N'auth:validate' AS name, N'validate' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 5 AS id, N'auth:forgot-password' AS name, N'forgot password' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 6 AS id, N'auth:reset-password' AS name, N'reset password' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 7 AS id, N'auth:bootstrap-superuser' AS name, N'bootstrap superuser' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 8 AS id, N'auth:create-user' AS name, N'create user' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 9 AS id, N'auth:update-user' AS name, N'update user' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 10 AS id, N'auth:delete-user' AS name, N'delete user' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 11 AS id, N'auth:view-users' AS name, N'view users' AS description, N'auth' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 12 AS id, N'profile:view-own' AS name, N'view own' AS description, N'profile' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 13 AS id, N'profile:edit-own' AS name, N'edit own' AS description, N'profile' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 14 AS id, N'profile:view-all' AS name, N'view all' AS description, N'profile' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 15 AS id, N'profile:view-clients' AS name, N'view clients' AS description, N'profile' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 16 AS id, N'profile:view-vendors' AS name, N'view vendors' AS description, N'profile' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 17 AS id, N'admin:manage-users' AS name, N'manage users' AS description, N'admin' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 18 AS id, N'admin:manage-roles' AS name, N'manage roles' AS description, N'admin' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 19 AS id, N'admin:view-stats' AS name, N'view stats' AS description, N'admin' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 20 AS id, N'admin:view-audit' AS name, N'view audit' AS description, N'admin' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);

MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT 21 AS id, N'system:full-access' AS name, N'full access' AS description, N'system' AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);
PRINT 'Permissions OK.';
GO

-- 2. Modules (4 filas)
PRINT 'Insertando modules...';

MERGE dbo.modules WITH (HOLDLOCK) AS T
USING (SELECT 1 AS id, N'Mi Perfil' AS name, N'Ver y editar información de tu perfil' AS description,
        N'Ver Perfil' AS buttonLabel, N'/dashboard/profile' AS href, N'👤' AS icon,
        1 AS showInNav,
        N'profile:view-own' AS permRead, N'profile:view-own|profile:edit-own' AS permWrite, N'profile:view-own|profile:edit-own' AS permFull) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, buttonLabel=S.buttonLabel,
  href=S.href, icon=S.icon, showInNav=S.showInNav, permRead=S.permRead, permWrite=S.permWrite, permFull=S.permFull
WHEN NOT MATCHED THEN INSERT (id,name,description,buttonLabel,href,icon,showInNav,permRead,permWrite,permFull)
  VALUES (S.id,S.name,S.description,S.buttonLabel,S.href,S.icon,S.showInNav,S.permRead,S.permWrite,S.permFull);

MERGE dbo.modules WITH (HOLDLOCK) AS T
USING (SELECT 2 AS id, N'Gestionar Usuarios' AS name, N'Ver y administrar todos los usuarios del sistema' AS description,
        N'Ver Usuarios' AS buttonLabel, N'/dashboard/users' AS href, N'👥' AS icon,
        1 AS showInNav,
        N'auth:view-users' AS permRead, N'auth:view-users|auth:create-user|auth:update-user|admin:manage-users' AS permWrite, N'auth:view-users|auth:create-user|auth:update-user|auth:delete-user|admin:manage-users|admin:manage-roles' AS permFull) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, buttonLabel=S.buttonLabel,
  href=S.href, icon=S.icon, showInNav=S.showInNav, permRead=S.permRead, permWrite=S.permWrite, permFull=S.permFull
WHEN NOT MATCHED THEN INSERT (id,name,description,buttonLabel,href,icon,showInNav,permRead,permWrite,permFull)
  VALUES (S.id,S.name,S.description,S.buttonLabel,S.href,S.icon,S.showInNav,S.permRead,S.permWrite,S.permFull);

MERGE dbo.modules WITH (HOLDLOCK) AS T
USING (SELECT 3 AS id, N'Auditoría' AS name, N'Registro de eventos y acciones del sistema' AS description,
        N'Ver Auditoría' AS buttonLabel, N'/dashboard/audit' AS href, N'📋' AS icon,
        1 AS showInNav,
        N'admin:view-audit|admin:view-stats' AS permRead, N'admin:view-audit|admin:view-stats' AS permWrite, N'admin:view-audit|admin:view-stats' AS permFull) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, buttonLabel=S.buttonLabel,
  href=S.href, icon=S.icon, showInNav=S.showInNav, permRead=S.permRead, permWrite=S.permWrite, permFull=S.permFull
WHEN NOT MATCHED THEN INSERT (id,name,description,buttonLabel,href,icon,showInNav,permRead,permWrite,permFull)
  VALUES (S.id,S.name,S.description,S.buttonLabel,S.href,S.icon,S.showInNav,S.permRead,S.permWrite,S.permFull);

MERGE dbo.modules WITH (HOLDLOCK) AS T
USING (SELECT 4 AS id, N'Roles y Permisos' AS name, N'Gestionar roles, permisos y accesos del sistema' AS description,
        N'Gestionar' AS buttonLabel, N'/dashboard/roles' AS href, N'🛡️' AS icon,
        1 AS showInNav,
        N'admin:view-roles' AS permRead, N'admin:view-roles|admin:manage-roles' AS permWrite, N'admin:view-roles|admin:manage-roles' AS permFull) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, buttonLabel=S.buttonLabel,
  href=S.href, icon=S.icon, showInNav=S.showInNav, permRead=S.permRead, permWrite=S.permWrite, permFull=S.permFull
WHEN NOT MATCHED THEN INSERT (id,name,description,buttonLabel,href,icon,showInNav,permRead,permWrite,permFull)
  VALUES (S.id,S.name,S.description,S.buttonLabel,S.href,S.icon,S.showInNav,S.permRead,S.permWrite,S.permFull);
PRINT 'Modules OK.';
GO

-- 3. Roles (5 filas)
PRINT 'Insertando roles...';

MERGE dbo.roles WITH (HOLDLOCK) AS T
USING (SELECT 1 AS id, N'superuser' AS name, N'Super Usuario - Acceso integral a todas las funciones' AS description,
        N'system:full-access' AS permissions, N'superuser|administrador|vendedor|cliente|tendero' AS canManage,
        N'1:full|2:full|3:full|4:full' AS modules) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description,
  permissions=S.permissions, canManage=S.canManage, modules=S.modules
WHEN NOT MATCHED THEN INSERT (id,name,description,permissions,canManage,modules)
  VALUES (S.id,S.name,S.description,S.permissions,S.canManage,S.modules);

MERGE dbo.roles WITH (HOLDLOCK) AS T
USING (SELECT 2 AS id, N'administrador' AS name, N'Administrador - Gestión de usuarios y sistemas' AS description,
        N'admin:manage-users|admin:manage-roles|admin:view-stats|admin:view-audit|profile:view-all|profile:view-clients|profile:view-vendors|auth:view-users|auth:create-user|auth:update-user|auth:delete-user' AS permissions, N'vendedor|cliente|tendero' AS canManage,
        N'1:full|2:write' AS modules) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description,
  permissions=S.permissions, canManage=S.canManage, modules=S.modules
WHEN NOT MATCHED THEN INSERT (id,name,description,permissions,canManage,modules)
  VALUES (S.id,S.name,S.description,S.permissions,S.canManage,S.modules);

MERGE dbo.roles WITH (HOLDLOCK) AS T
USING (SELECT 3 AS id, N'vendedor' AS name, N'Vendedor - Permisos limitados para venta' AS description,
        N'auth:login|auth:logout|auth:validate|profile:view-own|profile:edit-own|profile:view-clients' AS permissions, N'' AS canManage,
        N'1:write' AS modules) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description,
  permissions=S.permissions, canManage=S.canManage, modules=S.modules
WHEN NOT MATCHED THEN INSERT (id,name,description,permissions,canManage,modules)
  VALUES (S.id,S.name,S.description,S.permissions,S.canManage,S.modules);

MERGE dbo.roles WITH (HOLDLOCK) AS T
USING (SELECT 4 AS id, N'cliente' AS name, N'Cliente - Permisos básicos' AS description,
        N'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|profile:view-own|profile:edit-own' AS permissions, N'' AS canManage,
        N'1:read' AS modules) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description,
  permissions=S.permissions, canManage=S.canManage, modules=S.modules
WHEN NOT MATCHED THEN INSERT (id,name,description,permissions,canManage,modules)
  VALUES (S.id,S.name,S.description,S.permissions,S.canManage,S.modules);

MERGE dbo.roles WITH (HOLDLOCK) AS T
USING (SELECT 5 AS id, N'tendero' AS name, N'Tendero - Permisos de consultar y consumir pagos' AS description,
        N'' AS permissions, N'' AS canManage,
        N'1:full' AS modules) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description,
  permissions=S.permissions, canManage=S.canManage, modules=S.modules
WHEN NOT MATCHED THEN INSERT (id,name,description,permissions,canManage,modules)
  VALUES (S.id,S.name,S.description,S.permissions,S.canManage,S.modules);
PRINT 'Roles OK.';
GO

-- 4. Users (7 filas)
PRINT 'Insertando users...';

MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT '8735209a-d804-4b47-bb14-6bd6a11235f7' AS id, N'marco30jaramillo@gmail.com' AS email, N'fc537b59c95b5b47fedf7379bd9f0249:eb19c4b6f45b5ef78c73373ab468879f098b814a201deffad1a0044e4a3c42cbc61949b6b0a431a3867c509a34d26c1876e8ea5dab25acda34610e0459e7ee04' AS password,
        N'MARCO ANTONIO REVOLLEDO JARAMILLO' AS name, N'cliente' AS role, N'/uploads/users/8735209a-d804-4b47-bb14-6bd6a11235f7-1789281193931.jpg' AS photo,
        1 AS isActive, 0 AS mustChangePassword,
        CAST('2026-09-13T05:25:03.767Z' AS datetime2) AS createdAt,
        NULL AS resetToken,
        NULL AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);

MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS id, N'superuser@superuser.com' AS email, N'41eeae2764a3ebc9613981fc38afff93:546248c6fdb01194049584e8575715c3d2575ed96476b2898d4480e107ce0a4176ee9ced2d64e5ca44af503b3572bf9839c5e37d3f5276174c7992d2799024df' AS password,
        N'MARCO REVOLLEDO JARAMILLO' AS name, N'superuser' AS role, N'/uploads/users/88910e5a-fabc-43ac-9156-0cdc1bedad89-1789281730270.jpg' AS photo,
        1 AS isActive, 0 AS mustChangePassword,
        CAST('2026-09-13T05:50:46.244Z' AS datetime2) AS createdAt,
        NULL AS resetToken,
        NULL AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);

MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS id, N'delia@gmail.com' AS email, N'14bb541a8c7835cd931bed561d623f1d:6b6882af4cd912c8000f8b2759dda0f35cc466120014d4dfe364d2ae518b2e93b460be8bde2bb3d622cbf4a354189d1e0f68760e4fbe62d45462738699071e5a' AS password,
        N'Delia Maria Jaramillo Guerrero' AS name, N'vendedor' AS role, N'/uploads/users/4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df-1789300309529.jpg' AS photo,
        1 AS isActive, 0 AS mustChangePassword,
        CAST('2026-09-13T05:51:37.988Z' AS datetime2) AS createdAt,
        NULL AS resetToken,
        NULL AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);

MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS id, N'adriana@gmail.com' AS email, N'd3292ae9cd002dc583eff1d8d9fabec5:00c057905920f79d9ce12d788bf494fecd39d91eab4f2fccf395656fd70dd131ebf5cb0553cbb59352f426ceb25daf02e29129ff399c31d121c53d93e63398ed' AS password,
        N'ADRIANA REVOLLEDO ACTUALIZADO' AS name, N'administrador' AS role, N'/uploads/users/4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa-1789302429152.jpg' AS photo,
        1 AS isActive, 0 AS mustChangePassword,
        CAST('2026-09-13T05:52:06.076Z' AS datetime2) AS createdAt,
        NULL AS resetToken,
        NULL AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);

MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT '23a2c119-d2bd-4ce9-b10c-c0ec538962f9' AS id, N'test.usuario@ejemplo.com' AS email, N'afa703a6d146c5aa5229aefe85179279:b87b03e75aff196fcc67004a0f3bf798e1b8a2451008672e25f9e9ca907cd7d3facaba66741d50356534688836b8c1715fabee4635381678d33261e2741b311e' AS password,
        N'USUARIO TEST' AS name, N'cliente' AS role, N'/datos/default/default-avatar.svg' AS photo,
        0 AS isActive, 0 AS mustChangePassword,
        CAST('2026-09-13T07:47:36.564Z' AS datetime2) AS createdAt,
        NULL AS resetToken,
        NULL AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);

MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT '889b587e-c40c-46d5-908e-307b2146b4b9' AS id, N'valery@gmail.com' AS email, N'816d85aa8403a60fe5907726b7b3a47b:3ba1faf3de861dfcef5bb406642cc59d5e46045a3bf3bb33d9ff967e30897cff0896c7951a54ac6efb7b1114f10e703eb877e69558f0e946e810279fc6755b13' AS password,
        N'VALERY DIAZ' AS name, N'tendero' AS role, N'/datos/default/default-avatar.svg' AS photo,
        1 AS isActive, 0 AS mustChangePassword,
        CAST('2026-09-13T13:01:10.178Z' AS datetime2) AS createdAt,
        NULL AS resetToken,
        NULL AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);

MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT 'd82b6b13-2529-4676-b003-ec6369d8c670' AS id, N'root@superuser.com' AS email, N'26178a656ee5259858c2216fb61ebd50:b05a6e493a50f580386ead20b119b77f582d65be85be5b8d6d0fb9895f1c0286d20aa1cc3ebb1b5c180eeeb93267ab297dbb9ac70fcb0991c78469159a8ca5ef' AS password,
        N'SUPERUSERGENERIC' AS name, N'superuser' AS role, N'/datos/default/default-avatar.svg' AS photo,
        1 AS isActive, 0 AS mustChangePassword,
        CAST('2026-09-13T13:02:34.423Z' AS datetime2) AS createdAt,
        NULL AS resetToken,
        NULL AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);
PRINT 'Users OK.';
GO

-- 5. Tokens otorgados (15 filas)
PRINT 'Insertando tokens_granted...';

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT 'd2da64c9-39c7-4acb-9fbb-1174f4d7f2ed' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZDJkYTY0YzktMzljNy00YWNiLTlmYmItMTE3NGY0ZDdmMmVkIiwiaWF0IjoxNzg5Mjg1NjIwLCJleHAiOjE3ODkzNzIwMjB9.IVZweJjl7JKybbKOaZ9GwwPgGF0tqj8cka2gSjHrtJE' AS token, CAST('2026-09-13T07:47:00.310Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T07:47:00.310Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '1d278b7d-b90a-4e56-9951-664cd47b4f51' AS tokenId, '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS userId, N'delia@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDY4NThhNy0xMGY4LTRhOWYtOWE2ZS0wM2QxYmM2YWQyZGYiLCJlbWFpbCI6ImRlbGlhQGdtYWlsLmNvbSIsInJvbGUiOiJ2ZW5kZWRvciIsInRva2VuSWQiOiIxZDI3OGI3ZC1iOTBhLTRlNTYtOTk1MS02NjRjZDQ3YjRmNTEiLCJpYXQiOjE3ODkyODU2MjAsImV4cCI6MTc4OTM3MjAyMH0.D1JKndGKXBFy-HU84gIZK1PGx1ldwQg9Oj3KNhpQZFI' AS token, CAST('2026-09-13T07:47:00.486Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T07:47:00.486Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '1c388677-385f-4f23-8876-85a600e18393' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiMWMzODg2NzctMzg1Zi00ZjIzLTg4NzYtODVhNjAwZTE4MzkzIiwiaWF0IjoxNzg5Mjg1NjU3LCJleHAiOjE3ODkzNzIwNTd9.sikDuGviWIXDQlKL3gAPIxcD7IaodqY2lD4YqxhOhgc' AS token, CAST('2026-09-13T07:47:37.135Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T07:47:37.135Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '31d6499b-fbce-4c54-91de-0dd0076595f9' AS tokenId, '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS userId, N'delia@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDY4NThhNy0xMGY4LTRhOWYtOWE2ZS0wM2QxYmM2YWQyZGYiLCJlbWFpbCI6ImRlbGlhQGdtYWlsLmNvbSIsInJvbGUiOiJ2ZW5kZWRvciIsInRva2VuSWQiOiIzMWQ2NDk5Yi1mYmNlLTRjNTQtOTFkZS0wZGQwMDc2NTk1ZjkiLCJpYXQiOjE3ODkyODU2NTcsImV4cCI6MTc4OTM3MjA1N30.kXU18P4khoTTUiYZ5WTS4c41wFbCSPRhWMkINKDvup4' AS token, CAST('2026-09-13T07:47:37.525Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T07:47:37.525Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT 'e8b3b1e0-f217-42fb-a07b-bad26e1a1dea' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZThiM2IxZTAtZjIxNy00MmZiLWEwN2ItYmFkMjZlMWExZGVhIiwiaWF0IjoxNzg5Mjg1NjU4LCJleHAiOjE3ODkzNzIwNTh9.wCEeKdxbBDzS50VhtrevFjWd6cvtuYh0OrqCp5Aidj8' AS token, CAST('2026-09-13T07:47:38.762Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T07:47:38.762Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '81db2a3f-5017-48d1-9428-e809f00ef9da' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiODFkYjJhM2YtNTAxNy00OGQxLTk0MjgtZTgwOWYwMGVmOWRhIiwiaWF0IjoxNzg5MzAwMzUwLCJleHAiOjE3ODkzODY3NTB9.FOhNd-Pggc6d0bm-Eap0HAhg_mZdFstQZnTkJw1Q7Uc' AS token, CAST('2026-09-13T11:52:30.549Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T11:52:30.549Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '4c58de9a-e62e-413b-978d-b5c506ee06f0' AS tokenId, '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS userId, N'delia@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDY4NThhNy0xMGY4LTRhOWYtOWE2ZS0wM2QxYmM2YWQyZGYiLCJlbWFpbCI6ImRlbGlhQGdtYWlsLmNvbSIsInJvbGUiOiJ2ZW5kZWRvciIsInRva2VuSWQiOiI0YzU4ZGU5YS1lNjJlLTQxM2ItOTc4ZC1iNWM1MDZlZTA2ZjAiLCJpYXQiOjE3ODkzMDA0NTcsImV4cCI6MTc4OTkwNTI1N30.qhZ5RLnEZq7I7xbYDdDWvXYm-eI6zp7bb33QuXBh9-A' AS token, CAST('2026-09-13T11:54:17.120Z' AS datetime2) AS issuedAt,
        CAST('2026-09-20T11:54:17.120Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '25721d98-38de-4a93-8bd5-23284f012ab3' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiIyNTcyMWQ5OC0zOGRlLTRhOTMtOGJkNS0yMzI4NGYwMTJhYjMiLCJpYXQiOjE3ODkzMDEzNzcsImV4cCI6MTc4OTM4Nzc3N30.0AFo6y29RKL-6z8pONrNWmxocgWOuyjRbnweq92-HUo' AS token, CAST('2026-09-13T12:09:37.017Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T12:09:37.017Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT 'da77d163-3b0b-4d8e-ad14-5b74b8e08968' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZGE3N2QxNjMtM2IwYi00ZDhlLWFkMTQtNWI3NGI4ZTA4OTY4IiwiaWF0IjoxNzg5MzAxNjM4LCJleHAiOjE3ODkzODgwMzh9.QwekmxqTKGEDLzeH9HPAEjlQDrakv40LTE-gHzTc2kM' AS token, CAST('2026-09-13T12:13:58.811Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T12:13:58.811Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT 'b4461464-123d-4689-b5b8-2b60c6b3a53d' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiYjQ0NjE0NjQtMTIzZC00Njg5LWI1YjgtMmI2MGM2YjNhNTNkIiwiaWF0IjoxNzg5MzAyNDU3LCJleHAiOjE3ODkzODg4NTd9.-NuGJxM8BIjtqDaCaHpRChMGdVDuC-Y6V8zSZkvzF7c' AS token, CAST('2026-09-13T12:27:37.247Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T12:27:37.247Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT 'e0c8ae94-0e2c-4cf3-8c27-66cb616842e5' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiJlMGM4YWU5NC0wZTJjLTRjZjMtOGMyNy02NmNiNjE2ODQyZTUiLCJpYXQiOjE3ODkzMDI4MjYsImV4cCI6MTc4OTkwNzYyNn0.Uq6pzSz5tpWGxWswCrW_-TYRo1j5YtVOi6RGHoJEvR8' AS token, CAST('2026-09-13T12:33:46.151Z' AS datetime2) AS issuedAt,
        CAST('2026-09-20T12:33:46.151Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '53490e18-323b-4e67-9512-e74c0d3f35aa' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiNTM0OTBlMTgtMzIzYi00ZTY3LTk1MTItZTc0YzBkM2YzNWFhIiwiaWF0IjoxNzg5MzAzMzI0LCJleHAiOjE3ODkzODk3MjR9.5cpvsKEGIBRXd3gTQpu15RFEZ3YEs3trF518sbQLpYU' AS token, CAST('2026-09-13T12:42:04.191Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T12:42:04.191Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '0a7a834e-315f-4f61-89ee-1a4ba08f5c2b' AS tokenId, '889b587e-c40c-46d5-908e-307b2146b4b9' AS userId, N'valery@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODliNTg3ZS1jNDBjLTQ2ZDUtOTA4ZS0zMDdiMjE0NmI0YjkiLCJlbWFpbCI6InZhbGVyeUBnbWFpbC5jb20iLCJyb2xlIjoidGVuZGVybyIsInRva2VuSWQiOiIwYTdhODM0ZS0zMTVmLTRmNjEtODllZS0xYTRiYTA4ZjVjMmIiLCJpYXQiOjE3ODkzMDQ0NzAsImV4cCI6MTc4OTM5MDg3MH0.Z2ufd6d0RVC5pCOSkpl5tYjK9BdS1qF_2B9b29H3Gt0' AS token, CAST('2026-09-13T13:01:10.180Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T13:01:10.180Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT 'e1842b44-8450-4e62-86f5-ebcf224b44d4' AS tokenId, 'd82b6b13-2529-4676-b003-ec6369d8c670' AS userId, N'root@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkODJiNmIxMy0yNTI5LTQ2NzYtYjAwMy1lYzYzNjlkOGM2NzAiLCJlbWFpbCI6InJvb3RAc3VwZXJ1c2VyLmNvbSIsInJvbGUiOiJzdXBlcnVzZXIiLCJ0b2tlbklkIjoiZTE4NDJiNDQtODQ1MC00ZTYyLTg2ZjUtZWJjZjIyNGI0NGQ0IiwiaWF0IjoxNzg5MzA0NTU0LCJleHAiOjE3ODkzOTA5NTR9.9XR_1-CFbHJV7IuySuOrVeZ8JEfVzIhlzj9MUqrKIpQ' AS token, CAST('2026-09-13T13:02:34.426Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T13:02:34.426Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);

MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT '4f89f11c-e8e3-42b3-99cd-54f4b4d0e829' AS tokenId, 'd82b6b13-2529-4676-b003-ec6369d8c670' AS userId, N'root@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkODJiNmIxMy0yNTI5LTQ2NzYtYjAwMy1lYzYzNjlkOGM2NzAiLCJlbWFpbCI6InJvb3RAc3VwZXJ1c2VyLmNvbSIsInJvbGUiOiJzdXBlcnVzZXIiLCJ0b2tlbklkIjoiNGY4OWYxMWMtZThlMy00MmIzLTk5Y2QtNTRmNGI0ZDBlODI5IiwiaWF0IjoxNzg5MzA0NjAwLCJleHAiOjE3ODkzOTEwMDB9.aTvPZj5pvs0w1ZBsNxAMTD8lurMn-atdSl7KvDcJeco' AS token, CAST('2026-09-13T13:03:20.109Z' AS datetime2) AS issuedAt,
        CAST('2026-09-14T13:03:20.109Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);
PRINT 'Tokens granted OK.';
GO

-- 6. Tokens revocados (38 filas)
PRINT 'Insertando tokens_revoked...';

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '6deb1b22-e926-46f7-ab67-660dcfee3296' AS tokenId, '8735209a-d804-4b47-bb14-6bd6a11235f7' AS userId, N'marco30jaramillo@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NzM1MjA5YS1kODA0LTRiNDctYmIxNC02YmQ2YTExMjM1ZjciLCJlbWFpbCI6Im1hcmNvMzBqYXJhbWlsbG9AZ21haWwuY29tIiwicm9sZSI6ImNsaWVudGUiLCJ0b2tlbklkIjoiNmRlYjFiMjItZTkyNi00NmY3LWFiNjctNjYwZGNmZWUzMjk2IiwiaWF0IjoxNzg5Mjc3MzY1LCJleHAiOjE3ODkzNjM3NjV9.5YIl3i3sJYM79Z0vtCdgq5LU4qhvJzutne_-IiwfLQY' AS token, CAST('2026-09-13T05:32:51.359Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:29:25.796Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'ce36d253-a0db-4c31-a150-8cdbf22e971b' AS tokenId, '8735209a-d804-4b47-bb14-6bd6a11235f7' AS userId, N'marco30jaramillo@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NzM1MjA5YS1kODA0LTRiNDctYmIxNC02YmQ2YTExMjM1ZjciLCJlbWFpbCI6Im1hcmNvMzBqYXJhbWlsbG9AZ21haWwuY29tIiwicm9sZSI6ImNsaWVudGUiLCJ0b2tlbklkIjoiY2UzNmQyNTMtYTBkYi00YzMxLWExNTAtOGNkYmYyMmU5NzFiIiwiaWF0IjoxNzg5Mjc3MTAzLCJleHAiOjE3ODkzNjM1MDN9.4z3cmbx2pVdt-IYA75kJTzgT4CZBxhsGdW5kSLJo1pM' AS token, CAST('2026-09-13T05:41:13.748Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:25:03.773Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '36e80a1f-9b75-4813-80b6-de300804d883' AS tokenId, '8735209a-d804-4b47-bb14-6bd6a11235f7' AS userId, N'marco30jaramillo@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NzM1MjA5YS1kODA0LTRiNDctYmIxNC02YmQ2YTExMjM1ZjciLCJlbWFpbCI6Im1hcmNvMzBqYXJhbWlsbG9AZ21haWwuY29tIiwicm9sZSI6ImNsaWVudGUiLCJ0b2tlbklkIjoiMzZlODBhMWYtOWI3NS00ODEzLTgwYjYtZGUzMDA4MDRkODgzIiwiaWF0IjoxNzg5Mjc3NTgxLCJleHAiOjE3ODkzNjM5ODF9.Dx7jSQqXpDkLmgFL04xrSv7F1dgJvZiPRW7u7uH1Q9Q' AS token, CAST('2026-09-13T05:41:13.750Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:33:01.464Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'a8c94689-afa5-4a50-9c79-4e5e961a21be' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiJhOGM5NDY4OS1hZmE1LTRhNTAtOWM3OS00ZTVlOTYxYTIxYmUiLCJpYXQiOjE3ODkyNzg2NjUsImV4cCI6MTc4OTM2NTA2NX0.5mTYns6_3zmJ59o6RYjTjClr4o8pze0P8IjNxHv9xXg' AS token, CAST('2026-09-13T05:52:21.975Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:51:05.549Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '5bd52bda-a0e5-4e68-a99f-c47abedcf55f' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiNWJkNTJiZGEtYTBlNS00ZTY4LWE5OWYtYzQ3YWJlZGNmNTVmIiwiaWF0IjoxNzg5Mjc4NzU0LCJleHAiOjE3ODkzNjUxNTR9.PiKVhDn82sCpJoTOEAEjXrezHP0UovWwu0n4G8Q8W8c' AS token, CAST('2026-09-13T05:53:55.053Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:52:34.220Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'f8c2803b-c9b2-48d4-b5bc-ed0b1158651c' AS tokenId, '8735209a-d804-4b47-bb14-6bd6a11235f7' AS userId, N'marco30jaramillo@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NzM1MjA5YS1kODA0LTRiNDctYmIxNC02YmQ2YTExMjM1ZjciLCJlbWFpbCI6Im1hcmNvMzBqYXJhbWlsbG9AZ21haWwuY29tIiwicm9sZSI6ImNsaWVudGUiLCJ0b2tlbklkIjoiZjhjMjgwM2ItYzliMi00OGQ0LWI1YmMtZWQwYjExNTg2NTFjIiwiaWF0IjoxNzg5MjgwMDQzLCJleHAiOjE3ODkzNjY0NDN9.T8rnOjkQ_kWj2TQSg_3dH6AIdzf3G8PZ8Z93TKSR7Hw' AS token, CAST('2026-09-13T06:36:57.375Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:14:03.553Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '8b207573-d065-4220-ae6b-0e9a1bc3a780' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiOGIyMDc1NzMtZDA2NS00MjIwLWFlNmItMGU5YTFiYzNhNzgwIiwiaWF0IjoxNzg5Mjc4NzI2LCJleHAiOjE3ODkzNjUxMjZ9.VduFwnwBhm9LgfJcusiQnb_IKasg-asBo52j_Ux6Htc' AS token, CAST('2026-09-13T06:48:15.441Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:52:06.080Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '7cf516bc-2aa8-497a-9eb2-1a962d46ee75' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiN2NmNTE2YmMtMmFhOC00OTdhLTllYjItMWE5NjJkNDZlZTc1IiwiaWF0IjoxNzg5MjgxODg0LCJleHAiOjE3ODkzNjgyODR9.tVqVXE8iwi8qhH4vPmA9LlPsrF9pRBtqR5mRmqmlrOI' AS token, CAST('2026-09-13T06:48:15.443Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:44:44.508Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'bbd9f188-0fb0-4c4a-bd1a-438ca43db2a8' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiYmJkOWYxODgtMGZiMC00YzRhLWJkMWEtNDM4Y2E0M2RiMmE4IiwiaWF0IjoxNzg5MjgyMTUzLCJleHAiOjE3ODkzNjg1NTN9.oaxzyCVR6RwU3-nLwrAhySgLzs4TMrdKUsS3n0mRPA0' AS token, CAST('2026-09-13T06:51:59.324Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:49:13.770Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '1b5dca38-581e-44b9-92cb-8ceb018fa775' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiMWI1ZGNhMzgtNTgxZS00NGI5LTkyY2ItOGNlYjAxOGZhNzc1IiwiaWF0IjoxNzg5MjgyMzI3LCJleHAiOjE3ODkzNjg3Mjd9.KfgF6mGzdzBZB96yNasGDNXVswF3-P01MIX87VWtWlQ' AS token, CAST('2026-09-13T06:52:20.006Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:52:07.365Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'fcf05af7-f2ce-4eb1-85f4-beccd56d111f' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZmNmMDVhZjctZjJjZS00ZWIxLTg1ZjQtYmVjY2Q1NmQxMTFmIiwiaWF0IjoxNzg5MjgyMzYwLCJleHAiOjE3ODkzNjg3NjB9.rR7iUdGHdvp-CfHx6Cu_HHLKlvKwDbiaLduZEvtvZAo' AS token, CAST('2026-09-13T06:53:38.933Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:52:40.914Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '26711b39-1377-4c5d-a436-70d1df7d8ea5' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiMjY3MTFiMzktMTM3Ny00YzVkLWE0MzYtNzBkMWRmN2Q4ZWE1IiwiaWF0IjoxNzg5MjgyNTc0LCJleHAiOjE3ODkzNjg5NzR9.NQuxp2Eyn1Dv2Pdtue4BSOLdw6tTEpkz-JKLoSzwBg4' AS token, CAST('2026-09-13T06:56:22.928Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:56:14.209Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '301bb1bb-8db9-4891-8ac7-77ea21878f66' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiMzAxYmIxYmItOGRiOS00ODkxLThhYzctNzdlYTIxODc4ZjY2IiwiaWF0IjoxNzg5MjgyNjE0LCJleHAiOjE3ODkzNjkwMTR9.u8QNcU9SvWBNXlS3ZlTCAd9jyaZfwzigKR6zcErJ9jQ' AS token, CAST('2026-09-13T06:57:22.475Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:56:54.759Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '8de0c495-8584-419a-bba7-a19efaac27a2' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiOGRlMGM0OTUtODU4NC00MTlhLWJiYTctYTE5ZWZhYWMyN2EyIiwiaWF0IjoxNzg5MjgyNjU3LCJleHAiOjE3ODkzNjkwNTd9.1tF6SWrZUdtSyOqoyivciqOZ0r9hmA7FzMBNP_uw1XI' AS token, CAST('2026-09-13T07:10:21.371Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:57:37.067Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'fb4d5d98-d3d7-4251-ab58-ef7c24700636' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZmI0ZDVkOTgtZDNkNy00MjUxLWFiNTgtZWY3YzI0NzAwNjM2IiwiaWF0IjoxNzg5MjgzNDMwLCJleHAiOjE3ODkzNjk4MzB9.JvVQSRzPQ1LCKmh0TtysPJmPGoSbXEt21Wu3xAyLg3o' AS token, CAST('2026-09-13T07:30:25.087Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:10:30.148Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'e6cb6708-b8d5-4453-a663-bf1953b849bc' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZTZjYjY3MDgtYjhkNS00NDUzLWE2NjMtYmYxOTUzYjg0OWJjIiwiaWF0IjoxNzg5Mjg0MzYyLCJleHAiOjE3ODkzNzA3NjJ9.IRNnRZlfIzCSZ7O0W12MuWnx9ymIxa-56grxT6Iuqpk' AS token, CAST('2026-09-13T07:30:25.090Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:26:02.403Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '58ce8652-8c19-425b-bbba-a93d374af113' AS tokenId, '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS userId, N'delia@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDY4NThhNy0xMGY4LTRhOWYtOWE2ZS0wM2QxYmM2YWQyZGYiLCJlbWFpbCI6ImRlbGlhQGdtYWlsLmNvbSIsInJvbGUiOiJ2ZW5kZWRvciIsInRva2VuSWQiOiI1OGNlODY1Mi04YzE5LTQyNWItYmJiYS1hOTNkMzc0YWYxMTMiLCJpYXQiOjE3ODkyNzg2OTcsImV4cCI6MTc4OTM2NTA5N30.i6iM7kBo8UXmG2DuQhv39mu5EDZJuX0_Qmya8IznPvc' AS token, CAST('2026-09-13T07:32:34.061Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:51:37.991Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '6e217756-0cc6-45cd-bf8b-3b3857e3b709' AS tokenId, '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS userId, N'delia@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDY4NThhNy0xMGY4LTRhOWYtOWE2ZS0wM2QxYmM2YWQyZGYiLCJlbWFpbCI6ImRlbGlhQGdtYWlsLmNvbSIsInJvbGUiOiJ2ZW5kZWRvciIsInRva2VuSWQiOiI2ZTIxNzc1Ni0wY2M2LTQ1Y2QtYmY4Yi0zYjM4NTdlM2I3MDkiLCJpYXQiOjE3ODkyNzg4NTYsImV4cCI6MTc4OTM2NTI1Nn0.pgcze069D_FpN7YtNk7Hl6R4zj1RlBMXPyq5BK9GXmI' AS token, CAST('2026-09-13T07:32:34.063Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:54:16.037Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'f2a0554b-f5af-4b64-9171-c5705835f81c' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZjJhMDU1NGItZjVhZi00YjY0LTkxNzEtYzU3MDU4MzVmODFjIiwiaWF0IjoxNzg5Mjg0NjM1LCJleHAiOjE3ODkzNzEwMzV9.g8x9_GJaMf8AUsm2GXJtMbDhX9hxcu4ZMAsUfLfUrGk' AS token, CAST('2026-09-13T07:32:41.653Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:30:35.157Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'da71ba42-46c9-4518-8af6-f0a99aee49e9' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiZGE3MWJhNDItNDZjOS00NTE4LThhZjYtZjBhOTlhZWU0OWU5IiwiaWF0IjoxNzg5Mjg0NzEzLCJleHAiOjE3ODkzNzExMTN9.WupXTnMrElMQZQ_NfWwlp6KqIsmdAihkvi9hNytWHwA' AS token, CAST('2026-09-13T07:32:41.655Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:31:53.865Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'd8cb59ca-328d-4edb-9355-de819378fb00' AS tokenId, '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS userId, N'delia@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDY4NThhNy0xMGY4LTRhOWYtOWE2ZS0wM2QxYmM2YWQyZGYiLCJlbWFpbCI6ImRlbGlhQGdtYWlsLmNvbSIsInJvbGUiOiJ2ZW5kZWRvciIsInRva2VuSWQiOiJkOGNiNTljYS0zMjhkLTRlZGItOTM1NS1kZTgxOTM3OGZiMDAiLCJpYXQiOjE3ODkyODQ4MTIsImV4cCI6MTc4OTM3MTIxMn0.3QT6DH91M5J8ROq_E5EKO3PzdUhYkuGf-CBMlC7IrmY' AS token, CAST('2026-09-13T07:33:43.291Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:33:32.883Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '14d133c4-06b7-4dc5-90c8-1d2ac1333700' AS tokenId, '23a2c119-d2bd-4ce9-b10c-c0ec538962f9' AS userId, N'test.usuario@ejemplo.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyM2EyYzExOS1kMmJkLTRjZTktYjEwYy1jMGVjNTM4OTYyZjkiLCJlbWFpbCI6InRlc3QudXN1YXJpb0BlamVtcGxvLmNvbSIsInJvbGUiOiJjbGllbnRlIiwidG9rZW5JZCI6IjE0ZDEzM2M0LTA2YjctNGRjNS05MGM4LTFkMmFjMTMzMzcwMCIsImlhdCI6MTc4OTI4NTY1NiwiZXhwIjoxNzg5MzcyMDU2fQ.EvOPW2I69JHayYCq3j3s_ngXexx_ZdxaUGTxNB4WPTI' AS token, CAST('2026-09-13T07:47:40.343Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:47:36.566Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'cb44a85b-a26e-46a2-aa48-3636dce846b9' AS tokenId, '23a2c119-d2bd-4ce9-b10c-c0ec538962f9' AS userId, N'test.usuario@ejemplo.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyM2EyYzExOS1kMmJkLTRjZTktYjEwYy1jMGVjNTM4OTYyZjkiLCJlbWFpbCI6InRlc3QudXN1YXJpb0BlamVtcGxvLmNvbSIsInJvbGUiOiJjbGllbnRlIiwidG9rZW5JZCI6ImNiNDRhODViLWEyNmUtNDZhMi1hYTQ4LTM2MzZkY2U4NDZiOSIsImlhdCI6MTc4OTI4NTY1OCwiZXhwIjoxNzg5MzcyMDU4fQ.x9eZVd9NJyzOLANaiwknnpQF_6Fe9ePjbF1frF3zSpY' AS token, CAST('2026-09-13T07:47:40.346Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:47:38.267Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '5e3bf3a5-a4fa-46f3-8892-67b0fbd33ade' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiNWUzYmYzYTUtYTRmYS00NmYzLTg4OTItNjdiMGZiZDMzYWRlIiwiaWF0IjoxNzg5Mjk4NzI3LCJleHAiOjE3ODkzODUxMjd9.bkyIagIdXbzduhO8rlqFPkumjW1SVBrQM4LaHJdW-_s' AS token, CAST('2026-09-13T11:44:24.248Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T11:25:27.072Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'a39e6d82-fd69-453f-a039-192e1cb7f0ff' AS tokenId, '8735209a-d804-4b47-bb14-6bd6a11235f7' AS userId, N'marco30jaramillo@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NzM1MjA5YS1kODA0LTRiNDctYmIxNC02YmQ2YTExMjM1ZjciLCJlbWFpbCI6Im1hcmNvMzBqYXJhbWlsbG9AZ21haWwuY29tIiwicm9sZSI6ImNsaWVudGUiLCJ0b2tlbklkIjoiYTM5ZTZkODItZmQ2OS00NTNmLWEwMzktMTkyZTFjYjdmMGZmIiwiaWF0IjoxNzg5Mjk5OTM3LCJleHAiOjE3ODkzODYzMzd9.7eUhFHZe0ZWoD3BqzraVav7Q2Y2Jekg6AsIpajk6XK8' AS token, CAST('2026-09-13T11:45:51.620Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T11:45:37.543Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '09a50c5b-ea29-4501-8b6a-7eb85238ad00' AS tokenId, '4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS userId, N'delia@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDY4NThhNy0xMGY4LTRhOWYtOWE2ZS0wM2QxYmM2YWQyZGYiLCJlbWFpbCI6ImRlbGlhQGdtYWlsLmNvbSIsInJvbGUiOiJ2ZW5kZWRvciIsInRva2VuSWQiOiIwOWE1MGM1Yi1lYTI5LTQ1MDEtOGI2YS03ZWI4NTIzOGFkMDAiLCJpYXQiOjE3ODkzMDAyNTEsImV4cCI6MTc4OTkwNTA1MX0.Vigi9pEDh0WTXSiIWntUmvOCcdOLnPdkvzk-hzky2yU' AS token, CAST('2026-09-13T11:52:14.572Z' AS datetime2) AS revokedAt,
        CAST('2026-09-20T11:50:51.639Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'cf47cdfc-7787-4e48-a1ac-6cb6fa4f0a45' AS tokenId, '4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS userId, N'adriana@gmail.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZDQ0ODFhMy1mOGI4LTQyYmMtYTM2Yy04MGFkMWJjMmQ4YWEiLCJlbWFpbCI6ImFkcmlhbmFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmFkb3IiLCJ0b2tlbklkIjoiY2Y0N2NkZmMtNzc4Ny00ZTQ4LWExYWMtNmNiNmZhNGYwYTQ1IiwiaWF0IjoxNzg5Mjg0ODAxLCJleHAiOjE3ODkzNzEyMDF9.Z7Iby2Nk7T8dgyBpg1U5WPyskxgqwb8oVPSUan2tFm8' AS token, CAST('2026-09-13T11:53:31.753Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:33:21.602Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '14160b18-d87c-4c69-9ebb-d74ab6b6bc92' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiIxNDE2MGIxOC1kODdjLTRjNjktOWViYi1kNzRhYjZiNmJjOTIiLCJpYXQiOjE3ODkyNzg2NDYsImV4cCI6MTc4OTM2NTA0Nn0.-nYULqFGrHReQb86Z-LfyaCEmKeib_5PCgdFA_wP4ow' AS token, CAST('2026-09-13T12:09:24.589Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T05:50:46.249Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '5a9d57af-026e-40a7-a61d-0d5bfda7db9e' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiI1YTlkNTdhZi0wMjZlLTQwYTctYTYxZC0wZDViZmRhN2RiOWUiLCJpYXQiOjE3ODkyODE0MzMsImV4cCI6MTc4OTM2NzgzM30.k7oGz8D1nIlnEnyYXuavR_UuVxugEnL4GcjdqvQFHxY' AS token, CAST('2026-09-13T12:09:24.592Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T06:37:13.407Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '1b297722-3775-4274-8365-239e7f43abaf' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiIxYjI5NzcyMi0zNzc1LTQyNzQtODM2NS0yMzllN2Y0M2FiYWYiLCJpYXQiOjE3ODkyODU2MTYsImV4cCI6MTc4OTM3MjAxNn0.ysjhdGZK9KLvmdLk0jlRJRLtBUdEGp3b2caUBmwIQ_o' AS token, CAST('2026-09-13T12:09:24.595Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:46:56.090Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'ad65a4d3-db60-40b0-be62-5b3e43148211' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiJhZDY1YTRkMy1kYjYwLTQwYjAtYmU2Mi01YjNlNDMxNDgyMTEiLCJpYXQiOjE3ODkyODU2NTYsImV4cCI6MTc4OTM3MjA1Nn0.xwxuHO-pqIETqG_9G2rs1A7hy5H5ORBP-lniZ0I-H2I' AS token, CAST('2026-09-13T12:09:24.597Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T07:47:36.082Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '99a3e45d-1265-4f78-80a9-6f444ddc3b6e' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiI5OWEzZTQ1ZC0xMjY1LTRmNzgtODBhOS02ZjQ0NGRkYzNiNmUiLCJpYXQiOjE3ODkyOTgyNTEsImV4cCI6MTc4OTM4NDY1MX0.qLTNR9siCUr9sncjELMCxJGYTg9V4rnVhckgx0m4Zyo' AS token, CAST('2026-09-13T12:09:24.598Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T11:17:31.291Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '418e3f8b-f9c4-4f40-8eca-e1fcce275c5b' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiI0MThlM2Y4Yi1mOWM0LTRmNDAtOGVjYS1lMWZjY2UyNzVjNWIiLCJpYXQiOjE3ODkyOTg0OTIsImV4cCI6MTc4OTM4NDg5Mn0.5bnBSPhW_xlzXtU2ygyI9L85YhqrfiYB2cf9shCoCEU' AS token, CAST('2026-09-13T12:09:24.600Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T11:21:32.586Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '57313015-1bce-490f-bdca-3e07400a869f' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiI1NzMxMzAxNS0xYmNlLTQ5MGYtYmRjYS0zZTA3NDAwYTg2OWYiLCJpYXQiOjE3ODkzMDAwODgsImV4cCI6MTc4OTM4NjQ4OH0.JtSJFKiQn3m9PGAmAx1EAOoe_vJvOGHoRsTH__H-5aw' AS token, CAST('2026-09-13T12:09:24.602Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T11:48:08.164Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT 'cf211940-abdf-4202-abc5-de4ed5488c6b' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiJjZjIxMTk0MC1hYmRmLTQyMDItYWJjNS1kZTRlZDU0ODhjNmIiLCJpYXQiOjE3ODkzMDAxMzMsImV4cCI6MTc4OTM4NjUzM30.HBDM_-L-0szKiyl74HLjkZJtOApFe9UdhYR4ujjVjCo' AS token, CAST('2026-09-13T12:09:24.605Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T11:48:53.750Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '275bbb4b-4fe6-4b39-bb37-9dcff71bc633' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiIyNzViYmI0Yi00ZmU2LTRiMzktYmIzNy05ZGNmZjcxYmM2MzMiLCJpYXQiOjE3ODkzMDAxODAsImV4cCI6MTc4OTM4NjU4MH0.oP9dKq0O5MbPCkP2NMybfK-n8WCZgWfnrJHYZSoNRgQ' AS token, CAST('2026-09-13T12:09:24.607Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T11:49:40.359Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '95e3266a-7c27-4bbd-aaad-2e7aefe2a769' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiI5NWUzMjY2YS03YzI3LTRiYmQtYWFhZC0yZTdhZWZlMmE3NjkiLCJpYXQiOjE3ODkzMDA5NTIsImV4cCI6MTc4OTM4NzM1Mn0.v9rWMPXNhubYi9uNf9IrJAPYXPbax7u3yBNXhJuboMs' AS token, CAST('2026-09-13T12:09:24.609Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T12:02:32.780Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);

MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT '15666544-cfe7-4a8b-b11e-c2914165da00' AS tokenId, '88910e5a-fabc-43ac-9156-0cdc1bedad89' AS userId, N'superuser@superuser.com' AS email,
        N'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4ODkxMGU1YS1mYWJjLTQzYWMtOTE1Ni0wY2RjMWJlZGFkODkiLCJlbWFpbCI6InN1cGVydXNlckBzdXBlcnVzZXIuY29tIiwicm9sZSI6InN1cGVydXNlciIsInRva2VuSWQiOiIxNTY2NjU0NC1jZmU3LTRhOGItYjExZS1jMjkxNDE2NWRhMDAiLCJpYXQiOjE3ODkzMDE1MzUsImV4cCI6MTc4OTM4NzkzNX0.Pig827CP324ZiYGrib8eU0Oy0AdurB3vcR-O9RddUkg' AS token, CAST('2026-09-13T12:13:50.276Z' AS datetime2) AS revokedAt,
        CAST('2026-09-14T12:12:15.141Z' AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);
PRINT 'Tokens revoked OK.';
GO

-- 7. Audit logs (26 filas)
PRINT 'Insertando audit_logs...';

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '15cc6f69-fcc9-4d13-b61d-2cd47b842c00' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS targetId, N'superuser@superuser.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:49:40.362Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '0e125c0c-4ca2-479b-8761-f984c0db439b' AS id, N'failed_login_attempt' AS action, N'Intento de acceso fallido' AS actionLabel,
        N'desconocido' AS actorId, N'adriana@gmail.com' AS actorEmail, NULL AS actorName,
        NULL AS targetId, NULL AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:49:42.484Z' AS datetime2) AS [timestamp],
        0 AS success,
        N'Credenciales incorrectas' AS failureReason, N'{"email":"adriana@gmail.com"}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'd2c78f12-c7ce-4348-8aac-261321aaa6f2' AS id, N'failed_login_attempt' AS action, N'Intento de acceso fallido' AS actionLabel,
        N'desconocido' AS actorId, N'delia@gmail.com' AS actorEmail, NULL AS actorName,
        NULL AS targetId, NULL AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:50:39.860Z' AS datetime2) AS [timestamp],
        0 AS success,
        N'Credenciales incorrectas' AS failureReason, N'{"email":"delia@gmail.com"}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'b2c5b038-3a34-4414-84d8-4c6795dd6198' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS actorId, N'delia@gmail.com' AS actorEmail, N'DELIA JARAMILLO' AS actorName,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS targetId, N'delia@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:50:51.642Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '1c7e5110-54dc-4eaf-a5c1-9fc893f6b742' AS id, N'profile_update' AS action, N'Actualización de perfil' AS actionLabel,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS actorId, N'delia@gmail.com' AS actorEmail, N'Delia Maria Jaramillo Guerrero' AS actorName,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS targetId, N'delia@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:51:23.059Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, N'{"changes":{"name":"Delia Maria Jaramillo Guerrero","photo":"/datos/default/default-avatar.svg"}}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '3cf1a987-4f8e-47c6-b566-caf74d552648' AS id, N'profile_update' AS action, N'Actualización de perfil' AS actionLabel,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS actorId, N'delia@gmail.com' AS actorEmail, N'Delia Maria Jaramillo Guerrero' AS actorName,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS targetId, N'delia@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:51:51.094Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, N'{"changes":{"name":"Delia Maria Jaramillo Guerrero","photo":"/uploads/users/4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df-1789300309529.jpg"}}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '07e1cb16-5729-4c89-b235-c294a5428c90' AS id, N'logout' AS action, N'Cierre de sesión' AS actionLabel,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS actorId, N'delia@gmail.com' AS actorEmail, N'Delia Maria Jaramillo Guerrero' AS actorName,
        NULL AS targetId, NULL AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:52:14.576Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'b3657287-3481-4211-9442-358b47b9d800' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS actorId, N'adriana@gmail.com' AS actorEmail, N'ADRIANA REVOLLEDO ACTUALIZADO' AS actorName,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS targetId, N'adriana@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:52:30.553Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'f41b0ce5-1eab-41bb-9ce4-1d185de075b0' AS id, N'password_generated' AS action, N'Contraseña generada por admin' AS actionLabel,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS actorId, N'adriana@gmail.com' AS actorEmail, N'ADRIANA REVOLLEDO ACTUALIZADO' AS actorName,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS targetId, N'delia@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:52:49.663Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'admin' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'c7197c44-a941-47f6-99ea-45d023317160' AS id, N'logout' AS action, N'Cierre de sesión' AS actionLabel,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS actorId, N'adriana@gmail.com' AS actorEmail, N'ADRIANA REVOLLEDO ACTUALIZADO' AS actorName,
        NULL AS targetId, NULL AS targetEmail,
        N'192.168.40.29' AS ipAddress, N'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:53:31.757Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '0677e0c3-3325-47b0-909c-9bd5ca4ec060' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS actorId, N'delia@gmail.com' AS actorEmail, N'Delia Maria Jaramillo Guerrero' AS actorName,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS targetId, N'delia@gmail.com' AS targetEmail,
        N'192.168.40.29' AS ipAddress, N'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:54:17.123Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'f972dd80-2be6-4b53-9a72-9a9c58341afc' AS id, N'password_change' AS action, N'Cambio de contraseña' AS actionLabel,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS actorId, N'delia@gmail.com' AS actorEmail, N'Delia Maria Jaramillo Guerrero' AS actorName,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS targetId, N'delia@gmail.com' AS targetEmail,
        N'192.168.40.29' AS ipAddress, N'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36' AS userAgent,
        CAST('2026-09-13T11:54:36.176Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, N'{"changedByAdmin":false}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '986766d9-5930-4816-8800-bd1baae67561' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS targetId, N'superuser@superuser.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:02:32.789Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'eb355908-1ccf-4a73-9019-34790fa25373' AS id, N'password_change' AS action, N'Cambio de contraseña' AS actionLabel,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS actorId, N'delia@gmail.com' AS actorEmail, N'Delia Maria Jaramillo Guerrero' AS actorName,
        N'4d6858a7-10f8-4a9f-9a6e-03d1bc6ad2df' AS targetId, N'delia@gmail.com' AS targetEmail,
        N'192.168.40.29' AS ipAddress, N'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:08:13.077Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, N'{"changedByAdmin":false}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '5926e942-054a-49f8-8618-5461df1508d2' AS id, N'failed_login_attempt' AS action, N'Intento de acceso fallido' AS actionLabel,
        N'desconocido' AS actorId, N'delia@gmai.com' AS actorEmail, NULL AS actorName,
        NULL AS targetId, NULL AS targetEmail,
        N'192.168.40.29' AS ipAddress, N'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:09:14.809Z' AS datetime2) AS [timestamp],
        0 AS success,
        N'Credenciales incorrectas' AS failureReason, N'{"email":"delia@gmai.com"}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '3604655d-a9ce-4d17-bcba-1c0ac4139239' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS targetId, N'superuser@superuser.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:09:37.021Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'b6c0e9b3-ca58-421c-9674-37ee47cc5343' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS targetId, N'superuser@superuser.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:12:15.144Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '99dc35e3-0eb9-4441-a3d9-2de17a05cff6' AS id, N'logout' AS action, N'Cierre de sesión' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        NULL AS targetId, NULL AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:13:50.280Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'fe3ef767-759e-40f7-8b85-e6a6cc550d24' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS actorId, N'adriana@gmail.com' AS actorEmail, N'ADRIANA REVOLLEDO ACTUALIZADO' AS actorName,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS targetId, N'adriana@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:13:58.813Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '4175a713-374d-48a1-ae49-e0f896cb884f' AS id, N'profile_update' AS action, N'Actualización de perfil' AS actionLabel,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS actorId, N'adriana@gmail.com' AS actorEmail, N'ADRIANA REVOLLEDO ACTUALIZADO' AS actorName,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS targetId, N'adriana@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:27:10.884Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, N'{"changes":{"name":"ADRIANA REVOLLEDO ACTUALIZADO","photo":"/uploads/users/4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa-1789302429152.jpg"}}' AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '9d3fa9e4-f720-40f2-860d-d92bd76ccaf6' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS actorId, N'adriana@gmail.com' AS actorEmail, N'ADRIANA REVOLLEDO ACTUALIZADO' AS actorName,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS targetId, N'adriana@gmail.com' AS targetEmail,
        N'192.168.40.29' AS ipAddress, N'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:27:37.251Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT 'fbcb6d74-2cbd-4555-adcc-31829b987178' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS targetId, N'superuser@superuser.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:33:46.156Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '75862001-1b36-4186-b621-d47828a3f853' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS actorId, N'adriana@gmail.com' AS actorEmail, N'ADRIANA REVOLLEDO ACTUALIZADO' AS actorName,
        N'4d4481a3-f8b8-42bc-a36c-80ad1bc2d8aa' AS targetId, N'adriana@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T12:42:04.194Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '802377ef-3972-43cc-89b4-e0ff3ef3acfd' AS id, N'user_created' AS action, N'Usuario creado' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        N'889b587e-c40c-46d5-908e-307b2146b4b9' AS targetId, N'valery@gmail.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T13:01:10.183Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, N'{"email":"valery@gmail.com","role":"tendero"}' AS details,
        N'admin' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '9cb19d23-ef31-4398-bd20-2a2ce8115b29' AS id, N'user_created' AS action, N'Usuario creado' AS actionLabel,
        N'88910e5a-fabc-43ac-9156-0cdc1bedad89' AS actorId, N'superuser@superuser.com' AS actorEmail, N'MARCO REVOLLEDO JARAMILLO' AS actorName,
        N'd82b6b13-2529-4676-b003-ec6369d8c670' AS targetId, N'root@superuser.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36' AS userAgent,
        CAST('2026-09-13T13:02:34.429Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, N'{"email":"root@superuser.com","role":"superuser"}' AS details,
        N'admin' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);

MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT '6cd3ca64-75b9-442d-b1cd-4dc7f17bbbab' AS id, N'login' AS action, N'Inicio de sesión' AS actionLabel,
        N'd82b6b13-2529-4676-b003-ec6369d8c670' AS actorId, N'root@superuser.com' AS actorEmail, N'SUPERUSERGENERIC' AS actorName,
        N'd82b6b13-2529-4676-b003-ec6369d8c670' AS targetId, N'root@superuser.com' AS targetEmail,
        N'127.0.0.1' AS ipAddress, N'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0' AS userAgent,
        CAST('2026-09-13T13:03:20.113Z' AS datetime2) AS [timestamp],
        1 AS success,
        NULL AS failureReason, NULL AS details,
        N'web' AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);
PRINT 'Audit logs OK.';
GO

PRINT '============================================';
PRINT 'Importación completada correctamente.';
PRINT '============================================';
