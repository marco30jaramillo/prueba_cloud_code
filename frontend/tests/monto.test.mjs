/**
 * Pruebas sin navegador ni servidor de la lógica del campo de monto (`lib/monto.ts`).
 * Se ejecutan con `npm test` en `frontend/` (lo mismo que corre el despliegue a QA).
 * Cada nombre empieza por la regla de negocio que verifica.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soloDigitos, formatearMonto } from '../lib/monto.ts';

test('RN-04 · el campo de monto descarta signo negativo, decimales y letras: solo llegan dígitos', () => {
  assert.equal(soloDigitos('-5000'), '5000');
  assert.equal(soloDigitos('12,50'), '1250');
  assert.equal(soloDigitos('$ 25.000'), '25000');
  assert.equal(soloDigitos('abc'), '');
});

test('RN-04 · un monto en cero se conserva como cero (el rechazo lo hace la validación, no el formato)', () => {
  assert.equal(soloDigitos('0'), '0');
  assert.equal(formatearMonto('0'), '$ 0');
});

test('RN-04 · el monto se muestra en pesos enteros con separador de miles', () => {
  assert.equal(formatearMonto('25000'), '$ 25.000');
  assert.equal(formatearMonto('1250000'), '$ 1.250.000');
});

test('RN-04 · un campo vacío se muestra vacío', () => {
  assert.equal(formatearMonto(''), '');
});
