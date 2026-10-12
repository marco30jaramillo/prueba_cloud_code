/**
 * Requerimiento 005 (KAN-72): B-11 (anular abono acotado al vale de la ruta) y S-06
 * (operaciones de sistema protegidas, /debug/headers eliminada).
 *
 * Sin base de datos real: el acceso a SQL, los modelos y la verificación de sesión se
 * reemplazan por dobles. Las peticiones HTTP van al app de Express sobre un puerto local
 * efímero. Lo que NO cubre (queda para QA con MiValecito_Dev): que SQL Server aplique de
 * verdad `WHERE id=@id AND valeId=@valeId AND anulado=0` y que el saldo concilie.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Configuración mínima válida para startupChecks (valores de ejemplo, sin conexión real).
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

// server.js llama app.listen al cargarse: se neutraliza para capturar el app sin abrir el
// puerto 3001 ni conectar a la base. `express()` copia estos métodos al crear el app.
const express = require('express');
let app = null;
express.application.listen = function () { app = this; return { close() {} }; };

// ── Dobles de acceso a datos ────────────────────────────────────────────────
const VALE_PROPIO = '11111111-1111-4111-8111-111111111111';
const VALE_AJENO = '22222222-2222-4222-8222-222222222222';
const ABONO_PROPIO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ABONO_AJENO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TIENDA_PROPIA = 'tienda-propia';

// Tabla `abonos` en memoria; el doble de request() interpreta el UPDATE según su texto.
const abonos = new Map();
const sentencias = [];
function resetAbonos() {
  abonos.clear();
  abonos.set(ABONO_PROPIO, { id: ABONO_PROPIO, valeId: VALE_PROPIO, monto: 10, anulado: 0 });
  abonos.set(ABONO_AJENO, { id: ABONO_AJENO, valeId: VALE_AJENO, monto: 20, anulado: 0 });
  sentencias.length = 0;
}

const sqlPool = require('../src/database/sqlPool');
sqlPool.request = async () => {
  const inputs = {};
  const r = {
    input(name, _type, value) { inputs[name] = value; return r; },
    async query(text) {
      sentencias.push({ text, inputs: { ...inputs } });
      const m = /UPDATE dbo\.abonos[\s\S]*WHERE (.+)$/.exec(text);
      assert.ok(m, 'solo se espera el UPDATE de anulación');
      const cond = m[1];
      const fila = abonos.get(inputs.id);
      let ok = Boolean(fila) && fila.anulado === 0;
      // El doble solo respeta las condiciones que la sentencia realmente declara.
      if (/valeId=@valeId/.test(cond)) ok = ok && fila.valeId === inputs.valeId;
      if (!ok) return { recordset: [] };
      fila.anulado = 1;
      return { recordset: [{ ...fila, fechaAbono: new Date(), createdAt: new Date() }] };
    },
  };
  return r;
};

const Abono = require('../src/models/Abono');
const Vale = require('../src/models/Vale');
const Tienda = require('../src/models/Tienda');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const TokenManager = require('../src/utils/tokenManager');
const TokenUtils = require('../src/utils/tokenUtils');
const TokenCleaner = require('../src/scripts/cleanExpiredTokens');

const recalculos = [];
Vale.recalcularSaldo = async (id) => { recalculos.push(id); return { id, saldoPendiente: 0 }; };
Vale.findById = async (id) => {
  if (id === VALE_PROPIO) return { id, tiendaId: TIENDA_PROPIA, clienteId: 'otro' };
  if (id === VALE_AJENO) return { id, tiendaId: 'tienda-ajena', clienteId: 'otro' };
  return null;
};
Tienda.hasAcceso = async (tiendaId, userId) => tiendaId === TIENDA_PROPIA && userId === 'u-tendero';
const PERMISOS = {
  tendero: ['abono:anular'], administrador: ['abono:anular'], superuser: ['abono:anular'],
  vendedor: [], cliente: [],
};
Role.hasPermission = async (role, permiso) => (PERMISOS[role] || []).includes(permiso);
User.findById = async (id) => ({ id, isActive: true, mustChangePassword: false });
TokenManager.prototype.isTokenValid = async () => true;
let limpiezas = 0;
TokenCleaner.run = () => { limpiezas += 1; return 0; };
TokenManager.prototype.getStats = async () => ({ totalGranted: 0, totalRevoked: 0 });

require('../src/server');
assert.ok(app, 'server.js debe haber construido el app');

// ── Utilidades ──────────────────────────────────────────────────────────────
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

async function llamar(method, ruta, role) {
  const headers = role ? { Authorization: `Bearer ${tokenDe(role)}` } : {};
  const r = await fetch(base + ruta, { method, headers });
  let body = null;
  try { body = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, body };
}
const anular = (vale, abono, role) => llamar('PATCH', `/vales/${vale}/abonos/${abono}/anular`, role);

// ── B-11: anulación acotada al vale de la ruta ──────────────────────────────

test('B-11 modelo: el UPDATE incluye valeId parametrizado junto con id y anulado=0', async () => {
  resetAbonos();
  await Abono.anular(ABONO_PROPIO, VALE_PROPIO, 'u-tendero');
  const { text, inputs } = sentencias[0];
  assert.match(text, /WHERE id=@id AND valeId=@valeId AND anulado=0/);
  assert.equal(inputs.valeId, VALE_PROPIO);
  assert.doesNotMatch(text, new RegExp(VALE_PROPIO), 'el valeId no se concatena en el SQL');
});

test('B-11 modelo: abono de otro vale devuelve null, no cambia y no recalcula saldo', async () => {
  resetAbonos(); recalculos.length = 0;
  const r = await Abono.anular(ABONO_AJENO, VALE_PROPIO, 'u-tendero');
  assert.equal(r, null);
  assert.equal(abonos.get(ABONO_AJENO).anulado, 0);
  assert.deepEqual(recalculos, []);
});

test('B-11 modelo: valeId o abonoId mal formado devuelve null sin consultar la base', async () => {
  resetAbonos();
  assert.equal(await Abono.anular(ABONO_PROPIO, 'no-es-guid', 'u'), null);
  assert.equal(await Abono.anular('no-es-guid', VALE_PROPIO, 'u'), null);
  assert.equal(sentencias.length, 0);
});

test('B-11 ruta: tendero anula un abono de su vale -> 200 y recalcula el saldo de ese vale', async () => {
  resetAbonos(); recalculos.length = 0;
  const r = await anular(VALE_PROPIO, ABONO_PROPIO, 'tendero');
  assert.equal(r.status, 200);
  assert.equal(abonos.get(ABONO_PROPIO).anulado, 1);
  assert.deepEqual(recalculos, [VALE_PROPIO]);
});

test('B-11 ruta: abono ajeno bajo vale propio -> 404 idéntico al inexistente y sin cambios', async () => {
  resetAbonos(); recalculos.length = 0;
  const ajeno = await anular(VALE_PROPIO, ABONO_AJENO, 'tendero');
  const inexistente = await anular(VALE_PROPIO, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'tendero');
  assert.equal(ajeno.status, 404);
  assert.equal(inexistente.status, 404);
  assert.match(ajeno.body.message, /^Abono no encontrado o ya anulado/);
  assert.equal(ajeno.body.message, inexistente.body.message);
  assert.equal(abonos.get(ABONO_AJENO).anulado, 0);
  assert.deepEqual(recalculos, []);
});

test('B-11 ruta: abono y vale ajenos -> 403 y nada cambia', async () => {
  resetAbonos(); recalculos.length = 0;
  const r = await anular(VALE_AJENO, ABONO_AJENO, 'tendero');
  assert.equal(r.status, 403);
  assert.equal(abonos.get(ABONO_AJENO).anulado, 0);
  assert.equal(sentencias.length, 0);
});

test('B-11 ruta: vendedor -> 403 y nada cambia', async () => {
  resetAbonos();
  const r = await anular(VALE_PROPIO, ABONO_PROPIO, 'vendedor');
  assert.equal(r.status, 403);
  assert.equal(abonos.get(ABONO_PROPIO).anulado, 0);
});

test('B-11 ruta: abono ya anulado -> 404', async () => {
  resetAbonos();
  abonos.get(ABONO_PROPIO).anulado = 1;
  assert.equal((await anular(VALE_PROPIO, ABONO_PROPIO, 'tendero')).status, 404);
});

test('B-11 ruta: administrador y superusuario anulan en cualquier vale -> 200', async () => {
  for (const role of ['administrador', 'superuser']) {
    resetAbonos();
    assert.equal((await anular(VALE_AJENO, ABONO_AJENO, role)).status, 200, role);
    assert.equal(abonos.get(ABONO_AJENO).anulado, 1);
  }
});

test('B-11 ruta: sin token -> 401', async () => {
  resetAbonos();
  assert.equal((await anular(VALE_PROPIO, ABONO_PROPIO, null)).status, 401);
});

// ── S-06: operaciones de sistema ────────────────────────────────────────────

const OPERACIONES = [['GET', '/tokens/stats'], ['POST', '/tokens/clean']];

test('S-06: sin token -> 401 y no se ejecuta la limpieza', async () => {
  limpiezas = 0;
  for (const [m, p] of OPERACIONES) assert.equal((await llamar(m, p, null)).status, 401, `${m} ${p}`);
  assert.equal(limpiezas, 0);
});

test('S-06: tendero, vendedor y cliente -> 403 y no se ejecuta la limpieza', async () => {
  limpiezas = 0;
  for (const role of ['tendero', 'vendedor', 'cliente']) {
    for (const [m, p] of OPERACIONES) assert.equal((await llamar(m, p, role)).status, 403, `${role} ${m} ${p}`);
  }
  assert.equal(limpiezas, 0);
});

test('S-06: superusuario y administrador -> 200', async () => {
  limpiezas = 0;
  for (const role of ['superuser', 'administrador']) {
    for (const [m, p] of OPERACIONES) assert.equal((await llamar(m, p, role)).status, 200, `${role} ${m} ${p}`);
  }
  assert.equal(limpiezas, 2);
});

test('S-06: /health sigue público (200 sin token) y sin información interna', async () => {
  const r = await llamar('GET', '/health', null);
  assert.equal(r.status, 200);
  // ResponseFormatter.success esparce los datos en la raíz junto con status y statusCode.
  assert.deepEqual(Object.keys(r.body).sort(), ['message', 'status', 'statusCode', 'timestamp']);
  assert.equal(r.body.status, 'healthy');
});

test('S-06: /debug/headers ya no existe (404), con y sin token', async () => {
  assert.equal((await llamar('GET', '/debug/headers', null)).status, 404);
  assert.equal((await llamar('GET', '/debug/headers', 'superuser')).status, 404);
});

test('S-06: el repositorio ya no referencia /debug/headers y /docs marca las rutas protegidas', async () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, '../src/server.js'), 'utf8');
  assert.doesNotMatch(fuente, /debug\/headers/);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../DEBUG_HEADERS.md')), false);
  const r = await llamar('GET', '/docs', null);
  assert.equal(r.status, 200);
  const util = JSON.stringify(r.body);
  assert.match(util, /tokens\/stats \(requiere sesión de superusuario o administrador\)/);
  assert.doesNotMatch(util, /debug/);
});
