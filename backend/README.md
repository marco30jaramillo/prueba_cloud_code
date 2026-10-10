# Backend — Mi Valecito API

API REST en Express.js (CommonJS) con autenticación JWT y permisos por rol. Todos los datos
viven en SQL Server: una instancia local en desarrollo y Azure SQL en producción.

## Inicio rápido (local)

Requisitos: Node.js, **SQL Server Developer o Express** instalado en el equipo (instancia en
`localhost`, puerto 1433) y la herramienta `sqlcmd`.

Los pasos 1 y 2 se hacen una sola vez por equipo.

**1. Crear la base y la cuenta de la aplicación.** Desde la raíz del repositorio, en
PowerShell y con tu usuario de Windows (`sqlcmd -E`). La contraseña la eliges tú y entra por
una variable de entorno: no se escribe en ningún archivo ni en la línea de comandos.

```powershell
$env:MIVALECITO_APP_PASSWORD = Read-Host 'Contraseña para mivalecito_app' -MaskInput
sqlcmd -E -S localhost -C -b -f 65001 -i "database\scripts_sql\esquemas\00_crear_base_y_usuario.sql"
Remove-Item Env:MIVALECITO_APP_PASSWORD
```

Crea la base `MiValecito_Dev` y la cuenta `mivalecito_app`, que solo puede leer y escribir
datos (no puede crear ni alterar tablas). La contraseña debe tener 12 caracteres o más, sin
comillas simples ni paréntesis. El script se puede repetir; si la cuenta ya existe, no le
cambia la contraseña.

**2. Crear las tablas y los catálogos.**

```powershell
cd backend
npm install
npm run db:setup
```

Ejecuta con `sqlcmd -E`, contra `localhost` y `MiValecito_Dev`, los scripts de `esquemas/`
(salvo el `00_*`) y luego los de `inserts/`. Es repetible: no duplica nada.

**3. Crear `backend/.env`** a partir del ejemplo y completar los dos valores vacíos:

```powershell
Copy-Item env.example .env
```

- `JWT_SECRET`: un secreto propio de 32 caracteres o más.
- `DB_PASSWORD`: la contraseña que elegiste en el paso 1.

Copiado tal cual, el backend no arranca: indica qué falta y termina.

**4. Arrancar.**

```powershell
npm run dev      # node --watch, puerto 3001
```

Comprobación: `GET http://localhost:3001/health`. El primer superusuario se crea con
`POST /auth/bootstrap-superuser` (pantalla `/bootstrap` de la web).

**5. Datos de prueba (opcional).**

```powershell
npm run db:seed               # tiendas, usuarios y vales de ejemplo
npm run db:seed -- --clean    # borra antes lo que el propio seed creó
```

Solo corre contra la base local: se niega si el entorno define `AZURE_SQL_*` o una cadena de
conexión, o si `DB_SERVER` no es `localhost`. Los usuarios que crea son ficticios y existen
únicamente en esa base local.

**6. Pruebas.**

```powershell
node --test
```

Corre las pruebas de `tests/*.test.js` (configuración de conexión, validación de arranque y
scripts de base de datos). No necesitan base de datos ni servidor. `tests/security_tests.js`
es aparte: se ejecuta a mano contra un servidor local en marcha.
Exige `TEST_SUPERUSER_EMAIL` y `TEST_SUPERUSER_PASSWORD` (sin valor por defecto) y admite `TEST_API_URL` (por defecto `http://localhost:3001`).

## Configuración

Todo entra por variables de entorno. En local, `backend/.env` (no se versiona) a partir de
[`env.example`](env.example); para producción, los nombres están en
[`.env.production.example`](.env.production.example) y los valores se configuran en el App
Service.

| Variable | Para qué |
|---|---|
| `PORT` | 3001 en local, 8080 en Azure |
| `NODE_ENV` | `development` en local, `production` en Azure |
| `JWT_SECRET` | Firma de los tokens. Obligatorio, 32 caracteres o más; no tiene valor por defecto |
| `APP_URL` | URL pública del backend (enlaces de recuperación y fotos) |
| `FRONTEND_URL` | Origen de la web permitido por CORS |
| `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` | Conexión a SQL Server local |
| `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE` | Cifrado de la conexión local |
| `AZURE_SQL_SERVER`, `AZURE_SQL_DATABASE`, `AZURE_SQL_USER`, `AZURE_SQL_PASSWORD` | Conexión a Azure SQL |
| `AZURE_SQL_CONNECTION_STRING` | Alternativa a las cuatro anteriores |
| `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` | Fotos en Blob Storage; sin ellas se guardan en `datos/uploads/` |

Reglas que el backend comprueba al arrancar, antes de abrir ninguna conexión:

- **Una sola forma de conexión.** O las variables `DB_*`, o las cuatro `AZURE_SQL_*`, o
  `AZURE_SQL_CONNECTION_STRING`. Si coexisten dos, no arranca.
- **Cifrado.** Confiar en un certificado autofirmado (`DB_TRUST_SERVER_CERTIFICATE=true`) o
  desactivar el cifrado solo se acepta hacia `localhost`, con `NODE_ENV` en `development` o
  `test`, y fuera de App Service. Con `AZURE_SQL_*` la conexión va siempre cifrada y validando
  el certificado.
- **`JWT_SECRET`** presente y de 32 caracteres o más.

Los mensajes de error de configuración nunca incluyen la contraseña ni la cadena de conexión.

## Base de datos: `database/scripts_sql/`

Todos los scripts SQL del proyecto están en `database/scripts_sql/`, en cuatro carpetas:

| Carpeta | Contenido | Quién lo ejecuta |
|---|---|---|
| `esquemas/` | Scripts principales de creación, idempotentes: `00_crear_base_y_usuario.sql` (base y cuenta locales), `01_esquema_inicial.sql` (usuarios, roles, permisos, módulos, tokens, auditoría) y `02_esquema_vales.sql` (tiendas, vales, abonos) | El `00_*`, una persona con `sqlcmd -E`; el resto, `npm run db:setup` |
| `alters/` | Cambios sobre una base que ya existe, numerados (`001_...`) | En QA y producción, el ejecutor de migraciones desde el workflow de despliegue ([`scripts/db-migrate.md`](scripts/db-migrate.md)). En local, a mano; `npm run db:setup` aplica solo esquemas e inserts |
| `inserts/` | Catálogos de fábrica: permisos, roles y módulos; idempotentes | `npm run db:setup` |
| `consultas/` | Consultas de solo lectura para verificar, como `conciliar_saldos.sql` | A mano |

**Regla:** todo cambio que se escribe en `alters/` se refleja también en el script principal
de `esquemas/` (o de `inserts/`, si cambia un catálogo). Así, una base creada desde cero con
`esquemas/` + `inserts/` queda igual que una base antigua a la que se le aplicaron los
`alters/`, y `npm run db:setup` nunca necesita ejecutar `alters/`.

## Estructura

```
backend/
├── src/
│   ├── server.js              # Arranque, CORS, rutas, limpieza diaria de tokens
│   ├── config/
│   │   └── startupChecks.js   # Validación de configuración al arrancar
│   ├── database/
│   │   ├── dbConfig.js        # Resuelve y valida la configuración de conexión
│   │   └── sqlPool.js         # Único punto de conexión a SQL Server
│   ├── routes/
│   │   ├── auth.js            # /auth — login, register, tokens
│   │   ├── users.js           # /users — gestión de usuarios
│   │   ├── modules.js         # /modules — módulos por rol
│   │   ├── roles-config.js    # /roles-config — roles y permisos
│   │   ├── tiendas.js         # /tiendas — tiendas y equipo
│   │   ├── vales.js           # /vales — créditos y abonos
│   │   ├── audit.js           # /audit — logs de auditoría
│   │   ├── upload.js          # /upload — subida de fotos
│   │   └── docs.js            # /docs — documentación API
│   ├── models/                # Todo el SQL vive aquí, parametrizado
│   │   ├── User.js            # Usuarios
│   │   ├── Role.js            # Jerarquía, herencia de permisos
│   │   ├── Module.js          # Módulos con niveles de permiso
│   │   ├── Vale.js            # Vales al fiado
│   │   ├── Abono.js           # Abonos a vales
│   │   ├── Tienda.js          # Tiendas y equipo
│   │   ├── AuditLog.js        # Logs de auditoría
│   │   └── Permission.js      # Permisos granulares
│   ├── middleware/
│   │   ├── auth.js            # JWT verify, authMiddleware
│   │   ├── roleMiddleware.js  # requireRole(), requirePermission()
│   │   └── auditMiddleware.js # Registro automático de acciones
│   ├── scripts/
│   │   └── cleanExpiredTokens.js
│   └── utils/
│       ├── responseFormatter.js  # Respuestas estandarizadas
│       ├── tokenUtils.js
│       ├── tokenManager.js       # Tokens otorgados y revocados (SQL)
│       ├── passwordUtils.js      # PBKDF2 hash
│       ├── passwordValidator.js
│       ├── dataNormalizer.js
│       ├── rateLimiter.js
│       └── mailer.js
├── scripts/
│   ├── db-setup.js            # npm run db:setup
│   ├── seed.js                # npm run db:seed
│   └── lib/entornoLocal.js    # Guarda: los scripts solo corren contra la base local
├── tests/
│   ├── *.test.js              # node --test
│   └── security_tests.js      # A mano, contra el servidor local
├── env.example
└── .env.production.example
```

## Endpoints

### Documentación interactiva (sin auth)
```
GET /docs           → panorama general
GET /docs/auth      → módulo de autenticación
GET /docs/users     → gestión de usuarios
GET /docs/tiendas   → tiendas y equipo
GET /docs/vales     → vales y abonos
GET /docs/modules   → módulos del dashboard
GET /docs/roles     → roles y permisos
GET /docs/audit     → auditoría
```

### Auth (`/auth`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Registrar cliente |
| POST | `/auth/login` | — | Iniciar sesión → JWT |
| GET | `/auth/validate` | ✅ | Validar token activo |
| POST | `/auth/logout` | ✅ | Revocar token |
| POST | `/auth/logout-all` | ✅ | Revocar todos los tokens |
| PATCH | `/auth/change-password` | ✅ | Cambiar propia contraseña |
| PATCH | `/auth/profile` | ✅ | Actualizar nombre |
| POST | `/auth/create-user` | ✅ admin | Crear usuario |
| PATCH | `/auth/password/:userId` | ✅ admin | Cambiar contraseña de otro |
| POST | `/auth/forgot-password` | — | Solicitar recuperación |
| POST | `/auth/reset-password` | — | Restablecer con token |
| POST | `/auth/bootstrap-superuser` | — | Primer superusuario |

### Usuarios (`/users`)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/users` | `admin:manage-users` | Listar usuarios gestionables |
| GET | `/users/manageable-roles` | `admin:manage-users` | Roles asignables |
| GET | `/users/clientes/buscar?q=` | auth | Buscar clientes |
| PATCH | `/users/:id` | `admin:manage-users` | Editar usuario |
| PATCH | `/users/:id/status` | `admin:manage-users` | Activar/desactivar |
| POST | `/users/:id/generate-password` | `admin:manage-users` | Generar contraseña |

### Tiendas (`/tiendas`)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/tiendas` | `tienda:administrar` | Todas las tiendas |
| GET | `/tiendas/mis-tiendas` | `tienda:ver` | Tiendas del usuario |
| POST | `/tiendas` | `tienda:administrar` | Crear tienda |
| GET | `/tiendas/:id` | `tienda:ver` | Detalle de tienda |
| PATCH | `/tiendas/:id` | `tienda:administrar` | Actualizar tienda |
| PATCH | `/tiendas/:id/status` | `tienda:administrar` | Activar/desactivar |
| GET | `/tiendas/:id/usuarios` | `tienda:ver` | Equipo de la tienda |
| POST | `/tiendas/:id/usuarios` | `tienda:administrar` | Asignar usuario |
| DELETE | `/tiendas/:id/usuarios/:userId` | `tienda:administrar` | Quitar usuario |

### Vales (`/vales`)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/vales` | `vale:crear` | Crear vale al fiado |
| POST | `/vales/pago-integral` | `abono:crear` | Pago distribuido entre vales |
| GET | `/vales/mis-vales` | `vale:ver-propio` | Vales del cliente |
| GET | `/vales/tienda/:tiendaId` | `vale:ver-tienda` | Cartera de la tienda |
| GET | `/vales/usuario/:userId` | `vale:ver-tienda` | Vales de un cliente |
| GET | `/vales/:id` | auth | Detalle de vale |
| PATCH | `/vales/:id/anular` | `vale:anular` | Anular vale |
| POST | `/vales/:id/abonos` | `abono:crear` | Registrar abono |
| GET | `/vales/:id/abonos` | `abono:ver` | Historial de abonos |
| PATCH | `/vales/:valeId/abonos/:abonoId/anular` | `abono:anular` | Anular abono |

### Módulos, Roles, Auditoría
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/modules` | Módulos accesibles al rol actual |
| GET | `/modules/all` | Todos los módulos (superuser) |
| GET | `/roles-config` | Matriz roles/módulos/permisos |
| POST | `/roles-config` | Crear rol |
| PATCH | `/roles-config/:roleId` | Actualizar rol |
| GET | `/audit/logs` | Últimas 100 entradas |

## Formato de Respuesta

```json
// Éxito
{ "status": "success", "data": { ... }, "message": "Opcional" }

// Error
{ "status": "error", "message": "Descripción del error" }
```

## Sistema de Permisos

Los endpoints usan `requirePermission('perm:nombre')` — **nunca** roles hardcodeados.  
`system:full-access` es un comodín que solo tiene `superuser`.

### Herencia desde módulos
En la tabla `dbo.roles`, la columna `modules` asigna módulos con nivel:
```
"6:write|7:full"
```
Esto hace que el rol **herede** los permisos que la tabla `dbo.modules` define para ese nivel
(`permRead`, `permWrite`, `permFull`). Ver `docs/diagrams/er-diagram.md`.
