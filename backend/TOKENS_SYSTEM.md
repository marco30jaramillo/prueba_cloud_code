# Sistema de Gestión de Tokens

> **Acceso:** `GET /tokens/stats` y `POST /tokens/clean` requieren sesión de superusuario o
> administrador (sin token: 401; otro rol: 403). Solo `GET /health` es público.

## 📋 Arquitectura

El sistema mantiene **dos listas de tokens** para un control seguro. Son dos tablas de SQL
Server, `dbo.tokens_granted` y `dbo.tokens_revoked`, definidas en
`database/scripts_sql/esquemas/01_esquema_inicial.sql` y manejadas por
`src/utils/tokenManager.js`:

```
┌─────────────────────────────────────────────────────┐
│         TOKENS OTORGADOS (dbo.tokens_granted)       │
├─────────────────────────────────────────────────────┤
│ tokenId | userId | email | token | issuedAt | ...  │
├─────────────────────────────────────────────────────┤
│  uuid1  |  id1   | u@x   | jwt1  | 2024-01 | 24h   │
│  uuid2  |  id2   | u@y   | jwt2  | 2024-01 | 24h   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│        TOKENS REVOCADOS (dbo.tokens_revoked)        │
├─────────────────────────────────────────────────────┤
│ tokenId | userId | email | token | revokedAt | ... │
├─────────────────────────────────────────────────────┤
│  uuid1  |  id1   | u@x   | jwt1  | 2024-01 | 24h   │
└─────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Tokens

```
1. LOGIN/REGISTER
   ├─ Generar JWT + tokenId único
   ├─ Guardar en dbo.tokens_granted ✅
   └─ Devolver token al cliente

2. VALIDAR SESIÓN (GET /auth/validate)
   ├─ Recibir token en Authorization header
   ├─ Verificar JWT válido (firma + expiración)
   ├─ Verificar en lista de otorgados ✅
   ├─ Verificar NO en lista de revocados ❌
   └─ Responder sesión válida

3. LOGOUT (POST /auth/logout)
   ├─ Recibir token autenticado
   ├─ Buscar en dbo.tokens_granted
   ├─ Insertar en dbo.tokens_revoked
   ├─ Eliminar de dbo.tokens_granted
   └─ Token inválido para futuros usos

4. LIMPIEZA AUTOMÁTICA (2 AM diariamente)
   ├─ Buscar en dbo.tokens_revoked los tokens con expiresAt < ahora
   ├─ Eliminar esas filas
   └─ Liberar espacio en BD
```

## 📊 Estadísticas

Ver estado actual de tokens:

```bash
GET /tokens/stats
```

**Respuesta:**
```json
{
  "message": "Estadísticas de tokens",
  "stats": {
    "totalGranted": 5,      // Tokens activos
    "totalRevoked": 2,      // Tokens invalidados (pendientes de limpiar)
    "grantedUsers": 3,      // Usuarios con sesiones activas
    "revokedUsers": 2       // Usuarios que han hecho logout
  }
}
```

## 🧹 Limpieza de Tokens Vencidos

### Automática (Diaria)
- Se ejecuta automáticamente a las **2 AM** cada día
- Elimina tokens revocados que ya expiraron
- No requiere intervención manual

### Manual (Bajo demanda)
```bash
POST /tokens/clean
```

**Respuesta:**
```json
{
  "message": "Limpieza de tokens ejecutada",
  "tokensEliminados": 3
}
```

## 🔐 Validación en Cada Petición

El middleware `authMiddleware` valida:

```
1. ✅ Token presente en Authorization header
2. ✅ Firma JWT válida (no modificado)
3. ✅ JWT no expirado
4. ✅ Token en lista de otorgados (dbo.tokens_granted)
5. ❌ Token NO en lista de revocados (dbo.tokens_revoked)
```

Si falla cualquiera de estos checks → **401 Unauthorized**

## 📁 Tablas de Control

- `dbo.tokens_granted` - Tokens activos y válidos
- `dbo.tokens_revoked` - Tokens invalidados (pendientes de limpieza)

Ambas tienen `tokenId` como clave y `userId` como referencia a `dbo.users`.

## 💡 Ejemplo Completo en Postman

### 1. Registrarse
```
POST /auth/register
{
  "email": "user@test.com",
  "password": "Pass1234",
  "name": "Test User"
}

Response:
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJ..."  ← Guardado en dbo.tokens_granted
}
```

### 2. Ver estadísticas
```
GET /tokens/stats

Response:
{
  "stats": {
    "totalGranted": 1,
    "totalRevoked": 0
  }
}
```

### 3. Validar sesión
```
GET /auth/validate
Headers: Authorization: Bearer eyJ...

Response: ✅ Sesión válida
```

### 4. Logout (revoca el token)
```
POST /auth/logout
Headers: Authorization: Bearer eyJ...

Response:
{
  "message": "Sesión cerrada exitosamente",
  "details": "Token revocado para user@test.com"
}

Cambio: eyJ... movido de granted a revoked
```

### 5. Intentar usar token revocado
```
GET /auth/validate
Headers: Authorization: Bearer eyJ...

Response: ❌ 401 Token revocado o expirado
```

## 🎯 Seguridad Mejorada

✅ **Logout real** - El token es inmediatamente inválido  
✅ **Auditoría** - Registro de todos los tokens otorgados y revocados  
✅ **Limpieza automática** - No acumula datos viejos  
✅ **Control granular** - Ver exactamente qué tokens están activos  

## ⚙️ Configuración Futura

Puedes mejorar esto añadiendo:
- Revocar todos los tokens de un usuario (cuando cambia contraseña)
- Límite de tokens por usuario
- Rate limiting por usuario
- Logs de auditoría más detallados
- Dashboard de sesiones activas por usuario
