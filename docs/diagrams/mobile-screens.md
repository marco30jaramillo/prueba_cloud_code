# Flujo de Pantallas — App Mobile

## Diagrama de Navegación

```mermaid
flowchart TD
    SPLASH["Splash / Init\nCarga JWT desde SecureStore"] --> CHECK{"¿Token válido?"}
    CHECK -->|"No"| LOGIN["login.tsx\nPantalla de login"]
    CHECK -->|"Sí"| TABS["(tabs) — Tab Navigator"]

    LOGIN -->|"POST /auth/login\nJWT guardado"| TABS

    TABS --> HOME["index.tsx\nInicio — Panel de acceso"]
    TABS --> VALES["vales.tsx\nMis Vales / Cartera"]
    TABS --> CART["cartera.tsx\n💼 Solo admin/tendero"]
    TABS --> TEAM["equipo.tsx\n👥 Solo admin/tendero"]
    TABS --> PERFIL["perfil.tsx\nPerfil + Configuración"]

    HOME -->|"Nuevo Vale"| VNUEVO["vale-nuevo.tsx\nModal — Crear Vale"]
    HOME -->|"Mis Vales"| VALES
    HOME -->|"Cartera"| CART
    HOME -->|"Equipo"| TEAM

    VALES -->|"Toca un vale"| VDET["vale/[id].tsx\nDetalle + Abonos"]
    VDET -->|"Registrar abono"| VDET
    VDET -->|"Anular vale"| VDET

    PERFIL -->|"Abrir versión web"| BROWSER["expo-web-browser\nAbre URL web en navegador"]
    PERFIL -->|"Cerrar sesión"| LOGIN
```

## Pantallas y sus Permisos

| Pantalla | Roles | API usada |
|---------|-------|-----------|
| login | todos (sin auth) | `POST /auth/login` |
| index (inicio) | todos | — |
| vales | todos | `GET /vales/mis-vales` (cliente), `GET /vales/tienda/:id` (admin/tendero) |
| cartera | superuser, administrador, tendero | `GET /vales/tienda/:id`, `GET /tiendas/mis-tiendas` |
| equipo | superuser, administrador, tendero | `GET /tiendas/:id/usuarios` |
| perfil | todos | `PATCH /auth/profile`, `PATCH /auth/change-password` |
| vale-nuevo | superuser, administrador, tendero, vendedor | `POST /vales` |
| vale/[id] | todos (con acceso al vale) | `GET /vales/:id`, `POST /vales/:id/abonos` |

## Almacenamiento en Dispositivo

```mermaid
flowchart LR
    SS["expo-secure-store\n(almacenamiento cifrado)"]
    ZS["Zustand Store\n(memoria durante sesión)"]
    AX["Axios Interceptor\n(agrega Bearer token)"]

    SS -->|"init(): leer mv_token + mv_user"| ZS
    ZS -->|"setApiToken(token)"| AX
    AX -->|"Authorization: Bearer ..."| API["Azure Backend API"]
```
