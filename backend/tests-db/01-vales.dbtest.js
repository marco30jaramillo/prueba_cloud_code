/**
 * Registro de vales (RN-01, RN-02, RN-03, RN-17, RN-50). Pruebas por HTTP contra el backend de
 * pruebas y la base `MiValecito_Test` (ver `npm run test:db`).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { api, esperarEstado } = require('./helpers/api');
const { crearMundo } = require('./helpers/fixture');
const bd = require('./helpers/baseDatos');

let m;
before(async () => { m = await crearMundo(); });
after(async () => { await bd.cerrar(); });

async function contarVales(tienda) {
  const r = await api.get(`/vales/tienda/${tienda.id}`, m.tokenSu);
  esperarEstado(r, 200, 'listar vales');
  return r.body.vales.length;
}

test('RN-01 · un vale nuevo queda pendiente y con saldo igual a su monto', async () => {
  const vale = await m.crearVale({ tienda: m.tiendaA, cliente: m.clienteX, monto: 10000 });
  const leido = await m.leerVale(vale);
  assert.equal(leido.estado, 'pendiente');
  assert.equal(leido.montoTotal, 10000);
  assert.equal(leido.saldoPendiente, 10000);
  assert.equal(leido.abonos.length, 0);
  await m.conciliar('RN-01');
});

test('RN-02 · el cliente no puede registrar vales', async () => {
  const antes = await contarVales(m.tiendaA);
  const r = await api.post('/vales', {
    tiendaId: m.tiendaA.id, clienteId: m.clienteX.id, descripcion: 'Intento del cliente', montoTotal: 5000,
  }, await m.token(m.clienteX));
  assert.equal(r.status, 403);
  assert.equal(await contarVales(m.tiendaA), antes);
});

test('RN-03 · monto cero se rechaza al crear un vale y no se crea nada', async () => {
  const antes = await contarVales(m.tiendaA);
  const r = await api.post('/vales', {
    tiendaId: m.tiendaA.id, clienteId: m.clienteX.id, descripcion: 'Monto cero', montoTotal: 0,
  }, await m.token(m.tenderoA));
  assert.equal(r.status, 400);
  assert.equal(await contarVales(m.tiendaA), antes);
});

test('RN-03 · monto negativo se rechaza al crear un vale y no se crea nada', async () => {
  const antes = await contarVales(m.tiendaA);
  for (const monto of [-1, -5000]) {
    const r = await api.post('/vales', {
      tiendaId: m.tiendaA.id, clienteId: m.clienteX.id, descripcion: 'Monto negativo', montoTotal: monto,
    }, await m.token(m.tenderoA));
    assert.equal(r.status, 400, `monto ${monto}`);
  }
  assert.equal(await contarVales(m.tiendaA), antes);
});

test('RN-17 · un cliente que no existe no recibe vales', async () => {
  const antes = await contarVales(m.tiendaA);
  const r = await api.post('/vales', {
    tiendaId: m.tiendaA.id, clienteId: crypto.randomUUID(), descripcion: 'Sin cliente', montoTotal: 5000,
  }, await m.token(m.tenderoA));
  assert.equal(r.status, 400);
  assert.equal(await contarVales(m.tiendaA), antes);
});

test('RN-50 · una cuenta pendiente de activación no recibe vales', async () => {
  const antes = await contarVales(m.tiendaA);
  const r = await api.post('/vales', {
    tiendaId: m.tiendaA.id, clienteId: m.clientePendiente.id, descripcion: 'Cuenta pendiente', montoTotal: 5000,
  }, await m.token(m.tenderoA));
  assert.equal(r.status, 400);
  assert.equal(await contarVales(m.tiendaA), antes);
});

test('B-12 · un monto no numérico se rechaza con 400', { todo: 'B-12: hoy responde 500' }, async () => {
  const r = await api.post('/vales', {
    tiendaId: m.tiendaA.id, clienteId: m.clienteX.id, descripcion: 'Monto no numérico', montoTotal: 'abc',
  }, await m.token(m.tenderoA));
  assert.equal(r.status, 400);
});

test('RN-04 · al cierre del archivo, saldos y cartera concilian', async () => {
  await m.conciliar('cierre de 01-vales');
});
