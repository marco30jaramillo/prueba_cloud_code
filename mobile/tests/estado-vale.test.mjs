/**
 * Estado visible del vale y «En mora» calculado (RN-08; docs/marca.md). Sin navegador ni servidor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estaEnMora, estadoVisible } from '../lib/estado-vale.ts';

const AHORA = new Date('2026-10-12T12:00:00Z');

test('RN-08 · un vale pendiente o parcial con fecha vencida está en mora', () => {
  assert.equal(estaEnMora('pendiente', '2026-10-01', AHORA), true);
  assert.equal(estaEnMora('parcial', '2026-10-11T00:00:00Z', AHORA), true);
});

test('RN-08 · sin fecha de vencimiento no hay plazo ni mora', () => {
  assert.equal(estaEnMora('pendiente', null, AHORA), false);
  assert.equal(estaEnMora('parcial', undefined, AHORA), false);
  assert.equal(estaEnMora('parcial', 'no es fecha', AHORA), false);
});

test('RN-08 · fecha futura, pagado y anulado no están en mora', () => {
  assert.equal(estaEnMora('pendiente', '2026-12-01', AHORA), false);
  assert.equal(estaEnMora('pagado', '2026-01-01', AHORA), false);
  assert.equal(estaEnMora('anulado', '2026-01-01', AHORA), false);
});

test('marca · «En mora» reemplaza a Pendiente y a Parcial: se muestra un solo estado', () => {
  assert.equal(estadoVisible('pendiente', '2026-10-01', AHORA), 'mora');
  assert.equal(estadoVisible('parcial', '2026-10-01', AHORA), 'mora');
  assert.equal(estadoVisible('pendiente', '2026-12-01', AHORA), 'pendiente');
  assert.equal(estadoVisible('parcial', null, AHORA), 'parcial');
  assert.equal(estadoVisible('pagado', '2026-01-01', AHORA), 'pagado');
  assert.equal(estadoVisible('anulado', '2026-01-01', AHORA), 'anulado');
});
