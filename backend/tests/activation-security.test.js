/**
 * Piezas de seguridad de la activación (requerimiento 003): hash de tokens, contraseñas
 * generadas, IP confiable, limitador, lista blanca de D-2 y modos de la limpieza.
 * Sin base de datos ni red.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'z9'.repeat(16);

const User = require('../src/models/User');
const PasswordValidator = require('../src/utils/passwordValidator');
const { getClientIp, stripPort } = require('../src/utils/clientIp');
const { createRequestLimiter } = require('../src/utils/requestLimiter');
const { isAllowedWhilePasswordChangePending } = require('../src/middleware/auth');
const purge = require('../src/scripts/purgePendingAccounts');

test('el token de recuperación y activación es de 256 bits (64 hex) y su hash es distinto', () => {
  const token = User.generatePasswordResetToken();
  assert.match(token, /^[0-9a-f]{64}$/);
  const hash = User.hashToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(User.hashToken(token), hash);
  assert.notEqual(User.generatePasswordResetToken(), token);
});

test('generateRandomPassword usa crypto y cumple la complejidad de RN-43', () => {
  for (let i = 0; i < 200; i += 1) {
    const pwd = User.generateRandomPassword();
    assert.equal(pwd.length, 12);
    assert.equal(PasswordValidator.validatePassword(pwd).valid, true, pwd);
  }
  const fuente = fs.readFileSync(path.resolve(__dirname, '../src/models/User.js'), 'utf8');
  assert.ok(!/Math\.random/.test(fuente));
});

test('IP confiable: fuera de App Service se ignora X-Forwarded-For', () => {
  const req = { headers: { 'x-forwarded-for': '6.6.6.6' }, socket: { remoteAddress: '10.0.0.5' } };
  assert.equal(getClientIp(req, {}), '10.0.0.5');
});

test('IP confiable: en App Service se toma el último salto y se quita el puerto', () => {
  const env = { WEBSITE_SITE_NAME: 'app' };
  const req = { headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9:51234' }, socket: { remoteAddress: '10.0.0.5' } };
  assert.equal(getClientIp(req, env), '203.0.113.9');
  assert.equal(stripPort('[2001:db8::1]:443'), '2001:db8::1');
  assert.equal(stripPort('2001:db8::1'), '2001:db8::1');
});

test('limitador por IP: bloquea al superar el máximo y se libera al pasar la ventana', () => {
  let ahora = 1000;
  const limiter = createRequestLimiter({ name: 't', max: 2, windowMs: 1000, mode: 'hit', now: () => ahora });
  const respuestas = [];
  const res = { setHeader() {}, status(c) { respuestas.push(c); return { json() {} }; } };
  const req = { headers: {}, socket: { remoteAddress: '1.1.1.1' } };
  let pasaron = 0;
  for (let i = 0; i < 3; i += 1) limiter.middleware(req, res, () => { pasaron += 1; });
  assert.equal(pasaron, 2);
  assert.deepEqual(respuestas, [429]);
  ahora += 1500;
  limiter.middleware(req, res, () => { pasaron += 1; });
  assert.equal(pasaron, 3);
});

test('limitador de fallos: solo cuenta lo que se declara con fail()', () => {
  const limiter = createRequestLimiter({ name: 'f', max: 2, windowMs: 1000, mode: 'fail' });
  const req = { headers: {}, socket: { remoteAddress: '2.2.2.2' } };
  const res = { setHeader() {}, status() { return { json() {} }; } };
  let pasaron = 0;
  for (let i = 0; i < 5; i += 1) limiter.middleware(req, res, () => { pasaron += 1; });
  assert.equal(pasaron, 5);
  limiter.fail(req);
  limiter.fail(req);
  assert.equal(limiter.isBlocked('2.2.2.2').blocked, true);
});

test('D-2: lista blanca por método y ruta exactos', () => {
  assert.equal(isAllowedWhilePasswordChangePending('PATCH', '/auth/change-password-temporary'), true);
  assert.equal(isAllowedWhilePasswordChangePending('GET', '/auth/validate'), true);
  assert.equal(isAllowedWhilePasswordChangePending('POST', '/auth/logout'), true);
  assert.equal(isAllowedWhilePasswordChangePending('POST', '/auth/logout-all'), true);
  // Método equivocado, prefijo o ruta ajena: rechazado.
  assert.equal(isAllowedWhilePasswordChangePending('GET', '/auth/change-password-temporary'), false);
  assert.equal(isAllowedWhilePasswordChangePending('PATCH', '/auth/change-password'), false);
  assert.equal(isAllowedWhilePasswordChangePending('GET', '/vales/mis-vales'), false);
  assert.equal(isAllowedWhilePasswordChangePending('GET', '/auth/validate/../vales'), false);
  assert.equal(isAllowedWhilePasswordChangePending('GET', '/auth/validate?x=1'), true);
});

test('la limpieza simula por defecto y solo aplica con la orden explícita', () => {
  assert.equal(purge.resolveMode({}, []), 'dry-run');
  assert.equal(purge.resolveMode({ PENDING_ACCOUNT_PURGE: 'apply' }, []), 'apply');
  assert.equal(purge.resolveMode({ PENDING_ACCOUNT_PURGE: 'off' }, []), 'off');
  assert.equal(purge.resolveMode({ PENDING_ACCOUNT_PURGE: 'cualquier-cosa' }, []), 'dry-run');
  assert.equal(purge.resolveMode({ PENDING_ACCOUNT_PURGE: 'apply' }, ['--dry-run']), 'dry-run');
  assert.equal(purge.resolveMaxPerRun({}), 50);
  assert.equal(purge.resolveMaxPerRun({ PENDING_PURGE_MAX_PER_RUN: '5' }), 5);
});

test('la limpieza aborta sin tocar nada si el catálogo de llaves no está disponible', async () => {
  const pool = { request: () => ({ query: async () => ({ recordset: [] }) }) };
  const registros = [];
  const resumen = await purge.run({
    mode: 'apply',
    pool,
    audit: { logPendingPurgeRun: async (s) => { registros.push(s); } },
  });
  assert.equal(resumen.aborted, true);
  assert.equal(resumen.abortReason, 'foreign_keys_unavailable');
  assert.equal(resumen.deleted, 0);
  assert.equal(registros.length, 1);
});

test('la limpieza aborta si hay más candidatas que el tope por corrida', async () => {
  let llamada = 0;
  const pool = {
    request() {
      const r = { input() { return r; }, async query() {
        llamada += 1;
        if (llamada === 1) return { recordset: [{ schemaName: 'dbo', tableName: 'vales', columnName: 'clienteId' }] };
        return { recordset: Array.from({ length: 3 }, (_, i) => ({ id: `0000000${i}-0000-0000-0000-000000000000`, email: `u${i}@x.co`, role: 'cliente' })) };
      } };
      return r;
    },
  };
  const resumen = await purge.run({ mode: 'apply', maxPerRun: 2, pool, audit: { logPendingPurgeRun: async () => {} } });
  assert.equal(resumen.aborted, true);
  assert.equal(resumen.abortReason, 'cap_exceeded');
  assert.equal(resumen.deleted + resumen.disabled, 0);
});

test('ningún archivo del requerimiento imprime tokens ni enlaces en consola', () => {
  const raiz = path.resolve(__dirname, '../src');
  const archivos = [
    'mail/mailService.js', 'mail/accountMail.js', 'mail/links.js', 'mail/transports/azure.js',
    'mail/transports/outbox.js', 'routes/auth.js', 'models/User.js', 'scripts/purgePendingAccounts.js',
  ];
  for (const rel of archivos) {
    const texto = fs.readFileSync(path.join(raiz, rel), 'utf8');
    for (const linea of texto.split('\n').filter((l) => /console\.(log|warn|error|info)/.test(l))) {
      assert.ok(!/token|link|enlace|resetLink/i.test(linea.replace(/\[auth\]|\[mail\]|reenvío|recuperación|aviso/g, '')), `${rel}: ${linea.trim()}`);
    }
  }
});
