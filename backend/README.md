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

Corre las pruebas de `tests/*.test.js` (configuración de conexión, validación de arranque,
scripts de base de datos, correos y guardas del corredor de pruebas con base). **No necesitan
base de datos ni servidor**: es lo que ejecuta el despliegue a QA. `tests/security_tests.js`
es aparte: se ejecuta a mano contra un servidor local en marcha.
Exige `TEST_SUPERUSER_EMAIL` y `TEST_SUPERUSER_PASSWORD` (sin valor por defecto) y admite `TEST_API_URL` (por defecto `http://localhost:3001`).

**7. Pruebas de crédito con base de datos (solo en el computador local).** Dos comandos, mismo mecanismo:
`npm run test:db` (API) y `npm run test:web` (recorrido en navegador de la web).

```powershell
npm run test:db
```

`test:db` es un solo comando, sin argumentos, solo de API: estable y rápido. Cubre la lógica de crédito por HTTP contra la API real:
montos, abonos, anulaciones, pago integral, acceso por tienda y por rol, y la conciliación de
saldos y cartera. Cada prueba lleva en el nombre la regla o el criterio que verifica
(`RN-09 · …`); los defectos conocidos salen como `PENDIENTE` con su identificador del
backlog (no cuentan como fallo).

Qué hace, en orden:

1. Se niega a correr si recibe argumentos, si el entorno define `AZURE_SQL_*` o una cadena de
   conexión, o si `DB_SERVER` no es de bucle local.
2. Descarta la base `MiValecito_Test` si quedó de una corrida interrumpida.
3. Crea `MiValecito_Test` con `esquemas/` e `inserts/` (los mismos de `db:setup`) y da a
   `mivalecito_app` lectura y escritura de datos, sin DDL.
4. Arranca `src/server.js` como proceso hijo, solo en `127.0.0.1:3101`, con un secreto de firma
   aleatorio y correo en modo `outbox` (en una carpeta temporal). Comprueba que el puerto no
   responde por la IP de red del equipo.
5. Crea el primer superusuario y corre `tests-db/*.dbtest.js`, de uno en uno (`test:web` corre
   `tests-web/*.webtest.js` con los mismos pasos 1 a 4 y 6); el último archivo
   concilia toda la base (saldo = monto − abonos, cartera = Σ saldos).
6. Termina el servidor, **elimina `MiValecito_Test`** y borra los temporales, pasen o fallen las
   pruebas (también ante Ctrl+C). Si no pudo eliminarla, sale con código distinto de cero.

La salida termina con el total, las pruebas que pasaron, las que fallaron y las pendientes. El
código de salida es 0 solo si ninguna falló y la base quedó eliminada.

Requisitos: SQL Server local con el login `mivalecito_app` (paso 1 de este inicio rápido),
`sqlcmd` en el PATH, una cuenta de Windows que pueda crear y eliminar bases en el servidor local
y `DB_PASSWORD` en `backend/.env`. No usa `MiValecito_Dev`: no la lee ni la modifica. Duración
típica: menos de un minuto.

**Recorrido en navegador (`npm run test:web`).** Corre el recorrido de crédito de la web con
Playwright (`frontend/e2e`, Edge instalado en el equipo): vale nuevo y cartera. Es un script
aparte, con su carpeta fija `tests-web/`; no acepta argumentos ni parámetros y no forma parte de
`test:db`. Además del backend en `127.0.0.1:3101`, levanta la web en `127.0.0.1:3100` (debe estar
libre; no usa el 3000 de desarrollo). Compila las rutas con `next dev` (la corrida calienta las
rutas antes de probar); si falla, imprime la salida de Playwright (ya sin secretos) con la causa.
Requiere `npm install` en `frontend/`. Una corrida con `next build && next start` sería más
determinista, pero exige un directorio de compilación propio (`distDir`) para no pisar el
`.next` del desarrollo: queda como recomendación, no está hecho.

Ninguno de los dos existe en QA ni en producción, y el despliegue no los ejecuta. Los archivos de
`tests-db/` y `tests-web/` terminan en `.dbtest.js` y `.webtest.js` a propósito: ni
`node --test tests/*.test.js` ni `node --test` los encuentran. Para agregar casos: un archivo `NN-nombre.dbtest.js` que use `crearMundo()` de
`tests-db/helpers/fixture.js` (tiendas, usuarios y clientes propios por archivo) y concilie con
`m.conciliar()` tras mover dinero.

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
| `APP_URL` | URL pública del backend (URL de las fotos). **No** arma los enlaces de los correos |
| `FRONTEND_URL` | Origen de la web: permitido por CORS y base de los enlaces de los correos (`/activar#token=...`, `/reset-password#token=...`: el token va en el fragmento de la URL, no en la query). En producción debe ser https |
| `MAIL_TRANSPORT` | `azure` (Azure Communication Services Email) o `outbox` (escribe cada correo como archivo local; nunca sale a la red). Producción y App Service solo aceptan `azure`; sin definir, en local es `outbox` |
| `ACS_EMAIL_CONNECTION_STRING` | Cadena de conexión de Communication Services. **Secreto**: solo en la configuración del ambiente |
| `MAIL_FROM` | Remitente (dirección del dominio verificado en el servicio). Con dominio propio solo cambia este valor |
| `MAIL_OUTBOX_DIR` | Carpeta del transporte `outbox` (por defecto `backend/.mail-outbox/`, ignorada por Git) |
| `PENDING_ACCOUNT_PURGE` | Limpieza diaria de cuentas pendientes vencidas: `dry-run` (por defecto, solo cuenta), `apply` u `off`. Manual: `node src/scripts/purgePendingAccounts.js [--dry-run|--apply]` |
| `PENDING_PURGE_MAX_PER_RUN` | Tope de cuentas por corrida de limpieza (50 por defecto); si hay más, aborta sin tocar nada |
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
- **Correo.** En producción o App Service: `MAIL_TRANSPORT=azure`, cadena de conexión,
  `MAIL_FROM` válido y `FRONTEND_URL` https; si falta algo, no arranca.

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
│       ├── rateLimiter.js        # Intentos de login por IP
│       ├── requestLimiter.js     # Límites por IP (correo, activación)
│       └── clientIp.js           # IP confiable (no el primer X-Forwarded-For)
├── scripts/
│   ├── db-setup.js            # npm run db:setup
│   ├── db-test.js             # npm run test:db (corre tests-db/)
│   ├── web-test.js            # npm run test:web (corre tests-web/)
│   ├── seed.js                # npm run db:seed
│   └── lib/
│       ├── entornoLocal.js    # Guarda: los scripts solo corren contra la base local
│       ├── corredor.js        # Mecanismo común de test:db y test:web (base, backend, limpieza)
│       ├── sqlcmd.js          # Ejecución con sqlcmd, compartida por db-setup y el corredor
│       └── redactor.js        # Oculta secretos en la salida de las pruebas con base
├── tests/
│   ├── *.test.js              # node --test (sin base de datos; lo corre el despliegue)
│   └── security_tests.js      # A mano, contra el servidor local
├── tests-db/                  # npm run test:db (con base de datos; solo local)
│   ├── *.dbtest.js            # Casos de crédito por HTTP
│   ├── helpers/               # Fixture, cliente HTTP, conciliación, acceso a la base de pruebas
│   ├── preload-local.js       # Fuerza 127.0.0.1 en el backend de pruebas
│   └── reporter.js            # Salida: nombre, estado y duración
├── tests-web/                 # npm run test:web (recorrido en navegador; solo local)
│   └── *.webtest.js           # Lanza Playwright (frontend/e2e) con entorno de lista blanca
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
| POST | `/auth/register` | — | Registrar cliente (nace pendiente de activación; **no** devuelve token, envía correo) |
| POST | `/auth/login` | — | Iniciar sesión → JWT. Cuenta pendiente: 403 `ACCOUNT_PENDING_ACTIVATION` |
| POST | `/auth/activate` | — | Activar con el token del enlace; inicia sesión (body `{ token }`). En la primera activación la contraseña guardada se reemplaza por una aleatoria: quien no la cambie vuelve a entrar con el enlace o con «olvidé mi contraseña» |
| POST | `/auth/resend-activation` | — | Reenviar la activación (respuesta genérica; body `{ email }`) |
| PATCH | `/auth/change-password-temporary` | ✅ | Primer cambio de contraseña (cuenta con cambio forzado) |
| GET | `/auth/validate` | ✅ | Validar token activo |
| POST | `/auth/logout` | ✅ | Revocar token |
| POST | `/auth/logout-all` | ✅ | Revocar todos los tokens |
| PATCH | `/auth/change-password` | ✅ | Cambiar propia contraseña |
| PATCH | `/auth/profile` | ✅ | Actualizar nombre |
| POST | `/auth/create-user` | ✅ admin | Crear usuario (pendiente de activación; **no** devuelve token) |
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

## Correo transaccional

Todo el correo sale por `src/mail/`: `mailService.send('<plantilla>', { to, data })`. `send` nunca
lanza; deja en la auditoría tipo, destinatario y resultado (nunca el enlace ni el token).

| Plantilla | Correo | Cuándo |
|---|---|---|
| `activationSelf` | C-1 | Autorregistro |
| `activationByOther` | C-2 | Un tendero o administrador registra a un cliente (y reenvío a clientes) |
| `activationStaff` | C-3 | Un administrador crea personal (y reenvío a no clientes) |
| `passwordReset` | C-4 | `forgot-password` |
| `passwordChanged` | C-5 | Cada cambio de contraseña, por cualquier vía |

**Agregar un correo nuevo:** crear `src/mail/templates/<nombre>.js` con `{ group, subject(data), render(data) }`
(usar `renderLayout`, que aporta firma y pie), registrarlo en `src/mail/templates/index.js` y llamar
`mailService.send('<nombre>', { to, data })` donde corresponda.

**Límites** (conteo persistente en la auditoría): 3 por hora y 10 por día por destinatario y grupo, 60 s
entre envíos, 200 por hora en total. Superados, el envío se descarta en silencio.

**En local** (`MAIL_TRANSPORT=outbox`) los correos quedan en `backend/.mail-outbox/*.json`, con el enlace completo.
