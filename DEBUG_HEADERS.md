# Debugging de Headers - Autorización

## 🔍 Paso 1: Verificar que los Headers se Reciben

Haz una petición simple para ver si los headers llegan:

```
GET {{BASE_URL}}/debug/headers

Headers Tab en Postman:
  Authorization: Bearer test123
```

**Deberías ver en la respuesta:**
```json
{
  "allHeaders": {
    "authorization": "Bearer test123",
    ...
  },
  "authHeader": "Bearer test123"
}
```

---

## ❌ Si el header NO aparece:

### Problema 1: No estás usando la pestaña de Headers correctamente

En Postman:
1. Click en la pestaña **Headers**
2. Key: `Authorization`
3. Value: `Bearer eyJ0eXAiOiJKV1QiLCJhbGc...`
4. ✅ Asegúrate que NO esté tachado (deshabilitado)

### Problema 2: Estás usando Auth Tab mal

Si usas **Auth → Bearer Token**:
- Postman automáticamente agrega el header `Authorization: Bearer {token}`
- Esto debería funcionar

**Prueba esto primero:**

1. **Registrarse** (copiar token)
   ```
   POST {{BASE_URL}}/auth/register
   {
     "email": "test@test.com",
     "password": "Pass1234",
     "name": "Test"
   }
   ```

2. **Verificar headers** (copiar token de arriba)
   ```
   GET {{BASE_URL}}/debug/headers
   
   Auth Tab → Type: Bearer Token
   Token: eyJ0eXAiOiJKV1QiLCJhbGc...
   ```

   Mira si en la respuesta aparece `"authHeader": "Bearer eyJ..."`

---

## 🐛 Problema Común: Express normaliza headers

Express **convierte todos los headers a minúsculas automáticamente**, así que:
- `Authorization` → `authorization` ✅
- `AUTHORIZATION` → `authorization` ✅
- `Content-Type` → `content-type` ✅

El código ya maneja esto, pero verifica que lo estés haciendo bien.

---

## ✅ Formato CORRECTO del Header

**Opción 1 - Headers Tab (Manual):**
```
Key: Authorization
Value: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Opción 2 - Auth Tab (Automático):**
```
Type: Bearer Token
Token: eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Opción 3 - Con curl:**
```bash
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  http://localhost:3000/auth/validate
```

---

## 🔴 Errores Comunes

### ❌ Error: "Token no proporcionado"
```json
{
  "error": "Token no proporcionado",
  "debug": {
    "authHeader": "No incluido",
    "mensaje": "Envía: Authorization: Bearer {token}"
  }
}
```

**Solución:**
- Verifica que en el header Authorization esté incluido
- Usa: `Authorization: Bearer {token}` (con espacio)

### ❌ Error: "Token inválido o expirado"
```json
{
  "error": "Token inválido o expirado"
}
```

**Causas posibles:**
- El token está malformado
- El token ya expiró
- La firma JWT no es válida

**Solución:**
- Genera un token nuevo con login/register
- Verifica que sea un JWT válido

### ❌ Error: "Token revocado"
```json
{
  "error": "Token revocado o expirado"
}
```

**Causa:** Hiciste logout con ese token

**Solución:**
- Haz un nuevo login para obtener un token válido

---

## 📋 Checklist de Debugging

- [ ] ¿Está el Authorization header en la petición?
- [ ] ¿Usa el formato `Bearer {token}`?
- [ ] ¿El token es válido (no expiró)?
- [ ] ¿El token no está revocado (no hiciste logout)?
- [ ] ¿Estás usando `/auth/validate` con token?
- [ ] ¿Estás usando `/auth/logout` con token?

---

## 🧪 Test Completo Paso a Paso

### 1. Registrar
```
POST /auth/register
Body:
{
  "email": "test@test.com",
  "password": "Pass1234",
  "name": "Test User"
}

Response: {"token": "eyJ..."}
↓ Guarda este token
```

### 2. Verificar headers
```
GET /debug/headers
Auth: Bearer eyJ...

Response: Debería mostrar "authorization": "Bearer eyJ..."
```

### 3. Validar sesión
```
GET /auth/validate
Auth: Bearer eyJ...

Response: ✅ Sesión válida
```

Si esto funciona → **Los headers están correctos**

---

## 🚨 Si aún no funciona

Copia y pega AQUÍ:
1. El error exacto que ves en Postman
2. Los logs del servidor (la salida de la consola)
3. Cómo estás enviando el token (Headers Tab o Auth Tab?)
4. El token que estás usando (primeras 50 caracteres)

Así puedo debuggear más específicamente.
