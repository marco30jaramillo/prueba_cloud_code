/**
 * El lector de SVG de marca solo deja pasar etiquetas y atributos de una lista cerrada (sin HTML
 * inyectado). Sin navegador ni servidor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearSvg } from '../lib/marca-svg.ts';
import { ICONOS, LOGOS } from '../lib/marca-datos.ts';

test('marca · cada icono tiene al menos un nodo dibujable y hasta 4', () => {
  const nombres = Object.keys(ICONOS);
  assert.ok(nombres.length >= 38);
  for (const n of nombres) {
    const nodos = parsearSvg(ICONOS[n]);
    assert.ok(nodos.length >= 1 && nodos.length <= 4, `${n}: ${nodos.length} nodos`);
  }
});

test('marca · el logo se lee como svg con sus grupos y sin texto', () => {
  for (const [variante, svg] of Object.entries(LOGOS)) {
    const [raiz] = parsearSvg(svg);
    assert.equal(raiz.etiqueta, 'svg', variante);
    assert.ok(raiz.atributos.viewBox, variante);
    assert.ok(raiz.hijos.length >= 1, variante);
    assert.ok(raiz.hijos.every((h) => h.etiqueta !== 'title'), variante);
  }
});

test('marca · el lector descarta etiquetas, atributos y valores fuera de la lista', () => {
  const nodos = parsearSvg('<script>alert(1)</script><path d="M0 0" onclick="x()" fill="url(#a)"/><image href="https://x/y.png"/><path d="M1 1" stroke="red"/>');
  assert.equal(nodos.length, 2);
  assert.deepEqual(nodos[0].atributos, { d: 'M0 0' });
  assert.deepEqual(nodos[1].atributos, { d: 'M1 1', stroke: 'red' });
});
