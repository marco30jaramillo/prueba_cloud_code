# Formato de Respuestas de la API

## ✅ Respuestas Exitosas (2xx)

### Estructura Base
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Descripción de lo que pasó",
  "data": "depende del endpoint"
}
```

### Ejemplo: Login Exitoso
```
POST /auth/login
```

**Respuesta 200:**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Sesión iniciada exitosamente",
  "user": {
    "id": "uuid-1234",
    "email": "user@example.com",
    "name": "Juan Pérez"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Ejemplo: Validar Sesión
```
GET /auth/validate
Authorization: Bearer {token}
```

**Respuesta 200:**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Sesión válida ✅",
  "user": {
    "id": "uuid-1234",
    "email": "user@example.com",
    "name": "Juan Pérez"
  },
  "token_expires_at": "2024-09-12T15:30:00.000Z"
}
```

---

## ❌ Respuestas de Error

### 400 - Bad Request (Validación)
```json
{
  "status": "error",
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Descripción del error",
  "fields": {
    "email": "❌ requerido",
    "password": "❌ debe tener 8+ caracteres"
  },
  "timestamp": "2024-09-11T10:30:00.000Z"
}
```

**Ejemplos:**
- Campos faltantes
- Validación fallida (contraseña muy corta)
- Formato inválido

### 401 - Unauthorized (Autenticación)
```json
{
  "status": "error",
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "message": "Razón específica del error",
  "hint": "Qué hacer para solucionarlo",
  "example": "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "timestamp": "2024-09-11T10:30:00.000Z"
}
```

**Ejemplos de 401:**

1. **Token no proporcionado:**
   ```json
   {
     "statusCode": 401,
     "error": "UNAUTHORIZED",
     "message": "Token no proporcionado en header Authorization",
     "hint": "Verifica que hayas incluido un token válido en el header Authorization",
     "example": "Authorization: Bearer eyJ..."
   }
   ```

2. **Token inválido:**
   ```json
   {
     "statusCode": 401,
     "error": "UNAUTHORIZED",
     "message": "Token inválido o expirado (verifica que sea un JWT válido)",
     "hint": "Verifica que hayas incluido un token válido en el header Authorization"
   }
   ```

3. **Token revocado (logout):**
   ```json
   {
     "statusCode": 401,
     "error": "UNAUTHORIZED",
     "message": "Token revocado (cerraste sesión con este token)",
     "hint": "Verifica que hayas incluido un token válido en el header Authorization"
   }
   ```

4. **Credenciales incorrectas:**
   ```json
   {
     "statusCode": 401,
     "error": "UNAUTHORIZED",
     "message": "Email o contraseña incorrectos",
     "hint": "Verifica tus credenciales e intenta de nuevo"
   }
   ```

### 403 - Forbidden (Autorización)
```json
{
  "status": "error",
  "statusCode": 403,
  "error": "FORBIDDEN",
  "message": "No tienes permiso para acceder a este recurso",
  "timestamp": "2024-09-11T10:30:00.000Z"
}
```

### 404 - Not Found
```json
{
  "status": "error",
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Usuario no encontrado",
  "timestamp": "2024-09-11T10:30:00.000Z"
}
```

### 409 - Conflict
```json
{
  "status": "error",
  "statusCode": 409,
  "error": "CONFLICT",
  "message": "El email user@example.com ya está registrado",
  "timestamp": "2024-09-11T10:30:00.000Z"
}
```

### 500 - Internal Server Error
```json
{
  "status": "error",
  "statusCode": 500,
  "error": "INTERNAL_SERVER_ERROR",
  "message": "Error interno del servidor",
  "timestamp": "2024-09-11T10:30:00.000Z"
}
```

---

## 📋 Resumen de Status Codes

| Code | Error Type | Meaning |
|------|-----------|---------|
| **200** | ✅ OK | Solicitud exitosa |
| **201** | ✅ Created | Recurso creado (register) |
| **400** | ❌ Bad Request | Validación fallida |
| **401** | ❌ Unauthorized | Token faltante/inválido/revocado |
| **403** | ❌ Forbidden | Sin permisos |
| **404** | ❌ Not Found | Recurso no existe |
| **409** | ❌ Conflict | Email duplicado |
| **500** | ❌ Error interno | Fallo del servidor |

---

## 🔍 Debugging con Respuestas

### Problema: "Token no proporcionado"
**Solución:** Agrega el header `Authorization: Bearer {token}`

### Problema: "Token revocado"
**Solución:** Haz un nuevo login para obtener un token válido

### Problema: "Email ya registrado"
**Solución:** Usa otro email o haz login con ese email

### Problema: "Campos faltantes"
**Solución:** Verifica el objeto `fields` en la respuesta para ver qué falta

---

## 💡 Tips para Postman

1. **Ver los campos exactos que faltan:**
   ```
   La respuesta muestra: "fields": { "email": "✅", "password": "❌ requerido" }
   ```

2. **Entender errores de autenticación:**
   ```
   La respuesta incluye "hint" y "example" para saber qué hacer
   ```

3. **Verificar expiración del token:**
   ```
   La respuesta de validate muestra: "token_expires_at": "..."
   ```

4. **Todos los errores incluyen timestamp:**
   ```
   Útil para logs y debugging
   ```
