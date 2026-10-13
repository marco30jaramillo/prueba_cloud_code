// Variantes de la app (app.config.js): producción y QA deben ser apps distintas y la de QA
// nunca debe caer por defecto en el backend de producción.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));

// Evalúa app.config.js en un proceso aparte con el entorno dado (el módulo lee process.env al cargar).
const cargar = (env) => {
  const salida = execFileSync(
    process.execPath,
    ['-e', "process.stdout.write(JSON.stringify(require('./app.config.js').expo))"],
    { cwd: raiz, env: { PATH: process.env.PATH, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return JSON.parse(salida);
};
const falla = (env, patron) => {
  assert.throws(() => cargar(env), (e) => patron.test(String(e.stderr)));
};

const QA = { APP_VARIANT: 'qa', API_URL: 'https://api-qa.example.com', WEB_URL: 'https://web-qa.example.com' };

test('sin APP_VARIANT se construye producción', () => {
  const c = cargar({});
  assert.equal(c.name, 'Mi Valecito');
  assert.equal(c.android.package, 'com.mivalecito.app');
  assert.equal(c.ios.bundleIdentifier, 'com.mivalecito.app');
  assert.equal(c.extra.appVariant, 'production');
  assert.match(c.extra.apiUrl, /^https:\/\/app-backend-mivalencito/);
});

test('producción ignora API_URL del entorno', () => {
  const c = cargar({ APP_VARIANT: 'production', API_URL: 'https://otro.example.com' });
  assert.match(c.extra.apiUrl, /^https:\/\/app-backend-mivalencito/);
});

test('QA es otra app: nombre, identificador y scheme propios', () => {
  const c = cargar(QA);
  assert.equal(c.name, 'Mi Valecito QA');
  assert.equal(c.android.package, 'com.mivalecito.app.qa');
  assert.equal(c.ios.bundleIdentifier, 'com.mivalecito.app.qa');
  assert.equal(c.scheme, 'mivalecito-qa');
  assert.equal(c.extra.appVariant, 'qa');
  assert.equal(c.extra.apiUrl, QA.API_URL);
  assert.equal(c.extra.webUrl, QA.WEB_URL);
});

test('QA sin URLs falla en vez de apuntar a producción', () => {
  falla({ APP_VARIANT: 'qa' }, /API_URL/);
  falla({ ...QA, WEB_URL: '' }, /WEB_URL/);
});

test('QA exige https', () => {
  falla({ ...QA, API_URL: 'http://api-qa.example.com' }, /https/);
});

test('variante desconocida falla', () => {
  falla({ APP_VARIANT: 'prod' }, /no es válida/);
});

test('lib/config.ts expone los valores de la variante', async () => {
  const config = await import('../lib/config.ts');
  const { APP_VARIANT = '', API_URL = '', WEB_URL = '' } = process.env;
  const esperado = cargar({ APP_VARIANT, API_URL, WEB_URL });
  assert.equal(config.APP_VARIANT, esperado.extra.appVariant);
  assert.equal(config.API_URL, esperado.extra.apiUrl);
  assert.equal(config.WEB_URL, esperado.extra.webUrl);
});
