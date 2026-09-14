-- ============================================================
-- Mi Valecito — Migration 001: Módulo de Vales y Tiendas
-- Autor: Marco Revolledo
-- Fecha: 2026-09
-- ============================================================
-- Prerrequisito: dbo.users ya existe (creada por la app en el primer arranque).
-- Ejecutar en orden: las FK requieren que las tablas referenciadas existan.
-- Idempotente: usa IF NOT EXISTS en cada bloque.
-- ============================================================

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
        ciudad      NVARCHAR(100)    NOT NULL CONSTRAINT DF_tiendas_ciudad      DEFAULT 'Cartagena',
        telefono    NVARCHAR(20)     NULL,
        logo        NVARCHAR(2048)   NULL,        -- URL de imagen (Azure Blob o /uploads/...)
        isActive    BIT              NOT NULL CONSTRAINT DF_tiendas_isActive    DEFAULT 1,
        createdAt   DATETIME2        NOT NULL CONSTRAINT DF_tiendas_createdAt   DEFAULT GETDATE(),
        createdBy   UNIQUEIDENTIFIER NULL,        -- FK → dbo.users.id  (quién la creó)

        CONSTRAINT PK_tiendas           PRIMARY KEY (id),
        CONSTRAINT FK_tiendas_createdBy FOREIGN KEY (createdBy) REFERENCES dbo.users (id)
    );
    PRINT '✅ Tabla dbo.tiendas creada';
END
ELSE
    PRINT '⏭  Tabla dbo.tiendas ya existe';

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
    PRINT '✅ Tabla dbo.tienda_usuarios creada';
END
ELSE
    PRINT '⏭  Tabla dbo.tienda_usuarios ya existe';

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
    PRINT '✅ Tabla dbo.vales creada';
END
ELSE
    PRINT '⏭  Tabla dbo.vales ya existe';

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
    PRINT '✅ Tabla dbo.abonos creada';
END
ELSE
    PRINT '⏭  Tabla dbo.abonos ya existe';

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

PRINT '✅ Índices creados';

-- ── 6. NUEVOS PERMISOS ───────────────────────────────────────────────────────
-- Agregar solo si no existen (comparar por name).

INSERT INTO dbo.permissions (id, name, description, category)
SELECT v.id, v.name, v.description, v.category
FROM (VALUES
    (22, 'admin:view-roles',     'Ver configuración de roles y permisos',       'admin'),
    (23, 'vale:crear',           'Registrar un nuevo vale para un cliente',      'vale'),
    (24, 'vale:ver-tienda',      'Ver todos los vales activos de la tienda',     'vale'),
    (25, 'vale:ver-propio',      'Cliente: consultar sus propios vales',         'vale'),
    (26, 'vale:anular',          'Anular un vale (solo tendero propietario)',     'vale'),
    (27, 'abono:crear',          'Registrar un abono a un vale',                 'abono'),
    (28, 'abono:ver',            'Ver historial de abonos de un vale',            'abono'),
    (29, 'abono:anular',         'Anular un abono mal registrado',               'abono'),
    (30, 'tienda:ver',           'Consultar información de la tienda',           'tienda'),
    (31, 'tienda:administrar',   'Crear y gestionar tiendas (superuser/admin)',  'tienda'),
    (32, 'cartera:ver',          'Ver resumen de cartera pendiente',             'cartera'),
    (33, 'cartera:reportes',     'Generar reportes de deuda y mora',             'cartera')
) AS v(id, name, description, category)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.permissions p WHERE p.name = v.name
);

PRINT '✅ Nuevos permisos insertados';

-- ── 7. NUEVOS MÓDULOS (IDs 5 – 8) ────────────────────────────────────────────
-- Módulos que aparecerán en el dashboard y la navbar según el rol del usuario.
--
-- id 5 — Mis Vales    → cliente ve sus propios vales y deudas
-- id 6 — Nueva Venta  → tendero/vendedor registra un vale al fiado
-- id 7 — Cartera      → tendero gestiona toda la cartera de su tienda
-- id 8 — Mi Tienda    → tendero administra la info de su tienda

-- IMPORTANTE: usar prefijo N'...' en todos los literales con emoji o acentos.
-- Sin N, SQL Server trata el literal como VARCHAR y corrompe los emoji (muestra ?? o ?).

INSERT INTO dbo.modules (id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull)
SELECT v.id, v.name, v.description, v.buttonLabel, v.href, v.icon, v.showInNav, v.permRead, v.permWrite, v.permFull
FROM (VALUES
    (5, N'Mis Vales',
        N'Consulta tus vales y deudas pendientes',
        N'Ver mis vales', N'/dashboard/mis-vales', N'🧾', 1,
        N'vale:ver-propio',
        N'vale:ver-propio',
        N'vale:ver-propio'),

    (6, N'Nueva Venta',
        N'Registrar una compra al fiado para un cliente',
        N'Registrar vale', N'/dashboard/vale-nuevo', N'➕', 1,
        N'vale:crear',
        N'vale:crear|abono:crear',
        N'vale:crear|abono:crear|vale:anular'),

    (7, N'Cartera',
        N'Cartera activa: vales pendientes y cobros de la tienda',
        N'Ver cartera', N'/dashboard/cartera', N'💼', 1,
        N'vale:ver-tienda|abono:ver',
        N'vale:ver-tienda|abono:ver|abono:crear',
        N'vale:ver-tienda|abono:ver|abono:crear|vale:anular|abono:anular|cartera:reportes'),

    (8, N'Mi Tienda',
        N'Gestionar la información y el equipo de la tienda',
        N'Mi tienda', N'/dashboard/tienda', N'🏪', 1,
        N'tienda:ver',
        N'tienda:ver',
        N'tienda:ver|tienda:administrar')
) AS v(id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.modules m WHERE m.id = v.id
);

PRINT '✅ Nuevos módulos insertados';

-- ── 7b. REPARAR ICONOS CORRUPTOS (si la migración ya corrió sin prefijo N) ───
-- Si los módulos 5-8 ya existen pero sus iconos muestran ?? o ?, ejecutar esto.
-- Es seguro correrlo múltiples veces: solo actualiza si el icono no es el esperado.

UPDATE dbo.modules SET icon = N'🧾' WHERE id = 5 AND icon <> N'🧾';
UPDATE dbo.modules SET icon = N'➕' WHERE id = 6 AND icon <> N'➕';
UPDATE dbo.modules SET icon = N'💼' WHERE id = 7 AND icon <> N'💼';
UPDATE dbo.modules SET icon = N'🏪' WHERE id = 8 AND icon <> N'🏪';

PRINT '✅ Iconos de módulos verificados/reparados';

-- ── 8. ACTUALIZAR ROLES ──────────────────────────────────────────────────────
-- Asignar los nuevos módulos y permisos a cada rol.
--
-- superuser  : acceso total vía system:full-access (actúa como comodín)
-- administrador : gestiona tiendas desde el panel de app; no opera vales directamente
-- tendero    : opera su(s) tienda(s) — registra vales, gestiona cartera
-- vendedor   : solo puede registrar vales y abonos (sin anular, sin ver cartera completa)
-- cliente    : solo consulta sus propios vales

UPDATE dbo.roles SET
    modules = '1:full|2:full|3:full|4:full|5:full|6:full|7:full|8:full'
WHERE name = 'superuser';

UPDATE dbo.roles SET
    permissions = 'admin:manage-users|admin:manage-roles|admin:view-roles|admin:view-stats|admin:view-audit|profile:view-all|profile:view-clients|profile:view-vendors|auth:view-users|auth:create-user|auth:update-user|auth:delete-user|tienda:administrar|tienda:ver|cartera:ver',
    canManage   = 'tendero|vendedor|cliente',
    modules     = '1:full|2:write|3:read|4:read|8:full'
WHERE name = 'administrador';

UPDATE dbo.roles SET
    permissions = 'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|auth:create-user|profile:view-own|profile:edit-own|profile:view-clients|vale:crear|vale:ver-tienda|vale:anular|abono:crear|abono:ver|abono:anular|tienda:ver|cartera:ver|cartera:reportes',
    canManage   = 'cliente',
    modules     = '1:full|6:full|7:full|8:full'
WHERE name = 'tendero';

UPDATE dbo.roles SET
    permissions = 'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|profile:view-own|profile:edit-own|vale:crear|abono:crear|abono:ver|vale:ver-tienda',
    canManage   = '',
    modules     = '1:write|6:write'
WHERE name = 'vendedor';

UPDATE dbo.roles SET
    permissions = 'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|auth:register|profile:view-own|profile:edit-own|vale:ver-propio|abono:ver',
    canManage   = '',
    modules     = '1:read|5:read'
WHERE name = 'cliente';

PRINT '✅ Roles actualizados';

-- ── 9. GRANT DE PERMISOS AL USUARIO DE LA APP ────────────────────────────────
-- El usuario 'auth_app_runtime' es el login que usa el backend en tiempo de
-- ejecución. Necesita SELECT/INSERT/UPDATE/DELETE sobre las cuatro tablas nuevas.
-- (dbo.users ya debería tener permisos otorgados de la configuración inicial.)

GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.tiendas         TO [auth_app_runtime];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.tienda_usuarios TO [auth_app_runtime];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.vales           TO [auth_app_runtime];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.abonos          TO [auth_app_runtime];

PRINT '✅ Permisos otorgados a auth_app_runtime';
PRINT '';
PRINT '============================================================';
PRINT ' Migración 001 completada exitosamente';
PRINT '============================================================';
