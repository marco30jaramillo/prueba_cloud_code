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
- ✅ Roles dinámicos desde CSV: superuser, administrador, vendedor, cliente (+ roles personalizados)
- ✅ Permisos granulares por rol con herencia desde módulos
- ✅ Hashing PBKDF2 (100k iteraciones + salt)
- ✅ Token Manager (granted/revoked lists)
- ✅ Bootstrap de superuser único
- ✅ Creación de usuarios con validación de permisos
- ✅ Recuperación de contraseña con token de una sola vez
- ✅ CORS configurado para red local
- ✅ Limpieza automática de tokens vencidos (2 AM)
- ✅ Gestión de usuarios (foto, estado activo/inactivo)
- ✅ Cambio de contraseña propia y de otros usuarios
- ✅ Generación de contraseñas aleatorias seguras
- ✅ Edición de perfil de usuario
- ✅ Habilitar/deshabilitar usuarios
- ✅ Logs de auditoría (todas las acciones del sistema)
- ✅ Sistema de módulos dinámico desde `modules.csv`
- ✅ Jerarquía de roles desde `roles.csv` (`canManage` + `modules` con niveles)
- ✅ Herencia de permisos: asignar módulo a rol hereda sus permisos automáticamente
- ✅ Tiers de permisos por módulo: `read`, `write`, `full`
- ✅ API de configuración de roles (`/roles-config`)
- ✅ Middleware `requirePermission()` — acceso basado en permisos, no roles hardcodeados

### Frontend (Next.js)
- ✅ Home sin sesión (características, información, CTA)
- ✅ Login con validación
- ✅ Registro de clientes con foto de perfil (opcional)
- ✅ Recuperación de contraseña
- ✅ Reset de contraseña con token
- ✅ Dashboard con módulos dinámicos desde API (sin hardcoding)
- ✅ Crear usuarios (modal, solo admin/superuser)
- ✅ Navbar responsiva con logout y dropdown
- ✅ Sidebar móvil/tablet (aparece al hacer scroll, <1024px)
- ✅ Botón de panel (icono 9 cuadros) en navbar → `/dashboard`
- ✅ Logout en este dispositivo + Logout en todos los dispositivos
- ✅ **Mi Perfil** (`/dashboard/profile`) - para todos
- ✅ **Gestión de Usuarios** (`/dashboard/users`) - permisos dinámicos
- ✅ **Auditoría** (`/dashboard/audit`) - acceso por permiso `admin:view-audit`
- ✅ **Roles y Permisos** (`/dashboard/roles`) - acceso por permiso `admin:view-roles`
  - Selector de nivel de acceso por módulo (Sin acceso / Lectura / Escritura / Completo)
  - Gestión de permisos directos con vista de huérfanos
  - Vista de permisos efectivos
  - Crear nuevo rol con modal
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ `ProtectedRoute` — solo requiere autenticación; el backend controla los permisos

---

## 📁 Estructura de Carpetas

```
📦 prueba_cloud_code/
│
├── 📁 backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Role.js          # Jerarquía, herencia, tiers, createRole/updateRole
│   │   │   ├── Module.js        # Módulos con permRead/permWrite/permFull
│   │   │   ├── AuditLog.js
│   │   │   └── Permission.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js         # /manageable-roles → superuser ve todos los roles
│   │   │   ├── modules.js       # GET /modules (por rol), GET /modules/all
│   │   │   ├── roles-config.js  # GET/POST/PATCH /roles-config
│   │   │   └── audit.js         # Protegido por requirePermission('admin:view-audit')
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── roleMiddleware.js  # requireRole() + requirePermission()
│   │   │   └── auditMiddleware.js
│   │   └── utils/
│   │       ├── passwordUtils.js
│   │       ├── tokenUtils.js
│   │       ├── tokenManager.js
│   │       ├── responseFormatter.js
│   │       └── ...
│   │
│   ├── users.csv
│   ├── roles.csv          # id,name,description,permissions,canManage,modules
│   ├── modules.csv        # id,name,...,permRead,permWrite,permFull
│   ├── audit_logs/
│   └── tokens_granted.csv / tokens_revoked.csv
│
├── 📁 frontend/
│   ├── app/
│   │   └── dashboard/
│   │       ├── page.tsx         # Módulos dinámicos desde /modules API
│   │       ├── profile/
│   │       ├── users/
│   │       ├── audit/           # Acceso por permiso admin:view-audit
│   │       └── roles/           # Acceso por permiso admin:view-roles
│   │
│   ├── components/
│   │   ├── Navbar.tsx           # Sidebar móvil + botón panel 9-cuadros
│   │   ├── Navbar.module.scss
│   │   └── ProtectedRoute.tsx   # Solo valida autenticación, no rol
│   │
│   └── lib/
│       ├── api.ts               # authAPI, modulesAPI, rolesConfigAPI, usersAPI
│       └── auth-store.ts
```

---

## 🚀 Inicio Rápido

### Backend
```bash
cd backend
npm install
# Crear .env con JWT_SECRET y PORT=3001
npm run dev
# → Escucha en http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → Abre http://localhost:3000
```

---

## 🔐 Sistema de Módulos y Permisos

### modules.csv — Definición de módulos

```csv
id,name,description,buttonLabel,href,icon,showInNav,permRead,permWrite,permFull
1,"Mi Perfil",...,"/dashboard/profile","👤","true","profile:view-own","profile:view-own|profile:edit-own","profile:view-own|profile:edit-own"
2,"Gestionar Usuarios",...,"/dashboard/users","👥","true","auth:view-users","auth:view-users|auth:create-user|...","...auth:delete-user|admin:manage-roles"
3,"Auditoría",...,"/dashboard/audit","📋","true","admin:view-audit|admin:view-stats","...","..."
4,"Roles y Permisos",...,"/dashboard/roles","🛡️","true","admin:view-roles","admin:view-roles|admin:manage-roles","..."
```

- `permRead` — permisos mínimos para acceso de solo lectura
- `permWrite` — permisos para crear/editar (acumulativo: incluye permRead)
- `permFull` — permisos completos incluyendo borrar (acumulativo: incluye permWrite)

### roles.csv — Roles con acceso a módulos por nivel

```csv
id,name,description,permissions,canManage,modules
1,"superuser",...,"system:full-access","superuser|administrador|vendedor|cliente","1:full|2:full|3:full|4:full"
2,"administrador",...,"admin:manage-users|...","vendedor|cliente","1:full|2:write|3:read"
3,"vendedor",...,"...","","1:write"
4,"cliente",...,"...","","1:read"
```

- `modules` column: `"moduleId:level|moduleId:level"` donde level = `read | write | full`
- `canManage`: roles que este rol puede crear/gestionar
- Al asignar un módulo con nivel, el rol **hereda automáticamente** los permisos de ese nivel

### Herencia de permisos

`Role.getEffectivePermissions(roleName)` = permisos propios ∪ permisos de módulos asignados al nivel correcto

### Cómo agregar acceso a un módulo

1. En `/dashboard/roles`, seleccionar el rol
2. En la pestaña "Acceso a módulos", cambiar el nivel del módulo deseado
3. Los permisos se heredan automáticamente
4. El módulo aparece en el dashboard y navbar del usuario al próximo login

---

## 📡 Endpoints

### Autenticación (sin token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registrar nuevo cliente |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/forgot-password` | Solicitar recuperación |
| POST | `/auth/reset-password` | Restablecer con token |
| POST | `/auth/bootstrap-superuser` | Crear primer superuser |

### Autenticación (con token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/auth/validate` | Validar sesión |
| POST | `/auth/logout` | Cerrar sesión |
| POST | `/auth/logout-all` | Cerrar en todos los dispositivos |
| POST | `/auth/create-user` | Crear usuario |
| PATCH | `/auth/change-password` | Cambiar propia contraseña |
| PATCH | `/auth/profile` | Actualizar perfil propio |
| PATCH | `/auth/password/:userId` | Cambiar contraseña de otro usuario |

### Módulos
| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/modules` | auth | Módulos accesibles al rol actual |
| GET | `/modules/all` | system:full-access | Todos los módulos + roles |

### Usuarios
| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/users` | admin:manage-users | Listar usuarios gestionables |
| GET | `/users/manageable-roles` | admin:manage-users | Roles disponibles para crear |
| PATCH | `/users/:id` | admin:manage-users | Editar usuario |
| PATCH | `/users/:id/status` | admin:manage-users | Habilitar/deshabilitar |
| POST | `/users/:id/generate-password` | admin:manage-users | Generar contraseña |

### Configuración de Roles
| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/roles-config` | admin:view-roles | Ver matriz módulos/roles/permisos |
| POST | `/roles-config` | admin:manage-roles | Crear nuevo rol |
| PATCH | `/roles-config/:roleId` | admin:manage-roles | Actualizar acceso/permisos de un rol |

### Auditoría
| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/audit/logs` | admin:view-audit | Últimos 100 eventos |

---

## 🏗️ Decisiones de Arquitectura

### Fuente única de verdad: roles.csv
- El acceso de cada rol a cada módulo se define en la columna `modules` de `roles.csv`
- `modules.csv` define qué permisos corresponden a cada nivel de acceso
- No hay listas de roles en `modules.csv` — cada módulo no sabe quién tiene acceso

### Permisos basados en permisos, no en roles
- Todos los endpoints de API usan `requirePermission('perm:name')`, nunca `requireRole('superuser')`  
- Excepción: `system:full-access` en superuser es evaluado como comodín por `hasPermission()`
- Las páginas de frontend usan `<ProtectedRoute>` solo para validar autenticación; el backend controla permisos

### Dependencia circular Role ↔ Module
- `Role.getEffectivePermissions` necesita Module → lazy `require('./Module')` dentro del método
- `Module.getForRole` necesita Role → lazy `require('./Role')` dentro del método

### Roles personalizados
- `Role.createRole()` hace append a roles.csv con ID auto-incremental
- `GET /users/manageable-roles` devuelve todos los roles para superuser (incluye nuevos)
- Los nuevos roles aparecen en el dropdown de creación de usuarios automáticamente

---

## 🔧 Configuración

### Backend (.env)
```env
PORT=3001
JWT_SECRET=your-super-secret-key-here-min-32-chars
APP_URL=http://localhost:3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
# Para desarrollo remoto (detección automática si no se configura):
# NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
```

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| CORS error | Verificar IP backend en NEXT_PUBLIC_API_URL |
| Token inválido | Limpiar localStorage, hacer logout e iniciar sesión |
| Módulo no aparece | Verificar que el rol tiene el módulo asignado en roles.csv con nivel correcto |
| Página se queda cargando | Verificar que no hay `user?.role === 'superuser'` hardcodeado en el componente |
| Invalid status code en API | Verificar que `ResponseFormatter.success(res, data)` — el mensaje va dentro de `data`, no como tercer arg |
| Puerto ocupado | Cambiar PORT en .env backend |

---

## 📈 Próximas Versiones

- [ ] Integración email real (SendGrid/Gmail)
- [ ] Rate limiting en endpoints
- [ ] Validación de email con confirmación
- [ ] Two-factor authentication (2FA)
- [ ] Migración a PostgreSQL/MongoDB
- [ ] OAuth2/Google login
- [ ] Notificaciones en tiempo real (WebSocket)
- [ ] Soft delete de usuarios
- [ ] Exportar usuarios a CSV
- [ ] Búsqueda y filtrado avanzado en tabla de usuarios
- [ ] Internacionalización (i18n)
- [ ] Editor visual de permisos por endpoint en `/dashboard/roles`
- [ ] Asignación de rol a usuario desde `/dashboard/roles`
