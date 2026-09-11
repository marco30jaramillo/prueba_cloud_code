# 🔐 Sistema de Autenticación Seguro

Sistema de autenticación empresarial basado en Express.js con gestión completa de sesiones JWT, logout real, recuperación de contraseña y limpieza automática de tokens.

## ✨ Características

- ✅ **Registro e inicio de sesión** seguro
- ✅ **JWT tokens** con expiración de 24 horas
- ✅ **Logout real** - revoca tokens inmediatamente
- ✅ **Recuperación de contraseña** con tokens únicos
- ✅ **Gestión de tokens** - dos listas (otorgados/revocados)
- ✅ **Limpieza automática** diaria de tokens vencidos
- ✅ **Respuestas claras** con hints de debugging
- ✅ **PBKDF2 hashing** para contraseñas
- ✅ **CSV como BD** (cambiar a SQL en producción)

---

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd proyecto_prueba_claude_code

# Instalar dependencias
npm install --legacy-peer-deps
# O si tienes problemas con symlinks:
npm config set bin-links false && npm install

# Crear archivo .env
cp .env.example .env

# Iniciar servidor
npm start
```

El servidor estará disponible en:
- Local: `http://localhost:3000`
- Red: `http://192.168.x.x:3000`

---

## 📖 Documentación

| Archivo | Descripción |
|---------|-------------|
| **CLAUDE.md** | Guía técnica completa para desarrolladores |
| **API_RESPONSE_FORMAT.md** | Formato de todas las respuestas de la API |
| **TOKENS_SYSTEM.md** | Explicación profunda del sistema de tokens |
| **TEST_TOKENS.md** | Guía paso a paso para Postman |
| **DEBUG_HEADERS.md** | Debugging de problemas de autenticación |

---

## 🔌 API Endpoints

### Autenticación

#### Registrar Usuario
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Pass1234",
  "name": "John Doe"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Pass1234"
}
```

#### Validar Sesión
```bash
GET /auth/validate
Authorization: Bearer {token}
```

#### Logout (Revoca Token)
```bash
POST /auth/logout
Authorization: Bearer {token}
```

#### Recuperar Contraseña
```bash
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Restablecer Contraseña
```bash
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewPass1234"
}
```

### Administración

#### Ver Estadísticas de Tokens
```bash
GET /tokens/stats
```

#### Limpiar Tokens Vencidos
```bash
POST /tokens/clean
```

---

## 🔐 Seguridad

| Mecanismo | Detalles |
|-----------|---------|
| **Contraseñas** | PBKDF2 - 100k iteraciones + salt aleatorio |
| **Tokens JWT** | HS256, expiración 24 horas |
| **Reset Token** | Único, válido 1 hora |
| **Logout** | Token revocado inmediatamente |
| **Validación** | Verificada en cada petición |
| **Auditoría** | Registro de tokens otorgados/revocados |

---

## 📁 Estructura del Proyecto

```
src/
├── server.js                    # Servidor Express
├── models/User.js              # Modelo de usuario
├── routes/auth.js              # Endpoints de autenticación
├── middleware/auth.js          # Validación JWT
├── utils/
│   ├── passwordUtils.js        # PBKDF2 hashing
│   ├── tokenUtils.js           # JWT generation
│   ├── tokenManager.js         # Gestión de tokens
│   ├── csvDatabase.js          # Persistencia CSV
│   ├── mailer.js               # Envío de emails
│   └── responseFormatter.js    # Formato de respuestas
└── scripts/
    └── cleanExpiredTokens.js   # Limpiador automático

docs/
├── CLAUDE.md                   # Guía técnica
├── API_RESPONSE_FORMAT.md      # Formatos de respuesta
├── TOKENS_SYSTEM.md            # Sistema de tokens
├── TEST_TOKENS.md              # Guía Postman
└── DEBUG_HEADERS.md            # Debugging
```

---

## 🧪 Testing

### Con curl
```bash
# Registrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass1234","name":"Test"}'

# Validar sesión (reemplaza TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/auth/validate

# Logout
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/auth/logout
```

### Con Postman
Ver `TEST_TOKENS.md` para guía completa paso a paso.

---

## 🔧 Configuración

### Variables de Entorno (.env)
```
PORT=3000
JWT_SECRET=your-secret-key-here
APP_URL=http://localhost:3000
NODE_ENV=development
```

Cambiar `JWT_SECRET` en producción con un valor seguro:
```bash
openssl rand -base64 32
```

---

## 💾 Base de Datos

El proyecto usa CSV como almacenamiento temporal. Para producción, cambiar a:
- PostgreSQL
- MongoDB
- MySQL

**Archivos generados automáticamente:**
- `users.csv` - Usuarios con contraseña cifrada
- `tokens_granted.csv` - Tokens activos
- `tokens_revoked.csv` - Tokens invalidados

---

## 📊 Ejemplo: Flujo Completo

```bash
# 1. Registrarse
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Pass1234","name":"Test"}'

# Respuesta incluye token
# → Guardar token

# 2. Ver estadísticas
curl http://localhost:3000/tokens/stats
# totalGranted: 1, totalRevoked: 0

# 3. Validar sesión
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/auth/validate
# ✅ Sesión válida

# 4. Logout
curl -X POST \
  -H "Authorization: Bearer {token}" \
  http://localhost:3000/auth/logout

# 5. Ver estadísticas
curl http://localhost:3000/tokens/stats
# totalGranted: 0, totalRevoked: 1

# 6. Intentar usar token revocado
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/auth/validate
# ❌ Token revocado
```

---

## 🤖 Limpieza Automática de Tokens

El servidor ejecuta automáticamente:
- ⏰ **Tiempo**: 2:00 AM diariamente
- 🧹 **Acción**: Elimina tokens vencidos de `tokens_revoked.csv`
- 📊 **Log**: Muestra cuántos se eliminaron

O ejecutar manualmente:
```bash
POST /tokens/clean
```

---

## 🐛 Debugging

### Token no se extrae
→ Ver `DEBUG_HEADERS.md`

### Token revocado
→ Hacer login nuevamente

### Contraseña incorrecta
→ Revisar credenciales

### CORS issues
→ Agregar headers CORS en `src/server.js`

---

## 📈 Próximas Mejoras

- [ ] Integrar servicio de email real (Gmail, SendGrid)
- [ ] Rate limiting en login
- [ ] Cambio de contraseña en sesión activa
- [ ] Two-factor authentication (2FA)
- [ ] Validación de email
- [ ] OAuth2 / Social login
- [ ] Dashboard de sesiones activas
- [ ] Roles y permisos

---

## ⚖️ Licencia

ISC

---

## 📞 Soporte

- 📚 Lee `CLAUDE.md` para documentación técnica
- 🔍 Usa `/debug/headers` para debugging
- 📋 Revisa `API_RESPONSE_FORMAT.md` para entender respuestas
- ✉️ Revisa los logs en consola

---

## 🎯 Checklist Pre-Producción

- [ ] Cambiar `JWT_SECRET` en `.env`
- [ ] Cambiar BD de CSV a SQL
- [ ] Configurar CORS apropiadamente
- [ ] Agregar rate limiting
- [ ] Integrar servicio de email real
- [ ] Usar HTTPS en producción
- [ ] Configurar logs persistentes
- [ ] Hacer backup automático de BD
- [ ] Revisar auditoría de tokens
- [ ] Implementar logging de errores (Sentry)

---

**Hecho con ❤️ usando Express.js y Node.js**
