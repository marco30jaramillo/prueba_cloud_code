# Mobile — Mi Valecito App

Aplicación iOS/Android con Expo SDK 57 (React Native + TypeScript).  
Se conecta al backend desplegado en Azure.

## Inicio

```bash
cd mobile
npm install
npx expo start --lan   # usar --lan para dispositivos físicos en red local
```

Escanea el QR con **Expo Go** (SDK 57) en tu dispositivo.

## Configuración

```ts
// mobile/lib/config.ts
export const API_URL = 'https://app-backend-mivalencito-b3hycrgxaef2bjhn.brazilsouth-01.azurewebsites.net';
export const WEB_URL = 'https://app-frontend-mivalencito-gkf5bncwcpbkascb.brazilsouth-01.azurewebsites.net/dashboard';
```

## Generar APK (Android)

```bash
# Requiere cuenta Expo + EAS CLI
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

El perfil `preview` en `eas.json` genera un APK instalable directamente.

## Estructura

```
mobile/
├── app/
│   ├── _layout.tsx            # Root: init auth, redirección login/tabs
│   ├── login.tsx              # Pantalla de login
│   ├── vale-nuevo.tsx         # Modal: crear vale
│   ├── vale/
│   │   └── [id].tsx           # Detalle del vale + abonos
│   └── (tabs)/
│       ├── _layout.tsx        # Tab Navigator (oculta tabs por rol)
│       ├── index.tsx          # Inicio — panel de acceso
│       ├── vales.tsx          # Mis Vales / Cartera según rol
│       ├── cartera.tsx        # KPIs de cartera (admin/tendero)
│       ├── equipo.tsx         # Gestión de equipo (admin/tendero)
│       └── perfil.tsx         # Perfil, contraseña, abrir web
└── lib/
    ├── api.ts                 # Axios + interceptor Bearer token
    ├── store.ts               # Zustand — token + user en SecureStore
    └── config.ts              # API_URL, WEB_URL
```

## Autenticación

- JWT se almacena en `expo-secure-store` (cifrado en el dispositivo)
- Al iniciar la app, `init()` carga el token desde SecureStore
- `setApiToken(token)` actualiza el interceptor de Axios de forma síncrona (no async)
- No se usan cookies — Bearer token en header `Authorization`

## Pantallas

| Pantalla | Roles | Descripción |
|---------|-------|-------------|
| login | todos | JWT login |
| index | todos | Panel de acceso con tarjetas de módulos |
| vales | todos | Lista de vales (mis-vales o cartera según rol) |
| cartera | admin/tendero | KPIs: total pendiente, en mora, abonado |
| equipo | admin/tendero | Usuarios de la tienda |
| perfil | todos | Nombre, contraseña, abrir versión web |
| vale-nuevo | admin/tendero/vendedor | Formulario crear vale |
| vale/[id] | todos | Detalle + historial de abonos + registrar abono |

## Formato de respuesta API

```ts
// Siempre verificar así:
if (res?.status == 'success') {
  // éxito — datos en res.data o res.token (login)
}
```

## Dependencias principales

| Paquete | Versión | Uso |
|---------|---------|-----|
| expo | ~57.0.22 | SDK base |
| expo-router | ~57.0.21 | Navegación file-based |
| expo-secure-store | ~57.0.4 | Almacenamiento seguro JWT |
| expo-web-browser | ~57.0.3 | Abrir web app |
| zustand | ^4.5.5 | Estado global |
| axios | ^1.7.7 | HTTP client |
| react-native-safe-area-context | ~5.7.0 | Safe area |

## Notas

- El archivo `.npmrc` tiene `legacy-peer-deps=true` para SDK 57
- `expo-splash-screen` **no** está instalado — Expo Router SDK 57 lo gestiona internamente
- Para red local (dispositivo físico) usar siempre `--lan`, no `--localhost`
