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

test('el correo solo se comprueba contra cuentas activas', async () => {
  consultas.length = 0;
  await User.findActiveByEmail('persona@correo.com');
  assert.match(consultas[0], /email = @email AND isActive = 1/);
});

test('al buscar por correo se prefiere la cuenta activa sobre las deshabilitadas', async () => {
  consultas.length = 0;
  await User.findByEmail('persona@correo.com');
  assert.match(consultas[0], /ORDER BY isActive DESC, createdAt DESC/);
});

test('la base permite repetir correo solo entre cuentas deshabilitadas', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const alter = fs.readFileSync(path.resolve(__dirname, '../../database/scripts_sql/alters/006_correo_unico_entre_usuarios_activos.sql'), 'utf8');
  assert.match(alter, /DROP CONSTRAINT UQ_users_email/);
  assert.match(alter, /CREATE UNIQUE INDEX UX_users_email_activo ON dbo\.users \(email\) WHERE isActive = 1/);
  const esquema = fs.readFileSync(path.resolve(__dirname, '../../database/scripts_sql/esquemas/01_esquema_inicial.sql'), 'utf8');
  assert.ok(!/UQ_users_email/.test(esquema));
  assert.match(esquema, /UX_users_email_activo/);
});
