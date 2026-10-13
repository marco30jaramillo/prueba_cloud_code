// Fechas de calendario del formulario de vales: lib/fechas.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inicioDelDia, unMesDespues, aISO, noAntesDeHoy } from '../lib/fechas.ts';

const dia = (a, m, d, h = 0) => new Date(a, m - 1, d, h);

test('vencimiento por defecto: el mismo día del mes siguiente', () => {
  assert.equal(aISO(unMesDespues(dia(2026, 10, 13, 15))), '2026-11-13');
  assert.equal(aISO(unMesDespues(dia(2026, 12, 5))), '2027-01-05');
});

test('si el mes siguiente es más corto, cae en su último día', () => {
  assert.equal(aISO(unMesDespues(dia(2027, 1, 31))), '2027-02-28');
  assert.equal(aISO(unMesDespues(dia(2028, 1, 31))), '2028-02-29');
  assert.equal(aISO(unMesDespues(dia(2026, 3, 31))), '2026-04-30');
});

test('aISO usa la fecha local aunque sea de noche (no salta al día siguiente por UTC)', () => {
  assert.equal(aISO(dia(2026, 10, 13, 23)), '2026-10-13');
});

test('no se permiten fechas anteriores a hoy', () => {
  const hoy = dia(2026, 10, 13, 18);
  assert.equal(aISO(noAntesDeHoy(dia(2026, 10, 1), hoy)), '2026-10-13');
  assert.equal(aISO(noAntesDeHoy(dia(2026, 10, 13, 2), hoy)), '2026-10-13');
  assert.equal(aISO(noAntesDeHoy(dia(2026, 12, 24), hoy)), '2026-12-24');
});

test('inicioDelDia quita la hora', () => {
  assert.equal(inicioDelDia(dia(2026, 10, 13, 17)).getHours(), 0);
});
