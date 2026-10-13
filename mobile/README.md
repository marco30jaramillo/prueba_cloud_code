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

`lib/config.ts` decide a qué servidor apunta la app:

| Situación | Backend | Web |
|---|---|---|
| Desarrollo (`npx expo start`) | `http://<IP de tu máquina>:3001` | `http://<IP de tu máquina>:3000/dashboard` |
| Build `qa` / `qa-tiendas` (EAS) | `API_URL` del perfil en `eas.json` | `WEB_URL` del perfil |
| Build `production` (EAS) | `API_URL` del perfil `production` en `eas.json` | `WEB_URL` del perfil |
| Con `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL` (ver `.env.example`) | el valor definido | el valor definido |

En desarrollo la IP sale de la dirección con la que Expo sirve la app. Para que el celular llegue
a tu computador: misma red Wi-Fi, el backend (`backend/`) y, si usas «Abrir versión web», la web
(`frontend/`) corriendo, y el firewall de Windows permitiendo los puertos 3001 y 3000. Después de
cambiar la configuración, reinicia con `npx expo start -c`.

## Variantes QA y producción

`app.config.js` genera dos apps desde el mismo código, según `APP_VARIANT` (lo fija el perfil de `eas.json`):

| Variante | Nombre | Identificador |
|---|---|---|
| `production` (por defecto) | Mi Valecito | `com.mivalecito.app` |
| `qa` | Mi Valecito QA | `com.mivalecito.app.qa` |

Se pueden instalar las dos a la vez; la de QA lo indica en Perfil. Ambas usan el scheme `mivalecito`.

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
├── app.config.js              # Variantes QA / producción (nombre, identificador)
├── eas.json                   # Perfiles de build y URLs de cada ambiente: qa, qa-tiendas, production
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
│       ├── cartera.tsx        # KPIs, buscar cliente, sus vales y pago (admin/tendero)
│       ├── equipo.tsx         # Equipo; el propietario agrega o crea vendedores
│       └── perfil.tsx         # Perfil, contraseña, abrir web
└── lib/
    ├── api.ts                 # Axios + interceptor Bearer token
    ├── store.ts               # Zustand — token + user en SecureStore
    └── config.ts              # API_URL, WEB_URL, APP_VARIANT
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
| cartera | admin/tendero | KPIs; buscar cliente por nombre o correo; sus vales por cobrar con selección; «Pagar seleccionados» o «Pago integral» (del más antiguo al más reciente) |
| equipo | admin/tendero | Usuarios de la tienda; el propietario (y admin) agrega un vendedor registrado por su correo exacto o crea uno nuevo, que recibe correo de activación |
| perfil | todos | Nombre, contraseña, abrir versión web |
| vale-nuevo | admin/tendero/vendedor | Formulario crear vale |
| vale/[id] | todos | Detalle + historial de abonos + registrar abono |

## Módulos y permisos

Las pestañas y los accesos de Inicio salen de `GET /modules` (los módulos del rol, los mismos del
menú web), no del nombre del rol: lo que se cambie en «Roles y permisos» se refleja en la app al
volver a abrirla. La correspondencia está en `lib/modulos.ts`:

| Módulo (ruta web) | En la app |
|---|---|
| Mis vales | Pestaña Vales con los vales propios |
| Nueva venta | Botón «Nuevo vale» y pestaña Vales con los de la tienda |
| Cartera | Pestaña Cartera; en lectura solo consulta, en escritura o total también cobra |
| Mi tienda | Pestaña Equipo; en escritura el dueño agrega, crea o quita vendedores y encargados |

Los botones de cobrar y anular salen de los permisos efectivos del rol (`usePermiso`). Modelo completo: [docs/permisos.md](../docs/permisos.md).

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
| react-native-keyboard-controller | 1.21.9 | Formularios suben sobre el teclado (`KeyboardAwareScrollView`); requiere reanimated + worklets |
| @react-native-community/datetimepicker | 9.1.0 | Calendario del sistema para fechas (`components/CampoFecha.tsx`) |

## Notas

- El archivo `.npmrc` tiene `legacy-peer-deps=true` para SDK 57
- `expo-splash-screen` **no** está instalado — Expo Router SDK 57 lo gestiona internamente
- Para red local (dispositivo físico) usar siempre `--lan`, no `--localhost`
