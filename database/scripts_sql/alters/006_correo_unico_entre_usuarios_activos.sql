-- ============================================================
-- Mi Valecito - alters/006_correo_unico_entre_usuarios_activos.sql
-- El correo deja de ser único en toda la tabla y pasa a serlo solo entre cuentas ACTIVAS:
--   * no puede haber dos cuentas activas con el mismo correo;
--   * una cuenta deshabilitada libera su correo, que puede volver a registrarse.
-- Cambios (sin tocar datos):
--   1. Se quita la restricción UQ_users_email (única sobre toda la tabla).
--   2. Se crea el índice único filtrado UX_users_email_activo (email) WHERE isActive = 1.
--   3. Se crea IX_users_email (no único) para que las búsquedas por correo sigan usando índice.
-- Idempotente: cada paso comprueba antes de actuar. Las bases existentes cumplen la nueva regla
-- porque antes el correo era único en toda la tabla.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_users_email' AND parent_object_id = OBJECT_ID(N'dbo.users'))
    ALTER TABLE dbo.users DROP CONSTRAINT UQ_users_email;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_users_email_activo' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE UNIQUE INDEX UX_users_email_activo ON dbo.users (email) WHERE isActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_users_email' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE INDEX IX_users_email ON dbo.users (email);
GO
