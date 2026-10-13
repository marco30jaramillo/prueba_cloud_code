// Configuración de Expo por variante. Un solo código genera dos apps independientes:
//   APP_VARIANT=production (por defecto) -> "Mi Valecito",    com.mivalecito.app
//   APP_VARIANT=qa                       -> "Mi Valecito QA", com.mivalecito.app.qa
// Al tener distinto identificador, ambas se instalan lado a lado y Google Play / App Store
// las tratan como apps distintas: la build de QA nunca llega a los usuarios finales.
// La variante y sus URLs (API_URL, WEB_URL) las fija el perfil de eas.json: cada ambiente
// tiene las suyas ahí. Con `expo start` la app apunta a tu máquina (ver lib/config.ts).

const VARIANTES = {
  production: {
    nombre: 'Mi Valecito',
    identificador: 'com.mivalecito.app',
    color: '#2563EB',
  },
  qa: {
    nombre: 'Mi Valecito QA',
    identificador: 'com.mivalecito.app.qa',
    color: '#D97706',
  },
};

// Sin valores por defecto a propósito: una build sin sus URLs falla en vez de apuntar al
// ambiente equivocado.
// Sin «/» final: la app pega rutas que empiezan con «/» (`${API_URL}/datos/...`).
const sinBarraFinal = (url) => (url ? url.trim().replace(/\/+$/, '') : undefined) || undefined;
const apiUrl = sinBarraFinal(process.env.API_URL);
const webUrl = sinBarraFinal(process.env.WEB_URL);

const variante = process.env.APP_VARIANT || 'production';
const v = VARIANTES[variante];
if (!v) {
  throw new Error(`APP_VARIANT="${variante}" no es válida. Use: ${Object.keys(VARIANTES).join(', ')}.`);
}
// Se exigen al compilar (el perfil de eas.json fija APP_VARIANT; EAS_BUILD en sus servidores).
// Con `expo start` no hacen falta: la app usa la IP de tu máquina.
if (process.env.APP_VARIANT || process.env.EAS_BUILD === 'true') {
  for (const [valor, nombre] of [[apiUrl, 'API_URL'], [webUrl, 'WEB_URL']]) {
    if (!valor || !/^https:\/\//.test(valor)) {
      throw new Error(`La variante "${variante}" necesita ${nombre} con https:// (defínala en el perfil de eas.json).`);
    }
  }
}

module.exports = {
  expo: {
    name: v.nombre,
    slug: 'mi-valecito',
    // Cuenta y proyecto de EAS (expo.dev). eas init no puede escribirlos en una configuración
    // dinámica: se ponen a mano. Ambas variantes son el mismo proyecto con builds distintas.
    owner: 'mivalecito',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/marca/icon.png',
    splash: {
      image: './assets/marca/splash-icon.png',
      backgroundColor: v.color,
      resizeMode: 'contain',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: v.identificador,
      config: { usesNonExemptEncryption: false },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/marca/adaptive-icon.png',
        backgroundColor: v.color,
      },
      package: v.identificador,
      // «Mostrar sobre otras apps»: Expo lo usa solo para su menú de desarrollo; la app no.
      blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      // La app no usa cámara ni micrófono: se quitan esos permisos que la librería agrega por defecto.
      ['expo-image-picker', {
        photosPermission: 'Mi Valecito necesita acceder a tus fotos para que elijas tu foto de perfil.',
        cameraPermission: false,
        microphonePermission: false,
      }],
    ],
    // Mismo scheme en ambas variantes: el enlace del correo (frontend/app/reset-password) abre
    // mivalecito://. Si las dos están instaladas, Android pregunta con cuál abrirlo.
    scheme: 'mivalecito',
    extra: {
      router: { origin: false },
      eas: { projectId: 'b0362a87-72bc-4912-9352-72090782e3b9' },
      appVariant: variante,
      apiUrl,
      webUrl,
    },
  },
};
