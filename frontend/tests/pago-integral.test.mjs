/**
 * Pruebas sin navegador ni servidor de la lógica del pago integral (`lib/pago-integral.ts`).
 * El backend decide el resultado definitivo (cubierto por `npm run test:db` en `backend/`);
 * aquí se verifica lo que la web anticipa y la validación previa al envío.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  valesCobrables, distribuirPago, validarPago, totalSaldos,
} from '../lib/pago-integral.ts';

const vale = (id, saldoPendiente, fechaVale, estado = 'pendiente') => ({ id, saldoPendiente, fechaVale, estado });

const VIEJO = vale('viejo', 30000, '2026-01-10');
const MEDIO = vale('medio', '20000', '2026-02-10', 'parcial');
const NUEVO = vale('nuevo', 50000, '2026-03-10');

test('RN-11 · solo cuentan los vales pendientes o parciales, del más antiguo al más reciente', () => {
  const lista = [
    NUEVO,
    vale('pagado', 0, '2026-01-01', 'pagado'),
    VIEJO,
    vale('anulado', 10000, '2026-01-02', 'anulado'),
    MEDIO,
  ];
  assert.deepEqual(valesCobrables(lista).map((v) => v.id), ['viejo', 'medio', 'nuevo']);
});

test('RN-11 · el pago se reparte del más antiguo al más reciente hasta agotarlo', () => {
  const r = distribuirPago(40000, [VIEJO, MEDIO, NUEVO]);
  assert.deepEqual(r.map((x) => x.aplicado), [30000, 10000, 0]);
  assert.deepEqual(r.map((x) => x.quedaPendiente), [0, 10000, 50000]);
});

test('RN-04 · lo aplicado nunca supera el saldo del vale ni el monto del pago', () => {
  const r = distribuirPago(100000, [VIEJO, MEDIO, NUEVO]);
  r.forEach((x) => {
    assert.ok(x.aplicado <= Number(x.vale.saldoPendiente));
    assert.ok(x.quedaPendiente >= 0);
  });
  assert.equal(r.reduce((s, x) => s + x.aplicado, 0), 100000);
});

test('RN-04 · el reparto conserva la suma: aplicado + queda pendiente = saldo de cada vale', () => {
  const r = distribuirPago(35000, [VIEJO, MEDIO, NUEVO]);
  r.forEach((x) => assert.equal(x.aplicado + x.quedaPendiente, Number(x.vale.saldoPendiente)));
});

test('RN-04 · un monto en cero o negativo no genera reparto', () => {
  assert.deepEqual(distribuirPago(0, [VIEJO]), []);
  assert.deepEqual(distribuirPago(-1000, [VIEJO]), []);
  assert.deepEqual(distribuirPago(5000, []), []);
});

test('RN-04 · la validación rechaza monto cero o negativo antes de enviar', () => {
  assert.equal(validarPago(0, [VIEJO]).ok, false);
  assert.equal(validarPago(0, [VIEJO]).motivo, 'monto-invalido');
  assert.equal(validarPago(-5, [VIEJO]).motivo, 'monto-invalido');
});

test('RN-09 · la validación rechaza un pago mayor al saldo total seleccionado', () => {
  const r = validarPago(50001, [VIEJO, MEDIO]);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'excede-total');
  assert.equal(r.total, 50000);
});

test('RN-09 · un pago igual al saldo total seleccionado es válido (liquida los vales)', () => {
  assert.deepEqual(validarPago(50000, [VIEJO, MEDIO]), { ok: true });
});

test('RN-11 · la validación exige al menos un vale seleccionado', () => {
  assert.equal(validarPago(1000, []).motivo, 'sin-seleccion');
});

test('RN-04 · los saldos pueden llegar como texto desde la API y se suman como número', () => {
  assert.equal(totalSaldos([vale('a', '1500.50', '2026-01-01'), vale('b', 500, '2026-01-02')]), 2000.5);
});
