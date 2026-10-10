const sql = require('mssql');
const {
  DbConfigError,
  normalizeHost,
  isLoopbackHost,
  resolveDbConfig,
} = require('./dbConfig');

let poolPromise;

function getConfig() {
  return resolveDbConfig(process.env).config;
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(getConfig()).connect().catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

async function request() {
  const pool = await getPool();
  return pool.request();
}

// Un parámetro sql.UniqueIdentifier con un texto que no es un GUID no llega a la base: el
// driver lanza "Invalid GUID" al validar. Los modelos lo comprueban antes de consultar y
// tratan ese id como "no existe", igual que cualquier id desconocido.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isGuid(value) {
  return typeof value === 'string' && GUID_REGEX.test(value);
}

module.exports = {
  sql,
  getPool,
  request,
  isGuid,
  resolveDbConfig,
  normalizeHost,
  isLoopbackHost,
  DbConfigError,
};
