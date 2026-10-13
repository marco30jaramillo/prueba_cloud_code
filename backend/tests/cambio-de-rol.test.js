/**
 * Cambio de rol de una persona (PATCH /users/:id). Antes el rol no se guardaba (User.update no
 * lo admitía) y la API respondía «Persona actualizada»; además el rol viaja en el token, así que
 * las sesiones abiertas conservaban el anterior. Sin base de datos: modelos en memoria.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'k9'.repeat(20),
  DB_SERVER: 'localhost',
  DB_DATABASE: 'MiValecito_Test',
  DB_USER: 'usuario_ejemplo',
  DB_PASSWORD: 'clave_ejemplo_no_real',
  DB_TRUST_SERVER_CERTIFICATE: 'true',
  MAIL_TRANSPORT: 'outbox',
  MAIL_FROM: 'no-responder@example.com',
  FRONTEND_URL: 'http://localhost:3000',
});

const express = require('express');
let app = null;
express.application.listen = function () { app = this; return { close() {} }; };

const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Tienda = require('../src/models/Tienda');
const auditMiddleware = require('../src/middleware/auditMiddleware');
const TokenManager = require('../src/utils/tokenManager');
const TokenUtils = require('../src/utils/tokenUtils');

const ID = {
  encargado: '11111111-1111-4111-8111-111111111111',
  dueno: '22222222-2222-4222-8222-222222222222',
  vendedor: '33333333-3333-4333-8333-333333333333',
};
let usuarios;
let tiendasDe;
let revocados;
let quitados;
function reset() {
  usuarios = new Map([
    ['u-superuser', { id: 'u-superuser', role: 'superuser', email: 'su@x.com', name: 'Su' }],
    ['u-administrador', { id: 'u-administrador', role: 'administrador', email: 'ad@x.com', name: 'Ad' }],
    [ID.encargado, { id: ID.encargado, role: 'encargado', email: 'enc@x.com', name: 'Elsa' }],
    [ID.dueno, { id: ID.dueno, role: 'tendero', email: 'dueno@x.com', name: 'Tomás' }],
    [ID.vendedor, { id: ID.vendedor, role: 'vendedor', email: 'ven@x.com', name: 'Vera' }],
  ]);
  tiendasDe = {
    [ID.encargado]: [{ id: 't-1', esPropietario: false }],
    [ID.dueno]: [{ id: 't-1', esPropietario: true }],
    [ID.vendedor]: [{ id: 't-1', esPropietario: false }, { id: 't-2', esPropietario: false }],
  };
  revocados = [];
  quitados = [];
}
reset();

User.findById = async (id) => {
  const u = usuarios.get(id);
  return u ? { ...u, isActive: true, mustChangePassword: false } : null;
};
User.updateRole = async (id, role) => { usuarios.get(id).role = role; return User.findById(id); };
const ROLES = ['superuser', 'administrador', 'tendero', 'encargado', 'vendedor', 'cliente'];
Role.getByName = async (name) => (ROLES.includes(name) ? { name } : undefined);
Role.getManageableRoles = async (r) => (r === 'administrador' ? ['tendero', 'encargado', 'vendedor', 'cliente'] : []);
Role.hasPermission = async (r, p) => ['superuser', 'administrador'].includes(r) && p === 'auth:update-user';
Tienda.getTiendasByUsuario = async (id) => tiendasDe[id] ?? [];
Tienda.removeUsuario = async (tiendaId, userId) => { quitados.push(`${tiendaId}|${userId}`); return true; };
auditMiddleware.logUserRoleChanged = async () => {};
auditMiddleware.logProfileUpdate = async () => {};
User.updateProfile = async (id, cambios) => { Object.assign(usuarios.get(id), cambios); return User.findById(id); };
TokenManager.prototype.isTokenValid = async () => true;
TokenManager.prototype.revokeAllUserTokens = async (userId) => { revocados.push(userId); return 1; };

require('../src/server');
assert.ok(app, 'server.js debe haber construido el app');

const tokens = new TokenUtils();
const tokenDe = (role) => tokens.generateToken({ userId: `u-${role}`, role, tokenId: `t-${role}` });
let server;
let base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { await new Promise((res) => server.close(res)); });

async function cambiar(quien, id, role) {
  const r = await fetch(`${base}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDe(quien)}` },
    body: JSON.stringify({ name: usuarios.get(id)?.name ?? 'X', role }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

test('el superusuario cambia un encargado a vendedor: se guarda y se cierran sus sesiones', async () => {
  reset();
  const r = await cambiar('superuser', ID.encargado, 'vendedor');
  assert.equal(r.status, 200);
  assert.equal(usuarios.get(ID.encargado).role, 'vendedor');
  assert.equal(r.body.user.role, 'vendedor');
  assert.deepEqual(revocados, [ID.encargado]);
  assert.deepEqual(quitados, [], 'sigue en su tienda: vendedor también es personal de tienda');
});

test('el administrador cambia roles que gestiona; uno que no gestiona -> 403', async () => {
  reset();
  assert.equal((await cambiar('administrador', ID.encargado, 'vendedor')).status, 200);
  assert.equal((await cambiar('administrador', ID.vendedor, 'administrador')).status, 403);
  assert.equal(usuarios.get(ID.vendedor).role, 'vendedor');
});

test('rol inexistente -> 400 y no cambia nada', async () => {
  reset();
  assert.equal((await cambiar('superuser', ID.encargado, 'jefe')).status, 400);
  assert.equal(usuarios.get(ID.encargado).role, 'encargado');
  assert.deepEqual(revocados, []);
});

test('el dueño de una tienda no cambia de rol hasta asignar otro dueño -> 409', async () => {
  reset();
  const r = await cambiar('superuser', ID.dueno, 'vendedor');
  assert.equal(r.status, 409);
  assert.equal(usuarios.get(ID.dueno).role, 'tendero');
});

test('quien pasa a un rol que no es de tienda sale de sus tiendas', async () => {
  reset();
  assert.equal((await cambiar('superuser', ID.vendedor, 'cliente')).status, 200);
  assert.deepEqual(quitados.sort(), [`t-1|${ID.vendedor}`, `t-2|${ID.vendedor}`]);
  assert.deepEqual(revocados, [ID.vendedor]);
});

test('sin cambio de rol no se cierran sesiones', async () => {
  reset();
  assert.equal((await cambiar('superuser', ID.encargado, 'encargado')).status, 200);
  assert.deepEqual(revocados, []);
});
