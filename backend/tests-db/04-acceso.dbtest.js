/**
 * Acceso por tienda y por rol (RN-02, RN-22, RN-23, RN-33; regresión de B-11). Pruebas por
 * HTTP contra el backend de pruebas y la base `MiValecito_Test` (ver `npm run test:db`).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api } = require('./helpers/api');
const { crearMundo } = require('./helpers/fixture');
const bd = require('./helpers/baseDatos');

let m;
before(async () => { m = await crearMundo(); });
after(async () => { await bd.cerrar(); });

const valeEn = (tienda, cliente, monto = 10000) => m.crearVale({ tienda, cliente, monto });
const idsDe = (vales) => vales.map((v) => String(v.id).toUpperCase());

test('RN-02 · el vendedor registra vales y abonos en su tienda', async () => {
  const r = await api.post('/vales', {
    tiendaId: m.tiendaA.id, clienteId: m.clienteX.id, descripcion: 'Compra del vendedor', montoTotal: 3000,
  }, await m.token(m.vendedorA));
  assert.equal(r.status, 201);
  const abono = await api.post(`/vales/${r.body.vale.id}/abonos`, { monto: 1000 }, await m.token(m.vendedorA));
  assert.equal(abono.status, 201);
  await m.conciliar('RN-02 vendedor');
});

test('RN-22 · el tendero de otra tienda no ve, cobra ni anula los vales ajenos', async () => {
  const vale = await valeEn(m.tiendaA, m.clienteX);
  const abono = await m.abonar(vale, 2000, m.tenderoA);
  assert.equal(abono.status, 201);
  const tokenB = await m.token(m.tenderoB);

  const intentos = [
    ['cartera de la tienda ajena', await api.get(`/vales/tienda/${m.tiendaA.id}`, tokenB)],
    ['detalle del vale ajeno', await api.get(`/vales/${vale.id}`, tokenB)],
    ['abonos del vale ajeno', await api.get(`/vales/${vale.id}/abonos`, tokenB)],
    ['abono sobre el vale ajeno', await api.post(`/vales/${vale.id}/abonos`, { monto: 1000 }, tokenB)],
    ['anular el vale ajeno', await api.patch(`/vales/${vale.id}/anular`, {}, tokenB)],
    ['anular el abono ajeno', await api.patch(`/vales/${vale.id}/abonos/${abono.body.abono.id}/anular`, {}, tokenB)],
    ['registrar un vale en la tienda ajena', await api.post('/vales', {
      tiendaId: m.tiendaA.id, clienteId: m.clienteX.id, descripcion: 'Intento ajeno', montoTotal: 1000,
    }, tokenB)],
  ];
  for (const [que, r] of intentos) assert.equal(r.status, 403, que);

  const leido = await m.leerVale(vale);
  assert.deepEqual([leido.estado, leido.saldoPendiente, leido.abonos.length], ['parcial', 8000, 1]);
  assert.equal(leido.abonos[0].anulado, false);
  await m.conciliar('RN-22 tendero');
});

test('RN-22 · el vendedor de otra tienda no ve ni cobra los vales ajenos', async () => {
  const vale = await valeEn(m.tiendaA, m.clienteX);
  const tokenB = await m.token(m.vendedorB);
  const intentos = [
    ['cartera de la tienda ajena', await api.get(`/vales/tienda/${m.tiendaA.id}`, tokenB)],
    ['detalle del vale ajeno', await api.get(`/vales/${vale.id}`, tokenB)],
    ['abono sobre el vale ajeno', await api.post(`/vales/${vale.id}/abonos`, { monto: 1000 }, tokenB)],
    ['registrar un vale en la tienda ajena', await api.post('/vales', {
      tiendaId: m.tiendaA.id, clienteId: m.clienteX.id, descripcion: 'Intento ajeno', montoTotal: 1000,
    }, tokenB)],
  ];
  for (const [que, r] of intentos) assert.equal(r.status, 403, que);
  assert.equal((await m.leerVale(vale)).abonos.length, 0);
  await m.conciliar('RN-22 vendedor');
});

test('RN-22 · quien opera una tienda ve la cartera y los vales de la propia', async () => {
  const vale = await valeEn(m.tiendaA, m.clienteX);
  for (const quien of [m.tenderoA, m.vendedorA]) {
    const token = await m.token(quien);
    const cartera = await api.get(`/vales/tienda/${m.tiendaA.id}`, token);
    assert.equal(cartera.status, 200);
    assert.ok(idsDe(cartera.body.vales).includes(vale.id));
    assert.equal((await api.get(`/vales/${vale.id}`, token)).status, 200);
  }
});

test('RN-22 · los vales de un cliente se ven solo de las tiendas del que consulta; el superusuario ve todas', async () => {
  const enA = await valeEn(m.tiendaA, m.clienteY, 2000);
  const enB = await valeEn(m.tiendaB, m.clienteY, 3000);

  const comoA = await api.get(`/vales/usuario/${m.clienteY.id}`, await m.token(m.tenderoA));
  assert.equal(comoA.status, 200);
  assert.ok(idsDe(comoA.body.vales).includes(enA.id));
  assert.ok(!idsDe(comoA.body.vales).includes(enB.id));
  assert.ok(comoA.body.vales.every((v) => String(v.tiendaId).toUpperCase() === m.tiendaA.id));

  const comoB = await api.get(`/vales/usuario/${m.clienteY.id}`, await m.token(m.tenderoB));
  assert.equal(comoB.status, 200);
  assert.ok(idsDe(comoB.body.vales).includes(enB.id));
  assert.ok(!idsDe(comoB.body.vales).includes(enA.id));

  const comoSu = await api.get(`/vales/usuario/${m.clienteY.id}`, m.tokenSu);
  assert.equal(comoSu.status, 200);
  assert.ok(idsDe(comoSu.body.vales).includes(enA.id) && idsDe(comoSu.body.vales).includes(enB.id));
});

test('RN-22 · anular un abono exige que el abono pertenezca al vale de la ruta (B-11)', async () => {
  const valeA = await valeEn(m.tiendaA, m.clienteX);
  const abonoA = await m.abonar(valeA, 4000, m.tenderoA);
  const valeB = await valeEn(m.tiendaB, m.clienteX);
  const otroValeA = await valeEn(m.tiendaA, m.clienteX);
  const idAbono = abonoA.body.abono.id;
  const tokenA = await m.token(m.tenderoA);
  const tokenB = await m.token(m.tenderoB);

  // El vale de la ruta es de otra tienda (sin acceso del que opera): 403 por acceso.
  const sinAcceso = await api.patch(`/vales/${valeA.id}/abonos/${idAbono}/anular`, {}, tokenB);
  assert.equal(sinAcceso.status, 403, `vale de la ruta de otra tienda: HTTP ${sinAcceso.status}`);

  // Un tendero de otra tienda usa un vale propio en la ruta con el abono de un vale ajeno:
  // tiene acceso al vale de la ruta, pero el abono no le pertenece: 404.
  const ajeno = await api.patch(`/vales/${valeB.id}/abonos/${idAbono}/anular`, {}, tokenB);
  assert.equal(ajeno.status, 404, `abono ajeno por un vale propio: HTTP ${ajeno.status}`);

  // Dentro de la misma tienda, el abono tampoco se anula por la ruta de otro vale: 404.
  const cruzado = await api.patch(`/vales/${otroValeA.id}/abonos/${idAbono}/anular`, {}, tokenA);
  assert.equal(cruzado.status, 404, `abono de otro vale de la misma tienda: HTTP ${cruzado.status}`);

  // En ningun caso cambia el saldo del vale que es dueno del abono, ni el de los demas.
  const leido = await m.leerVale(valeA);
  assert.deepEqual([leido.estado, leido.saldoPendiente, leido.abonos.length, leido.abonos[0].anulado], ['parcial', 6000, 1, false]);
  for (const v of [valeB, otroValeA]) {
    const otro = await m.leerVale(v);
    assert.deepEqual([otro.estado, otro.saldoPendiente, otro.abonos.length], ['pendiente', 10000, 0]);
  }
  await m.conciliar('RN-22 B-11');
});

test('RN-23 · el cliente solo ve sus propios vales', async () => {
  const deX = await valeEn(m.tiendaA, m.clienteX, 1500);
  const deY = await valeEn(m.tiendaA, m.clienteY, 2500);
  const yEnB = await valeEn(m.tiendaB, m.clienteY, 3500);
  const tokenX = await m.token(m.clienteX);

  const propios = await api.get('/vales/mis-vales', tokenX);
  assert.equal(propios.status, 200);
  const ids = idsDe(propios.body.vales);
  assert.ok(ids.includes(deX.id));
  assert.ok(!ids.includes(deY.id) && !ids.includes(yEnB.id));
  assert.ok(propios.body.vales.every((v) => String(v.clienteId).toUpperCase() === m.clienteX.id));

  const intentos = [
    ['detalle del vale de otro cliente', await api.get(`/vales/${deY.id}`, tokenX)],
    ['abonos del vale de otro cliente', await api.get(`/vales/${deY.id}/abonos`, tokenX)],
    ['cartera de una tienda', await api.get(`/vales/tienda/${m.tiendaA.id}`, tokenX)],
    ['vales de otro cliente por su id', await api.get(`/vales/usuario/${m.clienteY.id}`, tokenX)],
  ];
  for (const [que, r] of intentos) {
    assert.equal(r.status, 403, que);
    assert.equal(r.body && r.body.vale, undefined, `${que}: no debe devolver el vale`);
    assert.equal(r.body && r.body.vales, undefined, `${que}: no debe devolver vales`);
  }
});

test('RN-23 · el cliente consulta el detalle y los abonos de su propio vale', async () => {
  const vale = await valeEn(m.tiendaA, m.clienteX, 2200);
  await m.abonar(vale, 200, m.tenderoA);
  const tokenX = await m.token(m.clienteX);
  const detalle = await api.get(`/vales/${vale.id}`, tokenX);
  assert.equal(detalle.status, 200);
  assert.equal(detalle.body.abonos.length, 1);
  const abonos = await api.get(`/vales/${vale.id}/abonos`, tokenX);
  assert.equal(abonos.status, 200);
  assert.equal(abonos.body.abonos.length, 1);
});

test('RN-33 · el vendedor no anula vales ni abonos; el tendero sí', async () => {
  const vale = await valeEn(m.tiendaA, m.clienteX);
  const abono = await m.abonar(vale, 3000, m.vendedorA);
  assert.equal(abono.status, 201);
  const tokenVendedor = await m.token(m.vendedorA);

  const sinAbono = await api.patch(`/vales/${vale.id}/abonos/${abono.body.abono.id}/anular`, {}, tokenVendedor);
  assert.equal(sinAbono.status, 403);
  const sinVale = await api.patch(`/vales/${vale.id}/anular`, {}, tokenVendedor);
  assert.equal(sinVale.status, 403);
  const intacto = await m.leerVale(vale);
  assert.deepEqual([intacto.estado, intacto.saldoPendiente, intacto.abonos[0].anulado], ['parcial', 7000, false]);

  const tokenTendero = await m.token(m.tenderoA);
  const conAbono = await api.patch(`/vales/${vale.id}/abonos/${abono.body.abono.id}/anular`, {}, tokenTendero);
  assert.equal(conAbono.status, 200);
  assert.equal(conAbono.body.vale.saldoPendiente, 10000);
  const conVale = await api.patch(`/vales/${vale.id}/anular`, {}, tokenTendero);
  assert.equal(conVale.status, 200);
  assert.equal((await m.leerVale(vale)).estado, 'anulado');
  await m.conciliar('RN-33');
});

test('RN-33 · el cliente no registra abonos ni anula vales o abonos', async () => {
  const vale = await valeEn(m.tiendaA, m.clienteX);
  const abono = await m.abonar(vale, 1000, m.tenderoA);
  const tokenX = await m.token(m.clienteX);
  assert.equal((await api.post(`/vales/${vale.id}/abonos`, { monto: 500 }, tokenX)).status, 403);
  assert.equal((await api.patch(`/vales/${vale.id}/anular`, {}, tokenX)).status, 403);
  assert.equal((await api.patch(`/vales/${vale.id}/abonos/${abono.body.abono.id}/anular`, {}, tokenX)).status, 403);
  const intacto = await m.leerVale(vale);
  assert.deepEqual([intacto.estado, intacto.saldoPendiente, intacto.abonos.length], ['parcial', 9000, 1]);
  await m.conciliar('RN-33 cliente');
});

test('RN-04 · al cierre del archivo, saldos y cartera concilian', async () => {
  await m.conciliar('cierre de 04-acceso');
});
