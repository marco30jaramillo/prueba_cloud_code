/**
 * Ninguna prueba de `tests/*.test.js` necesita una base de datos (CA-5).
 *
 * El job `pruebas-release` del despliegue corre `node --test tests/*.test.js` en un ambiente
 * sin SQL Server. Una prueba que abra el pool de conexiones rompería el release. Esta prueba
 * lo impide de dos formas:
 *
 *  1. Estática: ningún archivo de `tests/` carga los ayudantes de `tests-db/` que usan la base
 *     (solo los puros: conciliación, reporter y precargado).
 *  2. Dinámica: cada archivo que carga modelos, el pool de SQL, `mssql` o `server.js` se
 *     ejecuta aparte con un precargado que termina el proceso si algo intenta abrir una
 *     conexión real.
 *
 * Req. 006.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DIR_TESTS = __dirname;
const RAIZ = path.resolve(DIR_TESTS, '..');
const PRECARGADO = path.join(DIR_TESTS, 'fixtures', 'bloquea-pool.js');
const ESTE_ARCHIVO = path.basename(__filename);

const archivos = fs.readdirSync(DIR_TESTS).filter((nombre) => /\.test\.js$/.test(nombre)).sort();

// Ayudantes de tests-db/ que no tocan la base y pueden usarse desde tests/.
const PUROS = ['tests-db/helpers/conciliacion', 'tests-db/reporter', 'tests-db/preload-local'];
const CARGA_POOL = /require\(\s*['"][^'"]*(?:database\/sqlPool|src\/models\/|src\/server|\/server['"]|mssql)[^'"]*['"]\s*\)/;

function fuente(nombre) {
  return fs.readFileSync(path.join(DIR_TESTS, nombre), 'utf8');
}

test('CA-5 · hay pruebas sin base en tests/ y ninguna usa variables del corredor con base', () => {
  assert.ok(archivos.length >= 8, `solo ${archivos.length} archivos`);
  for (const nombre of archivos) {
    if (nombre === ESTE_ARCHIVO) continue;
    assert.doesNotMatch(fuente(nombre), /MV_TEST_[A-Z_]+/, `${nombre} usa variables del corredor con base`);
  }
});

test('CA-5 · ningún archivo de tests/ carga ayudantes de tests-db/ que necesiten la base', () => {
  for (const nombre of archivos) {
    if (nombre === ESTE_ARCHIVO) continue;
    const referencias = [...fuente(nombre).matchAll(/require\(\s*['"][^'"]*?(tests-db\/[A-Za-z0-9_./-]+)['"]\s*\)/g)]
      .map((m) => m[1].replace(/\.js$/, ''));
    for (const referencia of referencias) {
      assert.ok(PUROS.includes(referencia), `${nombre} carga ${referencia}, que puede necesitar la base`);
    }
  }
});

test('CA-5 · tests-db/ no contiene archivos que el patrón tests/*.test.js ni `node --test` encuentren', () => {
  const dirDb = path.join(RAIZ, 'tests-db');
  const nombres = fs.readdirSync(dirDb);
  for (const nombre of nombres) {
    assert.doesNotMatch(nombre, /\.test\.(c|m)?js$|[-_]test\.(c|m)?js$|^test[-.]/, `${nombre} sería descubierto por node --test`);
  }
  assert.ok(nombres.some((n) => /\.dbtest\.js$/.test(n)), 'faltan las pruebas con base');
});

test('CA-5 · tests-web/ no contiene archivos que el patrón del release ni `node --test` encuentren', () => {
  const dirWeb = path.join(RAIZ, 'tests-web');
  const nombres = fs.readdirSync(dirWeb);
  for (const nombre of nombres) {
    assert.doesNotMatch(nombre, /\.test\.(c|m)?js$|[-_]test\.(c|m)?js$|^test[-.]/, `${nombre} sería descubierto por node --test`);
  }
  assert.ok(nombres.some((n) => /\.webtest\.js$/.test(n)), 'falta el recorrido web');
});

test('CA-5 · ni tests-db/ ni tests-web/ coinciden con el patrón `tests/*.test.js` del despliegue', () => {
  // El flujo del release corre `node --test tests/*.test.js` desde backend/: solo el nivel de tests/.
  for (const carpeta of ['tests-db', 'tests-web']) {
    assert.notEqual(path.basename(path.join(RAIZ, carpeta)), 'tests');
    assert.equal(fs.existsSync(path.join(RAIZ, carpeta)), true);
  }
  const alcance = fs.readdirSync(DIR_TESTS).filter((n) => /\.test\.js$/.test(n));
  assert.ok(alcance.every((n) => !n.endsWith('.dbtest.js') && !n.endsWith('.webtest.js')));
  // Ningún archivo de tests/ carga el recorrido web (necesita navegador y servidor).
  for (const nombre of archivos) {
    if (nombre === ESTE_ARCHIVO) continue;
    const referencias = [...fuente(nombre).matchAll(/require\(\s*['"][^'"]*tests-web[^'"]*['"]\s*\)/g)];
    assert.equal(referencias.length, 0, `${nombre} carga tests-web/`);
  }
});

const conPool = archivos.filter((nombre) => nombre !== ESTE_ARCHIVO && CARGA_POOL.test(fuente(nombre)));

test('CA-5 · se detectan los archivos que cargan modelos, el pool o el servidor', () => {
  assert.ok(conPool.length >= 3, `se detectaron ${conPool.length}: ${conPool.join(', ')}`);
});

for (const nombre of conPool) {
  test(`CA-5 · ${nombre} no abre el pool de conexiones`, async () => {
    const entorno = {};
    for (const clave of ['SystemRoot', 'windir', 'TEMP', 'TMP', 'PATH', 'Path', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) {
      if (process.env[clave]) entorno[clave] = process.env[clave];
    }
    const resultado = await new Promise((resolve) => {
      const hijo = spawn(process.execPath, ['-r', PRECARGADO, path.join(DIR_TESTS, nombre)], {
        cwd: RAIZ, env: entorno, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      hijo.stdout.resume();
      hijo.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
      const reloj = setTimeout(() => hijo.kill(), 120000);
      hijo.once('exit', (codigo) => { clearTimeout(reloj); resolve({ codigo, stderr }); });
    });
    assert.ok(!resultado.stderr.includes('MV_POOL_ABIERTO'), `${nombre} intentó abrir una conexión real con la base`);
    assert.notEqual(resultado.codigo, 97);
  });
}
