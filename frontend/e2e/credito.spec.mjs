/**
 * Recorrido mínimo de crédito en el navegador, contra la base de pruebas.
 * Prepara por la API (tienda, cliente activado) y opera el vale desde la interfaz.
 * Credenciales: las genera `npm run test:web`; ninguna está en el repositorio.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';

const API = process.env.MV_TEST_API_URL;
const SU_EMAIL = process.env.MV_TEST_SU_EMAIL;
const SU_PASSWORD = process.env.MV_TEST_SU_PASSWORD;
const OUTBOX = process.env.MV_TEST_OUTBOX_DIR;

async function llamar(metodo, ruta, cuerpo, token) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  let body = null;
  try { body = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, body };
}

function exigir(respuesta, esperado, contexto) {
  // El mensaje no incluye el cuerpo: puede traer tokens o datos de personas.
  if (respuesta.status !== esperado) throw new Error(`${contexto}: se esperaba HTTP ${esperado} y llegó ${respuesta.status}`);
}

/** Busca en la bandeja local el token de activación enviado a `email`. */
function tokenDeActivacion(email) {
  for (const nombre of fs.readdirSync(OUTBOX)) {
    const correo = JSON.parse(fs.readFileSync(path.join(OUTBOX, nombre), 'utf8'));
    const destino = JSON.stringify(correo.to || '').toLowerCase();
    if (!destino.includes(email.toLowerCase())) continue;
    const m = /\/activar#token=([0-9a-f]{64})/i.exec(`${correo.text || ''}${correo.html || ''}`);
    if (m) return m[1];
  }
  throw new Error('no se encontró el correo de activación del cliente de prueba');
}

const sufijo = crypto.randomBytes(4).toString('hex');
const mundo = {};

test.beforeAll(async () => {
  if (!SU_EMAIL || !SU_PASSWORD || !OUTBOX) {
    throw new Error('faltan las credenciales de la corrida: usa `npm run test:web` en backend/.');
  }
  const login = await llamar('POST', '/auth/login', { email: SU_EMAIL, password: SU_PASSWORD });
  exigir(login, 200, 'iniciar sesión del superusuario');
  mundo.token = login.body.token;

  const tienda = await llamar('POST', '/tiendas', { nombre: `Tienda web ${sufijo}`, ciudad: 'Ciudad de pruebas' }, mundo.token);
  exigir(tienda, 201, 'crear tienda');
  mundo.tienda = { id: tienda.body.tienda.id, nombre: tienda.body.tienda.nombre };

  const email = `cliente.web.${sufijo}@mvtest.example`;
  const nombre = `Cliente Web ${sufijo}`;
  const cliente = await llamar('POST', '/auth/create-user', {
    email, name: nombre, role: 'cliente', password: `Aa1!${crypto.randomBytes(18).toString('base64url')}`,
  }, mundo.token);
  exigir(cliente, 201, 'crear cliente');
  const activacion = await llamar('POST', '/auth/activate', { token: tokenDeActivacion(email) });
  exigir(activacion, 200, 'activar cliente');
  mundo.cliente = { nombre, email };
});

async function iniciarSesionSuperusuario(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(SU_EMAIL);
  await page.locator('input[name="password"]').fill(SU_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesi/i }).click();
  await page.waitForURL('**/dashboard**');
}

async function llenarVale(page, { descripcion, monto }) {
  await page.goto('/dashboard/vale-nuevo');
  // La pantalla muestra un selector de tienda solo si hay dos o más; con una única tienda (el
  // caso de una base recién creada, donde esta prueba corre sola) la muestra fija y deshabilitada.
  const buscador = page.getByPlaceholder('Buscar por nombre o email...');
  await buscador.waitFor();
  const selector = page.locator('select');
  if (await selector.count() > 0) {
    await selector.first().selectOption({ label: mundo.tienda.nombre });
  } else {
    await expect(page.locator('input:disabled').first()).toHaveValue(mundo.tienda.nombre);
  }
  await buscador.fill(mundo.cliente.nombre);
  await page.getByText(mundo.cliente.email).first().click();
  await page.getByPlaceholder(/Mercado semanal/).fill(descripcion);
  await page.getByPlaceholder('$ 0').fill(monto);
}

test.describe.serial('Recorrido de crédito en la web', () => {
  test('RN-04 · la pantalla de vale nuevo rechaza un monto en cero y no registra nada', async ({ page }) => {
    await iniciarSesionSuperusuario(page);
    await llenarVale(page, { descripcion: 'Vale en cero (prueba)', monto: '0' });
    await page.getByRole('button', { name: /Registrar Vale/ }).click();
    await expect(page.getByText('El monto debe ser mayor a 0.')).toBeVisible();

    const cartera = await llamar('GET', `/vales/tienda/${mundo.tienda.id}`, undefined, mundo.token);
    exigir(cartera, 200, 'leer cartera');
    expect(cartera.body.vales.length).toBe(0);
  });

  test('RN-04 · un vale registrado desde la web queda pendiente con saldo igual a su monto y aparece en la cartera', async ({ page }) => {
    await iniciarSesionSuperusuario(page);
    await llenarVale(page, { descripcion: 'Mercado de prueba', monto: '25000' });
    await page.getByRole('button', { name: /Registrar Vale/ }).click();
    await expect(page.getByText('¡Vale registrado exitosamente!')).toBeVisible();

    const cartera = await llamar('GET', `/vales/tienda/${mundo.tienda.id}`, undefined, mundo.token);
    exigir(cartera, 200, 'leer cartera');
    expect(cartera.body.vales.length).toBe(1);
    const vale = cartera.body.vales[0];
    expect(vale.estado).toBe('pendiente');
    expect(Number(vale.montoTotal)).toBe(25000);
    expect(Number(vale.saldoPendiente)).toBe(25000);
    expect(Number(cartera.body.totalPendiente)).toBe(25000);

    await page.waitForURL('**/dashboard/cartera');
    await page.locator('select').first().selectOption({ label: mundo.tienda.nombre });
    await expect(page.getByText('Mercado de prueba')).toBeVisible();
  });
});
