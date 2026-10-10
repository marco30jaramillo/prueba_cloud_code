-- ============================================================
-- Mi Valecito - esquemas/00_cuenta_despliegue.sql
-- Crea la cuenta de despliegue de UN ambiente (QA o producción): un usuario contenido de
-- la base (Azure SQL), sin login de servidor, que usa el ejecutor de migraciones
-- (backend/scripts/db-migrate.js) desde el workflow de despliegue.
--
-- QUIÉN Y CÓMO LO EJECUTA
--   Lo ejecuta Marco a mano, conectado a la base del ambiente con una cuenta con permiso
--   para crear usuarios. Ningún agente ni `db-setup` lo ejecuta (los 00_* se excluyen).
--   La contraseña entra SOLO por variables de sqlcmd; no se escribe en este archivo:
--
--     $env:DEPLOY_USER = 'mivalecito_deploy_qa'
--     $env:DEPLOY_PASSWORD = Read-Host 'Contraseña de la cuenta de despliegue' -MaskInput
--     sqlcmd -S <servidor>.database.windows.net -d <base> -U <admin> -P <...> -N -b -f 65001 `
--            -i "database\scripts_sql\esquemas\00_cuenta_despliegue.sql"
--     Remove-Item Env:DEPLOY_USER, Env:DEPLOY_PASSWORD
--
--   Requisitos (el script aborta si no se cumplen): DEPLOY_PASSWORD de 16 caracteres o más,
--   sin comillas simples, corchetes ni paréntesis, y que cumpla la política de contraseñas
--   de Azure SQL. DEPLOY_USER solo admite letras, números y guion bajo, y NO puede ser la
--   cuenta de la aplicación: se rechaza mivalecito_app, auth_app_runtime y cualquier nombre
--   que contenga "app" o "runtime" (sin distinguir mayúsculas), porque esta cuenta recibe
--   db_ddladmin y la de la aplicación no debe tener DDL (CA-15). Debe cargarse luego como
--   secreto DEPLOY_DB_USER / DEPLOY_DB_PASSWORD del ambiente de GitHub correspondiente.
--   Nota: una comilla simple en la contraseña rompe el lote al compilar (sqlcmd -b aborta
--   antes de crear nada); la guarda de abajo solo deja el mensaje claro cuando llega a evaluarse.
--
-- CADA AMBIENTE LLEVA SU CUENTA Y SU CONTRASEÑA PROPIAS. Se ejecuta una vez por base
-- (QA, producción), con una contraseña distinta en cada una. No reutilizar.
--
-- PERMISOS (conjunto propuesto por el plan): db_ddladmin, db_datareader, db_datawriter.
--   db_ddladmin  crear y alterar tablas, índices, restricciones (el ejecutor)
--   db_datareader leer para conciliar
--   db_datawriter escribir en inserts/ y en dbo.migraciones_aplicadas
--   PROHIBIDO y no concedido: db_owner, CONTROL, db_securityadmin, ALTER ANY USER,
--   ALTER ANY ROLE, ni permisos de servidor. La cuenta no puede crear usuarios ni cambiar
--   roles directamente.
--
-- RIESGO ACEPTADO (no es un límite fuerte):
--   * db_ddladmin incluye ALTER ANY SCHEMA y ALTER ANY DATABASE DDL TRIGGER. Es una vía
--     conocida de escalada: la cuenta puede crear un trigger DDL de base que se ejecute con
--     los privilegios de quien luego corra un DDL en esa base (p. ej. un administrador), y
--     así adquirir sus permisos. Esta cuenta NO está aislada de un administrador que opere
--     después en la misma base.
--   * Con db_datareader y db_datawriter la cuenta lee y escribe TODOS los datos personales
--     y crediticios (usuarios, vales, abonos), no solo el esquema.
--   Se acepta mientras la variante granular (bloque comentado al final) se valida en QA.
--   Marco decide el cambio con security-expert ANTES de producción.
--
-- ADVERTENCIA: con permisos de esquema, DROP y TRUNCATE siguen siendo técnicamente
-- posibles. La barrera real no es el permiso: es el ejecutor (revisión de sentencias
-- destructivas, aprobación en archivo aparte, conciliación) y la revisión del PR por Marco.
--
-- ALTERNATIVA GRANULAR (no aplicada; sin verificar en Azure SQL; ver bloque comentado al
-- final): CREATE TABLE a nivel base + ALTER y REFERENCES sobre SCHEMA::dbo, y
-- SELECT/INSERT/UPDATE/DELETE sobre SCHEMA::dbo. Tiene la ventaja de no poder crear
-- esquemas nuevos ni otros objetos fuera de dbo; el mismo riesgo de DROP/TRUNCATE.
--
-- Idempotente: si el usuario ya existe NO se le cambia la contraseña (para rotarla, usar
-- ALTER USER ... WITH PASSWORD a mano). Los permisos se reconcilian: los roles se agregan
-- solo si faltan.
-- ============================================================

SET NOCOUNT ON;
GO

-- Aborta si las variables no se proporcionaron (sqlcmd deja el literal $(...) sin sustituir
-- o vacío) o si el nombre trae caracteres no permitidos.
IF N'$(DEPLOY_PASSWORD)' = N'' OR N'$(DEPLOY_PASSWORD)' LIKE N'$' + N'(%'
   OR N'$(DEPLOY_USER)' = N'' OR N'$(DEPLOY_USER)' LIKE N'$' + N'(%'
   OR N'$(DEPLOY_USER)' LIKE N'%[^A-Za-z0-9_]%'
BEGIN
    RAISERROR(N'Faltan las variables DEPLOY_USER y DEPLOY_PASSWORD (o DEPLOY_USER tiene caracteres no permitidos). No se creó ninguna cuenta. Ver el encabezado del script.', 16, 1);
    SET NOEXEC ON;
END
GO

-- DEPLOY_USER no puede ser la cuenta de la aplicación: recibiría db_ddladmin (rompe CA-15).
-- Regla: rechaza cualquier nombre que contenga "app" o "runtime" (cubre mivalecito_app y
-- auth_app_runtime); la comparación no distingue mayúsculas.
IF LOWER(N'$(DEPLOY_USER)') LIKE N'%app%' OR LOWER(N'$(DEPLOY_USER)') LIKE N'%runtime%'
BEGIN
    RAISERROR(N'DEPLOY_USER no puede ser la cuenta de la aplicación ni contener "app" o "runtime". Use un nombre como mivalecito_deploy_qa. No se creó ninguna cuenta.', 16, 1);
    SET NOEXEC ON;
END
GO

-- Contraseña: mínimo 16 caracteres y sin comilla simple, corchetes ni paréntesis.
IF LEN(N'$(DEPLOY_PASSWORD)') < 16
   OR CHARINDEX(NCHAR(39), N'$(DEPLOY_PASSWORD)') > 0
   OR N'$(DEPLOY_PASSWORD)' LIKE N'%[[]%' OR N'$(DEPLOY_PASSWORD)' LIKE N'%]%'
   OR N'$(DEPLOY_PASSWORD)' LIKE N'%(%' OR N'$(DEPLOY_PASSWORD)' LIKE N'%)%'
BEGIN
    RAISERROR(N'DEPLOY_PASSWORD debe tener al menos 16 caracteres y no contener comillas simples, corchetes ni paréntesis. No se creó ninguna cuenta.', 16, 1);
    SET NOEXEC ON;
END
GO

IF DB_NAME() IN (N'master', N'MiValecito_Dev', N'MiValecito_Cmp')
BEGIN
    RAISERROR(N'Este script es para la base de QA o producción, no para master ni para las bases locales.', 16, 1);
    SET NOEXEC ON;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(DEPLOY_USER)' AND type = N'S')
BEGIN
    CREATE USER [$(DEPLOY_USER)] WITH PASSWORD = N'$(DEPLOY_PASSWORD)';
    PRINT N'Usuario de despliegue creado';
END
ELSE
    PRINT N'El usuario de despliegue ya existe; no se cambió su contraseña';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members AS m
    JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id AND r.name = N'db_ddladmin'
    JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id AND u.name = N'$(DEPLOY_USER)')
    ALTER ROLE db_ddladmin ADD MEMBER [$(DEPLOY_USER)];
IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members AS m
    JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id AND r.name = N'db_datareader'
    JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id AND u.name = N'$(DEPLOY_USER)')
    ALTER ROLE db_datareader ADD MEMBER [$(DEPLOY_USER)];
IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members AS m
    JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id AND r.name = N'db_datawriter'
    JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id AND u.name = N'$(DEPLOY_USER)')
    ALTER ROLE db_datawriter ADD MEMBER [$(DEPLOY_USER)];
GO

SET NOEXEC OFF;
GO

-- ── Alternativa granular (NO se ejecuta; para evaluar con security-expert) ───
-- GRANT CREATE TABLE TO [$(DEPLOY_USER)];
-- GRANT ALTER, REFERENCES, SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [$(DEPLOY_USER)];
-- Reemplazaría a los tres roles. Si el ejecutor llegara a crear vistas o procedimientos,
-- habría que agregar CREATE VIEW / CREATE PROCEDURE.
