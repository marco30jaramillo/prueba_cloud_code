// Cliente HTTP del móvil: lib/api.ts. Se sustituye el adaptador de axios para no usar red.
// Identificadores: SEC-token (Bearer), RN-xx (rutas de vales, abonos, tiendas y sesión).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

const llamadas = [];
let respuesta = () => ({ status: 'success' });
let fallo = null;

// Debe fijarse antes de cargar lib/api.ts: axios.create hereda los valores por defecto.
axios.defaults.adapter = async (config) => {
  llamadas.push(config);
  if (fallo) {
    const e = new Error('simulado');
    e.response = { status: fallo, data: {}, config };
    e.config = config;
    e.isAxiosError = true;
    throw e;
  }
  return { data: respuesta(config), status: 200, statusText: 'OK', headers: {}, config };
};

const { authAPI, valesAPI, tiendasAPI, usersAPI, setApiToken } = await import('../lib/api.ts');
const { API_URL } = await import('../lib/config.ts');

const ultima = () => llamadas[llamadas.length - 1];
const cuerpo = (c) => (c.data ? JSON.parse(c.data) : undefined);
const authorization = (c) => c.headers.Authorization ?? c.headers.get?.('Authorization');

beforeEach(() => {
  llamadas.length = 0;
  fallo = null;
  respuesta = () => ({ status: 'success' });
  setApiToken(null);
});

test('SEC-token · sin token no envía Authorization', async () => {
  await valesAPI.getMisVales();
  assert.equal(authorization(ultima()) ?? undefined, undefined);
});

test('SEC-token · con token envía Authorization Bearer', async () => {
  setApiToken('token-sintetico');
  await valesAPI.getMisVales();
  assert.equal(authorization(ultima()), 'Bearer token-sintetico');
});

test('SEC-token · al limpiar el token deja de enviarse Authorization', async () => {
  setApiToken('token-sintetico');
  await valesAPI.getMisVales();
  setApiToken(null);
  await valesAPI.getMisVales();
  assert.equal(authorization(ultima()) ?? undefined, undefined);
});

test('SEC-config · la URL base proviene de lib/config y es https', async () => {
  await valesAPI.getMisVales();
  assert.equal(ultima().baseURL, API_URL);
  assert.match(API_URL, /^https:\/\//);
});

test('RN-23 · getMisVales consulta GET /vales/mis-vales', async () => {
  await valesAPI.getMisVales();
  assert.equal(ultima().method, 'get');
  assert.equal(ultima().url, '/vales/mis-vales');
});

test('RN-22 · getCartera consulta la tienda indicada, con y sin filtro de estado', async () => {
  await valesAPI.getCartera('t-1');
  assert.equal(ultima().url, '/vales/tienda/t-1');
  assert.deepEqual(ultima().params, {});
  await valesAPI.getCartera('t-1', 'parcial');
  assert.deepEqual(ultima().params, { estado: 'parcial' });
});

test('RN-01 · crear envía POST /vales con el cuerpo recibido', async () => {
  const body = { tiendaId: 't-1', clienteId: 'c-1', descripcion: 'Prueba', montoTotal: 5000 };
  await valesAPI.crear(body);
  assert.equal(ultima().method, 'post');
  assert.equal(ultima().url, '/vales');
  assert.deepEqual(cuerpo(ultima()), body);
});

test('RN-06 · anular vale envía PATCH /vales/:id/anular', async () => {
  await valesAPI.anular('v-1');
  assert.equal(ultima().method, 'patch');
  assert.equal(ultima().url, '/vales/v-1/anular');
});

test('RN-09 · registrarAbono envía POST /vales/:id/abonos con monto y notas', async () => {
  await valesAPI.registrarAbono('v-1', 2500, 'nota');
  assert.equal(ultima().method, 'post');
  assert.equal(ultima().url, '/vales/v-1/abonos');
  assert.deepEqual(cuerpo(ultima()), { monto: 2500, notas: 'nota' });
});

test('RN-07 · anularAbono envía PATCH y el cliente no expone un borrado de abonos', async () => {
  await valesAPI.anularAbono('v-1', 'a-1');
  assert.equal(ultima().method, 'patch');
  assert.equal(ultima().url, '/vales/v-1/abonos/a-1/anular');
  assert.deepEqual(
    Object.keys(valesAPI).filter((k) => /borr|delete|elimin/i.test(k)),
    []
  );
});

test('RN-21 · removeUsuario usa DELETE sobre la asignación de la tienda', async () => {
  await tiendasAPI.removeUsuario('t-1', 'u-1');
  assert.equal(ultima().method, 'delete');
  assert.equal(ultima().url, '/tiendas/t-1/usuarios/u-1');
});

test('RN-17 · buscarClientes envía q como parámetro de consulta', async () => {
  await usersAPI.buscarClientes('ana');
  assert.equal(ultima().url, '/users/clientes/buscar');
  assert.deepEqual(ultima().params, { q: 'ana' });
});

test('RN-46 · login envía POST /auth/login y devuelve el cuerpo de la respuesta', async () => {
  respuesta = () => ({ status: 'success', token: 'token-sintetico' });
  const r = await authAPI.login('prueba@example.test', 'Clave-sintetica-1!');
  assert.equal(ultima().url, '/auth/login');
  assert.equal(ultima().method, 'post');
  assert.equal(r.token, 'token-sintetico');
});

test('RN-46 · logout no propaga el error si el servidor falla', async () => {
  fallo = 500;
  await assert.doesNotReject(authAPI.logout());
});

test('RN-46 · un error HTTP en una consulta se propaga a la pantalla', async () => {
  fallo = 403;
  await assert.rejects(valesAPI.getMisVales(), (e) => e.response?.status === 403);
});
