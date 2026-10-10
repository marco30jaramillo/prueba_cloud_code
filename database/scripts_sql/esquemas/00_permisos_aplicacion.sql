-- ============================================================
-- Mi Valecito - esquemas/00_permisos_aplicacion.sql
-- Permisos de la cuenta de la aplicación en Azure SQL (auth_app_runtime) sobre las tablas
-- del módulo de vales: tiendas, tienda_usuarios, vales y abonos.
--
-- En la base local la cuenta es mivalecito_app y ya tiene db_datareader y db_datawriter
-- (esquemas/00_crear_base_y_usuario.sql), que cubren estos permisos: aquí no hace nada.
--
-- Lo ejecuta una persona con permisos, no el ejecutor de scripts (que excluye los 00_* y
-- rechaza sentencias de permisos en esquemas/). Conectado a la base destino, DESPUÉS de
-- esquemas/02_esquema_vales.sql:
--
--   sqlcmd -S <servidor> -d <base> -G -C -b -f 65001 -i "database\scripts_sql\esquemas\00_permisos_aplicacion.sql"
--
-- Además de lo anterior, DENEGA INSERT, UPDATE y DELETE de auth_app_runtime sobre
-- dbo.migraciones_aplicadas (tabla de control del ejecutor): db_datawriter le permitiría
-- escribirla. Va DESPUÉS de la inicialización (que crea la tabla) y se repite después de
-- cada release que la cree o la recree. La cuenta de despliegue (otro usuario) no se ve
-- afectada: el ejecutor sigue registrando migraciones.
--
-- Origen: sección 6 de 02_esquema_vales.sql. Idempotente: se puede repetir.
-- ============================================================

SET NOCOUNT ON;
GO

IF DATABASE_PRINCIPAL_ID(N'auth_app_runtime') IS NOT NULL
   AND OBJECT_ID(N'dbo.abonos') IS NOT NULL
BEGIN
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.tiendas         TO [auth_app_runtime];
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.tienda_usuarios TO [auth_app_runtime];
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.vales           TO [auth_app_runtime];
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.abonos          TO [auth_app_runtime];
    PRINT N'Permisos otorgados a auth_app_runtime';
END
ELSE
    PRINT N'auth_app_runtime o las tablas de vales no existen en esta base: no se otorgan permisos';
GO

-- Tabla de control del ejecutor de scripts: la aplicación puede leerla (SELECT viene de
-- db_datareader, no se toca) pero no escribirla. DENY prevalece sobre db_datawriter.
IF DATABASE_PRINCIPAL_ID(N'auth_app_runtime') IS NOT NULL
   AND OBJECT_ID(N'dbo.migraciones_aplicadas') IS NOT NULL
BEGIN
    DENY INSERT, UPDATE, DELETE ON dbo.migraciones_aplicadas TO [auth_app_runtime];
    PRINT N'Escritura denegada a auth_app_runtime sobre dbo.migraciones_aplicadas';
END
ELSE
    PRINT N'auth_app_runtime o dbo.migraciones_aplicadas no existen en esta base: no se deniega nada';
GO
