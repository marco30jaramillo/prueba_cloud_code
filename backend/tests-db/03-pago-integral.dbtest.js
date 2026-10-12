/**
 * Pago integral (RN-03, RN-11, RN-12, RN-22; defecto conocido B-03). Pruebas por HTTP contra
 * el backend de pruebas y la base `MiValecito_Test` (ver `npm run test:db`).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api } = require('./helpers/api');
const { crearMundo } = require('./helpers/fixture');
const bd = require('./helpers/baseDatos');

let m;
before(async () => { m = await crearMundo(); });
after(async () => { await bd.cerrar(); });

async function pagoIntegral({ cliente, monto, valeIds, quien }) {
  return api.post('/vales/pago-integral', {
    clienteId: cliente.id, monto, valeIds: valeIds.map((v) => v.id),
  }, quien === 'su' ? m.tokenSu : await m.token(quien));
}

const vale = (tienda, cliente, monto) => m.crearVale({ tienda, cliente, monto });

test('RN-03 · un pago integral de monto cero o negativo se rechaza y no aplica nada', async () => {
  const v = await vale(m.tiendaA, m.clienteX, 10000);
  for (const monto of [0, -1, -4000]) {
    const r = await pagoIntegral({ cliente: m.clienteX, monto, valeIds: [v], quien: m.tenderoA });
    assert.equal(r.status, 400, `monto ${monto}`);
  }
  const leido = await m.leerVale(v);
  assert.equal(leido.saldoPendiente, 10000);
  assert.equal(leido.abonos.length, 0);
  await m.conciliar('RN-03 pago integral');
});

test('RN-11 · el pago se reparte del vale más antiguo al más reciente, sin importar el orden pedido', async () => {
  const v1 = await vale(m.tiendaA, m.clienteX, 10000);
  const v2 = await vale(m.tiendaA, m.clienteX, 20000);
  const v3 = await vale(m.tiendaA, m.clienteX, 30000);

  const r = await pagoIntegral({ cliente: m.clienteX, monto: 25000, valeIds: [v3, v1, v2], quien: m.tenderoA });
  assert.equal(r.status, 201);
  assert.equal(r.body.montoAplicado, 25000);
  assert.equal(r.body.montoNoAplicado, 0);
  assert.equal(r.body.abonos.length, 2);

  const [l1, l2, l3] = [await m.leerVale(v1), await m.leerVale(v2), await m.leerVale(v3)];
  assert.deepEqual([l1.estado, l1.saldoPendiente], ['pagado', 0]);
  assert.deepEqual([l2.estado, l2.saldoPendiente], ['parcial', 5000]);
  assert.deepEqual([l3.estado, l3.saldoPendiente], ['pendiente', 30000]);
  await m.conciliar('RN-11 reparto');
});

test('RN-11 · un pago mayor a lo que se debe cubre todos los saldos y solo aplica lo que se debe', async () => {
  const v1 = await vale(m.tiendaA, m.clienteY, 10000);
  const v2 = await vale(m.tiendaA, m.clienteY, 20000);
  const r = await pagoIntegral({ cliente: m.clienteY, monto: 35000, valeIds: [v1, v2], quien: m.tenderoA });
  assert.equal(r.status, 201);
  assert.equal(r.body.montoAplicado, 30000);
  for (const v of [v1, v2]) {
    const l = await m.leerVale(v);
    assert.deepEqual([l.estado, l.saldoPendiente], ['pagado', 0]);
  }
  await m.conciliar('RN-11 excedente');
});

test('RN-12 · el excedente de un pago mayor a lo que se debe queda como saldo a favor, no como monto no aplicado', {
  todo: 'Brecha «RN-12, saldo a favor» (docs/reglas-negocio.md): hoy el excedente de un pago mayor a la deuda solo se informa como montoNoAplicado',
}, async () => {
  assert.fail('RN-12 sin implementar: hoy el excedente (5000) solo se devuelve como montoNoAplicado y no se registra');
});

test('RN-11 · solo cuentan los vales pendientes o parciales; pagados y anulados no reciben abonos', async () => {
  const pagado = await vale(m.tiendaA, m.clienteX, 4000);
  await m.abonar(pagado, 4000, m.tenderoA);
  const anulado = await vale(m.tiendaA, m.clienteX, 6000);
  await api.patch(`/vales/${anulado.id}/anular`, {}, await m.token(m.tenderoA));
  const abierto = await vale(m.tiendaA, m.clienteX, 5000);

  const r = await pagoIntegral({ cliente: m.clienteX, monto: 20000, valeIds: [pagado, anulado, abierto], quien: m.tenderoA });
  assert.equal(r.status, 201);
  assert.equal(r.body.montoAplicado, 5000);
  assert.equal((await m.leerVale(pagado)).abonos.length, 1);
  assert.equal((await m.leerVale(anulado)).abonos.length, 0);
  assert.equal((await m.leerVale(anulado)).estado, 'anulado');
  assert.equal((await m.leerVale(abierto)).estado, 'pagado');
  await m.conciliar('RN-11 estados');
});

test('RN-12 · lo que sobra de un pago sobre vales pagados o anulados queda como saldo a favor', {
  todo: 'Brecha «RN-12, saldo a favor» (docs/reglas-negocio.md): caso de vales ya pagados o anulados, el sobrante tampoco se registra',
}, async () => {
  assert.fail('RN-12 sin implementar: hoy los 15000 sobrantes solo se devuelven como montoNoAplicado y no se registran');
});

test('RN-11 · sin ningún vale válido el pago se rechaza y no aplica nada', async () => {
  const pagado = await vale(m.tiendaA, m.clienteX, 3000);
  await m.abonar(pagado, 3000, m.tenderoA);
  const r = await pagoIntegral({ cliente: m.clienteX, monto: 1000, valeIds: [pagado], quien: m.tenderoA });
  assert.equal(r.status, 400);
  assert.equal((await m.leerVale(pagado)).abonos.length, 1);
  await m.conciliar('RN-11 sin vales');
});

test('RN-11 · el pago de un cliente no se aplica a vales de otro cliente', async () => {
  const deX = await vale(m.tiendaA, m.clienteX, 8000);
  const deY = await vale(m.tiendaA, m.clienteY, 8000);
  const r = await pagoIntegral({ cliente: m.clienteX, monto: 8000, valeIds: [deY, deX], quien: m.tenderoA });
  assert.equal(r.status, 201);
  assert.equal(r.body.montoAplicado, 8000);
  assert.equal((await m.leerVale(deX)).estado, 'pagado');
  const ajeno = await m.leerVale(deY);
  assert.deepEqual([ajeno.estado, ajeno.saldoPendiente, ajeno.abonos.length], ['pendiente', 8000, 0]);
  await m.conciliar('RN-11 otro cliente');
});

test('RN-22 · el pago integral solo aplica a vales de tiendas a las que el cobrador pertenece', async () => {
  const enA = await vale(m.tiendaA, m.clienteX, 6000);
  const enB = await vale(m.tiendaB, m.clienteX, 9000);

  const propio = await pagoIntegral({ cliente: m.clienteX, monto: 15000, valeIds: [enA, enB], quien: m.tenderoA });
  assert.equal(propio.status, 201);
  assert.equal(propio.body.montoAplicado, 6000);
  const ajeno = await m.leerVale(enB);
  assert.deepEqual([ajeno.estado, ajeno.saldoPendiente, ajeno.abonos.length], ['pendiente', 9000, 0]);

  // El tendero de la otra tienda tampoco puede cobrar el vale de A, ya pagado y ajeno.
  const sinAcceso = await pagoIntegral({ cliente: m.clienteX, monto: 1000, valeIds: [enA], quien: m.tenderoB });
  assert.equal(sinAcceso.status, 400);

  // Superusuario y administrador ven todas las tiendas (RN-22): el superusuario sí cobra el vale de B.
  const su = await pagoIntegral({ cliente: m.clienteX, monto: 9000, valeIds: [enB], quien: 'su' });
  assert.equal(su.status, 201);
  assert.equal((await m.leerVale(enB)).estado, 'pagado');
  await m.conciliar('RN-22 pago integral');
});

test('B-03 · el pago integral acepta el id del cliente tal como lo devuelve su creación', {
  todo: 'B-03: los identificadores se comparan distinguiendo mayúsculas; con el id en minúsculas responde 400',
}, async () => {
  const v = await vale(m.tiendaA, m.clienteY, 5000);
  const r = await api.post('/vales/pago-integral', {
    clienteId: m.clienteY.idOriginal, monto: 5000, valeIds: [v.id],
  }, await m.token(m.tenderoA));
  assert.equal(r.status, 201);
});

test('RN-12 · el saldo a favor se registra por cliente y por tienda, sin mezclarse con otras tiendas', {
  todo: 'Brecha «RN-12, saldo a favor» (docs/reglas-negocio.md): falta el registro por cliente y tienda; a cuál tienda queda en pagos de varias tiendas es pregunta abierta del mismo documento',
}, async () => {
  assert.fail('RN-12 sin implementar: el sistema no tiene dónde registrar el saldo a favor por cliente y tienda');
});

test('RN-04 · al cierre del archivo, saldos y cartera concilian', async () => {
  await m.conciliar('cierre de 03-pago-integral');
});
