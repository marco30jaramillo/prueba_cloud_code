/**
 * Cliente HTTP mínimo de las pruebas con base de datos. Usa el `fetch` de Node.
 *
 * Los errores que lanza solo llevan método, ruta y código HTTP: nunca el cuerpo de la
 * respuesta ni los encabezados, que pueden contener tokens o datos de personas.
 */

function urlBase() {
  const url = process.env.MV_TEST_API_URL;
  if (!url) {
    throw new Error('Estas pruebas no se ejecutan solas: usa `npm run test:db` en backend/ (crea la base de pruebas y el servidor).');
  }
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) {
    throw new Error('MV_TEST_API_URL debe apuntar a 127.0.0.1.');
  }
  return url;
}

/**
 * @returns {Promise<{ status: number, body: any }>}
 */
async function llamar(metodo, ruta, { token, cuerpo } = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(30000),
  });
  let body = null;
  try {
    body = await respuesta.json();
  } catch (_) {
    body = null;
  }
  return { status: respuesta.status, body };
}

const api = {
  get: (ruta, token) => llamar('GET', ruta, { token }),
  post: (ruta, cuerpo, token) => llamar('POST', ruta, { token, cuerpo }),
  patch: (ruta, cuerpo, token) => llamar('PATCH', ruta, { token, cuerpo }),
};

/** Inicia sesión y devuelve solo el token. */
async function iniciarSesion(email, password) {
  const r = await api.post('/auth/login', { email, password });
  if (r.status !== 200 || !r.body || !r.body.token) {
    throw new Error(`inicio de sesión rechazado (HTTP ${r.status})`);
  }
  return r.body.token;
}

/** Afirma el código HTTP con un mensaje que no incluye el cuerpo. */
function esperarEstado(respuesta, esperado, contexto) {
  const validos = Array.isArray(esperado) ? esperado : [esperado];
  if (!validos.includes(respuesta.status)) {
    throw errorAfirmacion(`${contexto}: se esperaba HTTP ${validos.join(' o ')} y llegó ${respuesta.status}`);
  }
}

function errorAfirmacion(mensaje) {
  const assert = require('node:assert/strict');
  return new assert.AssertionError({ message: mensaje });
}

module.exports = { api, llamar, iniciarSesion, esperarEstado };
