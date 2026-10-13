import Constants from 'expo-constants';

// Los valores vienen de app.config.js según APP_VARIANT (production | qa).
const extra = Constants.expoConfig?.extra ?? {};

export const APP_VARIANT: string = extra.appVariant ?? 'production';
export const API_URL: string = extra.apiUrl;
export const WEB_URL: string = extra.webUrl;
