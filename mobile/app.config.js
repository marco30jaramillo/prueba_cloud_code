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
const apiUrl = process.env.API_URL || undefined;
const webUrl = process.env.WEB_URL || undefined;

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
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      ['expo-image-picker', { photosPermission: 'Mi Valecito necesita acceder a tus fotos para que elijas tu foto de perfil.' }],
    ],
    // Mismo scheme en ambas variantes: el enlace del correo (frontend/app/reset-password) abre
    // mivalecito://. Si las dos están instaladas, Android pregunta con cuál abrirlo.
    scheme: 'mivalecito',
    extra: {
      router: { origin: false },
      appVariant: variante,
      apiUrl,
      webUrl,
    },
  },
};
