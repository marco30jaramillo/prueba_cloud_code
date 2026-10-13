/**
 * Equipo de la tienda (KAN-75): el dueño (equipo:gestionar, solo en SU tienda) suma vendedores
 * o encargados ya registrados por su correo exacto, crea la cuenta de uno nuevo o lo quita, sin
 * depender del administrador. tienda:administrar lo hace en cualquier tienda.
 *
 * Sin base de datos real: modelos, correo y auditoría se reemplazan por dobles. Las
 * peticiones HTTP van al app de Express sobre un puerto local efímero.
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

// ── Dobles ──────────────────────────────────────────────────────────────────
const TIENDA = '11111111-1111-4111-8111-111111111111';
const OTRA_TIENDA = '22222222-2222-4222-8222-222222222222';

const Tienda = require('../src/models/Tienda');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const TokenManager = require('../src/utils/tokenManager');
const TokenUtils = require('../src/utils/tokenUtils');
const accountMail = require('../src/mail/accountMail');
const auditMiddleware = require('../src/middleware/auditMiddleware');

let usuarios;       // email -> usuario
let asignaciones;   // `${tiendaId}|${userId}`
let creados;
let correos;
let auditorias;
function reset() {
  usuarios = new Map([
    ['vendedor@ejemplo.com', { id: 'u-vend', email: 'vendedor@ejemplo.com', name: 'Vera Vendedora', role: 'vendedor', isActive: true }],
    ['inactivo@ejemplo.com', { id: 'u-inac', email: 'inactivo@ejemplo.com', name: 'Iván', role: 'vendedor', isActive: false }],
    ['cliente@ejemplo.com', { id: 'u-cli', email: 'cliente@ejemplo.com', name: 'Carla', role: 'cliente', isActive: true }],
    ['encargada@ejemplo.com', { id: 'u-enc', email: 'encargada@ejemplo.com', name: 'Elsa Encargada', role: 'encargado', isActive: true }],
    ['tendero2@ejemplo.com', { id: 'u-ten2', email: 'tendero2@ejemplo.com', name: 'Tomás', role: 'tendero', isActive: true }],
  ]);
  asignaciones = new Set();
  creados = [];
  correos = [];
  auditorias = [];
}

Tienda.findById = async (id) => ([TIENDA, OTRA_TIENDA].includes(id) ? { id } : null);
Tienda.esPropietario = async (tiendaId, userId) => tiendaId === TIENDA && userId === 'u-tendero';
Tienda.getUsuariosByTienda = async (tiendaId) => {
  const porId = new Map([...usuarios.values()].map((u) => [u.id, u]));
  const lista = [{ userId: 'U-TENDERO', name: 'Dueño', role: 'tendero', esPropietario: true }];
  for (const clave of asignaciones) {
    const [t, uid] = clave.split('|');
    if (t === tiendaId) lista.push({ userId: uid.toUpperCase(), name: porId.get(uid)?.name, role: porId.get(uid)?.role, esPropietario: false });
  }
  return lista;
};
const quitados = [];
Tienda.removeUsuario = async (tiendaId, userId) => {
  quitados.push(userId);
  asignaciones.delete(`${tiendaId}|${String(userId).toLowerCase()}`);
  return true;
};
Tienda.addUsuario = async (tiendaId, userId, esPropietario, assignedBy) => {
  const clave = `${tiendaId}|${userId}`;
  if (asignaciones.has(clave)) { const e = new Error('Violation of UQ_tienda_usuario'); e.number = 2627; throw e; }
  asignaciones.add(clave);
  return { tiendaId, userId, esPropietario, assignedBy };
};
User.findByEmail = async (email) => usuarios.get(email) ?? null;
User.create = async (email, password, name, role, photo, options) => {
  const u = { id: `u-nuevo-${creados.length}`, email, name, role, isActive: true, activationToken: 'tok', password, options };
  creados.push(u);
  usuarios.set(email, u);
  return u;
};
User.findById = async (id) => {
  const u = [...usuarios.values()].find((x) => x.id === id);
  return u ? { ...u, mustChangePassword: false } : { id, isActive: true, mustChangePassword: false };
};
Role.canCreateRole = async (creador, rol) => creador === 'superuser' || (creador === 'tendero' && rol === 'cliente');
accountMail.sendActivation = async (user, token, opts) => { correos.push({ user, token, opts }); return { ok: true }; };
auditMiddleware.logUserCreation = async (...args) => { auditorias.push(args); };
// Permisos efectivos por defecto (alters/005): el dueño gestiona su equipo; el encargado y el
// vendedor solo ven la tienda; el administrador administra cualquiera.
const PERMISOS = {
  tendero: ['tienda:ver', 'equipo:gestionar'],
  encargado: ['tienda:ver'],
  vendedor: ['tienda:ver'],
  administrador: ['tienda:ver', 'equipo:gestionar', 'tienda:administrar'],
  superuser: ['tienda:ver', 'equipo:gestionar', 'tienda:administrar'],
  cliente: [],
};
Role.hasPermission = async (role, permiso) => (PERMISOS[role] || []).includes(permiso);
TokenManager.prototype.isTokenValid = async () => true;

require('../src/server');
assert.ok(app, 'server.js debe haber construido el app');

const tokens = new TokenUtils();
const tokenDe = (role, userId = `u-${role}`) => tokens.generateToken({ userId, role, tokenId: `t-${userId}` });

let server;
let base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { await new Promise((res) => server.close(res)); });

async function post(ruta, role, body, userId, method = 'POST') {
  const r = await fetch(base + ruta, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDe(role, userId)}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const agregar = (tienda, email, role = 'tendero', userId) => post(`/tiendas/${tienda}/equipo`, role, { email }, userId);
const crear = (tienda, body, role = 'tendero', userId) => post(`/tiendas/${tienda}/equipo/nuevo`, role, body, userId);
const quitar = (tienda, uid, role = 'tendero', userId) => post(`/tiendas/${tienda}/equipo/${uid}`, role, undefined, userId, 'DELETE');

// ── Agregar por correo ──────────────────────────────────────────────────────

test('propietario agrega un vendedor registrado por su correo exacto (sin importar mayúsculas)', async () => {
  reset();
  const r = await agregar(TIENDA, '  Vendedor@Ejemplo.com ');
  assert.equal(r.status, 201);
  assert.ok(asignaciones.has(`${TIENDA}|u-vend`));
  assert.equal(r.body.usuario.email, 'vendedor@ejemplo.com');
  assert.equal(creados.length, 0, 'no crea usuarios');
});

test('correo inexistente y correo de otro rol responden igual (404) y no asignan', async () => {
  reset();
  const inexistente = await agregar(TIENDA, 'nadie@ejemplo.com');
  const cliente = await agregar(TIENDA, 'cliente@ejemplo.com');
  assert.equal(inexistente.status, 404);
  assert.equal(cliente.status, 404);
  assert.equal(inexistente.body.message, cliente.body.message);
  assert.equal(asignaciones.size, 0);
});

test('correo incompleto -> 400', async () => {
  reset();
  assert.equal((await agregar(TIENDA, 'vendedor@')).status, 400);
  assert.equal((await agregar(TIENDA, undefined)).status, 400);
});

test('vendedor deshabilitado -> 400', async () => {
  reset();
  assert.equal((await agregar(TIENDA, 'inactivo@ejemplo.com')).status, 400);
  assert.equal(asignaciones.size, 0);
});

test('vendedor ya en la tienda -> 409', async () => {
  reset();
  await agregar(TIENDA, 'vendedor@ejemplo.com');
  assert.equal((await agregar(TIENDA, 'vendedor@ejemplo.com')).status, 409);
});

test('tendero que no es propietario de la tienda -> 403', async () => {
  reset();
  assert.equal((await agregar(OTRA_TIENDA, 'vendedor@ejemplo.com')).status, 403);
  assert.equal((await agregar(TIENDA, 'vendedor@ejemplo.com', 'tendero', 'u-otro-tendero')).status, 403);
  assert.equal(asignaciones.size, 0);
});

test('el dueño también suma encargados; tenderos u otros roles no se suman por aquí', async () => {
  reset();
  assert.equal((await agregar(TIENDA, 'encargada@ejemplo.com')).status, 201);
  assert.ok(asignaciones.has(`${TIENDA}|u-enc`));
  assert.equal((await agregar(TIENDA, 'tendero2@ejemplo.com')).status, 404);
});

test('vendedor y encargado no gestionan el equipo -> 403; cliente sin permiso -> 403', async () => {
  reset();
  assert.equal((await agregar(TIENDA, 'vendedor@ejemplo.com', 'vendedor')).status, 403);
  assert.equal((await agregar(TIENDA, 'vendedor@ejemplo.com', 'encargado')).status, 403);
  assert.equal((await agregar(TIENDA, 'vendedor@ejemplo.com', 'cliente')).status, 403);
  assert.equal(asignaciones.size, 0);
});

test('administrador agrega en cualquier tienda; tienda inexistente -> 404', async () => {
  reset();
  assert.equal((await agregar(OTRA_TIENDA, 'vendedor@ejemplo.com', 'administrador')).status, 201);
  assert.equal((await agregar('33333333-3333-4333-8333-333333333333', 'vendedor@ejemplo.com', 'administrador')).status, 404);
});

// ── Crear vendedor nuevo ────────────────────────────────────────────────────

test('propietario crea un vendedor: cuenta pendiente, en la tienda, con correo de activación y auditoría', async () => {
  reset();
  const r = await crear(TIENDA, { name: 'Nico Nuevo', email: 'Nuevo@Ejemplo.com' });
  assert.equal(r.status, 201);
  assert.equal(creados.length, 1);
  const u = creados[0];
  assert.equal(u.email, 'nuevo@ejemplo.com');
  assert.equal(u.role, 'vendedor');
  assert.deepEqual(u.options, { pending: true, mustChangePassword: true });
  assert.ok(u.password.length >= 32, 'contraseña aleatoria larga');
  assert.ok(asignaciones.has(`${TIENDA}|${u.id}`));
  assert.equal(correos.length, 1);
  assert.equal(correos[0].opts.origin, 'byOther');
  assert.equal(auditorias.length, 1);
  assert.equal(r.body.activationEmailSent, true);
  assert.equal(r.body.usuario.password, undefined, 'no devuelve la contraseña');
});

test('crear con correo ya registrado -> 409 y no crea nada', async () => {
  reset();
  const r = await crear(TIENDA, { name: 'Otra', email: 'vendedor@ejemplo.com' });
  assert.equal(r.status, 409);
  assert.equal(creados.length, 0);
  assert.equal(asignaciones.size, 0);
});

test('crear sin nombre o con correo inválido -> 400', async () => {
  reset();
  assert.equal((await crear(TIENDA, { name: ' ', email: 'x@ejemplo.com' })).status, 400);
  assert.equal((await crear(TIENDA, { name: 'Ana', email: 'no-es-correo' })).status, 400);
  assert.equal(creados.length, 0);
});

test('crear en una tienda ajena -> 403 y no crea nada', async () => {
  reset();
  assert.equal((await crear(OTRA_TIENDA, { name: 'Ana', email: 'ana@ejemplo.com' })).status, 403);
  assert.equal((await crear(TIENDA, { name: 'Ana', email: 'ana@ejemplo.com' }, 'vendedor')).status, 403);
  assert.equal(creados.length, 0);
});

test('crear un encargado nuevo: rol encargado, en la tienda y con correo de activación', async () => {
  reset();
  const r = await crear(TIENDA, { name: 'Eva Encargada', email: 'eva@ejemplo.com', rol: 'encargado' });
  assert.equal(r.status, 201);
  assert.equal(creados[0].role, 'encargado');
  assert.ok(asignaciones.has(`${TIENDA}|${creados[0].id}`));
  assert.match(r.body.message, /encargado/);
});

test('crear con un rol que no es de equipo -> 400 y no crea nada', async () => {
  reset();
  for (const rol of ['tendero', 'administrador', 'cliente']) {
    assert.equal((await crear(TIENDA, { name: 'X Y', email: `${rol}@nuevo.com`, rol })).status, 400, rol);
  }
  assert.equal(creados.length, 0);
});

// ── Quitar del equipo ───────────────────────────────────────────────────────

test('el dueño quita a un vendedor o encargado de su tienda', async () => {
  reset(); quitados.length = 0;
  await agregar(TIENDA, 'vendedor@ejemplo.com');
  await agregar(TIENDA, 'encargada@ejemplo.com');
  assert.equal((await quitar(TIENDA, 'u-vend')).status, 200);
  assert.equal((await quitar(TIENDA, 'U-ENC')).status, 200, 'el id no distingue mayúsculas');
  assert.equal(asignaciones.size, 0);
});

test('al dueño no se le quita desde el equipo; a quien no está -> 404', async () => {
  reset(); quitados.length = 0;
  assert.equal((await quitar(TIENDA, 'u-tendero')).status, 403);
  assert.equal((await quitar(TIENDA, 'u-nadie')).status, 404);
  assert.equal(quitados.length, 0);
});

test('encargado, vendedor o tendero de otra tienda no quitan -> 403', async () => {
  reset(); quitados.length = 0;
  await agregar(TIENDA, 'vendedor@ejemplo.com');
  assert.equal((await quitar(TIENDA, 'u-vend', 'encargado')).status, 403);
  assert.equal((await quitar(TIENDA, 'u-vend', 'vendedor')).status, 403);
  assert.equal((await quitar(TIENDA, 'u-vend', 'tendero', 'u-otro-tendero')).status, 403);
  assert.equal(quitados.length, 0);
});

// ── Crear usuarios sin contraseña y dueño solo tendero ──────────────────────

test('create-user sin contraseña: cuenta pendiente con contraseña aleatoria y correo de activación', async () => {
  reset();
  const r = await post('/auth/create-user', 'superuser', { email: 'nueva@ejemplo.com', name: 'Nueva Persona', role: 'encargado' });
  assert.equal(r.status, 201);
  assert.equal(creados.length, 1);
  assert.ok(creados[0].password.length >= 32, 'contraseña aleatoria larga');
  assert.deepEqual(creados[0].options, { pending: true, mustChangePassword: true });
  assert.equal(correos.length, 1);
});

test('create-user con contraseña corta -> 400 (scripts que la envían)', async () => {
  reset();
  assert.equal((await post('/auth/create-user', 'superuser', { email: 'x@ejemplo.com', name: 'X Y', role: 'cliente', password: 'corta' })).status, 400);
  assert.equal(creados.length, 0);
});

test('asignar a la tienda: solo un tendero puede quedar como dueño', async () => {
  reset();
  const asignar = (userId, esPropietario) => post(`/tiendas/${TIENDA}/usuarios`, 'administrador', { userId, esPropietario });
  assert.equal((await asignar('u-enc', true)).status, 400);
  assert.equal((await asignar('u-vend', true)).status, 400);
  assert.equal(asignaciones.size, 0);
  assert.equal((await asignar('u-enc', false)).status, 201);
  assert.equal((await asignar('u-ten2', true)).status, 201);
});
