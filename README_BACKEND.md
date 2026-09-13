# Backend - Sistema de Autenticación

Backend seguro en **Express.js** con gestión completa de autenticación, roles y permisos.

## 🚀 Características

- ✅ **Express.js** servidor robusto
- ✅ **JWT** para autenticación stateless
- ✅ **PBKDF2** para hashing seguro de contraseñas
- ✅ **Roles y Permisos** granulares
- ✅ **CORS** configurado
- ✅ **CSV Database** para persistencia
- ✅ **Token Management** avanzado
- ✅ **Limpieza automática** de tokens vencidos

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── server.js              # Servidor principal
│   ├── models/
│   │   ├── User.js           # Modelo Usuario
│   │   ├── Role.js           # Modelo Roles
│   │   └── Permission.js     # Modelo Permisos
│   ├── routes/
│   │   └── auth.js           # Endpoints de autenticación
│   ├── middleware/
│   │   ├── auth.js           # Validación JWT
│   │   └── roleMiddleware.js # Validación de roles
│   ├── utils/
│   │   ├── passwordUtils.js  # Hashing PBKDF2
│   │   ├── tokenUtils.js     # Generación JWT
│   │   ├── tokenManager.js   # Gestión de tokens
│   │   ├── csvDatabase.js    # ORM CSV
│   │   ├── mailer.js         # Envío de emails
│   │   └── responseFormatter.js # Formato respuestas
│   └── scripts/
│       └── cleanExpiredTokens.js # Limpiador automático
├── users.csv                 # Base de datos usuarios
├── roles.csv                 # Definición de roles
├── permissions.csv           # Definición de permisos
├── tokens_granted.csv        # Tokens activos
├── tokens_revoked.csv        # Tokens revocados
├── package.json
└── .env.example
```

## 🔐 Seguridad

### Autenticación
- **JWT HS256** con expiración 24 horas
- **Token ID único** para cada sesión
- **Listas de tokens**: Granted (activos) y Revoked (inválidos)
- **Logout real**: Revocación inmediata

### Contraseñas
- **PBKDF2** con 100,000 iteraciones
- **Salt aleatorio** de 16 bytes
- **Nunca se guardan en texto plano**

### Validación
- Email único por usuario
- Contraseña mínimo 8 caracteres
- Validación en cada petición autenticada

## 👥 Roles y Permisos

### Roles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **superuser** | Acceso integral | `system:full-access` |
| **administrador** | Gestión de usuarios | Admin + Vistas |
| **vendedor** | Operaciones limitadas | Perfil + Clientes |
| **cliente** | Usuario estándar | Perfil básico |

### Permisos

Categorías:
- `auth:*` - Autenticación
- `profile:*` - Perfil de usuario
- `admin:*` - Operaciones admin
- `system:*` - Sistema

## 📡 Endpoints

### Autenticación

#### `POST /auth/register`
Registrar nuevo cliente
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```
**Respuesta**: User + JWT token

#### `POST /auth/login`
Iniciar sesión
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### `GET /auth/validate`
Validar sesión (requiere token)
**Headers**: `Authorization: Bearer {token}`

#### `POST /auth/logout`
Cerrar sesión (revoca token)
**Headers**: `Authorization: Bearer {token}`

### Recuperación

#### `POST /auth/forgot-password`
Solicitar recuperación
```json
{
  "email": "user@example.com"
}
```

#### `POST /auth/reset-password`
Restablecer contraseña
```json
{
  "token": "reset_token_here",
  "newPassword": "NewPass123"
}
```

### Roles (Requieren autenticación)

#### `POST /auth/bootstrap-superuser`
Crear primer superuser (solo si no existe)
```json
{
  "email": "admin@system.com",
  "password": "SecurePass123",
  "name": "System Admin"
}
```

#### `POST /auth/create-user`
Crear usuario con rol
**Headers**: `Authorization: Bearer {token}`
```json
{
  "email": "vendor@shop.com",
  "password": "SecurePass123",
  "name": "John Vendor",
  "role": "vendedor"
}
```

#### `GET /auth/user-schema/:roleType`
Obtener esquema de usuario para frontend

### Sistema

#### `GET /health`
Estado del servidor

#### `GET /tokens/stats`
Estadísticas de tokens

#### `POST /tokens/clean`
Limpieza manual de tokens

#### `GET /docs`
Documentación de API

## 🔧 Instalación

```bash
cd backend
npm install
```

## 🌍 Variables de Entorno

Crear `.env`:
```env
PORT=3000
JWT_SECRET=your-super-secret-key-change-in-production
APP_URL=http://localhost:3000
```

## 🚀 Desarrollo

```bash
# Servidor con auto-reload
npm run dev

# Servidor normal
npm start
```

## 📊 Estructura de Datos

### users.csv
```
id,email,password,name,role,createdAt,resetToken,resetTokenExpiry
uuid,user@test.com,hash:salt,Test User,cliente,2024-09-12T...,token,2024-09-12T...
```

### roles.csv
```
id,name,description,permissions
1,superuser,Super Usuario,system:full-access
2,administrador,Administrador,"admin:manage-users|profile:view-all|..."
```

### permissions.csv
```
id,name,description,category
1,auth:login,Iniciar sesión,auth
2,profile:view-own,Ver propio perfil,profile
```

### tokens_granted.csv
```
tokenId,userId,email,token,issuedAt,expiresAt
uuid,user_id,user@test.com,jwt_here,2024-09-12T...,2024-09-13T...
```

### tokens_revoked.csv
```
tokenId,userId,email,token,revokedAt,expiresAt
uuid,user_id,user@test.com,jwt_here,2024-09-12T...,2024-09-13T...
```

## 🔄 Flujos de Autenticación

### Registro → Login

```
1. POST /auth/register
   └── Crear usuario (rol: cliente)
   └── Generar JWT + tokenId
   └── Guardar en tokens_granted.csv
   └── Retornar token

2. POST /auth/login
   └── Validar email/password
   └── Generar nuevo JWT
   └── Retornar token

3. GET /auth/validate
   └── Verificar Authorization header
   └── Validar firma JWT
   └── Verificar en granted + no en revoked
   └── Retornar user + exp
```

### Logout → Revocación

```
POST /auth/logout
  └── Obtener token del header
  └── Mover de granted → revoked
  └── Token inmediatamente inválido
```

### Limpieza Automática

```
Cada día a las 2 AM
  └── Lee tokens_revoked.csv
  └── Elimina tokens con exp < ahora
  └── Libera espacio
```

## 🎯 Creación de Usuarios

| Escenario | Token | Rol | Descripción |
|-----------|-------|-----|-------------|
| Cliente registrándose | ❌ | cliente | Sin autenticación |
| Superuser creando | ✅ | Cualquiera | Token superuser |
| Admin creando | ✅ | cliente/vendedor | Token admin |
| Bootstrap | ❌ | superuser | Solo si no existe |

## 💾 Base de Datos

**Formato**: CSV con encabezados
- Ubicación: raíz del proyecto
- Auto-creados en primera ejecución
- Migración automática si faltan columnas

## ⏰ Token Manager

### Funciones
- `addGrantedToken()` - Registra token activo
- `revokeToken()` - Revoca un token
- `readGrantedTokens()` - Lee tokens activos
- `readRevokedTokens()` - Lee tokens revocados
- `getStats()` - Retorna estadísticas

## 📧 Mailer

**Modo Console** (desarrollo):
- Simula envío imprimiendo en consola
- No envía emails reales

Para producción:
- Integrar con SendGrid, Gmail, etc.
- Archivo: `src/utils/mailer.js`

## 🐛 Debugging

### Ver headers recibidos
```bash
GET /debug/headers
Authorization: Bearer {token}
```

### Estadísticas de tokens
```bash
GET /tokens/stats
```

### Limpiar tokens manualmente
```bash
POST /tokens/clean
```

## 📈 Monitoreo

El servidor loguea:
- Cada request: `METHOD PATH from IP`
- Validaciones JWT
- Revocaciones de tokens
- Errores y excepciones

## 🔄 CORS

Configurado para aceptar:
- `localhost`
- `127.0.0.1`
- Red local (192.168.x.x, 10.x.x.x)

Rechaza:
- Dominios externos
- Internet pública

## 🚀 Próximas Mejoras

- [ ] Integración con BD real (PostgreSQL/MongoDB)
- [ ] Rate limiting
- [ ] Validación de email
- [ ] Two-factor authentication (2FA)
- [ ] Cambio de contraseña en sesión
- [ ] Listar sesiones activas
- [ ] Revocar todas las sesiones
- [ ] OAuth2/Google login
- [ ] Webhooks para eventos

## 📞 Endpoints Faltantes

Posibles endpoints a agregar en futuras versiones:

```
- PATCH /auth/change-password (cambiar en sesión)
- GET /users (listar usuarios - admin)
- GET /users/:id (ver usuario - admin)
- DELETE /users/:id (eliminar usuario - admin)
- GET /sessions (listar sesiones - usuario)
- DELETE /sessions/:id (cerrar sesión específica)
```
