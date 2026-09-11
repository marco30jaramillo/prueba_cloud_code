# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Resumen del Proyecto

Sistema de autenticación seguro basado en Express.js con gestión completa de sesiones mediante JWT. Incluye registro, login, recuperación de contraseña, validación de sesiones y control granular de tokens.

---

## 🎯 Funcionalidades Principales

### 1. **Autenticación de Usuarios**
- Registro con validación (email único, password 8+ caracteres)
- Login seguro
- Logout con revocación de tokens

### 2. **Gestión de Sesiones (JWT)**
- Tokens JWT con expiración de 24h
- ID único por token
- Lista de tokens otorgados (`tokens_granted.csv`)
- Lista de tokens revocados (`tokens_revoked.csv`)

### 3. **Recuperación de Contraseña**
- Solicitar reseteo
- Token de una sola vez (válido 1 hora)
- Restablecimiento seguro

### 4. **Seguridad**
- Contraseñas cifradas con PBKDF2 (100k iteraciones + salt)
- Validación en cada petición autenticada
- Logout real (token inmediatamente inválido)
- Limpieza automática de tokens vencidos (2 AM diariamente)

### 5. **Respuestas Claras**
- Status codes significativos (200, 201, 400, 401, 404, 409, 500)
- Mensajes descriptivos
- Hints para resolver problemas
- Timestamps en errores

---

## 📁 Estructura de Archivos

```
src/
├── server.js                    # Servidor Express principal
├── models/
│   └── User.js                 # Modelo Usuario (lógica de negocio)
├── routes/
│   └── auth.js                 # Endpoints de autenticación
├── middleware/
│   └── auth.js                 # Validación JWT y tokenManager
├── utils/
│   ├── passwordUtils.js        # PBKDF2 hashing
│   ├── tokenUtils.js           # JWT generation/verification
│   ├── tokenManager.js         # Gestión de listas de tokens
│   ├── csvDatabase.js          # Persistencia de usuarios
│   ├── mailer.js               # Envío de emails (modo console)
│   └── responseFormatter.js    # Formato de respuestas
└── scripts/
    └── cleanExpiredTokens.js   # Limpiador automático de tokens

Archivos de datos:
├── users.csv                   # Base de datos de usuarios
├── tokens_granted.csv          # Tokens activos
└── tokens_revoked.csv          # Tokens invalidados
```

---

## 🔌 Endpoints Disponibles

### Autenticación
```
POST   /auth/register           Registrar nuevo usuario
POST   /auth/login              Iniciar sesión
GET    /auth/validate           Validar sesión actual (requiere token)
POST   /auth/logout             Cerrar sesión (revoca token)
POST   /auth/forgot-password    Solicitar recuperación de contraseña
POST   /auth/reset-password     Restablecer contraseña con token
```

### Administración de Tokens
```
GET    /tokens/stats            Ver estadísticas de tokens
POST   /tokens/clean            Ejecutar limpieza manual de tokens
```

### Utilidad
```
GET    /health                  Verificar estado del servidor
GET    /debug/headers           Debuggear headers (desarrollo)
GET    /docs                    Listar todos los endpoints
```

---

## 🔐 Sistema de Tokens

### Flujo de Autenticación

```
1. REGISTRO/LOGIN
   ↓
   Generar JWT + tokenId único
   ↓
   Guardar en tokens_granted.csv
   ↓
   Responder con token al cliente

2. PETICIÓN AUTENTICADA
   ↓
   Verificar Authorization: Bearer {token}
   ↓
   Validar firma JWT
   ↓
   Verificar en tokens_granted.csv
   ↓
   Verificar NO en tokens_revoked.csv
   ↓
   ✅ Acceso permitido

3. LOGOUT
   ↓
   Mover token de granted → revoked
   ↓
   Eliminar de granted
   ↓
   Token inmediatamente inválido

4. LIMPIEZA AUTOMÁTICA (2 AM diariamente)
   ↓
   Eliminar tokens vencidos de revoked
   ↓
   Liberar espacio en BD
```

### Archivos de Control

**tokens_granted.csv:**
- Tokens activos y válidos
- Columnas: tokenId, userId, email, token, issuedAt, expiresAt

**tokens_revoked.csv:**
- Tokens invalidados (pendientes de limpieza)
- Columnas: tokenId, userId, email, token, revokedAt, expiresAt

---

## 🔒 Seguridad Implementada

| Aspecto | Implementación |
|--------|-----------------|
| **Hashing de contraseñas** | PBKDF2 - 100k iteraciones + salt aleatorio |
| **Tokens JWT** | HS256 - Expiran en 24 horas |
| **Reset password** | Token de una sola vez - Válido 1 hora |
| **Logout** | Revocación inmediata de token |
| **Validación** | Mínimo 8 caracteres en contraseña |
| **Autenticación** | Verificación en cada petición protegida |
| **Auditoría** | Registro de tokens otorgados y revocados |
| **Limpieza** | Eliminación automática de tokens vencidos |

---

## 📊 Ejemplo de Flujo Completo

### 1. Registrar Usuario
```bash
POST /auth/register
{
  "email": "user@test.com",
  "password": "Pass1234",
  "name": "Test User"
}

Response:
{
  "status": "success",
  "message": "Usuario registrado exitosamente",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { "id": "uuid", "email": "user@test.com", "name": "Test User" }
}
```

### 2. Ver Estadísticas
```bash
GET /tokens/stats

Response:
{
  "status": "success",
  "stats": {
    "totalGranted": 1,      ← 1 token activo
    "totalRevoked": 0       ← 0 tokens revocados
  }
}
```

### 3. Validar Sesión
```bash
GET /auth/validate
Headers: Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

Response:
{
  "status": "success",
  "message": "Sesión válida ✅",
  "user": { "id": "uuid", ... },
  "token_expires_at": "2024-09-12T15:30:00.000Z"
}
```

### 4. Logout (Revocar Token)
```bash
POST /auth/logout
Headers: Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

Response:
{
  "status": "success",
  "message": "Sesión cerrada exitosamente",
  "details": "Token revocado para user@test.com"
}
```

### 5. Intentar Usar Token Revocado
```bash
GET /auth/validate
Headers: Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

Response: ❌ 401
{
  "status": "error",
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "message": "Token revocado (cerraste sesión con este token)",
  "hint": "Verifica que hayas incluido un token válido..."
}
```

### 6. Nuevas Estadísticas
```bash
GET /tokens/stats

Response:
{
  "status": "success",
  "stats": {
    "totalGranted": 0,      ← 0 tokens activos
    "totalRevoked": 1       ← 1 token revocado
  }
}
```

---

## 🚀 Comandos Comunes

```bash
npm start                    # Iniciar servidor en puerto 3000
npm run dev                  # Modo desarrollo con auto-reload

# Pruebas
bash test-headers.sh        # Script de prueba automática
bash test-api.sh            # Pruebas de API con curl
```

---

## 📖 Documentación Adicional

- **API_RESPONSE_FORMAT.md** - Formato detallado de todas las respuestas
- **TOKENS_SYSTEM.md** - Explicación profunda del sistema de tokens
- **TEST_TOKENS.md** - Guía paso a paso para Postman
- **DEBUG_HEADERS.md** - Debugging de autenticación

---

## 🔧 Configuración

### Archivo `.env`
```
PORT=3000
JWT_SECRET=your-super-secret-key-change-in-production
APP_URL=http://localhost:3000
```

### npm config
```bash
npm config set bin-links false  # Necesario para Android/Termux
```

---

## 💾 Base de Datos

### users.csv
```
id,email,password,name,createdAt,resetToken,resetTokenExpiry
uuid,user@test.com,hash:salt,Test User,2024-09-11T...,token,2024-09-11T...
```

### tokens_granted.csv
```
tokenId,userId,email,token,issuedAt,expiresAt
uuid,userid,user@test.com,jwt,2024-09-11T...,2024-09-12T...
```

### tokens_revoked.csv
```
tokenId,userId,email,token,revokedAt,expiresAt
uuid,userid,user@test.com,jwt,2024-09-11T...,2024-09-12T...
```

---

## ⚙️ Inicialización del Servidor

Cuando inicia el servidor:

1. ✅ Crea archivos CSV si no existen
2. ✅ Inicia limpiador automático de tokens (2 AM)
3. ✅ Escucha en todas las interfaces (0.0.0.0)
4. ✅ Muestra IP local para conexiones remotas
5. ✅ Registra todas las peticiones en consola

```
🚀 Servidor corriendo
   Local: http://localhost:3000
   Red: http://192.168.1.100:3000
📝 Base de datos: users.csv
📚 Documentación: http://localhost:3000/docs
📋 Tokens: http://localhost:3000/tokens/stats
⏰ Limpiador de tokens programado...
```

---

## 🎯 Próximas Mejoras Posibles

- [ ] Integrar servicio de email real (Gmail, SendGrid)
- [ ] Implementar rate limiting
- [ ] Agregar validación de email
- [ ] Two-factor authentication (2FA)
- [ ] Cambio de contraseña en sesión activa
- [ ] Listar sesiones activas por usuario
- [ ] Revocar todas las sesiones de un usuario
- [ ] Roles y permisos
- [ ] OAuth2/Google login

---

## 📝 Notas Técnicas

- **JWT hermético**: Firma HS256 con secret compartido
- **Sin estado (stateless)**: Servidor no guarda sesiones en memoria
- **Dos listas de tokens**: Permite logout real sin invalidar todos
- **PBKDF2**: Más seguro que bcrypt en este contexto
- **CSV como BD**: Suficiente para desarrollo/MVP (cambiar a SQL en producción)
- **Limpieza automática**: Evita acumulo de datos vencidos

---

## 🔍 Debugging

### Token no se extrae del header
```
GET /debug/headers
Authorization: Bearer {token}
→ Verifica que "authorization" aparezca en la respuesta
```

### Token revocado
```
El token fue usado en logout
→ Hacer login nuevamente para obtener nuevo token
```

### Token expirado
```
Pasaron más de 24 horas desde que se generó
→ Hacer login nuevamente
```

### Estadísticas de tokens
```
GET /tokens/stats
→ Ver cuántos tokens activos y revocados hay
```

---

## 📞 Contacto y Soporte

Para errores o preguntas:
1. Revisar `API_RESPONSE_FORMAT.md` para entender la respuesta
2. Revisar `DEBUG_HEADERS.md` para debugging de autenticación
3. Revisar logs en consola del servidor
4. Usar `/debug/headers` para verificar que headers se reciben
