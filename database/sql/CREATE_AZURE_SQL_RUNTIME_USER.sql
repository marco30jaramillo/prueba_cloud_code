/*
  Credenciales de runtime para la aplicación.

  Ejecuta el BLOQUE 1 conectado a la base `master` del servidor lógico Azure SQL
  como administrador SQL. Ejecuta el BLOQUE 2 conectado a la base de datos de
  la aplicación. Reemplaza el nombre y la contraseña antes de ejecutar.

  No uses esta cuenta para ejecutar migraciones DDL. El esquema debe crearlo el
  administrador o una cuenta temporal de migración, separada de la aplicación.
*/

/* BLOQUE 1 — base de datos master */
CREATE LOGIN [auth_app_runtime]
WITH PASSWORD = '&4S[W^kw75q*"y{g2$46U*#X]J(h[1Wb%5';
GO

/* BLOQUE 2 — base de datos de la aplicación */
CREATE USER [auth_app_runtime] FOR LOGIN [auth_app_runtime];
GO

/* Lectura necesaria para autenticación, autorización y auditoría. */
GRANT SELECT ON dbo.users           TO [auth_app_runtime];
GRANT SELECT ON dbo.roles           TO [auth_app_runtime];
GRANT SELECT ON dbo.permissions     TO [auth_app_runtime];
GRANT SELECT ON dbo.modules         TO [auth_app_runtime];
GRANT SELECT ON dbo.tokens_granted  TO [auth_app_runtime];
GRANT SELECT ON dbo.tokens_revoked  TO [auth_app_runtime];
GRANT SELECT ON dbo.audit_logs      TO [auth_app_runtime];
GO

/* Escrituras que reproduce la funcionalidad actual. */
GRANT INSERT, UPDATE ON dbo.users          TO [auth_app_runtime];
GRANT INSERT, UPDATE ON dbo.roles          TO [auth_app_runtime];
GRANT INSERT, UPDATE, DELETE ON dbo.tokens_granted TO [auth_app_runtime];
GRANT INSERT, UPDATE, DELETE ON dbo.tokens_revoked TO [auth_app_runtime];
GRANT INSERT ON dbo.audit_logs              TO [auth_app_runtime];
GO

/*
  No se otorgan ALTER, CREATE, DROP, CONTROL, db_owner ni permisos sobre
  permisos/módulos, porque la aplicación actual solo los consulta.
*/
