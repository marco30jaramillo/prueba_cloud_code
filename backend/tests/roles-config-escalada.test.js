/**
 * Roles y permisos sin escalada (KAN-75): quien edita roles no puede darse más permisos ni
 * conceder el acceso total, y los permisos se conceden con módulos (como permiso directo solo
 * los de sesión). Sin base de datos: roles y módulos en memoria.
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
const User = require('../src/models/User');
const auditMiddleware = require('../src/middleware/auditMiddleware');
const TokenManager = require('../src/utils/tokenManager');
const TokenUtils = require('../src/utils/tokenUtils');

const MODULOS = [
  new Module({ id: '4', name: 'Roles', href: '/dashboard/roles', permRead: ['admin:view-roles'], permWrite: ['admin:view-roles', 'admin:manage-roles'] }),
  new Module({ id: '7', name: 'Cartera', href: '/dashboard/cartera', permRead: ['abono:ver'], permWrite: ['abono:ver', 'abono:crear'] }),
];
let roles;
let guardados;
function reset() {
  guardados = [];
  roles = [
    new Role({ id: '1', name: 'superuser', permissions: 'system:full-access', modules: '4:full|7:full' }),
    new Role({ id: '2', name: 'administrador', permissions: 'auth:login', modules: '4:read|7:write' }),
    // Rol con «Roles y permisos» en escritura, sin acceso total.
    new Role({ id: '3', name: 'gestor', permissions: 'auth:login', modules: '4:write' }),
    // Rol con un permiso directo heredado de antes de la regla.
    new Role({ id: '4', name: 'vendedor', permissions: 'auth:login|vale:crear', modules: '7:read' }),
  ];
}
reset();
Module.getAll = async () => MODULOS;
Role.getAll = async () => roles;
Role.updateRole = async (id, cambios) => {
  guardados.push({ id, ...cambios });
  const r = roles.find((x) => x.id === String(id));
  if (cambios.permissions) r.permissions = cambios.permissions;
  if (cambios.moduleAccess) r.moduleAccess = cambios.moduleAccess;
  return r;
};
Role.createRole = async (data) => { guardados.push({ nuevo: data.name }); roles.push(new Role({ id: '9', name: data.name, permissions: data.permissions.join('|'), modules: '' })); };
User.findById = async (id) => ({ id, isActive: true, mustChangePassword: false });
for (const k of ['logRoleCreated', 'logRoleModulesUpdated', 'logRolePermissionsUpdated']) auditMiddleware[k] = async () => {};
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
const editar = (role, rolId, body) => llamar('PATCH', `/roles-config/${rolId}`, role, body);

test('el administrador (Roles en lectura) consulta pero no edita roles', async () => {
  reset();
  const r = await llamar('GET', '/roles-config', 'administrador');
  assert.equal(r.status, 200);
  assert.equal(r.body.canManageRoles, false);
  assert.ok(r.body.sessionPermissions.includes('auth:login'));
  assert.equal((await editar('administrador', '4', { moduleAccess: [{ id: '7', level: 'write' }] })).status, 403);
  assert.equal(guardados.length, 0);
});

test('quien edita roles no puede editar su propio rol ni el de superusuario', async () => {
  reset();
  assert.equal((await editar('gestor', '3', { moduleAccess: [{ id: '4', level: 'write' }, { id: '7', level: 'full' }] })).status, 403);
  assert.equal((await editar('gestor', '1', { moduleAccess: [] })).status, 403);
  assert.equal(guardados.length, 0);
});

test('nadie concede el acceso total, tampoco el superusuario', async () => {
  reset();
  assert.equal((await editar('gestor', '2', { directPermissions: ['auth:login', 'system:full-access'] })).status, 400);
  assert.equal((await editar('superuser', '2', { directPermissions: ['system:full-access'] })).status, 400);
  assert.equal((await llamar('POST', '/roles-config', 'superuser', { name: 'otro', directPermissions: ['system:full-access'] })).status, 400);
  assert.equal(guardados.length, 0);
});

test('los permisos de módulo no se conceden directamente; los de sesión sí', async () => {
  reset();
  const r = await editar('gestor', '4', { directPermissions: ['auth:login', 'abono:crear'] });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /abono:crear/);
  assert.equal((await editar('gestor', '4', { directPermissions: ['auth:login', 'auth:logout'] })).status, 200);
});

test('un permiso directo heredado se puede conservar o quitar, no volver a agregar', async () => {
  reset();
  assert.equal((await editar('gestor', '4', { directPermissions: ['auth:login', 'vale:crear'] })).status, 200, 'conservar');
  assert.equal((await editar('gestor', '4', { directPermissions: ['auth:login'] })).status, 200, 'quitar');
  assert.equal((await editar('gestor', '4', { directPermissions: ['auth:login', 'vale:crear'] })).status, 400, 'volver a agregar');
});

test('módulo inexistente o nivel inválido -> 400', async () => {
  reset();
  assert.equal((await editar('gestor', '4', { moduleAccess: [{ id: '99', level: 'read' }] })).status, 400);
  assert.equal((await editar('gestor', '4', { moduleAccess: [{ id: '7', level: 'admin' }] })).status, 400);
  assert.equal((await editar('gestor', '4', { moduleAccess: [{ id: '7', level: 'write' }] })).status, 200);
});

test('el superusuario edita cualquier rol, incluido el suyo, sin perder el acceso total', async () => {
  reset();
  assert.equal((await editar('superuser', '2', { moduleAccess: [{ id: '4', level: 'write' }] })).status, 200);
  assert.equal((await editar('superuser', '1', { directPermissions: ['auth:login'] })).status, 200);
  assert.ok(roles.find((r) => r.id === '1').permissions.includes('system:full-access'));
});
