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

const PROD = { APP_VARIANT: 'production', API_URL: 'https://api.example.com', WEB_URL: 'https://web.example.com' };

test('sin APP_VARIANT (expo start) es producción y no exige URLs: usa la IP de la máquina', () => {
  const c = cargar({});
  assert.equal(c.name, 'Mi Valecito');
  assert.equal(c.android.package, 'com.mivalecito.app');
  assert.equal(c.ios.bundleIdentifier, 'com.mivalecito.app');
  assert.equal(c.extra.appVariant, 'production');
  assert.equal(c.extra.apiUrl, undefined);
});

test('producción toma sus URLs del perfil de eas.json', () => {
  const c = cargar(PROD);
  assert.equal(c.extra.apiUrl, PROD.API_URL);
  assert.equal(c.extra.webUrl, PROD.WEB_URL);
});

test('una build de producción sin URLs falla (también en los servidores de EAS)', () => {
  falla({ APP_VARIANT: 'production' }, /API_URL/);
  falla({ EAS_BUILD: 'true' }, /API_URL/);
});

test('eas.json define URLs https distintas para producción y QA', async () => {
  const { readFileSync } = await import('node:fs');
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
  const prod = eas.build.production.env;
  assert.match(prod.API_URL, /^https:\/\//);
  assert.match(prod.WEB_URL, /^https:\/\//);
  const qa = eas.build.qa.env;
  if (qa.API_URL) assert.notEqual(qa.API_URL, prod.API_URL, 'QA no debe apuntar al backend de producción');
});

test('QA es otra app: nombre e identificador propios', () => {
  const c = cargar(QA);
  assert.equal(c.name, 'Mi Valecito QA');
  assert.equal(c.android.package, 'com.mivalecito.app.qa');
  assert.equal(c.ios.bundleIdentifier, 'com.mivalecito.app.qa');
  assert.equal(c.scheme, 'mivalecito'); // el enlace de recuperar contraseña usa este scheme
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

test('lib/config.ts usa las URLs de la variante en las builds', async () => {
  const config = await import('../lib/config.ts');
  const { APP_VARIANT = '', API_URL = '', WEB_URL = '' } = process.env;
  const esperado = cargar({ APP_VARIANT, API_URL, WEB_URL });
  assert.equal(config.APP_VARIANT, esperado.extra.appVariant);
  // Fuera de desarrollo (__DEV__ no existe en node) y sin EXPO_PUBLIC_*, se usan las de la variante.
  assert.equal(config.API_URL, esperado.extra.apiUrl);
  assert.equal(config.WEB_URL, esperado.extra.webUrl);
});
