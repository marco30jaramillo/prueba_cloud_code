/**
 * Pruebas sin navegador de la URL de las fotos (`lib/image-url.ts`). Se ejecutan en Node, es
 * decir, por la rama de «lado del servidor» (sin `window`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getImageUrl } from '../lib/image-url.ts';

test('UI-FOTO · sin foto o con la foto por defecto del servidor se usa el avatar local', () => {
  assert.equal(getImageUrl(undefined), '/default-avatar.svg');
  assert.equal(getImageUrl(''), '/default-avatar.svg');
  assert.equal(getImageUrl('/datos/default/default-avatar.svg'), '/default-avatar.svg');
});

test('UI-FOTO · una URL absoluta se devuelve tal cual', () => {
  assert.equal(getImageUrl('https://ejemplo.example/foto.png'), 'https://ejemplo.example/foto.png');
});

test('UI-FOTO · una ruta relativa se completa con la URL del backend configurada', () => {
  const anterior = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = 'https://api.ejemplo.example';
  try {
    assert.equal(getImageUrl('/datos/uploads/a.png'), 'https://api.ejemplo.example/datos/uploads/a.png');
  } finally {
    if (anterior === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = anterior;
  }
});
