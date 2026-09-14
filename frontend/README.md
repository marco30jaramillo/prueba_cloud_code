# Frontend — Mi Valecito Dashboard

Next.js 14 App Router con autenticación JWT, módulos dinámicos por rol e interfaz responsive.

## Inicio

```bash
cd frontend
npm install
# Crear .env.local (ver Configuración)
npm run dev   # → http://localhost:3000
```

## Configuración (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
# Producción:
# NEXT_PUBLIC_API_URL=https://app-backend-mivalencito-b3hycrgxaef2bjhn.brazilsouth-01.azurewebsites.net
```

## Estructura

```
frontend/
├── app/
│   ├── page.tsx                    # Home pública (sin sesión)
│   ├── login/page.tsx              # Login
│   ├── register/page.tsx           # Registro de clientes
│   ├── forgot-password/page.tsx    # Recuperación de contraseña
│   ├── reset-password/page.tsx     # Restablecimiento con token
│   └── dashboard/
│       ├── page.tsx                # Dashboard — módulos dinámicos
│       ├── profile/page.tsx        # Mi Perfil (todos los roles)
│       ├── users/page.tsx          # Gestión de Usuarios (admin)
│       ├── audit/page.tsx          # Auditoría (admin)
│       ├── roles/page.tsx          # Roles y Permisos (admin)
│       ├── mis-vales/page.tsx      # Mis Vales (cliente)
│       ├── vale-nuevo/page.tsx     # Nueva Venta (tendero/vendedor)
│       ├── cartera/page.tsx        # Cartera (tendero/admin)
│       └── tienda/page.tsx         # Mi Tienda (tendero/admin)
├── components/
│   ├── Navbar.tsx                  # Navbar responsiva + sidebar móvil
│   ├── Navbar.module.scss
│   └── ProtectedRoute.tsx          # Solo valida auth — backend controla permisos
└── lib/
    ├── api.ts                      # authAPI, modulesAPI, usersAPI, tiendasAPI, valesAPI, rolesConfigAPI
    └── auth-store.ts               # Zustand store (token + user)
```

## Módulos del Dashboard

Los módulos se cargan dinámicamente desde `GET /modules` según el rol del usuario.  
No hay hardcoding de roles en el frontend — el backend controla el acceso.

| Módulo | Ruta | Roles con acceso |
|--------|------|-----------------|
| Mi Perfil | `/dashboard/profile` | todos |
| Gestionar Usuarios | `/dashboard/users` | superuser, administrador |
| Auditoría | `/dashboard/audit` | superuser, administrador |
| Roles y Permisos | `/dashboard/roles` | superuser, administrador |
| Mis Vales | `/dashboard/mis-vales` | cliente |
| Nueva Venta | `/dashboard/vale-nuevo` | tendero, vendedor |
| Cartera | `/dashboard/cartera` | tendero, administrador |
| Mi Tienda | `/dashboard/tienda` | tendero, administrador |

## Cliente API (`lib/api.ts`)

```ts
authAPI      // login, register, validate, logout, changePassword, updateProfile
modulesAPI   // getAll (según rol)
usersAPI     // getAll, update, toggleStatus, generatePassword, buscarClientes
rolesConfigAPI // getMatrix, createRole, updateRole
tiendasAPI   // getMisTiendas, getById, update, getUsuarios, addUsuario, removeUsuario
valesAPI     // crear, getMisVales, getCartera, getById, anular, registrarAbono, getAbonos, anularAbono
```

Axios intercepta automáticamente el 401 y hace logout salvo en rutas públicas.

## Colores de roles

```ts
const ROLE_COLORS = {
  superuser:     '#f59e0b',  // amber
  administrador: '#3b82f6',  // blue
  vendedor:      '#10b981',  // green
  cliente:       '#8b5cf6',  // purple
}
```
