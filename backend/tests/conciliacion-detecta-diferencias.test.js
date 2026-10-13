/**
 * La conciliación de saldos y cartera detecta una diferencia fabricada (CA-7).
 * Sin base de datos: opera sobre filas construidas a mano. La misma verificación sobre la base
 * de pruebas, con una alteración real, está en `tests-db/05-conciliacion.dbtest.js`.
 *
 * Req. 006.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { conciliar, afirmarConciliado } = require('../tests-db/helpers/conciliacion');

const T1 = 'AAAAAAAA-0000-4000-8000-000000000001';
const T2 = 'AAAAAAAA-0000-4000-8000-000000000002';

/** Dos tiendas, tres vales y abonos coherentes: saldo = monto − Σ abonos no anulados. */
function datosCoherentes() {
  return {
    vales: [
      { id: 'V1', tiendaId: T1, montoTotal: '10000.00', saldoPendiente: '6000.00', estado: 'parcial' },
      { id: 'V2', tiendaId: T1, montoTotal: '5000.00', saldoPendiente: '0.00', estado: 'pagado' },
      { id: 'V3', tiendaId: T2, montoTotal: '8000.00', saldoPendiente: '8000.00', estado: 'pendiente' },
      { id: 'V4', tiendaId: T2, montoTotal: '2000.00', saldoPendiente: '2000.00', estado: 'anulado' },
    ],
    abonos: [
      { valeId: 'v1', monto: '4000.00', anulado: false },
      { valeId: 'V1', monto: '1500.00', anulado: true },
      { valeId: 'V2', monto: '5000.00', anulado: 0 },
    ],
  };
}
const apiCoherente = () => ({
  saldosPorVale: { V1: 6000, V2: 0, V3: 8000, V4: 2000 },
  carteraPorTienda: { [T1]: 6000, [T2]: 8000 },
  valesPorTienda: { [T1]: ['V1', 'V2'], [T2]: ['V3', 'V4'] },
});

test('CA-7 · datos coherentes no producen diferencias', () => {
  assert.deepEqual(conciliar(datosCoherentes(), apiCoherente()), []);
  assert.doesNotThrow(() => afirmarConciliado(datosCoherentes(), apiCoherente()));
});

test('CA-7 · un abono anulado no cuenta y uno vigente sí (RN-04, RN-07)', () => {
  const base = datosCoherentes();
  base.abonos[1].anulado = false; // el abono de 1500 pasa a vigente: el saldo esperado baja
  const diferencias = conciliar(base, apiCoherente());
  assert.ok(diferencias.some((d) => /vale V1: saldo en base 6000\.00 ≠ monto − abonos 4500\.00/.test(d)), diferencias.join('\n'));
});

test('CA-7 · un saldo distinto de monto − abonos en la base se detecta y hace fallar', () => {
  const base = datosCoherentes();
  base.vales[0].saldoPendiente = '5999.99';
  const diferencias = conciliar(base, apiCoherente());
  assert.ok(diferencias.some((d) => d.startsWith('vale V1: saldo en base')), diferencias.join('\n'));
  assert.throws(() => afirmarConciliado(base, apiCoherente(), 'prueba'), /diferencia/);
});

test('CA-7 · un saldo distinto en la respuesta de la API se detecta', () => {
  const api = apiCoherente();
  api.saldosPorVale.V3 = 7999;
  const diferencias = conciliar(datosCoherentes(), api);
  assert.ok(diferencias.some((d) => /vale V3: saldo en la API 7999\.00/.test(d)), diferencias.join('\n'));
});

test('CA-7 · una cartera de la API distinta de la suma de saldos se detecta', () => {
  const api = apiCoherente();
  api.carteraPorTienda[T1] = 6500;
  const diferencias = conciliar(datosCoherentes(), api);
  assert.ok(diferencias.some((d) => /cartera en la API 6500\.00 ≠ Σ saldos esperados 6000\.00/.test(d)), diferencias.join('\n'));
});

test('CA-7 · una cartera en la base que no suma los saldos esperados se detecta', () => {
  // El estado cuadra con el saldo registrado pero el saldo registrado no cuadra con los abonos.
  const base = datosCoherentes();
  base.vales[2].saldoPendiente = '7000.00';
  base.vales[2].estado = 'parcial';
  const diferencias = conciliar(base, {});
  assert.ok(diferencias.some((d) => d.startsWith('vale V3: saldo en base')), diferencias.join('\n'));
  assert.ok(diferencias.some((d) => /tienda .*0002: cartera en base 7000\.00 ≠ Σ saldos esperados 8000\.00/.test(d)), diferencias.join('\n'));
});

test('CA-7 · un saldo fuera de [0, monto] y un estado incoherente se detectan (RN-04, RN-05)', () => {
  const base = datosCoherentes();
  base.abonos.push({ valeId: 'V2', monto: '1.00', anulado: false }); // sobreabono: esperado −1
  base.vales[2].estado = 'pagado'; // con saldo 8000
  const diferencias = conciliar(base, {});
  assert.ok(diferencias.some((d) => /vale V2: saldo esperado -1\.00 fuera de \[0, 5000\.00\]/.test(d)), diferencias.join('\n'));
  assert.ok(diferencias.some((d) => /vale V3: estado "pagado" ≠ "pendiente"/.test(d)), diferencias.join('\n'));
});

test('CA-7 · un vale que la API no lista, o que lista sin existir, se detecta', () => {
  const api = apiCoherente();
  api.valesPorTienda[T1] = ['V1', 'V9'];
  const diferencias = conciliar(datosCoherentes(), api);
  assert.ok(diferencias.some((d) => /vale V2: está en la base y la API no lo lista/.test(d)), diferencias.join('\n'));
  assert.ok(diferencias.some((d) => /vale V9: la API lo lista pero no existe/.test(d)), diferencias.join('\n'));
});

test('CA-7 · la comparación es en centavos y no depende de la coma flotante', () => {
  const base = {
    vales: [{ id: 'V1', tiendaId: T1, montoTotal: '0.30', saldoPendiente: '0.10', estado: 'parcial' }],
    abonos: [{ valeId: 'V1', monto: '0.10', anulado: false }, { valeId: 'V1', monto: '0.10', anulado: false }],
  };
  assert.deepEqual(conciliar(base, { saldosPorVale: { V1: 0.1 }, carteraPorTienda: { [T1]: 0.1 } }), []);
});
