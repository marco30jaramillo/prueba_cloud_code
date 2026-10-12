/**
 * Precargado (`node -r`) de la prueba `tests/sin-base-de-datos.test.js`: si algo intenta abrir
 * una conexión real con `mssql`, el proceso termina con código 97 y deja la marca en stderr.
 * No abre ninguna conexión: solo reemplaza `connect` antes de que nadie la use.
 */
const sql = require('mssql');

function bloqueado() {
  process.stderr.write('MV_POOL_ABIERTO\n');
  process.exit(97);
}

if (sql.ConnectionPool && sql.ConnectionPool.prototype) {
  sql.ConnectionPool.prototype.connect = bloqueado;
}
sql.connect = bloqueado;
