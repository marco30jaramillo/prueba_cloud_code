-- ============================================================
-- Mi Valecito - esquemas/00_cuenta_aplicacion.sql
-- Crea la cuenta de la APLICACIÓN (backend) de UN ambiente (QA o producción): un usuario
-- contenido de la base (Azure SQL), sin login de servidor. Es la cuenta con la que el
-- backend se conecta en runtime. NO tiene DDL (CA-15).
--
-- ORDEN DE EJECUCIÓN EN UNA BASE NUEVA
--   1. esquemas/00_cuenta_aplicacion.sql   (este: crea el usuario con lectura y escritura)
--   2. inicialización (esquema, alters, inserts)
--   3. esquemas/00_permisos_aplicacion.sql (permisos finos sobre los objetos ya creados)
--   APP_USER debe ser el mismo nombre que espera 00_permisos_aplicacion.sql: auth_app_runtime.
--
-- QUIÉN Y CÓMO LO EJECUTA
--   Lo ejecuta Marco a mano, una vez por ambiente, conectado a la base del ambiente con una
--   cuenta con permiso para crear usuarios. Ningún agente ni `db-setup` lo ejecuta (los 00_*
--   se excluyen). La contraseña entra SOLO por variables de sqlcmd; no se escribe en archivos:
--
--     $env:APP_USER = 'auth_app_runtime'
--     $env:APP_PASSWORD = Read-Host 'Contraseña de la cuenta de la aplicación' -MaskInput
--     sqlcmd -S <servidor>.database.windows.net -d <base> -U <admin> -P <...> -N -b -f 65001 `
--            -i "database\scripts_sql\esquemas\00_cuenta_aplicacion.sql"
--     Remove-Item Env:APP_USER, Env:APP_PASSWORD
--
--   Requisitos (el script aborta si no se cumplen): APP_PASSWORD de 16 caracteres o más,
--   sin comillas simples, corchetes ni paréntesis, y que cumpla la política de contraseñas
--   de Azure SQL. APP_USER solo admite letras, números y guion bajo, y NO puede contener
--   "deploy" (sin distinguir mayúsculas) para no confundirla con la cuenta de despliegue.
--   Nota: una comilla simple en la contraseña rompe el lote al compilar (sqlcmd -b aborta
--   antes de crear nada); la guarda de abajo solo deja el mensaje claro cuando llega a evaluarse.
--
-- CADA AMBIENTE LLEVA SU CONTRASEÑA PROPIA (QA y producción distintas). No reutilizar.
-- Esa contraseña debe cargarse en la configuración (variables de entorno) del App Service
-- del backend del ambiente. NUNCA en el repositorio ni en un archivo versionado.
--
-- PERMISOS: solo db_datareader y db_datawriter.
--   PROHIBIDO y no concedido: db_ddladmin, db_owner, CONTROL, db_securityadmin, ALTER ANY
--   USER, ALTER ANY ROLE, ni permisos de servidor. Ninguna sentencia GRANT en este script.
--
-- Idempotente: si el usuario ya existe NO se le cambia la contraseña (para rotarla, usar
-- ALTER USER ... WITH PASSWORD a mano). Los roles se agregan solo si faltan.
-- ============================================================

SET NOCOUNT ON;
GO

-- Aborta si las variables no se proporcionaron (sqlcmd deja el literal $(...) sin sustituir
-- o vacío) o si el nombre trae caracteres no permitidos.
IF N'$(APP_PASSWORD)' = N'' OR N'$(APP_PASSWORD)' LIKE N'$' + N'(%'
   OR N'$(APP_USER)' = N'' OR N'$(APP_USER)' LIKE N'$' + N'(%'
   OR N'$(APP_USER)' LIKE N'%[^A-Za-z0-9_]%'
BEGIN
    RAISERROR(N'Faltan las variables APP_USER y APP_PASSWORD (o APP_USER tiene caracteres no permitidos). No se creó ninguna cuenta. Ver el encabezado del script.', 16, 1);
    SET NOEXEC ON;
END
GO

-- APP_USER no puede ser la cuenta de despliegue (esa lleva db_ddladmin; esta no).
IF LOWER(N'$(APP_USER)') LIKE N'%deploy%'
BEGIN
    RAISERROR(N'APP_USER no puede contener "deploy": esa es la cuenta de despliegue. Use auth_app_runtime. No se creó ninguna cuenta.', 16, 1);
    SET NOEXEC ON;
END
GO

-- Contraseña: mínimo 16 caracteres y sin comilla simple, corchetes ni paréntesis.
IF LEN(N'$(APP_PASSWORD)') < 16
   OR CHARINDEX(NCHAR(39), N'$(APP_PASSWORD)') > 0
   OR N'$(APP_PASSWORD)' LIKE N'%[[]%' OR N'$(APP_PASSWORD)' LIKE N'%]%'
   OR N'$(APP_PASSWORD)' LIKE N'%(%' OR N'$(APP_PASSWORD)' LIKE N'%)%'
BEGIN
    RAISERROR(N'APP_PASSWORD debe tener al menos 16 caracteres y no contener comillas simples, corchetes ni paréntesis. No se creó ninguna cuenta.', 16, 1);
    SET NOEXEC ON;
END
GO

IF DB_NAME() IN (N'master', N'MiValecito_Dev', N'MiValecito_Cmp')
BEGIN
    RAISERROR(N'Este script es para la base de QA o producción, no para master ni para las bases locales.', 16, 1);
    SET NOEXEC ON;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(APP_USER)' AND type = N'S')
BEGIN
    CREATE USER [$(APP_USER)] WITH PASSWORD = N'$(APP_PASSWORD)';
    PRINT N'Usuario de la aplicación creado';
END
ELSE
    PRINT N'El usuario de la aplicación ya existe; no se cambió su contraseña';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members AS m
    JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id AND r.name = N'db_datareader'
    JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id AND u.name = N'$(APP_USER)')
    ALTER ROLE db_datareader ADD MEMBER [$(APP_USER)];
IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members AS m
    JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id AND r.name = N'db_datawriter'
    JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id AND u.name = N'$(APP_USER)')
    ALTER ROLE db_datawriter ADD MEMBER [$(APP_USER)];
GO

SET NOEXEC OFF;
GO
