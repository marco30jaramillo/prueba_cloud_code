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

## Configuración y variantes (QA / producción)

La app tiene dos variantes que salen del mismo código (`app.config.js`):

| Variante | Nombre | Identificador | Backend |
|---|---|---|---|
| `production` (por defecto) | Mi Valecito | `com.mivalecito.app` | URLs fijas en `app.config.js` |
| `qa` | Mi Valecito QA | `com.mivalecito.app.qa` | `API_URL` / `WEB_URL` del perfil `qa` en `eas.json` |

`lib/config.ts` lee `API_URL` y `WEB_URL` de la variante vía `expo-constants`; no se editan a mano.

```bash
npx expo start                                                              # producción
APP_VARIANT=qa API_URL=https://... WEB_URL=https://... npx expo start --lan # QA
```

## Generar builds y publicar

```bash
npm install -g eas-cli && eas login
eas build -p android --profile qa           # APK de QA para instalar directo
eas build -p android --profile production   # AAB para Google Play
eas build -p ios --profile production       # IPA para App Store / TestFlight
```

El paso a paso completo (Google Play, App Store, credenciales) está en [PUBLICACION.md](PUBLICACION.md).

## Estructura

```
mobile/
├── app.config.js              # Variantes QA / producción (nombre, identificador, URLs)
├── eas.json                   # Perfiles de build: qa, qa-tiendas, production
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
    └── config.ts              # API_URL, WEB_URL, APP_VARIANT (desde app.config.js)
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
