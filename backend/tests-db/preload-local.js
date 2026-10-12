/**
 * Precargado (`node -r`) del backend de pruebas: lo obliga a escuchar solo en 127.0.0.1.
 *
 * `src/server.js` hace `app.listen(PORT, '0.0.0.0')`; durante la corrida con base de datos de
 * pruebas ese servicio no debe ser alcanzable desde la red local. Sin tocar `server.js`, este
 * archivo reemplaza el host de cualquier `listen` por el bucle local. El corredor
 * (`scripts/db-test.js`) comprueba después, por la IP de red del equipo, que el puerto
 * efectivamente no responde; si esa comprobación falla, aborta la corrida.
 */

const net = require('net');

const HOST_LOCAL = '127.0.0.1';
const original = net.Server.prototype.listen;

net.Server.prototype.listen = function listenSoloLocal(...args) {
  const primero = args[0];
  // listen(port[, host][, backlog][, cb])
  if (typeof primero === 'number' || (typeof primero === 'string' && /^\d+$/.test(primero))) {
    if (typeof args[1] === 'string') {
      args[1] = HOST_LOCAL;
    } else {
      args.splice(1, 0, HOST_LOCAL);
    }
    return original.apply(this, args);
  }
  // listen(options)
  if (primero && typeof primero === 'object' && !Array.isArray(primero) && primero.port !== undefined) {
    args[0] = { ...primero, host: HOST_LOCAL };
    return original.apply(this, args);
  }
  // Rutas de pipe, descriptores u otras formas: no se admiten en el backend de pruebas.
  throw new Error('preload-local: forma de listen no admitida en el backend de pruebas.');
};
