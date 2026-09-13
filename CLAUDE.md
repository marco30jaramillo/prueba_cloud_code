# CLAUDE.md - Sistema de Autenticación Moderno

Proyecto fullstack de autenticación con **Express.js (Backend)** + **Next.js (Frontend)**.

## 📋 Resumen Ejecutivo

Plataforma segura y escalable para gestionar usuarios con autenticación JWT, roles/permisos granulares e interfaz UX profesional responsive.

**Stack:**
- Backend: Express.js + Node.js
- Frontend: Next.js 14 + React 18 + TypeScript
- Base de datos: CSV (migrará a PostgreSQL/MongoDB)
- Estilos: SCSS + React Bootstrap
- Estado: Zustand
- HTTP: Axios

---

## 🎯 Funcionalidades Implementadas

### Backend (Express.js)
- ✅ Autenticación JWT (24h expiry) con token ID único
- ✅ Roles: superuser, administrador, vendedor, cliente
- ✅ Permisos granulares por rol
- ✅ Hashing PBKDF2 (100k iteraciones + salt)
- ✅ Token Manager (granted/revoked lists)
- ✅ Bootstrap de superuser único
- ✅ Creación de usuarios con validación de permisos
- ✅ Recuperación de contraseña con token de una sola vez
- ✅ CORS configurado para red local
- ✅ Limpieza automática de tokens vencidos (2 AM)

### Frontend (Next.js)
- ✅ Home sin sesión (características, información, CTA)
- ✅ Login con validación
- ✅ Registro de clientes
- ✅ Recuperación de contraseña
- ✅ Reset de contraseña con token
- ✅ Dashboard con menú dinámico por rol
- ✅ Crear usuarios (modal, solo admin/superuser)
- ✅ Navbar responsiva con logout
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Colores suavizados: verde (#10b981), azul (#3b82f6), blanco
- ✅ Animaciones fade-in, slide-in
- ✅ Validación de formularios con mensajes de error
- ✅ Manejo robusto de errores API

---

## 📁 Estructura de Carpetas

```
📦 prueba_cloud_code/
│
├── 📁 backend/
│   ├── src/
│   │   ├── server.js                    # Express app principal
│   │   ├── models/
│   │   │   ├── User.js                 # CRUD usuarios
│   │   │   ├── Role.js                 # Gestión de roles
│   │   │   └── Permission.js           # Gestión de permisos
│   │   ├── routes/
│   │   │   └── auth.js                 # Endpoints /auth/*
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT verification
│   │   │   └── roleMiddleware.js       # Role/permission checks
│   │   ├── utils/
│   │   │   ├── passwordUtils.js        # PBKDF2 hashing
│   │   │   ├── tokenUtils.js           # JWT generation
│   │   │   ├── tokenManager.js         # Token lists
│   │   │   ├── csvDatabase.js          # CSV ORM
│   │   │   ├── mailer.js               # Email stubs
│   │   │   └── responseFormatter.js    # JSON formatting
│   │   └── scripts/
│   │       └── cleanExpiredTokens.js   # Auto cleanup
│   │
│   ├── users.csv                       # User database
│   ├── roles.csv                       # Role definitions
│   ├── permissions.csv                 # Permission definitions
│   ├── tokens_granted.csv              # Active tokens
│   ├── tokens_revoked.csv              # Revoked tokens
│   ├── package.json
│   ├── .env.example
│   └── [docs]
│
├── 📁 frontend/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout + Navbar
│   │   ├── page.tsx                    # Home (landing)
│   │   ├── page.module.scss
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── page.module.scss
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   └── page.module.scss
│   │   ├── forgot-password/
│   │   │   ├── page.tsx
│   │   │   └── page.module.scss
│   │   ├── reset-password/
│   │   │   ├── page.tsx
│   │   │   └── page.module.scss
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       └── page.module.scss
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Navbar.module.scss
│   │   ├── AuthForm.tsx
│   │   └── AuthForm.module.scss
│   │
│   ├── hooks/
│   │   └── useAuth.ts                  # Auth logic
│   │
│   ├── lib/
│   │   ├── api.ts                      # Axios + interceptors
│   │   └── auth-store.ts               # Zustand store
│   │
│   ├── types/
│   │   └── index.ts                    # TypeScript interfaces
│   │
│   ├── styles/
│   │   └── globals.scss                # Global styles + colors
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── .env.example
│   └── .gitignore
│
├── README_BACKEND.md                   # Backend docs
├── README_FRONTEND.md                  # Frontend docs
├── CLAUDE.md                           # Este archivo
└── [otros docs del proyecto]
```

---

## 🚀 Inicio Rápido

### Backend
```bash
cd backend
npm install
# Crear .env con JWT_SECRET
npm run dev
# → Escucha en http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
# Crear .env.local con NEXT_PUBLIC_API_URL
npm run dev
# → Abre http://localhost:3000 en navegador
```

> **Nota**: El backend usa puerto 3000, el frontend está en Next.js (también 3000 por defecto pero redirige a 3001 si hay conflicto).

---

## 🔐 Seguridad

### Autenticación
- **JWT HS256** con firma usando JWT_SECRET
- **Expiración**: 24 horas
- **Token ID único**: Rastrea sesiones individuales
- **Dos listas CSV**: granted (activos) vs revoked (inválidos)
- **Logout real**: Revocación inmediata sin invalidar otros tokens

### Contraseñas
- **PBKDF2** 100,000 iteraciones (NIST recomendado)
- **Salt aleatorio**: 16 bytes por usuario
- **Nunca se guardan**: Solo hash+salt en CSV

### CORS
- Backend acepta solo de `localhost`, `127.0.0.1`, red local (192.168.*, 10.*)
- Frontend acepta solicitudes de cualquier dispositivo en red local

---

## 👥 Roles y Permisos

### Roles Disponibles

| Rol | Crear Usuarios | Permisos | Caso de Uso |
|-----|---|---|---|
| **superuser** | Cualquiera | `system:full-access` | Admin del sistema |
| **administrador** | cliente, vendedor | admin:*, profile:view-all | Manager |
| **vendedor** | ❌ | profile:view-own, profile:view-clients | Vendedor |
| **cliente** | ❌ | profile:view-own, auth:* | Usuario estándar |

### Permisos Categorizados

```
auth:*               - Autenticación (login, logout, validate, etc)
profile:*            - Perfil de usuario (view-own, edit-own, view-all)
admin:*              - Administración (manage-users, manage-roles, etc)
system:full-access   - Acceso total (solo superuser)
```

---

## 📡 Endpoints Principales

### Autenticación (Sin token requerido)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registrar nuevo cliente |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/forgot-password` | Solicitar recuperación |
| POST | `/auth/reset-password` | Restablecer con token |
| POST | `/auth/bootstrap-superuser` | Crear primer superuser (solo si no existe) |
| GET | `/auth/user-schema/:roleType` | Esquema para formulario dinámico |

### Autenticación (Requiere token)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/auth/validate` | Validar sesión actual |
| POST | `/auth/logout` | Cerrar sesión |
| POST | `/auth/create-user` | Crear usuario (validación de permisos) |

### Sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del servidor |
| GET | `/docs` | Documentación API |
| GET | `/tokens/stats` | Estadísticas de tokens |
| POST | `/tokens/clean` | Limpieza manual |

---

## 🎨 Diseño y UX

### Paleta de Colores (Suavizados)

```scss
$primary-green:    #10b981   // Botones primarios, acciones
$secondary-green:  #34d399   // Hover effects
$primary-blue:     #3b82f6   // Enlaces, secundarios
$light-gray:       #f3f4f6   // Fondos, bordes
$text-dark:        #1f2937   // Texto principal
$text-light:       #6b7280   // Texto secundario
```

### Componentes

- **Navbar**: Responsive, collapsa en móvil, muestra rol del usuario
- **AuthForm**: Reutilizable, validación inline, feedback inmediato
- **Cards**: Hover effects, sombras sutiles, animaciones
- **Botones**: Transiciones suaves, iconos emoji

### Animaciones

```scss
.fade-in  // Aparición suave (0.3s)
.slide-in // Entrada desde la izquierda (0.4s)
```

---

## 🔄 Flujos de Usuario

### Registro → Login
1. Usuario accede a `/register`
2. Completa: email, password (8+ chars), nombre
3. POST `/auth/register` → crea cliente automáticamente
4. Backend retorna JWT + datos usuario
5. Frontend guarda en localStorage + Zustand store
6. Redirecciona a `/dashboard`

### Olvidó Contraseña
1. Click en "¿Olvidaste tu contraseña?"
2. Ingresa email en `/forgot-password`
3. Backend envía token de reset (simula envío en consola)
4. Usuario recibe enlace con token
5. Accede a `/reset-password?token=...`
6. Crea nueva contraseña
7. POST `/auth/reset-password` con token
8. Redirecciona a `/login`

### Crear Usuario (Admin/Superuser)
1. Superuser/Admin en `/dashboard`
2. Click "Crear Usuario"
3. Modal con formulario (email, password, name, role)
4. POST `/auth/create-user` con token
5. Backend valida: creador puede crear ese rol
6. Nuevo usuario con token retornado
7. Mensaje de éxito

---

## 💾 Base de Datos (CSV)

### users.csv
```csv
id,email,password,name,role,createdAt,resetToken,resetTokenExpiry
uuid,user@ex.com,pbkdf2_hash:salt,John,cliente,2024-09-12T12:00:00Z,,
```

### roles.csv
```csv
id,name,description,permissions
1,superuser,Super Usuario,system:full-access
2,administrador,Admin,admin:manage-users|profile:view-all|...
3,vendedor,Vendedor,profile:view-own|...
4,cliente,Cliente,auth:login|auth:logout|...
```

### permissions.csv
```csv
id,name,description,category
1,auth:login,Iniciar sesión,auth
2,profile:view-own,Ver propio perfil,profile
...
```

### tokens_granted.csv
```csv
tokenId,userId,email,token,issuedAt,expiresAt
uuid1,user_id,user@ex.com,eyJ0eXA...,2024-09-12T12:00:00Z,2024-09-13T12:00:00Z
```

### tokens_revoked.csv
```csv
tokenId,userId,email,token,revokedAt,expiresAt
uuid2,user_id,user@ex.com,eyJ0eXA...,2024-09-12T14:00:00Z,2024-09-13T12:00:00Z
```

---

## 🎯 Endpoints Faltantes (Posibles Mejoras)

```
PATCH /auth/change-password         Cambiar contraseña (en sesión)
GET   /users                        Listar usuarios (admin)
GET   /users/:id                    Ver usuario específico
PUT   /users/:id                    Editar usuario
DELETE /users/:id                   Eliminar usuario
GET   /sessions                     Listar sesiones activas
DELETE /sessions/:id                Cerrar sesión específica
POST  /auth/refresh-token           Renovar token
GET   /admin/analytics              Estadísticas administrativas
```

---

## 🔧 Configuración

### Backend (.env)
```env
PORT=3000
JWT_SECRET=your-super-secret-key-here-min-32-chars
APP_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
# Para desarrollo remoto:
# NEXT_PUBLIC_API_URL=http://192.168.1.100:3000
```

---

## 📚 Documentación Adicional

- **[README_BACKEND.md](./README_BACKEND.md)** - Guía completa del backend
- **[README_FRONTEND.md](./README_FRONTEND.md)** - Guía completa del frontend

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| CORS error | Verificar IP backend en NEXT_PUBLIC_API_URL |
| Token inválido | Limpiar localStorage, hacer logout e iniciar sesión |
| Puerto ocupado | Cambiar PORT en .env backend |
| Página en blanco | Revisar console (F12) para errores |
| npm not found | Instalar Node.js desde nodejs.org |

---

## 📈 Próximas Versiones

- [ ] Integración email real (SendGrid/Gmail)
- [ ] Rate limiting
- [ ] Validación de email
- [ ] Two-factor authentication (2FA)
- [ ] Migración a PostgreSQL/MongoDB
- [ ] Dashboard administrativo avanzado
- [ ] Logs y auditoría
- [ ] OAuth2/Google login
- [ ] Notificaciones en tiempo real (WebSocket)
- [ ] Cambio de rol en sesión
