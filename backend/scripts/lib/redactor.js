/**
 * Redactor de secretos para la salida de las pruebas con base de datos.
 *
 * Todo texto que sale de un proceso hijo (backend de pruebas, corredor de pruebas) pasa por
 * aquí antes de llegar a la consola o a un archivo: los secretos de la corrida (clave de
 * firma, contraseñas, tokens) y cualquier cosa con forma de token o de credencial se
 * sustituyen por `***`. Función pura, sin dependencias.
 */

const MARCA = '***';
const LARGO_MINIMO_SECRETO = 6;

// Token propio: tres segmentos base64url separados por punto.
const FORMA_TOKEN = /[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g;
const FORMA_BEARER = /(Bearer\s+)[^\s"']+/gi;
const FORMA_CREDENCIAL = /((?:password|pwd|secret|accesskey|access_key|token)["']?\s*[:=]\s*["']?)[^\s"',;&]+/gi;

function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string[]} secretos valores literales a ocultar (se ignoran los vacíos o muy cortos)
 * @returns {(texto: unknown) => string}
 */
function crearRedactor(secretos = []) {
  const literales = [...new Set(secretos.filter((s) => typeof s === 'string' && s.length >= LARGO_MINIMO_SECRETO))]
    .sort((a, b) => b.length - a.length)
    .map((s) => new RegExp(escapar(s), 'g'));

  return function redactar(texto) {
    let salida = typeof texto === 'string' ? texto : String(texto ?? '');
    for (const patron of literales) salida = salida.replace(patron, MARCA);
    return salida
      .replace(FORMA_BEARER, `$1${MARCA}`)
      .replace(FORMA_TOKEN, MARCA)
      .replace(FORMA_CREDENCIAL, `$1${MARCA}`);
  };
}

module.exports = { crearRedactor, MARCA };
