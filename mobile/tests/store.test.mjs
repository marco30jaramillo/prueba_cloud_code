// Lógica de sesión y utilidades del móvil: lib/store.ts
// Identificadores: RN-33 (anular es del tendero), RN-30 (permisos), RN-46 (sesión),
// RN-04 (montos), SEC-token (el token solo vive en SecureStore).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore, isAdminRole, ROLE_LABEL, formatCOP } from '../lib/store.ts';

const usuario = { id: 'u-1', name: 'Usuario Prueba', email: 'prueba@example.test', role: 'tendero' };

beforeEach(async () => {
  SecureStore.__limpiar();
  SecureStore.__estado.fallar = false;
  await useAuthStore.getState().clearAuth();
  useAuthStore.setState({ isLoaded: false });
});

test('RN-33 · isAdminRole habilita superuser, administrador y tendero', () => {
  for (const r of ['superuser', 'administrador', 'tendero']) {
    assert.equal(isAdminRole(r), true, r);
  }
});

test('RN-33 · isAdminRole no habilita vendedor, cliente, rol desconocido ni vacío', () => {
  for (const r of ['vendedor', 'cliente', 'otro', '', undefined]) {
    assert.equal(isAdminRole(r), false, String(r));
  }
});

test('RN-30 · ROLE_LABEL define etiqueta para los seis roles base (incluido el encargado)', () => {
  assert.deepEqual(Object.keys(ROLE_LABEL).sort(), [
    'administrador', 'cliente', 'encargado', 'superuser', 'tendero', 'vendedor',
  ]);
});

test('RN-04 · formatCOP formatea montos con separador de miles es-CO', () => {
  assert.equal(formatCOP(1500), '$1.500');
  assert.equal(formatCOP('25000'), '$25.000');
  assert.equal(formatCOP(0), '$0');
});

test('RN-04 · formatCOP trata null y undefined como cero', () => {
  assert.equal(formatCOP(null), '$0');
  assert.equal(formatCOP(undefined), '$0');
});

test('SEC-token · setAuth guarda token y usuario en SecureStore y en el estado', async () => {
  await useAuthStore.getState().setAuth('token-sintetico', usuario);
  assert.equal(await SecureStore.getItemAsync('mv_token'), 'token-sintetico');
  assert.deepEqual(JSON.parse(await SecureStore.getItemAsync('mv_user')), usuario);
  const s = useAuthStore.getState();
  assert.equal(s.token, 'token-sintetico');
  assert.deepEqual(s.user, usuario);
});

test('SEC-token · solo se escriben las claves mv_token y mv_user, y el usuario no lleva el token', async () => {
  await useAuthStore.getState().setAuth('token-sintetico', usuario);
  assert.deepEqual(SecureStore.__claves().sort(), ['mv_token', 'mv_user']);
  const guardado = await SecureStore.getItemAsync('mv_user');
  assert.equal(guardado.includes('token-sintetico'), false);
});

test('RN-46 · clearAuth borra token y usuario del almacén seguro y del estado', async () => {
  await useAuthStore.getState().setAuth('token-sintetico', usuario);
  await useAuthStore.getState().clearAuth();
  assert.deepEqual(SecureStore.__claves(), []);
  const s = useAuthStore.getState();
  assert.equal(s.token, null);
  assert.equal(s.user, null);
});

test('RN-46 · clearAuth limpia el estado aunque el almacén seguro falle', async () => {
  await useAuthStore.getState().setAuth('token-sintetico', usuario);
  SecureStore.__estado.fallar = true;
  await useAuthStore.getState().clearAuth();
  assert.equal(useAuthStore.getState().token, null);
});

test('RN-46 · init restaura la sesión guardada y marca isLoaded', async () => {
  await SecureStore.setItemAsync('mv_token', 'token-sintetico');
  await SecureStore.setItemAsync('mv_user', JSON.stringify(usuario));
  await useAuthStore.getState().init();
  const s = useAuthStore.getState();
  assert.equal(s.token, 'token-sintetico');
  assert.deepEqual(s.user, usuario);
  assert.equal(s.isLoaded, true);
});

test('RN-46 · init sin sesión guardada queda sin autenticar pero cargado', async () => {
  await useAuthStore.getState().init();
  const s = useAuthStore.getState();
  assert.equal(s.token, null);
  assert.equal(s.user, null);
  assert.equal(s.isLoaded, true);
});

test('RN-46 · init con usuario guardado corrupto queda sin autenticar y cargado', async () => {
  await SecureStore.setItemAsync('mv_token', 'token-sintetico');
  await SecureStore.setItemAsync('mv_user', '{no es json');
  await useAuthStore.getState().init();
  const s = useAuthStore.getState();
  assert.equal(s.token, null);
  assert.equal(s.isLoaded, true);
});

test('RN-46 · init con el almacén seguro caído queda sin autenticar y cargado', async () => {
  SecureStore.__estado.fallar = true;
  await useAuthStore.getState().init();
  const s = useAuthStore.getState();
  assert.equal(s.token, null);
  assert.equal(s.isLoaded, true);
});
