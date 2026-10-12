/**
 * Reporter de las pruebas con base de datos (`node --test --test-reporter=...`).
 *
 * Imprime solo el nombre, el estado y la duración de cada prueba y, si falla, la primera línea
 * de su mensaje (recortada). Nunca vuelca el objeto del error, el diff de la aserción ni el
 * stack: una aserción sobre un cuerpo de respuesta podría arrastrar un token o una contraseña
 * a la salida. Al final escribe una línea `RESUMEN ...` que lee el corredor.
 *
 * Estados: PASS, FAIL, PENDIENTE (prueba `todo`: defecto conocido, no cuenta como fallo) y
 * OMITIDA (prueba `skip`).
 */

const LARGO_MENSAJE = 300;

function primeraLinea(error) {
  const origen = (error && (error.cause && error.cause.message ? error.cause : error)) || {};
  const texto = String(origen.message || origen.code || 'sin mensaje').split(/\r?\n/)[0];
  return texto.length > LARGO_MENSAJE ? `${texto.slice(0, LARGO_MENSAJE)}…` : texto;
}

module.exports = async function* reporter(source) {
  const cuenta = { total: 0, pasadas: 0, falladas: 0, pendientes: 0, omitidas: 0 };
  let inicio = null;

  for await (const evento of source) {
    const { type, data } = evento;
    if (type !== 'test:pass' && type !== 'test:fail') continue;
    if (!data || (data.details && data.details.type === 'suite')) continue;
    if (inicio === null) inicio = Date.now();

    const duracion = Math.round((data.details && data.details.duration_ms) || 0);
    cuenta.total += 1;

    if (data.skip) {
      cuenta.omitidas += 1;
      yield `  OMITIDA    ${data.name}\n`;
    } else if (data.todo) {
      cuenta.pendientes += 1;
      const motivo = typeof data.todo === 'string' ? data.todo : 'defecto conocido';
      const estado = type === 'test:pass' ? 'ahora pasa' : 'sigue fallando';
      yield `  PENDIENTE  ${data.name}\n             (${estado}) ${motivo}\n`;
    } else if (type === 'test:pass') {
      cuenta.pasadas += 1;
      yield `  PASS       ${data.name} (${duracion} ms)\n`;
    } else {
      cuenta.falladas += 1;
      yield `  FAIL       ${data.name} (${duracion} ms)\n             ${primeraLinea(data.details && data.details.error)}\n`;
    }
  }

  yield `\nRESUMEN total=${cuenta.total} pasadas=${cuenta.pasadas} falladas=${cuenta.falladas}`
    + ` pendientes=${cuenta.pendientes} omitidas=${cuenta.omitidas}\n`;
};
