import Constants from 'expo-constants';

/**
 * Direcciones del backend y de la web.
 *
 * - En desarrollo (`expo start`) apuntan a tu computador: el host sale de la dirección con la que
 *   Expo sirve la app, así que funciona igual en Expo Go por Wi-Fi (usa la IP de tu máquina), en
 *   el emulador y en el simulador. Backend en el puerto 3001 y web en el 3000.
 * - En una compilación (EAS) apuntan al despliegue de su variante, QA o producción, que fija
 *   app.config.js según APP_VARIANT.
 * - Para forzar otra dirección, define EXPO_PUBLIC_API_URL y EXPO_PUBLIC_WEB_URL (por ejemplo en
 *   mobile/.env) y reinicia Expo con `npx expo start -c`.
 */
const extra = Constants.expoConfig?.extra ?? {};

/** 'production' o 'qa' (app.config.js). */
export const APP_VARIANT: string = extra.appVariant ?? 'production';

const PUERTO_API = 3001;
const PUERTO_WEB = 3000;

/** Host de la máquina de desarrollo, tomado de la dirección de Expo ("192.168.1.50:8081"). */
function hostDeDesarrollo(): string {
  const direccion: string | undefined =
    (Constants.expoConfig as any)?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  const host = direccion?.split(':')[0];
  return host && host.length > 0 ? host : 'localhost';
}

const enDesarrollo = typeof __DEV__ !== 'undefined' && __DEV__;

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||
  (enDesarrollo ? `http://${hostDeDesarrollo()}:${PUERTO_API}` : extra.apiUrl);

export const WEB_URL: string =
  process.env.EXPO_PUBLIC_WEB_URL ||
  (enDesarrollo ? `http://${hostDeDesarrollo()}:${PUERTO_WEB}/dashboard` : extra.webUrl);
