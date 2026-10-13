/**
 * Abonos y anulaciones (RN-03, RN-04, RN-05, RN-06, RN-07, RN-09, RN-10). Pruebas por HTTP
 * contra el backend de pruebas y la base `MiValecito_Test` (ver `npm run test:db`).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api } = require('./helpers/api');
const { crearMundo } = require('./helpers/fixture');
const bd = require('./helpers/baseDatos');

let m;
before(async () => { m = await crearMundo(); });
after(async () => { await bd.cerrar(); });

const nuevoVale = (monto) => m.crearVale({ tienda: m.tiendaA, cliente: m.clienteX, monto });

async function anularAbono(vale, abonoId, quien) {
  return api.patch(`/vales/${vale.id}/abonos/${abonoId}/anular`, {}, await m.token(quien));
}

const mismoId = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();

test('RN-03 · un abono de monto cero se rechaza y el saldo no cambia', async () => {
  const vale = await nuevoVale(10000);
  const r = await m.abonar(vale, 0, m.tenderoA);
  assert.equal(r.status, 400);
  const leido = await m.leerVale(vale);
  assert.equal(leido.saldoPendiente, 10000);
  assert.equal(leido.abonos.length, 0);
  await m.conciliar('RN-03 cero');
});

test('RN-03 · un abono de monto negativo se rechaza y el saldo no cambia', async () => {
  const vale = await nuevoVale(10000);
  for (const monto of [-1, -2500]) {
    const r = await m.abonar(vale, monto, m.tenderoA);
    assert.equal(r.status, 400, `monto ${monto}`);
  }
  const leido = await m.leerVale(vale);
  assert.equal(leido.saldoPendiente, 10000);
  assert.equal(leido.abonos.length, 0);
  await m.conciliar('RN-03 negativo');
});

test('RN-09 · un abono mayor al saldo se rechaza y el saldo no cambia', async () => {
  const vale = await nuevoVale(10000);
  const r = await m.abonar(vale, 10001, m.tenderoA);
  assert.equal(r.status, 400);
  const parcial = await m.abonar(vale, 4000, m.tenderoA);
  assert.equal(parcial.status, 201);
  const r2 = await m.abonar(vale, 6000.01, m.tenderoA);
  assert.equal(r2.status, 400);
  const leido = await m.leerVale(vale);
  assert.equal(leido.saldoPendiente, 6000);
  assert.equal(leido.abonos.length, 1);
  await m.conciliar('RN-09');
});

test('RN-09 · un abono igual al saldo se acepta y deja el vale pagado', async () => {
  const vale = await nuevoVale(7500);
  const r = await m.abonar(vale, 7500, m.tenderoA);
  assert.equal(r.status, 201);
  assert.equal(r.body.vale.saldoPendiente, 0);
  assert.equal(r.body.vale.estado, 'pagado');
  await m.conciliar('RN-09 borde');
});

test('RN-10 · no se abona a un vale pagado', async () => {
  const vale = await nuevoVale(5000);
  assert.equal((await m.abonar(vale, 5000, m.tenderoA)).status, 201);
  const r = await m.abonar(vale, 1, m.tenderoA);
  assert.equal(r.status, 400);
  const leido = await m.leerVale(vale);
  assert.equal(leido.saldoPendiente, 0);
  assert.equal(leido.abonos.length, 1);
  await m.conciliar('RN-10 pagado');
});

test('RN-10 · no se abona a un vale anulado', async () => {
  const vale = await nuevoVale(5000);
  const anulado = await api.patch(`/vales/${vale.id}/anular`, {}, await m.token(m.tenderoA));
  assert.equal(anulado.status, 200);
  const r = await m.abonar(vale, 1000, m.tenderoA);
  assert.equal(r.status, 400);
  const leido = await m.leerVale(vale);
  assert.equal(leido.estado, 'anulado');
  assert.equal(leido.abonos.length, 0);
  await m.conciliar('RN-10 anulado');
});

test('RN-05 · el estado pasa de pendiente a parcial y a pagado según los abonos', async () => {
  const vale = await nuevoVale(9000);
  assert.equal((await m.leerVale(vale)).estado, 'pendiente');
  const a1 = await m.abonar(vale, 3000, m.tenderoA);
  assert.equal(a1.status, 201);
  assert.equal(a1.body.vale.estado, 'parcial');
  assert.equal(a1.body.vale.saldoPendiente, 6000);
  const a2 = await m.abonar(vale, 6000, m.encargadoA);
  assert.equal(a2.status, 201);
  assert.equal(a2.body.vale.estado, 'pagado');
  assert.equal(a2.body.vale.saldoPendiente, 0);
  await m.conciliar('RN-05');
});

test('RN-07 · anular un abono lo conserva, marcado, y recalcula el saldo y el estado', async () => {
  const vale = await nuevoVale(10000);
  const a1 = await m.abonar(vale, 4000, m.tenderoA);
  const a2 = await m.abonar(vale, 6000, m.tenderoA);
  assert.equal(a2.body.vale.estado, 'pagado');

  const r = await anularAbono(vale, a2.body.abono.id, m.tenderoA);
  assert.equal(r.status, 200);
  assert.equal(r.body.vale.saldoPendiente, 6000);
  assert.equal(r.body.vale.estado, 'parcial');

  const leido = await m.leerVale(vale);
  assert.equal(leido.abonos.length, 2, 'el abono anulado no se borra');
  assert.equal(leido.abonos.find((a) => mismoId(a.id, a2.body.abono.id)).anulado, true);
  assert.equal(leido.abonos.find((a) => mismoId(a.id, a1.body.abono.id)).anulado, false);

  // Anular el otro lleva el vale de vuelta a pendiente.
  const r2 = await anularAbono(vale, a1.body.abono.id, m.tenderoA);
  assert.equal(r2.status, 200);
  assert.equal(r2.body.vale.saldoPendiente, 10000);
  assert.equal(r2.body.vale.estado, 'pendiente');
  await m.conciliar('RN-07');
});

test('RN-07 · tras anular un abono el saldo vuelve a permitir abonar', async () => {
  const vale = await nuevoVale(5000);
  const a = await m.abonar(vale, 5000, m.tenderoA);
  assert.equal((await anularAbono(vale, a.body.abono.id, m.tenderoA)).status, 200);
  const otra = await m.abonar(vale, 5000, m.tenderoA);
  assert.equal(otra.status, 201);
  assert.equal(otra.body.vale.estado, 'pagado');
  await m.conciliar('RN-07 reabono');
});

test('RN-06 · un vale puede anularse desde pendiente, parcial y pagado, con quién y cuándo', async () => {
  const pendiente = await nuevoVale(1000);
  const parcial = await nuevoVale(1000);
  await m.abonar(parcial, 400, m.tenderoA);
  const pagado = await nuevoVale(1000);
  await m.abonar(pagado, 1000, m.tenderoA);

  for (const vale of [pendiente, parcial, pagado]) {
    const r = await api.patch(`/vales/${vale.id}/anular`, {}, await m.token(m.tenderoA));
    assert.equal(r.status, 200);
    const leido = await m.leerVale(vale);
    assert.equal(leido.estado, 'anulado');
    assert.ok(mismoId(leido.anuladoPor, m.tenderoA.id), 'queda registrado quién anuló');
    assert.ok(leido.anuladoAt, 'queda registrado cuándo');
  }
  await m.conciliar('RN-06');
});

test('RN-04 · al cierre del archivo, saldos y cartera concilian', async () => {
  await m.conciliar('cierre de 02-abonos');
});
