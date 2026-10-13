/**
 * Conciliación de cierre de la suite (CA-7): corre al final (el corredor ordena los archivos por
 * nombre y los ejecuta de uno en uno) y revisa TODA la base de pruebas, no solo el mundo de un
 * archivo: saldo = monto − abonos no anulados por vale, y cartera = Σ saldos vigentes por
 * tienda, contra la base y contra lo que responde la API.
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, iniciarSesion, esperarEstado } = require('./helpers/api');
const bd = require('./helpers/baseDatos');
const { afirmarConciliado } = require('./helpers/conciliacion');

after(async () => { await bd.cerrar(); });

test('CA-7 · cierre de la suite: saldo contra abonos y cartera contra saldos en toda la base', async () => {
  const token = await iniciarSesion(process.env.MV_TEST_SU_EMAIL, process.env.MV_TEST_SU_PASSWORD);
  const tiendas = await api.get('/tiendas', token);
  esperarEstado(tiendas, 200, 'listar tiendas');

  const base = await bd.leerValesYAbonos();
  assert.ok(base.vales.length > 0 && base.abonos.length > 0, 'la suite debió dejar vales y abonos');

  const saldosPorVale = {};
  const carteraPorTienda = {};
  const valesPorTienda = {};
  for (const tienda of tiendas.body.tiendas) {
    const r = await api.get(`/vales/tienda/${tienda.id}`, token);
    esperarEstado(r, 200, 'listar cartera de la tienda');
    carteraPorTienda[tienda.id] = r.body.totalPendiente;
    valesPorTienda[tienda.id] = r.body.vales.map((v) => v.id);
    for (const v of r.body.vales) saldosPorVale[v.id] = v.saldoPendiente;
  }
  afirmarConciliado(base, { saldosPorVale, carteraPorTienda, valesPorTienda }, 'cierre de la suite');
});
