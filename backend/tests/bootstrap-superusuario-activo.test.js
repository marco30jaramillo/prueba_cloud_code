/**
 * El bootstrap del superusuario debe estar disponible mientras no exista un superusuario ACTIVO:
 * un superusuario deshabilitado o pendiente de activación no cuenta. Sin base de datos: se
 * sustituye la conexión por una que registra la consulta y devuelve un conteo fijo.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'z9'.repeat(16);

const sqlPool = require('../src/database/sqlPool');
const consultas = [];
let total = 0;
sqlPool.request = async () => {
  const consulta = { input() { return consulta; }, async query(texto) { consultas.push(texto); return { recordset: [{ total }] }; } };
  return consulta;
};
const User = require('../src/models/User');

test('sin superusuarios activos el bootstrap queda disponible', async () => {
  total = 0;
  assert.equal(await User.isSuperuserExists(), false);
});

test('con un superusuario activo el bootstrap se cierra', async () => {
  total = 1;
  assert.equal(await User.isSuperuserExists(), true);
});

test('solo se cuentan superusuarios activos y con la cuenta activada', async () => {
  consultas.length = 0;
  total = 0;
  await User.isSuperuserExists();
  assert.match(consultas[0], /isActive = 1/);
  assert.match(consultas[0], /activatedAt IS NOT NULL/);
  assert.match(consultas[0], /role = @role/);
});
