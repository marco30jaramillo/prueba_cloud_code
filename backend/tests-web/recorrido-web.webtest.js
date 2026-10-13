/**
 * Recorrido de crédito en el navegador de la web (frontend/, `npm run test:e2e`, Playwright),
 * enganchado a `npm run test:web`: reutiliza la base y el backend de pruebas del corredor y sus
 * credenciales efímeras. No forma parte de `npm run test:db`.
 *
 * Condiciones de seguridad del plan (006):
 *  - el proceso hijo recibe un entorno de lista blanca: sin la contraseña de la base de datos
 *    ni nada ajeno a la prueba;
 *  - su salida se captura y pasa por el redactor de secretos antes de mostrarse o guardarse;
 *  - el árbol de procesos (Playwright, Next, navegador) se termina siempre en `finally`;
 *  - el puerto 3100 debe estar libre antes de empezar y se comprueba libre al terminar.
 *
 * Diagnóstico: la salida completa (ya redactada) se escribe en `MV_TEST_SALIDA_DIR`, carpeta
 * temporal del corredor, que la imprime si la corrida falla y la borra al terminar. El mensaje
 * del fallo incluye el código de salida y la primera línea útil de Playwright.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { entornoMinimo } = require('../scripts/lib/sqlcmd');
const { crearRedactor } = require('../scripts/lib/redactor');

const FRONTEND = path.resolve(__dirname, '..', '..', 'frontend');
const CLI = path.join(FRONTEND, 'node_modules', '@playwright', 'test', 'cli.js');
const PUERTO_WEB = 3100;
const HOST_LOCAL = '127.0.0.1';
const TIEMPO_MAXIMO_MS = 13 * 60 * 1000;
const MAXIMO_SALIDA = 2 * 1024 * 1024;

/** Variables de la corrida que la prueba de navegador necesita; nada más pasa de la lista. */
const VARIABLES_CORRIDA = ['MV_TEST_API_URL', 'MV_TEST_SU_EMAIL', 'MV_TEST_SU_PASSWORD', 'MV_TEST_OUTBOX_DIR'];

function puertoLibre(puerto) {
  return new Promise((resolve) => {
    const servidor = net.createServer();
    servidor.once('error', () => resolve(false));
    servidor.listen(puerto, HOST_LOCAL, () => servidor.close(() => resolve(true)));
  });
}

function terminarArbol(proceso) {
  if (!proceso || !proceso.pid || proceso.exitCode !== null || proceso.signalCode !== null) return;
  const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
  spawnSync(taskkill, ['/PID', String(proceso.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 15000 });
}

/** Primera línea de la salida que explica el fallo (ya redactada). */
function causa(salidaRedactada) {
  const lineas = salidaRedactada.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const util = lineas.find((l) => /Timeout \d+ms|Error:|expect\(|esperaba|se esperaba|net::ERR|ECONNREFUSED|Executable doesn't exist|channel/i.test(l))
    || lineas.find((l) => /\d+ (failed|did not run|interrupted)/.test(l))
    || lineas[lineas.length - 1]
    || 'sin salida';
  const conteo = lineas.filter((l) => /^\d+ (passed|failed|skipped|did not run)/.test(l)).join(', ');
  return `${conteo ? `${conteo}; ` : ''}${util}`.slice(0, 240);
}

test('CA-10 · Web E2E · recorrido de credito en el navegador (frontend, test:e2e)', { timeout: 14 * 60 * 1000 }, async () => {
  for (const nombre of VARIABLES_CORRIDA) {
    assert.ok(process.env[nombre], 'faltan las variables de la corrida: usa `npm run test:web` en backend/.');
  }
  assert.match(process.env.MV_TEST_API_URL, /^http:\/\/127\.0\.0\.1:\d+$/, 'MV_TEST_API_URL debe apuntar a 127.0.0.1');
  assert.equal(await puertoLibre(PUERTO_WEB), true, `el puerto ${PUERTO_WEB} esta ocupado; liberalo y repite`);

  const redactar = crearRedactor([
    process.env.MV_TEST_SU_PASSWORD, process.env.MV_TEST_DB_PASSWORD, process.env.MV_TEST_SU_EMAIL,
  ]);
  const entorno = { ...entornoMinimo(), NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1' };
  for (const nombre of VARIABLES_CORRIDA) entorno[nombre] = process.env[nombre];

  let salida = '';
  let truncada = false;
  let hijo = null;
  let reloj = null;
  let codigo = 1;
  try {
    codigo = await new Promise((resolve) => {
      hijo = spawn(process.execPath, [CLI, 'test'], {
        cwd: FRONTEND, env: entorno, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      });
      const acumular = (d) => {
        if (salida.length >= MAXIMO_SALIDA) { truncada = true; return; }
        salida += d;
      };
      hijo.stdout.on('data', acumular);
      hijo.stderr.on('data', acumular);
      reloj = setTimeout(() => terminarArbol(hijo), TIEMPO_MAXIMO_MS);
      hijo.on('exit', (c) => resolve(c === null ? 1 : c));
      hijo.on('error', () => resolve(1));
    });
  } finally {
    clearTimeout(reloj);
    terminarArbol(hijo);
  }

  const redactada = redactar(salida) + (truncada ? '\n[salida truncada]' : '');
  const carpeta = process.env.MV_TEST_SALIDA_DIR;
  if (carpeta) {
    try { fs.writeFileSync(path.join(carpeta, 'web-e2e.log'), redactada, 'utf8'); } catch (_) { /* solo diagnóstico */ }
  }

  // Dejar un instante a que el sistema libere el puerto tras terminar el árbol.
  let libre = false;
  for (let i = 0; i < 20 && !libre; i += 1) {
    libre = await puertoLibre(PUERTO_WEB);
    if (!libre) await new Promise((r) => setTimeout(r, 250));
  }
  assert.equal(libre, true, `el puerto ${PUERTO_WEB} quedo ocupado al terminar`);
  assert.equal(codigo, 0, `las pruebas de navegador fallaron (codigo ${codigo}): ${causa(redactada)}`);
  assert.match(redactada, /2 passed/, `no se vio «2 passed» en la salida: ${causa(redactada)}`);
});
