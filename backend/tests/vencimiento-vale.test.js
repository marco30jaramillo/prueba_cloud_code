/**
 * Fecha de vencimiento de un vale (KAN-75): vacía o desde hoy; nunca un día pasado.
 * Sin base de datos real: modelos y sesión se reemplazan por dobles.
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

const Vale = require('../src/models/Vale');
const Tienda = require('../src/models/Tienda');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const TokenManager = require('../src/utils/tokenManager');
const TokenUtils = require('../src/utils/tokenUtils');

const creados = [];
Vale.create = async (data) => { creados.push(data); return { id: 'v-1', ...data }; };
Tienda.hasAcceso = async () => true;
Role.hasPermission = async (role, permiso) => role === 'tendero' && permiso === 'vale:crear';
User.findById = async (id) => ({ id, isActive: true, mustChangePassword: false, activatedAt: '2026-01-01T00:00:00Z' });
TokenManager.prototype.isTokenValid = async () => true;

require('../src/server');
assert.ok(app, 'server.js debe haber construido el app');

const token = new TokenUtils().generateToken({ userId: 'u-tendero', role: 'tendero', tokenId: 't-1' });
let server;
let base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { await new Promise((res) => server.close(res)); });

const DIA = 24 * 3600 * 1000;
const isoDia = (ms) => new Date(ms).toISOString().slice(0, 10);

async function crearVale(fechaVencimiento) {
  const body = { tiendaId: 't-1', clienteId: 'c-1', descripcion: 'Mercado', montoTotal: 10000 };
  if (fechaVencimiento !== undefined) body.fechaVencimiento = fechaVencimiento;
  const r = await fetch(`${base}/vales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

test('sin fecha de vencimiento se crea el vale', async () => {
  creados.length = 0;
  assert.equal((await crearVale()).status, 201);
  assert.equal((await crearVale('')).status, 201);
  assert.equal(creados.length, 2);
});

test('hoy y fechas futuras se aceptan', async () => {
  creados.length = 0;
  assert.equal((await crearVale(isoDia(Date.now()))).status, 201);
  assert.equal((await crearVale(isoDia(Date.now() + 30 * DIA))).status, 201);
  assert.equal(creados.length, 2);
});

test('una fecha pasada se rechaza con 400 y no crea el vale', async () => {
  creados.length = 0;
  const r = await crearVale(isoDia(Date.now() - 5 * DIA));
  assert.equal(r.status, 400);
  assert.match(r.body.message, /anterior a hoy/);
  assert.equal(creados.length, 0);
});

test('una fecha que no es fecha se rechaza con 400', async () => {
  creados.length = 0;
  assert.equal((await crearVale('mañana')).status, 400);
  assert.equal((await crearVale(12345)).status, 400);
  assert.equal(creados.length, 0);
});
