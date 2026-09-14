# Backend — Mi Valecito API

Express.js REST API con autenticación JWT, roles granulares y soporte dual CSV/Azure SQL.

## Inicio

```bash
cd backend
npm install
# Crear .env (ver sección Configuración)
npm run dev          # desarrollo con nodemon
npm start            # producción
```

## Configuración (`.env`)

```env
PORT=3001
JWT_SECRET=tu-clave-secreta-minimo-32-chars
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Para Azure SQL (opcional — sin esto usa CSV)
DATA_PROVIDER=sql
DB_SERVER=sv-db-dev-mivalencito-001.database.windows.net
DB_NAME=db_dev_mivalecito_001
DB_USER=auth_app_runtime
DB_PASSWORD=tu-password
```

## Estructura

```
backend/
├── src/
│   ├── server.js              # Entry point, CORS, rutas
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
│   ├── models/
│   │   ├── User.js            # CRUD usuarios (CSV + SQL)
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
│   └── utils/
│       ├── responseFormatter.js  # Respuestas estandarizadas
│       ├── tokenUtils.js
│       ├── tokenManager.js
│       ├── passwordUtils.js      # PBKDF2 hash
│       ├── rateLimiter.js
│       └── mailer.js
├── users.csv
├── roles.csv                  # id,name,permissions,canManage,modules
├── modules.csv                # id,name,permRead,permWrite,permFull
├── tokens_granted.csv
├── tokens_revoked.csv
└── migrations/
    └── 01_vale_schema.sql     # Migración Azure SQL (tiendas/vales/abonos)
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
En `roles.csv`, la columna `modules` asigna módulos con nivel:
```
"6:write|7:full"
```
Esto hace que el rol **herede** los permisos de `modules.csv` para ese nivel. Ver `docs/diagrams/er-diagram.md`.

## Migraciones

Para Azure SQL, ejecutar como admin antes de usar endpoints de vales/tiendas:
```bash
# En Azure SQL Query Editor o sqlcmd
backend/migrations/01_vale_schema.sql
```
