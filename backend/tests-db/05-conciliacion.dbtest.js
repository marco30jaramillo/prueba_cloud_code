/**
 * La conciliación detecta diferencias (CA-7). Sobre la base de pruebas se altera, a propósito
 * y de forma temporal, un saldo y un abono (la cuenta de la aplicación puede escribir datos);
 * la conciliación debe fallar con la alteración y pasar al restaurarla.
 *
 * La misma verificación sin base, sobre datos fabricados, está en
 * `tests/conciliacion-detecta-diferencias.test.js`.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api } = require('./helpers/api');
const { crearMundo } = require('./helpers/fixture');
const bd = require('./helpers/baseDatos');

let m;
before(async () => { m = await crearMundo(); });
after(async () => { await bd.cerrar(); });

test('CA-7 · la conciliación cuadra con vales, abonos y anulaciones mezclados', async () => {
  const v1 = await m.crearVale({ tienda: m.tiendaA, cliente: m.clienteX, monto: 12000 });
  const v2 = await m.crearVale({ tienda: m.tiendaB, cliente: m.clienteY, monto: 8000 });
  const a = await m.abonar(v1, 5000, m.tenderoA);
  await m.abonar(v1, 7000, m.vendedorA);
  await api.patch(`/vales/${v1.id}/abonos/${a.body.abono.id}/anular`, {}, await m.token(m.tenderoA));
  await m.abonar(v2, 3000, m.tenderoB);
  await m.conciliar('CA-7 mezcla');
});

test('CA-7 · un saldo alterado en la base hace fallar la conciliación', async () => {
  const vale = await m.crearVale({ tienda: m.tiendaA, cliente: m.clienteX, monto: 10000 });
  await m.abonar(vale, 4000, m.tenderoA);
  await m.conciliar('antes de alterar');

  const pool = await bd.abrir();
  const alterar = (delta) => pool.request()
    .input('id', bd.sql.UniqueIdentifier, vale.id)
    .input('delta', bd.sql.Decimal(12, 2), delta)
    .query('UPDATE dbo.vales SET saldoPendiente = saldoPendiente + @delta WHERE id = @id');
  await alterar(-500);
  try {
    await assert.rejects(() => m.conciliar('saldo alterado'), /diferencia/);
  } finally {
    await alterar(500);
  }
  await m.conciliar('saldo restaurado');
});

test('CA-7 · un abono alterado en la base hace fallar la conciliación', async () => {
  const vale = await m.crearVale({ tienda: m.tiendaB, cliente: m.clienteY, monto: 6000 });
  const abono = await m.abonar(vale, 2000, m.tenderoB);
  await m.conciliar('antes de alterar');

  const pool = await bd.abrir();
  const alterar = (delta) => pool.request()
    .input('id', bd.sql.UniqueIdentifier, abono.body.abono.id)
    .input('delta', bd.sql.Decimal(12, 2), delta)
    .query('UPDATE dbo.abonos SET monto = monto + @delta WHERE id = @id');
  await alterar(300);
  try {
    await assert.rejects(() => m.conciliar('abono alterado'), /diferencia/);
  } finally {
    await alterar(-300);
  }
  await m.conciliar('abono restaurado');
});
