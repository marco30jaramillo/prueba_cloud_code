/**
 * Recorridos de navegador de la web (`npm run test:e2e`, que lanza `npm run test:web` en backend/). SOLO local y contra la base de
 * pruebas: no corre en QA ni en producción y el despliegue no lo ejecuta.
 *
 * No se lanza solo: necesita el backend de pruebas y sus credenciales efímeras, que crea
 * `npm run test:web` en `backend/` (ver `backend/tests-web/recorrido-web.webtest.js`). Sin esas
 * variables, se niega a correr.
 *
 * El servidor web de la prueba escucha en 127.0.0.1:3100 (no en 3000, que es el de
 * desarrollo) y apunta al backend de pruebas (127.0.0.1:3101).
 */
import { defineConfig } from '@playwright/test';

const API = process.env.MV_TEST_API_URL;
if (!API || !/^http:\/\/127\.0\.0\.1:\d+$/.test(API)) {
  throw new Error(
    'test:e2e no se ejecuta solo: lo lanza `npm run test:web` en backend/ (crea la base de pruebas, ' +
    'el backend en 127.0.0.1 y las credenciales de la corrida).'
  );
}

const PUERTO_WEB = 3100;
const BASE_WEB = `http://127.0.0.1:${PUERTO_WEB}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Topes holgados: `next dev` compila cada ruta la primera vez (el globalSetup las calienta) y
  // el equipo puede ir lento (OneDrive, antivirus).
  timeout: 120_000,
  expect: { timeout: 30_000 },
  globalSetup: './e2e/calentar.mjs',
  reporter: [['list']],
  outputDir: './.e2e-resultados',
  use: {
    baseURL: BASE_WEB,
    // Navegador ya instalado en el equipo (Edge en Windows): no se descarga ninguno.
    channel: process.env.E2E_BROWSER_CHANNEL || 'msedge',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next dev -p ${PUERTO_WEB} -H 127.0.0.1`,
    url: BASE_WEB,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_API_URL: API,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
