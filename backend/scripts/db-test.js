/**
 * db-test.js — Corre las pruebas de crédito con base de datos (tests-db/, solo API).
 *
 * Uso:  npm run test:db        (en backend/, solo en el computador local)
 *
 * Es un punto de entrada fino: todo el mecanismo (guardas, base `MiValecito_Test`, backend de
 * pruebas en 127.0.0.1:3101, entorno por lista blanca, redactor y limpieza) está en
 * `lib/corredor.js`, compartido con `web-test.js`. Aquí solo se fija, en el código, qué carpeta
 * se corre. No acepta argumentos ni lee servidor, base o puerto del entorno.
 *
 * El recorrido en navegador de la web NO forma parte de este comando: es `npm run test:web`.
 */

const corredor = require('./lib/corredor');

const CONFIG = Object.freeze({
  etiqueta: 'db-test',
  carpeta: 'tests-db',
  sufijo: '.dbtest.js',
  puertosLibres: [],
});

if (require.main === module) {
  corredor.ejecutarYSalir(CONFIG);
}

module.exports = {
  ...corredor,
  CONFIG,
  validarInvocacion: (opciones = {}) => corredor.validarInvocacion({ ...opciones, etiqueta: CONFIG.etiqueta }),
};
