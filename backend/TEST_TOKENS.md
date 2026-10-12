# Pruebas del Sistema de Tokens - Postman

## 🚀 Setup

1. Ten el backend arrancado contra la base local (ver `README.md`, "Inicio rápido")
2. Importa estos requests en Postman
3. Reemplaza `{{BASE_URL}}` con la URL del backend (ej: `http://localhost:3001`)
4. `/tokens/stats` y `/tokens/clean` requieren sesión de superusuario o administrador: envía
   `Authorization: Bearer <token>` en cada request. Sin token responden 401; con otro rol, 403.

---

## 1️⃣ VER ESTADÍSTICAS INICIALES

```
GET {{BASE_URL}}/tokens/stats
```

**Resultado esperado:**
```json
{
  "stats": {
    "totalGranted": 0,
    "totalRevoked": 0
  }
}
```

---

## 2️⃣ REGISTRAR USUARIO

```
POST {{BASE_URL}}/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Pass1234",
  "name": "Test User"
}
```

**Resultado esperado:**
```json
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Guarda el token en una variable de Postman:**
- Click derecho en response
- Set variable → `token`

---

## 3️⃣ VERIFICAR TOKENS GUARDADOS

```
GET {{BASE_URL}}/tokens/stats
```

**Resultado esperado:**
```json
{
  "stats": {
    "totalGranted": 1,  ← ¡Aumentó!
    "totalRevoked": 0
  }
}
```

---

## 4️⃣ VALIDAR SESIÓN (Token activo)

```
GET {{BASE_URL}}/auth/validate
Headers:
  Authorization: Bearer {{token}}
```

**Resultado esperado:**
```json
{
  "message": "Sesión válida",
  "user": {...}
}
```

---

## 5️⃣ LOGOUT (Revocar token)

```
POST {{BASE_URL}}/auth/logout
Headers:
  Authorization: Bearer {{token}}
```

**Resultado esperado:**
```json
{
  "message": "Sesión cerrada exitosamente",
  "details": "Token revocado para test@example.com"
}
```

---

## 6️⃣ VERIFICAR ESTADÍSTICAS DESPUÉS DE LOGOUT

```
GET {{BASE_URL}}/tokens/stats
```

**Resultado esperado:**
```json
{
  "stats": {
    "totalGranted": 0,  ← Disminuyó
    "totalRevoked": 1   ← ¡Aumentó!
  }
}
```

---

## 7️⃣ INTENTAR USAR TOKEN REVOCADO ❌

```
GET {{BASE_URL}}/auth/validate
Headers:
  Authorization: Bearer {{token}}
```

**Resultado esperado (ERROR):**
```json
{
  "error": "Token revocado o expirado"
}
```

✅ **¡El logout funciona!** El token es inmediatamente inválido.

---

## 8️⃣ NUEVO LOGIN (Obtener nuevo token)

```
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Pass1234"
}
```

**Resultado:**
```json
{
  "message": "Sesión iniciada exitosamente",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..." ← Nuevo token
}
```

---

## 9️⃣ LIMPIEZA MANUAL (Opcional)

```
POST {{BASE_URL}}/tokens/clean
```

**Resultado:**
```json
{
  "message": "Limpieza de tokens ejecutada",
  "tokensEliminados": 0  // Ninguno porque aún no expiraron
}
```

---

## 📊 Flujo Resumido

```
Registro        → 1 granted, 0 revoked
Validar         → ✅ Válido
Logout          → 0 granted, 1 revoked  
Validar nuevo   → ❌ Token revocado
Login            → 1 granted, 1 revoked
```

---

## 🔍 Ver Tablas de Control

Los tokens están guardados en dos tablas de la base local `MiValecito_Dev`:
- `dbo.tokens_granted` - Tokens activos
- `dbo.tokens_revoked` - Tokens invalidados

Puedes consultarlas (por ejemplo, con `sqlcmd -E` o SQL Server Management Studio) para ver
exactamente qué tokens hay.

---

## 💾 Colección JSON para Postman

Copia esto en "Postman → Import → Paste Raw Text":

```json
{
  "info": {
    "name": "Token Management System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Ver Estadísticas",
      "request": {
        "method": "GET",
        "url": "{{BASE_URL}}/tokens/stats"
      }
    },
    {
      "name": "Registrar",
      "request": {
        "method": "POST",
        "url": "{{BASE_URL}}/auth/register",
        "body": {
          "raw": "{\"email\":\"test@example.com\",\"password\":\"Pass1234\",\"name\":\"Test\"}"
        }
      }
    },
    {
      "name": "Validar Sesión",
      "request": {
        "method": "GET",
        "url": "{{BASE_URL}}/auth/validate",
        "header": [{
          "key": "Authorization",
          "value": "Bearer {{token}}"
        }]
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "url": "{{BASE_URL}}/auth/logout",
        "header": [{
          "key": "Authorization",
          "value": "Bearer {{token}}"
        }]
      }
    },
    {
      "name": "Limpiar Tokens Vencidos",
      "request": {
        "method": "POST",
        "url": "{{BASE_URL}}/tokens/clean"
      }
    }
  ]
}
```
