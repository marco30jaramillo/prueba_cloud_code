// Configuración de Expo por variante. Un solo código genera dos apps independientes:
//   APP_VARIANT=production (por defecto) -> "Mi Valecito",    com.mivalecito.app
//   APP_VARIANT=qa                       -> "Mi Valecito QA", com.mivalecito.app.qa
// Al tener distinto identificador, ambas se instalan lado a lado y Google Play / App Store
// las tratan como apps distintas: la build de QA nunca llega a los usuarios finales.
// La variante la fija el perfil de eas.json; en local: APP_VARIANT=qa npx expo start

const VARIANTES = {
  production: {
    nombre: 'Mi Valecito',
    identificador: 'com.mivalecito.app',
    scheme: 'mivalecito',
    color: '#3b82f6',
    apiUrl: 'https://app-backend-mivalencito-b3hycrgxaef2bjhn.brazilsouth-01.azurewebsites.net',
    webUrl: 'https://app-frontend-mivalencito-gkf5bncwcpbkascb.brazilsouth-01.azurewebsites.net/dashboard',
  },
  qa: {
    nombre: 'Mi Valecito QA',
    identificador: 'com.mivalecito.app.qa',
    scheme: 'mivalecito-qa',
    color: '#f59e0b',
    // Sin valor por defecto a propósito: una build de QA sin URL debe fallar, no apuntar a producción.
    apiUrl: process.env.API_URL,
    webUrl: process.env.WEB_URL,
  },
};

const variante = process.env.APP_VARIANT || 'production';
const v = VARIANTES[variante];
if (!v) {
  throw new Error(`APP_VARIANT="${variante}" no es válida. Use: ${Object.keys(VARIANTES).join(', ')}.`);
}
for (const [clave, nombre] of [['apiUrl', 'API_URL'], ['webUrl', 'WEB_URL']]) {
  if (!v[clave] || !/^https:\/\//.test(v[clave])) {
    throw new Error(`La variante "${variante}" necesita ${nombre} con https:// (defínala en el perfil de eas.json).`);
  }
}

module.exports = {
  expo: {
    name: v.nombre,
    slug: 'mi-valecito',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
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
        backgroundColor: v.color,
      },
      package: v.identificador,
    },
    plugins: ['expo-router', 'expo-secure-store'],
    scheme: v.scheme,
    extra: {
      router: { origin: false },
      appVariant: variante,
      apiUrl: v.apiUrl,
      webUrl: v.webUrl,
    },
  },
};
