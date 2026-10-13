// Sustituto de expo-constants (el real exige módulo nativo): expone la configuración que
// produce app.config.js con el APP_VARIANT del entorno, igual que la app en tiempo de ejecución.
// Solo para pruebas; la app usa el paquete real.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { expo } = require('../../app.config.js');

export default { expoConfig: expo };
