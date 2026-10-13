-- ============================================================
-- Mi Valecito - esquemas/02_esquema_vales.sql
-- Tablas del módulo de vales: tiendas, tienda_usuarios, vales, abonos, y sus índices.
--
-- Origen: backend/migrations/01_vale_schema.sql (secciones 1 a 5 y 9). Las definiciones
-- de tablas e índices no cambian.
-- Prerrequisito: esquemas/01_esquema_inicial.sql (las llaves foráneas apuntan a dbo.users).
-- Idempotente: cada bloque comprueba antes si el objeto existe.
--
-- Los datos de catálogo que traía el script original (permisos 22 a 33, módulos 5 a 8 y
-- la actualización de roles) ya no están aquí: se cargan con inserts/01_permisos.sql,
-- inserts/02_roles.sql e inserts/03_modulos.sql.
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ── 1. TIENDAS ───────────────────────────────────────────────────────────────
-- Las tiendas son creadas y administradas por superuser / administrador de app.
-- Un tendero puede pertenecer a una o varias tiendas (ver tienda_usuarios).

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tiendas' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tiendas (
        id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_tiendas_id          DEFAULT NEWID(),
        nombre      NVARCHAR(200)    NOT NULL,
        descripcion NVARCHAR(500)    NULL,
        direccion   NVARCHAR(300)    NULL,
        ciudad      NVARCHAR(100)    NOT NULL CONSTRAINT DF_tiendas_ciudad      DEFAULT '',
        telefono    NVARCHAR(20)     NULL,
        logo        NVARCHAR(2048)   NULL,        -- URL de imagen (Azure Blob o /uploads/...)
        isActive    BIT              NOT NULL CONSTRAINT DF_tiendas_isActive    DEFAULT 1,
        createdAt   DATETIME2        NOT NULL CONSTRAINT DF_tiendas_createdAt   DEFAULT GETDATE(),
        createdBy   UNIQUEIDENTIFIER NULL,        -- FK → dbo.users.id  (quién la creó)

        CONSTRAINT PK_tiendas           PRIMARY KEY (id),
        CONSTRAINT FK_tiendas_createdBy FOREIGN KEY (createdBy) REFERENCES dbo.users (id)
    );
    PRINT N'Tabla dbo.tiendas creada';
END
ELSE
    PRINT N'Tabla dbo.tiendas ya existe';

-- ── 2. TIENDA_USUARIOS ───────────────────────────────────────────────────────
-- Relación M:N entre tiendas y sus usuarios operativos.
-- esPropietario = 1 → tendero dueño de la tienda.
-- esPropietario = 0 → vendedor empleado de la tienda.
-- Un mismo usuario puede ser propietario de tienda A y empleado de tienda B.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tienda_usuarios' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.tienda_usuarios (
        id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_tu_id            DEFAULT NEWID(),
        tiendaId      UNIQUEIDENTIFIER NOT NULL,
        userId        UNIQUEIDENTIFIER NOT NULL,
        esPropietario BIT              NOT NULL CONSTRAINT DF_tu_propietario   DEFAULT 0,
        assignedAt    DATETIME2        NOT NULL CONSTRAINT DF_tu_assignedAt    DEFAULT GETDATE(),
        assignedBy    UNIQUEIDENTIFIER NULL,      -- FK → dbo.users.id (quien asignó)

        CONSTRAINT PK_tienda_usuarios    PRIMARY KEY (id),
        CONSTRAINT FK_tu_tienda          FOREIGN KEY (tiendaId)   REFERENCES dbo.tiendas (id),
        CONSTRAINT FK_tu_user            FOREIGN KEY (userId)     REFERENCES dbo.users (id),
        CONSTRAINT FK_tu_assignedBy      FOREIGN KEY (assignedBy) REFERENCES dbo.users (id),
        CONSTRAINT UQ_tu_tienda_usuario  UNIQUE (tiendaId, userId)   -- un usuario una sola vez por tienda
    );
    PRINT N'Tabla dbo.tienda_usuarios creada';
END
ELSE
    PRINT N'Tabla dbo.tienda_usuarios ya existe';

-- ── 3. VALES ─────────────────────────────────────────────────────────────────
-- El vale es la compra al fiado.
-- Solo un tendero o vendedor (registradoPor) puede crearlo; el cliente no.
--
-- saldoPendiente: se mantiene sincronizado por la app cada vez que se registra
--                 o anula un abono. saldoPendiente = montoTotal − Σ abonos activos.
--
-- estado evoluciona así:
--   INSERT  → 'pendiente'  (saldoPendiente = montoTotal)
--   abono parcial → 'parcial'   (0 < saldoPendiente < montoTotal)
--   abono total   → 'pagado'    (saldoPendiente = 0)
--   anulación     → 'anulado'   (desde cualquier estado, por tendero)
--
-- fechaVencimiento: si es NULL, el vale no tiene plazo. Si es < GETDATE()
--                   y estado IN ('pendiente','parcial'), el vale está en mora.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'vales' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.vales (
        id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_vales_id            DEFAULT NEWID(),
        tiendaId         UNIQUEIDENTIFIER NOT NULL,
        clienteId        UNIQUEIDENTIFIER NOT NULL,
        registradoPor    UNIQUEIDENTIFIER NOT NULL,    -- tendero o vendedor

        -- Información del vale
        descripcion      NVARCHAR(500)    NOT NULL,
        montoTotal       DECIMAL(12, 2)   NOT NULL,
        saldoPendiente   DECIMAL(12, 2)   NOT NULL,   -- mantenido por la app
        estado           NVARCHAR(20)     NOT NULL CONSTRAINT DF_vales_estado DEFAULT 'pendiente',

        -- Fechas
        fechaVale        DATETIME2        NOT NULL CONSTRAINT DF_vales_fechaVale   DEFAULT GETDATE(),
        fechaVencimiento DATETIME2        NULL,        -- NULL = sin plazo

        -- Notas adicionales
        notas            NVARCHAR(1000)   NULL,

        -- Anulación
        anuladoPor       UNIQUEIDENTIFIER NULL,
        anuladoAt        DATETIME2        NULL,

        -- Auditoría
        createdAt        DATETIME2        NOT NULL CONSTRAINT DF_vales_createdAt   DEFAULT GETDATE(),
        updatedAt        DATETIME2        NOT NULL CONSTRAINT DF_vales_updatedAt   DEFAULT GETDATE(),

        CONSTRAINT PK_vales            PRIMARY KEY (id),
        CONSTRAINT CK_vales_monto      CHECK (montoTotal > 0),
        CONSTRAINT CK_vales_saldo      CHECK (saldoPendiente >= 0 AND saldoPendiente <= montoTotal),
        CONSTRAINT CK_vales_estado     CHECK (estado IN ('pendiente', 'parcial', 'pagado', 'anulado')),
        CONSTRAINT FK_vales_tienda     FOREIGN KEY (tiendaId)      REFERENCES dbo.tiendas (id),
        CONSTRAINT FK_vales_cliente    FOREIGN KEY (clienteId)     REFERENCES dbo.users (id),
        CONSTRAINT FK_vales_reg        FOREIGN KEY (registradoPor) REFERENCES dbo.users (id),
        CONSTRAINT FK_vales_anulado    FOREIGN KEY (anuladoPor)    REFERENCES dbo.users (id)
    );
    PRINT N'Tabla dbo.vales creada';
END
ELSE
    PRINT N'Tabla dbo.vales ya existe';

-- ── 4. ABONOS ────────────────────────────────────────────────────────────────
-- Un abono es un pago parcial o total contra un vale.
-- Al registrar un abono, la app debe:
--   1. Insertar en dbo.abonos
--   2. Recalcular vales.saldoPendiente = montoTotal − Σ abonos WHERE anulado=0
--   3. Actualizar vales.estado y vales.updatedAt
--
-- Si un abono fue mal registrado, se puede anular (anulado=1).
-- La anulación también recalcula el vale.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'abonos' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.abonos (
        id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_abonos_id         DEFAULT NEWID(),
        valeId        UNIQUEIDENTIFIER NOT NULL,
        monto         DECIMAL(12, 2)   NOT NULL,
        registradoPor UNIQUEIDENTIFIER NOT NULL,    -- tendero o vendedor

        -- Detalles
        notas         NVARCHAR(500)    NULL,

        -- Anulación
        anulado       BIT              NOT NULL CONSTRAINT DF_abonos_anulado    DEFAULT 0,
        anuladoPor    UNIQUEIDENTIFIER NULL,
        anuladoAt     DATETIME2        NULL,

        -- Fechas
        fechaAbono    DATETIME2        NOT NULL CONSTRAINT DF_abonos_fechaAbono DEFAULT GETDATE(),
        createdAt     DATETIME2        NOT NULL CONSTRAINT DF_abonos_createdAt  DEFAULT GETDATE(),

        CONSTRAINT PK_abonos        PRIMARY KEY (id),
        CONSTRAINT CK_abonos_monto  CHECK (monto > 0),
        CONSTRAINT FK_abonos_vale   FOREIGN KEY (valeId)        REFERENCES dbo.vales (id),
        CONSTRAINT FK_abonos_reg    FOREIGN KEY (registradoPor) REFERENCES dbo.users (id),
        CONSTRAINT FK_abonos_anulBy FOREIGN KEY (anuladoPor)    REFERENCES dbo.users (id)
    );
    PRINT N'Tabla dbo.abonos creada';
END
ELSE
    PRINT N'Tabla dbo.abonos ya existe';

-- ── 5. ÍNDICES ───────────────────────────────────────────────────────────────
-- Optimizan las consultas más frecuentes de la app.

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_vales_cliente' AND object_id = OBJECT_ID('dbo.vales'))
    CREATE INDEX IX_vales_cliente ON dbo.vales (clienteId, estado);     -- "mis vales" del cliente

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_vales_tienda' AND object_id = OBJECT_ID('dbo.vales'))
    CREATE INDEX IX_vales_tienda  ON dbo.vales (tiendaId, estado);     -- cartera de la tienda

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_vales_venc' AND object_id = OBJECT_ID('dbo.vales'))
    CREATE INDEX IX_vales_venc    ON dbo.vales (fechaVencimiento)      -- alertas de mora
    WHERE fechaVencimiento IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_vales_fecha' AND object_id = OBJECT_ID('dbo.vales'))
    CREATE INDEX IX_vales_fecha   ON dbo.vales (fechaVale DESC);       -- orden cronológico

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_abonos_vale' AND object_id = OBJECT_ID('dbo.abonos'))
    CREATE INDEX IX_abonos_vale   ON dbo.abonos (valeId)               -- abonos de un vale
    WHERE anulado = 0;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tu_user' AND object_id = OBJECT_ID('dbo.tienda_usuarios'))
    CREATE INDEX IX_tu_user       ON dbo.tienda_usuarios (userId);     -- tiendas de un usuario

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tu_tienda' AND object_id = OBJECT_ID('dbo.tienda_usuarios'))
    CREATE INDEX IX_tu_tienda     ON dbo.tienda_usuarios (tiendaId);   -- usuarios de una tienda
GO

-- Los permisos de la cuenta de la aplicación sobre estas tablas no se otorgan aquí: el
-- ejecutor de scripts rechaza sentencias de permisos en esquemas/. Viven en
-- esquemas/00_permisos_aplicacion.sql, que corre una persona después de este script.
GO
