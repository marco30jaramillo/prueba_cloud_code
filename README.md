# Mi Valecito

Sistema de crédito local — gestión de vales al fiado, tiendas y clientes.

## Stack

| Componente | Tecnología | Puerto / URL |
|-----------|-----------|-------------|
| **Backend** | Express.js + Node.js | `:3001` / Azure App Service |
| **Frontend** | Next.js 14 + TypeScript | `:3000` / Azure App Service |
| **Mobile** | Expo SDK 57 (React Native) | iOS / Android |
| **Base de datos** | Dual-mode: CSV (dev) / Azure SQL (prod) | — |

## Inicio rápido

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (nueva terminal)
cd frontend && npm install && npm run dev

# Mobile (nueva terminal)
cd mobile && npm install && npx expo start --lan
```

## Estructura

```
prueba_cloud_code/
├── backend/          # Express.js API — ver backend/README.md
├── frontend/         # Next.js dashboard — ver frontend/README.md
├── mobile/           # Expo app iOS/Android — ver mobile/README.md
└── docs/
    └── diagrams/
        ├── architecture.md      # Diagrama de arquitectura (Mermaid)
        ├── er-diagram.md        # Diagrama ER de base de datos (Mermaid)
        └── mobile-screens.md    # Flujo de pantallas mobile (Mermaid)
```

## URLs de producción (Azure)

| Servicio | URL |
|---------|-----|
| Backend API | `https://app-backend-mivalencito-b3hycrgxaef2bjhn.brazilsouth-01.azurewebsites.net` |
| Frontend | `https://app-frontend-mivalencito-gkf5bncwcpbkascb.brazilsouth-01.azurewebsites.net/dashboard` |
| Docs API | `https://app-backend-mivalencito-b3hycrgxaef2bjhn.brazilsouth-01.azurewebsites.net/docs` |

## Documentación de la API

La API expone documentación interactiva en JSON:

- `GET /docs` — panorama general, módulos y estructura de respuestas
- `GET /docs/auth` — autenticación y sesión
- `GET /docs/users` — gestión de usuarios
- `GET /docs/tiendas` — tiendas y equipo
- `GET /docs/vales` — vales al fiado y abonos
- `GET /docs/modules` — módulos del dashboard
- `GET /docs/roles` — roles y permisos
- `GET /docs/audit` — registros de auditoría

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `superuser` | Acceso total — comodín `system:full-access` |
| `administrador` | Gestiona usuarios, roles, cartera, auditoría |
| `tendero` | Administra su tienda, crea vales, ve cartera |
| `vendedor` | Crea vales en su tienda asignada |
| `cliente` | Ve y sigue sus propios vales |

## Diagramas

Ver [`docs/diagrams/`](docs/diagrams/) para:
- Arquitectura del sistema
- Entidades de la base de datos
- Flujo de navegación mobile
