# Publicación de Mi Valecito (QA y producción)

Un solo código genera **dos apps independientes**. La variante la elige el perfil de `eas.json`:

| | QA | Producción |
|---|---|---|
| Nombre en el teléfono | Mi Valecito QA | Mi Valecito |
| Identificador (Android / iOS) | `com.mivalecito.app.qa` | `com.mivalecito.app` |
| Backend | `API_URL` / `WEB_URL` del perfil `qa` en `eas.json` | `API_URL` / `WEB_URL` del perfil `production` en `eas.json` |
| Color de fondo del splash e ícono | Ámbar | Azul de marca |
| Se instala desde | APK directo o pista interna de Play / TestFlight | Google Play / App Store |

Las dos apps se pueden tener instaladas a la vez. La de QA muestra "Ambiente de pruebas (QA)" en Perfil.
Ambas usan el scheme `mivalecito://` (el enlace de recuperar contraseña lo abre): con las dos instaladas,
Android pregunta con cuál abrirlo.

Con `npx expo start` la app apunta siempre a tu máquina (ver `lib/config.ts`); las URLs de la tabla son
las de las builds de EAS.

> El identificador de producción (`com.mivalecito.app`) **no se puede cambiar** después de la primera
> publicación. Si se quiere otro, se cambia en `app.config.js` antes de subir nada.

Perfiles de `eas.json`:

- `qa`: APK para instalar directo en los teléfonos de prueba (sin tienda).
- `qa-tiendas`: la app de QA como AAB/IPA para la pista interna de Play o TestFlight.
- `production`: la app real, AAB para Play e IPA para App Store. El número de build sube solo (`autoIncrement`).

---

## 0. Preparación (una sola vez)

1. **Revisar las URLs de cada ambiente** en `eas.json`: perfil `qa` y perfil `production`, en `env.API_URL` y
   `env.WEB_URL`, con `https://`. `qa-tiendas` hereda las de `qa`.
   Si quedan vacías, la build de ese perfil falla a propósito para no apuntar al ambiente equivocado.
2. **Ícono:** `app.config.js` usa los de `assets/marca/` (1024×1024; `icon.png` sin transparencia, como
   exige App Store). Si los cambias, mantén esos requisitos.
3. Instalar EAS CLI e iniciar sesión (se necesita una cuenta gratuita en https://expo.dev):
   ```bash
   npm install -g eas-cli
   cd mobile
   eas login
   eas init          # vincula el proyecto con tu cuenta y agrega extra.eas.projectId a la config
   ```
   `eas init` no puede escribir en `app.config.js`: te mostrará el `projectId` para que lo agregues a mano
   en `expo.extra.eas.projectId`. Haz commit de ese cambio.
4. Probar una build sin tienda antes de publicar: `eas build -p android --profile qa` (paso 1).

## 1. App de QA para el equipo de pruebas

```bash
eas build -p android --profile qa
```

Al terminar, EAS da un enlace y un QR para descargar el **APK**. Se abre en el teléfono y se instala
(Android pedirá permitir "instalar apps de origen desconocido"). Para nuevas versiones de QA se repite
el comando. No hace falta pasar por Google Play.

La primera vez, EAS pregunta si genera la llave de firma (keystore): responde **sí**. EAS la guarda en tu
cuenta. No la borres ni la pierdas: es la que identifica tu app.

---

## 2. Google Play (producción)

### 2.1 Cuenta de desarrollador
1. Crear la cuenta en https://play.google.com/console (pago único de USD 25, con verificación de identidad).
2. Elegir el tipo **personal** u **organización**. Para una empresa conviene *organización*: requiere
   número D-U-N-S, pero no exige la prueba cerrada del paso 2.6.

### 2.2 Crear la app en Play Console
*Todas las apps → Crear app*: nombre "Mi Valecito", idioma español, tipo App, gratuita.

### 2.3 Primera build y primera subida (manual)
```bash
eas build -p android --profile production
```
Genera un **.aab** (Android App Bundle). Google Play exige este formato; el APK no se acepta para publicar.

La **primera** subida a Play tiene que ser manual (limitación de la API de Google):
*Prueba → Prueba interna → Crear versión → Subir* el `.aab` descargado de EAS.
Acepta **Play App Signing** cuando lo ofrezca: Google guarda la llave final y la de EAS queda como
llave de subida.

### 2.4 Subidas siguientes (automáticas, opcional)
1. En Google Cloud, crea una cuenta de servicio con una llave JSON y dale acceso en Play Console
   (*Usuarios y permisos → Invitar*, con permiso de publicar versiones). Guía:
   https://docs.expo.dev/submit/android/
2. Guarda el JSON como `mobile/play-service-account.json`. Ya está en `.gitignore`: **nunca lo subas al repo**.
3. Luego cada versión es:
   ```bash
   eas build -p android --profile production --auto-submit
   ```
   Queda como **borrador** en la pista interna (`releaseStatus: draft`). Lo promueves desde la consola.

### 2.5 Ficha y formularios obligatorios
En *Panel → Configurar tu app*, completar todo antes de publicar:

- **Acceso a la app:** la app exige login, así que hay que dar a Google **un usuario y contraseña de
  prueba** en el backend de producción (con un rol que vea las pantallas principales) e instrucciones.
- **Política de privacidad:** una URL pública (puede ser una página en el frontend web).
- **Seguridad de los datos:** declarar lo que la app recoge: nombre, correo, datos financieros (vales y
  abonos), que viaja cifrado (HTTPS) y cómo se piden las eliminaciones.
- **Eliminación de cuenta:** si los usuarios pueden crear su cuenta desde la app o por enlace de
  activación, Play pide una URL donde solicitar el borrado de la cuenta y sus datos.
- **Clasificación de contenido** (cuestionario), **público objetivo** (mayores de 18 si es crédito),
  **anuncios** (no) y **categoría** (Finanzas o Empresa).
- **Ficha de Play Store:** descripción corta (80 caracteres), descripción completa, ícono de 512×512,
  imagen destacada de 1024×500 y al menos 2 capturas del teléfono.
- **Apps financieras:** al declarar categoría Finanzas, Play puede pedir la *declaración de funciones
  financieras*. Si la app gestiona crédito entre tienda y cliente, responde con exactitud: Play tiene
  reglas específicas para préstamos personales.

### 2.6 Prueba cerrada (solo cuentas personales nuevas)
Las cuentas personales creadas después de noviembre de 2023 deben tener una **prueba cerrada con al
menos 12 testers durante 14 días seguidos** antes de poder pedir acceso a producción. Revisa el número
vigente en Play Console. Se arma en *Prueba → Prueba cerrada*, con una lista de correos de Gmail de los
testers, que se unen por enlace.

### 2.7 Publicar
*Producción → Crear versión* → elegir la build (o promoverla desde la pista interna o cerrada) → notas de
la versión → *Enviar a revisión*. La primera revisión suele tardar de unas horas a unos días.

### 2.8 Nuevas versiones
1. Sube `version` en `app.config.js` (por ejemplo `1.0.0` → `1.1.0`). Es lo que ve el usuario.
   El `versionCode` interno lo sube EAS solo.
2. `eas build -p android --profile production --auto-submit` (o la subida manual).
3. Promover a producción desde Play Console.

### 2.9 QA dentro de Play (opcional)
Si prefieres que los testers instalen QA desde Play en vez de con el APK, crea **otra app** en Play Console
("Mi Valecito QA", `com.mivalecito.app.qa`), no la publiques en producción y usa:
```bash
eas build -p android --profile qa-tiendas    # primera subida manual a Prueba interna
eas submit -p android --profile qa-tiendas   # siguientes
```

---

## 3. App Store (iPhone)

1. **Apple Developer Program:** USD 99 al año, en https://developer.apple.com/programs/. Como empresa se
   necesita número D-U-N-S.
2. **Crear la app en App Store Connect** (https://appstoreconnect.apple.com): *Mis apps → + → Nueva app*,
   bundle ID `com.mivalecito.app`. EAS puede registrar el bundle ID por ti en el paso siguiente.
3. **Build y envío:**
   ```bash
   eas build -p ios --profile production      # EAS crea certificados y perfiles; inicia sesión con tu Apple ID
   eas submit -p ios --profile production     # la sube a App Store Connect / TestFlight
   ```
   No necesitas una Mac: EAS compila en la nube.
4. **TestFlight:** la build aparece ahí en unos minutos y se prueba con testers internos (tu equipo) sin
   revisión. Los testers externos requieren una revisión corta.
5. **Ficha:** capturas de iPhone de 6.9" (1320×2868), descripción, palabras clave, URL de soporte, URL de
   política de privacidad y las *etiquetas de privacidad* (equivalente a "Seguridad de datos" de Play).
6. **Revisión de Apple:** en *Información para la revisión de la app* pon **un usuario y contraseña de
   prueba**. Sin eso la rechazan. Si la app permite crear cuentas, Apple exige que la **eliminación de la
   cuenta se pueda iniciar desde la app** (guía 5.1.1(v)), no basta una página web.
7. *Enviar a revisión*. Suele tardar de 1 a 3 días.

**QA en iPhone:** la forma práctica es una segunda app en App Store Connect con `com.mivalecito.app.qa`,
`eas build -p ios --profile qa-tiendas` y distribuir solo por TestFlight, sin publicarla. El perfil `qa`
(`distribution: internal`) también sirve, pero obliga a registrar cada iPhone con `eas device:create`.

---

## 4. Lo que nunca va al repositorio

- `play-service-account.json` (llave de Google Play)
- Keystores (`*.jks`), certificados y llaves de Apple (`*.p12`, `*.p8`, `*.mobileprovision`)

Todos están en `mobile/.gitignore`. EAS guarda las credenciales de firma en tu cuenta de Expo:
`eas credentials` permite verlas y descargar un respaldo. **Guarda un respaldo del keystore de Android.**
