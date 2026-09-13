# Frontend - Sistema de Autenticación

Frontend moderno en **Next.js + TypeScript** con diseño responsivo, componentes escalables y manejo de autenticación basado en roles.

## 🚀 Características

- ✅ **Next.js 14** con App Router
- ✅ **TypeScript** para type-safety
- ✅ **React Bootstrap** para componentes UI
- ✅ **SCSS Modules** para estilos modulares
- ✅ **Zustand** para state management
- ✅ **Axios** para llamadas API
- ✅ **Responsive Design** (móvil, tablet, desktop)
- ✅ **Animaciones y Transiciones** suaves
- ✅ **Autenticación basada en roles**

## 📁 Estructura del Proyecto

```
frontend/
├── app/                    # Páginas (Next.js App Router)
│   ├── layout.tsx         # Layout base con Navbar
│   ├── page.tsx           # Home sin sesión
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   └── dashboard/         # Panel después de login
├── components/            # Componentes reutilizables
│   ├── Navbar.tsx
│   ├── AuthForm.tsx
│   └── *.module.scss
├── hooks/                 # Custom hooks
│   └── useAuth.ts         # Hook de autenticación
├── lib/                   # Utilidades
│   ├── api.ts            # Cliente HTTP con axios
│   └── auth-store.ts     # Zustand store
├── types/                # TypeScript types
│   └── index.ts
├── styles/               # Estilos globales
│   └── globals.scss
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🎨 Colores y Diseño

- **Verde Principal**: `#10b981` (Acciones, botones primarios)
- **Azul Secundario**: `#3b82f6` (Enlaces, botones secundarios)
- **Blanco**: `#ffffff` (Fondo)
- **Gris Suave**: `#f8fafb`, `#f3f4f6` (Fondos alternativos)

## 📄 Páginas Implementadas

### 1. **Home (Sin Sesión)**
- Información general del sistema
- Características principales
- Botones para login/register
- Descripción de roles disponibles

### 2. **Login**
- Formulario de inicio de sesión
- Validación de campos
- Enlace a recuperar contraseña
- Enlace a registrarse

### 3. **Register**
- Formulario de registro para nuevos clientes
- Validación de contraseña
- Confirmación de contraseña
- Términos y condiciones (placeholder)

### 4. **Forgot Password**
- Solicitud de recuperación
- Envío de enlace de reset al email

### 5. **Reset Password**
- Restablecer contraseña con token único
- Validación de contraseña nueva
- Redirección a login

### 6. **Dashboard**
- Panel principal después de login
- Menú dinámico basado en rol del usuario
- Opciones disponibles:
  - **Crear Usuario** (Superuser/Admin)
  - **Restablecer Contraseña** (Superuser/Admin)
  - **Mi Perfil** (Todos)
  - **Estadísticas** (Todos)
- Modal para crear usuarios con formulario

## 🔧 Instalación

```bash
cd frontend
npm install
```

## 🚀 Desarrollo

```bash
# Servidor de desarrollo
npm run dev

# Navegar a http://localhost:3000
```

## 🏗️ Build

```bash
npm run build
npm start
```

## 📡 Configuración de API

El frontend se conecta al backend en `http://localhost:3000` por defecto.

Para cambiar la URL de la API, edita `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:3000
```

## 🔐 Autenticación

### Flujo de Login

1. Usuario ingresa email y contraseña
2. Frontend envía solicitud a `POST /auth/login`
3. Backend retorna token JWT y datos del usuario
4. Frontend guarda token en `localStorage` y store
5. Token se incluye en headers de futuras requests
6. Usuario redirigido a `/dashboard`

### Flujo de Logout

1. Usuario hace click en "Logout"
2. Frontend llama a `POST /auth/logout`
3. Backend revoca el token
4. Frontend limpia `localStorage`
5. Usuario redirigido a home

## 🎯 Endpoints Utilizados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registrar nuevo cliente |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/validate` | Validar token actual |
| POST | `/auth/logout` | Cerrar sesión |
| POST | `/auth/forgot-password` | Solicitar recuperación |
| POST | `/auth/reset-password` | Restablecer contraseña |
| POST | `/auth/bootstrap-superuser` | Crear primer superuser |
| POST | `/auth/create-user` | Crear usuario (requiere auth) |
| GET | `/auth/user-schema/:roleType` | Obtener esquema de usuario |

## 🧩 Componentes Principales

### **AuthForm**
Componente reutilizable para formularios de autenticación.
- Props: `type`, `onSubmit`, `isLoading`
- Validación de campos
- Mensajes de error
- Animaciones

### **Navbar**
Barra de navegación responsiva.
- Links condicionales según autenticación
- Muestra rol y nombre del usuario
- Botón de logout

## 🎮 Manejo de Estado

**Zustand Store** (`lib/auth-store.ts`):
```typescript
- user: User | null
- token: string | null
- isAuthenticated: boolean
- isLoading: boolean
- setAuth(user, token)
- logout()
```

**LocalStorage**:
- `authToken`: JWT token
- `authUser`: Datos del usuario (JSON)

## 📱 Responsive Design

- **Móvil**: Columna única, botones full-width
- **Tablet**: 2 columnas, diseño adaptado
- **Desktop**: 3-4 columnas, layout completo

Breakpoints Bootstrap:
- `xs`: <576px
- `sm`: 576px+
- `md`: 768px+
- `lg`: 992px+
- `xl`: 1200px+

## 🎨 Animaciones

- **fade-in**: Aparición suave
- **slide-in**: Desplazamiento desde la izquierda
- **Hover effects**: Transformaciones en botones y cards

## 🔒 Seguridad

- Tokens almacenados en `localStorage`
- CORS configurado en backend
- Validación de campos en frontend
- Contraseñas nunca se guardan
- Headers seguros en API

## 🐛 Troubleshooting

### "Error: CORS policy"
- Verificar que backend está corriendo en `http://localhost:3000`
- Revisar `NEXT_PUBLIC_API_URL` en `.env.local`

### "Token no válido"
- Limpiar `localStorage`
- Hacer logout e iniciar sesión nuevamente

### "Página en blanco"
- Revisar consola del navegador (F12)
- Asegurar que `npm run dev` está ejecutándose

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [React Bootstrap](https://react-bootstrap.github.io/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Axios](https://axios-http.com/)
