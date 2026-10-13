/**
 * web-test.js — Corre el recorrido de crédito en el navegador de la web (tests-web/).
 *
 * Uso:  npm run test:web       (en backend/, solo en el computador local; necesita Edge)
 *
 * Mismo mecanismo que `npm run test:db` (módulo común `lib/corredor.js`): crea y elimina
 * `MiValecito_Test`, levanta el backend de pruebas en 127.0.0.1:3101 y corre los archivos
 * `tests-web/*.webtest.js`, que lanzan Playwright (frontend, `npm run test:e2e`) con un entorno
 * de lista blanca. La web de la prueba escucha en 127.0.0.1:3100, que debe estar libre.
 *
 * Es un script distinto, no un parámetro: no acepta argumentos ni lee servidor, base o puerto
 * del entorno.
 */

const corredor = require('./lib/corredor');

const CONFIG = Object.freeze({
  etiqueta: 'web-test',
  carpeta: 'tests-web',
  sufijo: '.webtest.js',
  puertosLibres: [3100],
  tiempoMaximoMs: 15 * 60 * 1000,
});

if (require.main === module) {
  corredor.ejecutarYSalir(CONFIG);
}

module.exports = {
  ...corredor,
  CONFIG,
  validarInvocacion: (opciones = {}) => corredor.validarInvocacion({ ...opciones, etiqueta: CONFIG.etiqueta }),
};
