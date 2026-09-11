# Sistema de Autenticación Seguro

## 🚀 Inicio Rápido

```bash
npm start          # Servidor en http://localhost:3000
npm run dev        # Modo desarrollo
```

## 📚 Endpoints Disponibles

### 1. **Registro de Usuario**
```
POST /auth/register
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Juan Pérez"
}
```
**Response:**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": { "id": "...", "email": "user@example.com", "name": "Juan Pérez" },
  "token": "eyJ..."
}
```

---

### 2. **Login**
```
POST /auth/login
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "message": "Sesión iniciada exitosamente",
  "user": { "id": "...", "email": "user@example.com", "name": "Juan Pérez" },
  "token": "eyJ..."
}
```

---

### 3. **Validar Sesión (Protegido)**
```
GET /auth/validate
Headers: Authorization: Bearer {token}
```
**Response:**
```json
{
  "message": "Sesión válida",
  "user": { "id": "...", "email": "user@example.com", "name": "Juan Pérez" }
}
```

---

### 4. **Olvidaste tu Contraseña**
```
POST /auth/forgot-password
```
**Request:**
```json
{
  "email": "user@example.com"
}
```
**Response:**
```json
{
  "message": "Se envió un enlace de recuperación a tu email"
}
```
*Nota: El token se imprime en consola (desarrollo)*

---

### 5. **Restablecer Contraseña**
```
POST /auth/reset-password
```
**Request:**
```json
{
  "token": "token_recibido_en_email",
  "newPassword": "newpassword123"
}
```
**Response:**
```json
{
  "message": "Contraseña restablecida exitosamente"
}
```

---

### 6. **Logout**
```
POST /auth/logout
```
**Response:**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

### 7. **Health Check**
```
GET /health
```
**Response:**
```json
{
  "status": "ok"
}
```

---

## 🔐 Seguridad

| Feature | Implementación |
|---------|-----------------|
| **Contraseñas** | PBKDF2 - 100k iteraciones + salt aleatorio |
| **Tokens** | JWT - Expiran en 24 horas |
| **Reset Password** | Token de una sola vez - Válido 1 hora |
| **Validación** | Mínimo 8 caracteres en contraseña |

## 📁 Archivos Importantes

- `src/server.js` - Servidor Express
- `src/models/User.js` - Lógica de usuario
- `src/routes/auth.js` - **Todos los endpoints aquí** ⬅️
- `users.csv` - Base de datos (se crea automáticamente)

## 🧪 Pruebas Rápidas

```bash
# Terminal 1: Inicia el servidor
npm start

# Terminal 2: Pruebas
# Registrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass1234","name":"Test"}'

# Copiar el token recibido y usarlo aquí:
curl -X GET http://localhost:3000/auth/validate \
  -H "Authorization: Bearer PEGA_TOKEN_AQUI"
```

## 🗂️ Estructura del Proyecto

```
proyecto_prueba_claude_code/
├── src/
│   ├── server.js              # Entrada principal
│   ├── models/
│   │   └── User.js            # Modelo Usuario
│   ├── routes/
│   │   └── auth.js            # ENDPOINTS (lee este archivo)
│   ├── middleware/
│   │   └── auth.js            # Validación JWT
│   └── utils/
│       ├── passwordUtils.js   # Cifrado PBKDF2
│       ├── tokenUtils.js      # JWT
│       ├── csvDatabase.js     # CSV storage
│       └── mailer.js          # Emails
├── users.csv                  # Base de datos (auto-creada)
├── package.json
├── .env                       # Variables de entorno
├── README.md                  # Este archivo
└── CLAUDE.md                  # Documentación técnica
```

## 📖 Ver Todos los Endpoints

**Opción 1:** Lee `src/routes/auth.js` (líneas 6-100)

**Opción 2:** Levanta el servidor y consulta `/health` para verificar que está activo

**Opción 3:** Usa `test-api.sh` para probar todos los endpoints automáticamente
