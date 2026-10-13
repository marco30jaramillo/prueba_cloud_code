// Sustituto de expo-constants para node --test: sin dirección de Expo (cae a localhost) y con la
// configuración que produce app.config.js para el APP_VARIANT del entorno, como en una build.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { expo } = require('../../app.config.js');

export default { expoConfig: expo, expoGoConfig: {} };
