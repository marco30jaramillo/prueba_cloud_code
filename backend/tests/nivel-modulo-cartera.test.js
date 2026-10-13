/**
 * Nivel de acceso a Cartera (KAN-75): Cartera en solo lectura no cobra aunque el rol tenga
 * abono:crear por otra vía (el vendedor lo trae en su rol y en Nueva venta). GET /modules
 * informa el nivel para que web y app oculten los pagos.
 *
 * Sin base de datos real: roles, módulos y vales se reemplazan por dobles.
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

const Role = require('../src/models/Role');
const Module = require('../src/models/Module');
const Vale = require('../src/models/Vale');
const User = require('../src/models/User');
const TokenManager = require('../src/utils/tokenManager');
const TokenUtils = require('../src/utils/tokenUtils');

const MODULOS = [
  new Module({ id: '6', name: 'Nueva Venta', href: '/dashboard/vale-nuevo', permRead: ['vale:crear'], permWrite: ['vale:crear', 'abono:crear'] }),
  new Module({ id: '7', name: 'Cartera', href: '/dashboard/cartera', permRead: ['vale:ver-tienda', 'abono:ver'], permWrite: ['abono:crear'] }),
];
// Accesos por rol, como en dbo.roles.modules; se cambian por prueba.
let accesos;
function reset() {
  accesos = {
    vendedor: [{ id: '6', level: 'write' }, { id: '7', level: 'read' }],
    tendero: [{ id: '6', level: 'full' }, { id: '7', level: 'full' }],
    cliente: [],
  };
}
reset();
Module.getAll = async () => MODULOS;
Role.getByName = async (name) => (name === 'superuser'
  ? { name, permissions: ['system:full-access'], moduleAccess: [] }
  : { name, permissions: ['abono:crear'], moduleAccess: accesos[name] ?? [] });
Role.getModuleAccess = async (name) => accesos[name] ?? [];
Role.hasPermission = async (role, permiso) => role !== 'cliente' && permiso === 'abono:crear';
Vale.findById = async () => null;
User.findById = async (id) => ({ id, isActive: true, mustChangePassword: false });
TokenManager.prototype.isTokenValid = async () => true;

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

async function llamar(method, ruta, role, body) {
  const r = await fetch(base + ruta, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDe(role)}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const pagar = (role) => llamar('POST', '/vales/pago-integral', role, { clienteId: 'c-1', monto: 1000, valeIds: ['v-1'] });

test('vendedor con Cartera en lectura no puede registrar un pago integral -> 403', async () => {
  reset();
  const r = await pagar('vendedor');
  assert.equal(r.status, 403);
  assert.equal(r.body.required_level, 'write');
  assert.equal(r.body.your_level, 'read');
});

test('con Cartera en escritura el pago pasa la verificación de nivel', async () => {
  reset();
  accesos.vendedor = [{ id: '7', level: 'write' }];
  // Pasa el nivel y llega a la validación de vales (no hay vales válidos en el doble).
  assert.equal((await pagar('vendedor')).status, 400);
  assert.equal((await pagar('tendero')).status, 400);
});

test('sin el módulo Cartera -> 403; superusuario siempre pasa', async () => {
  reset();
  accesos.vendedor = [{ id: '6', level: 'write' }];
  assert.equal((await pagar('vendedor')).status, 403);
  assert.equal((await pagar('superuser')).status, 400);
});

test('GET /modules devuelve el nivel de cada módulo', async () => {
  reset();
  Module.getForRole = async (name) => (accesos[name] ?? []).map(({ id }) => MODULOS.find((m) => m.id === id));
  const r = await llamar('GET', '/modules', 'vendedor');
  assert.equal(r.status, 200);
  const nivel = Object.fromEntries(r.body.modules.map((m) => [m.href, m.level]));
  assert.deepEqual(nivel, { '/dashboard/vale-nuevo': 'write', '/dashboard/cartera': 'read' });
});
