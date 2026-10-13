/**
 * Correcciones del requerimiento 003 tras la auditoría de seguridad (H-1, H-2, H-4, H-5, O-3).
 * Sin base de datos ni red: el acceso a SQL se reemplaza por uno que registra lo que recibe.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'q7'.repeat(16);

// El modelo toma `request` al cargarse: se reemplaza antes de requerirlo.
const sqlPool = require('../src/database/sqlPool');
const capturas = [];
sqlPool.request = async () => {
  const captura = { inputs: {}, text: null };
  const req = {
    input(name, type, value) { captura.inputs[name] = value; return req; },
    async query(text) { captura.text = text; capturas.push(captura); return { recordset: [] }; },
  };
  return req;
};

const User = require('../src/models/User');
const PasswordUtils = require('../src/utils/passwordUtils');
const { buildLink } = require('../src/mail/links');

const TOKEN = 'cd'.repeat(32);
const fuente = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

// ── H-1 ─────────────────────────────────────────────────────────────────────

test('H-1: la activación reemplaza la contraseña solo si la cuenta aún no estaba activada, en un único UPDATE', async () => {
  capturas.length = 0;
  await User.activateWithToken(TOKEN);
  const q = capturas[0];
  assert.match(q.text, /UPDATE dbo\.users/);
  assert.match(q.text, /password = CASE WHEN activatedAt IS NULL THEN @unusablePassword ELSE password END/);
  // La marca de activación y el reemplazo van en la misma sentencia (atómico).
  assert.match(q.text, /activatedAt = COALESCE\(activatedAt, SYSUTCDATETIME\(\)\)/);
  assert.equal(capturas.length, 1);
});

test('H-1: el valor que se guarda es un hash PBKDF2 válido de un secreto aleatorio distinto en cada llamada', async () => {
  capturas.length = 0;
  await User.activateWithToken(TOKEN);
  await User.activateWithToken(TOKEN);
  const [a, b] = capturas.map((c) => c.inputs.unusablePassword);
  assert.match(a, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.notEqual(a, b);
  // Ninguna contraseña corriente coincide con el hash guardado.
  for (const candidata of ['Clave#Prueba1', 'Temporal#123', '', 'password']) {
    assert.equal(PasswordUtils.verifyPassword(candidata, a), false);
  }
});

test('H-1: un token con formato inválido no toca la base', async () => {
  capturas.length = 0;
  assert.equal(await User.activateWithToken('corto'), null);
  assert.equal(capturas.length, 0);
});

// ── H-2 ─────────────────────────────────────────────────────────────────────

test('H-2: generate-password y PATCH /auth/password/:userId cierran todas las sesiones del destinatario', () => {
  const orden = (texto, fn) => {
    const i = texto.indexOf(fn);
    assert.ok(i > 0, `no se encontró ${fn}`);
    return texto.slice(i, i + 400);
  };
  const users = fuente('src/routes/users.js');
  const trasGenerar = orden(users, 'await User.setPasswordForUser(userId, newPassword);');
  assert.match(trasGenerar, /revokeAllUserTokens\(userId, targetUser\.email\)/);
  const auth = fuente('src/routes/auth.js');
  const trasAdmin = orden(auth, 'await User.setPasswordForUser(userId, newPassword);');
  assert.match(trasAdmin, /revokeAllUserTokens\(userId, targetUser\.email\)/);
});

// ── H-4 ─────────────────────────────────────────────────────────────────────

test('H-4: los enlaces llevan el token en el fragmento, no en la query', () => {
  const env = { NODE_ENV: 'production', FRONTEND_URL: 'https://web-qa.example.net' };
  const activar = buildLink('activate', TOKEN, env);
  const reset = buildLink('resetPassword', TOKEN, env);
  assert.equal(activar, `https://web-qa.example.net/activar#token=${TOKEN}`);
  assert.equal(reset, `https://web-qa.example.net/reset-password#token=${TOKEN}`);
  for (const enlace of [activar, reset]) {
    assert.ok(!new URL(enlace).search, 'sin query');
    assert.equal(new URL(enlace).hash, `#token=${TOKEN}`);
  }
});

// ── H-5 ─────────────────────────────────────────────────────────────────────

test('H-5: el manejador de errores solo registra el tipo, nunca el mensaje ni el cuerpo', () => {
  const server = fuente('src/server.js');
  const i = server.indexOf('app.use((err, req, res, next) => {');
  const bloque = server.slice(i, server.indexOf('});', i));
  const logs = bloque.split('\n').filter((l) => /console\./.test(l)).join('\n');
  assert.match(logs, /tipo=/);
  assert.ok(!/err\.message|err\.body|, err\)|err\.stack/.test(logs), logs);
});

// ── O-3 ─────────────────────────────────────────────────────────────────────

test('O-3: create-user no afirma que se envió el correo si el envío falló', () => {
  const auth = fuente('src/routes/auth.js');
  const i = auth.indexOf("message: mail.ok === true");
  assert.ok(i > 0);
  const bloque = auth.slice(i, i + 700);
  assert.match(bloque, /Se envió el correo de activación/);
  assert.match(bloque, /no pudo enviarse/);
});
