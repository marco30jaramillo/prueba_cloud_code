const sql = require('mssql');

let poolPromise;

function usingSql() {
  return (process.env.DATA_PROVIDER || 'csv').toLowerCase() === 'sql';
}

function getConfig() {
  if (process.env.AZURE_SQL_CONNECTION_STRING) return process.env.AZURE_SQL_CONNECTION_STRING;

  const keys = ['AZURE_SQL_SERVER', 'AZURE_SQL_DATABASE', 'AZURE_SQL_USER', 'AZURE_SQL_PASSWORD'];
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Azure SQL no está configurado. Faltan: ${missing.join(', ')}`);
  }

  return {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    options: { encrypt: true, trustServerCertificate: false },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };
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

module.exports = { sql, usingSql, getPool, request };
