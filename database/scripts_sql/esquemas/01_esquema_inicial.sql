/*
  Mi Valecito - esquemas/01_esquema_inicial.sql
  Tablas base: roles, permissions, modules, users, tokens_granted, tokens_revoked, audit_logs.

  Origen: database/migrations/001_initial_schema.sql. Las definiciones de tablas e indices
  son las mismas; solo se envolvio cada CREATE en una comprobacion de existencia para que
  el script sea idempotente.

  roles.permissions, roles.canManage, roles.modules y los campos permRead, permWrite y
  permFull de modules conservan su formato delimitado por "|".
  users.role no tiene llave foranea intencionalmente: referencia roles.name como texto.

  Compatible con SQL Server y Azure SQL Database. Los catalogos se cargan con inserts/.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles (
        id          INT            NOT NULL,
        name        NVARCHAR(100)  NOT NULL,
        description NVARCHAR(500)  NOT NULL,
        permissions NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_roles_permissions DEFAULT (N''),
        canManage   NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_roles_canManage DEFAULT (N''),
        modules     NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_roles_modules DEFAULT (N''),

        CONSTRAINT PK_roles PRIMARY KEY (id),
        CONSTRAINT UQ_roles_name UNIQUE (name)
    );
END;
GO

IF OBJECT_ID(N'dbo.permissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.permissions (
        id          INT            NOT NULL,
        name        NVARCHAR(150)  NOT NULL,
        description NVARCHAR(500)  NOT NULL,
        category    NVARCHAR(100)  NOT NULL,

        CONSTRAINT PK_permissions PRIMARY KEY (id),
        CONSTRAINT UQ_permissions_name UNIQUE (name)
    );
END;
GO

IF OBJECT_ID(N'dbo.modules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.modules (
        id          INT            NOT NULL,
        name        NVARCHAR(150)  NOT NULL,
        description NVARCHAR(1000) NOT NULL,
        buttonLabel NVARCHAR(150)  NOT NULL,
        href        NVARCHAR(500)  NOT NULL,
        icon        NVARCHAR(50)   NOT NULL,
        showInNav   BIT            NOT NULL CONSTRAINT DF_modules_showInNav DEFAULT (1),
        permRead    NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_modules_permRead DEFAULT (N''),
        permWrite   NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_modules_permWrite DEFAULT (N''),
        permFull    NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_modules_permFull DEFAULT (N''),

        CONSTRAINT PK_modules PRIMARY KEY (id),
        CONSTRAINT UQ_modules_name UNIQUE (name),
        CONSTRAINT UQ_modules_href UNIQUE (href)
    );
END;
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id                 UNIQUEIDENTIFIER NOT NULL,
        email              NVARCHAR(320)    NOT NULL,
        password           NVARCHAR(512)    NOT NULL,
        name               NVARCHAR(300)    NOT NULL,
        role               NVARCHAR(100)    NOT NULL,
        photo              NVARCHAR(2048)   NULL,
        isActive           BIT              NOT NULL CONSTRAINT DF_users_isActive DEFAULT (1),
        mustChangePassword BIT              NOT NULL CONSTRAINT DF_users_mustChangePassword DEFAULT (0),
        createdAt          DATETIME2(3)     NOT NULL CONSTRAINT DF_users_createdAt DEFAULT (SYSUTCDATETIME()),
        resetToken         NVARCHAR(128)    NULL,
        resetTokenExpiry   DATETIME2(3)     NULL,

        CONSTRAINT PK_users PRIMARY KEY (id),
        CONSTRAINT UQ_users_email UNIQUE (email)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_users_role' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE INDEX IX_users_role ON dbo.users (role);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_users_resetToken' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE INDEX IX_users_resetToken ON dbo.users (resetToken) WHERE resetToken IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.tokens_granted', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tokens_granted (
        tokenId   UNIQUEIDENTIFIER NOT NULL,
        userId    UNIQUEIDENTIFIER NOT NULL,
        email     NVARCHAR(320)    NOT NULL,
        token     NVARCHAR(MAX)    NOT NULL,
        issuedAt  DATETIME2(3)     NOT NULL,
        expiresAt DATETIME2(3)     NOT NULL,

        CONSTRAINT PK_tokens_granted PRIMARY KEY (tokenId),
        CONSTRAINT FK_tokens_granted_users FOREIGN KEY (userId) REFERENCES dbo.users(id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_tokens_granted_userId' AND object_id = OBJECT_ID(N'dbo.tokens_granted'))
    CREATE INDEX IX_tokens_granted_userId ON dbo.tokens_granted (userId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_tokens_granted_expiresAt' AND object_id = OBJECT_ID(N'dbo.tokens_granted'))
    CREATE INDEX IX_tokens_granted_expiresAt ON dbo.tokens_granted (expiresAt);
GO

IF OBJECT_ID(N'dbo.tokens_revoked', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tokens_revoked (
        tokenId   UNIQUEIDENTIFIER NOT NULL,
        userId    UNIQUEIDENTIFIER NOT NULL,
        email     NVARCHAR(320)    NOT NULL,
        token     NVARCHAR(MAX)    NOT NULL,
        revokedAt DATETIME2(3)     NOT NULL,
        expiresAt DATETIME2(3)     NOT NULL,

        CONSTRAINT PK_tokens_revoked PRIMARY KEY (tokenId),
        CONSTRAINT FK_tokens_revoked_users FOREIGN KEY (userId) REFERENCES dbo.users(id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_tokens_revoked_userId' AND object_id = OBJECT_ID(N'dbo.tokens_revoked'))
    CREATE INDEX IX_tokens_revoked_userId ON dbo.tokens_revoked (userId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_tokens_revoked_expiresAt' AND object_id = OBJECT_ID(N'dbo.tokens_revoked'))
    CREATE INDEX IX_tokens_revoked_expiresAt ON dbo.tokens_revoked (expiresAt);
GO

IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.audit_logs (
        id            UNIQUEIDENTIFIER NOT NULL,
        action        NVARCHAR(100)    NOT NULL,
        actionLabel   NVARCHAR(300)    NOT NULL,
        actorId       NVARCHAR(100)    NULL,
        actorEmail    NVARCHAR(320)    NULL,
        actorName     NVARCHAR(300)    NULL,
        targetId      NVARCHAR(100)    NULL,
        targetEmail   NVARCHAR(320)    NULL,
        ipAddress     NVARCHAR(64)     NULL,
        userAgent     NVARCHAR(MAX)    NULL,
        [timestamp]   DATETIME2(3)     NOT NULL,
        success       BIT              NOT NULL,
        failureReason NVARCHAR(1000)   NULL,
        details       NVARCHAR(MAX)    NULL,
        method        NVARCHAR(50)     NULL,

        CONSTRAINT PK_audit_logs PRIMARY KEY (id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_logs_timestamp' AND object_id = OBJECT_ID(N'dbo.audit_logs'))
    CREATE INDEX IX_audit_logs_timestamp ON dbo.audit_logs ([timestamp] DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_logs_action_timestamp' AND object_id = OBJECT_ID(N'dbo.audit_logs'))
    CREATE INDEX IX_audit_logs_action_timestamp ON dbo.audit_logs (action, [timestamp] DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_logs_actorId_timestamp' AND object_id = OBJECT_ID(N'dbo.audit_logs'))
    CREATE INDEX IX_audit_logs_actorId_timestamp ON dbo.audit_logs (actorId, [timestamp] DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_logs_targetId_timestamp' AND object_id = OBJECT_ID(N'dbo.audit_logs'))
    CREATE INDEX IX_audit_logs_targetId_timestamp ON dbo.audit_logs (targetId, [timestamp] DESC);
GO
