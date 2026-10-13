/**
 * Las copias de marca dentro de `frontend/` deben ser idénticas a su fuente en `Mi Valecito/marca/`
 * (requerimiento 008, tarea 5b). Si falla: corre `npm run marca:sincronizar`.
 * Sin navegador ni servidor; se ejecuta con `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FRONTEND, MARCA, listaCopias, generarDatos, RUTA_DATOS } from '../scripts/sincronizar-marca.mjs';

test('008 · la fuente de marca existe y trae fuentes, logo, favicon e iconos', () => {
  assert.ok(fs.existsSync(MARCA), `no existe ${MARCA}`);
  const copias = listaCopias();
  assert.ok(copias.filter(([o]) => o.endsWith('.woff2')).length === 3, 'faltan pesos de la fuente');
  assert.ok(copias.some(([o]) => o.endsWith('OFL.txt')), 'falta la licencia OFL');
  assert.ok(copias.filter(([o]) => o.startsWith('iconos/') && o.endsWith('.svg')).length >= 38, 'faltan iconos');
  assert.ok(copias.some(([o]) => o.endsWith('favicon.ico')), 'falta el favicon');
});

test('008 · cada copia de marca en frontend/ es idéntica a su fuente', () => {
  for (const [origen, destino] of listaCopias()) {
    const copia = path.join(FRONTEND, destino);
    assert.ok(fs.existsSync(copia), `falta ${destino}: corre npm run marca:sincronizar`);
    const a = fs.readFileSync(path.join(MARCA, origen));
    const b = fs.readFileSync(copia);
    assert.ok(a.equals(b), `${destino} difiere de marca/${origen}: corre npm run marca:sincronizar`);
  }
});

test('008 · lib/marca-datos.ts corresponde a la fuente de marca', () => {
  const actual = fs.readFileSync(path.join(FRONTEND, RUTA_DATOS), 'utf8');
  assert.equal(actual, generarDatos(), `${RUTA_DATOS} está desactualizado: corre npm run marca:sincronizar`);
});

test('008 · no hay archivos de más en las carpetas de copias', () => {
  const esperados = new Set(listaCopias().map(([, d]) => d));
  for (const carpeta of ['assets/marca/fuentes', 'assets/marca/logo', 'assets/marca/iconos', 'public/marca']) {
    for (const f of fs.readdirSync(path.join(FRONTEND, carpeta))) {
      assert.ok(esperados.has(`${carpeta}/${f}`), `${carpeta}/${f} no viene de marca/`);
    }
  }
});

test('008 · ningún recurso de marca de la web pide fuentes ni imágenes a un tercero', () => {
  const datos = fs.readFileSync(path.join(FRONTEND, RUTA_DATOS), 'utf8');
  assert.doesNotMatch(datos, /https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
  for (const [, destino] of listaCopias().filter(([o]) => o.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(FRONTEND, destino), 'utf8');
    assert.doesNotMatch(svg, /<text|<image|href=|@import|https?:\/\/(?!www\.w3\.org\/2000\/svg)/, destino);
  }
});
