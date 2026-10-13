// mobile/scripts/perfil-eas.mjs: el pipeline toma de aquí canal, ambiente de EAS y URLs de cada perfil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolverPerfil, variablesDelPerfil } from '../scripts/perfil-eas.mjs';

const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));

test('cada perfil de eas.json resuelve canal, ambiente y URLs https', () => {
  for (const nombre of Object.keys(eas.build)) {
    const v = variablesDelPerfil(eas, nombre);
    assert.match(v.API_URL, /^https:\/\//, nombre);
    assert.match(v.WEB_URL, /^https:\/\//, nombre);
  }
});

test('QA y producción quedan en canales y ambientes de EAS distintos', () => {
  assert.deepEqual(
    [variablesDelPerfil(eas, 'qa').CANAL, variablesDelPerfil(eas, 'qa').AMBIENTE_EAS],
    ['qa', 'preview']
  );
  assert.deepEqual(
    [variablesDelPerfil(eas, 'production').CANAL, variablesDelPerfil(eas, 'production').AMBIENTE_EAS],
    ['production', 'production']
  );
});

test('production-apk hereda de production y genera APK', () => {
  assert.deepEqual(variablesDelPerfil(eas, 'production-apk'), variablesDelPerfil(eas, 'production'));
  assert.equal(resolverPerfil(eas, 'production-apk').android.buildType, 'apk');
});

test('el env se mezcla clave a clave y se detectan perfiles inexistentes o circulares', () => {
  const prueba = {
    build: {
      base: { channel: 'c', environment: 'preview', env: { APP_VARIANT: 'qa', API_URL: 'https://a', WEB_URL: 'https://w' } },
      hijo: { extends: 'base', env: { API_URL: 'https://b' } },
      a: { extends: 'b' },
      b: { extends: 'a' },
    },
  };
  assert.equal(variablesDelPerfil(prueba, 'hijo').API_URL, 'https://b');
  assert.equal(variablesDelPerfil(prueba, 'hijo').WEB_URL, 'https://w');
  assert.throws(() => resolverPerfil(prueba, 'nada'), /no existe/);
  assert.throws(() => resolverPerfil(prueba, 'a'), /circular/);
});
