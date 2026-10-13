/**
 * Acceso directo a la base de pruebas, para preparar la fixture y conciliar.
 *
 * Servidor y base fijos en el código (`localhost`, `MiValecito_Test`): no salen del entorno.
 * Solo la cuenta de la aplicación y su contraseña llegan del corredor (`db-test.js`), y la
 * conexión comprueba que de verdad está en la base de pruebas antes de devolverla.
 */

const sql = require('mssql');

const SERVIDOR = 'localhost';
const BASE = 'MiValecito_Test';

let poolPromise = null;

async function abrir() {
  if (!poolPromise) {
    const usuario = process.env.MV_TEST_DB_USER;
    const clave = process.env.MV_TEST_DB_PASSWORD;
    if (!usuario || !clave) {
      throw new Error('Estas pruebas no se ejecutan solas: usa `npm run test:db` en backend/.');
    }
    poolPromise = (async () => {
      const pool = await new sql.ConnectionPool({
        server: SERVIDOR,
        port: 1433,
        database: BASE,
        user: usuario,
        password: clave,
        options: { encrypt: true, trustServerCertificate: true },
        pool: { max: 4, min: 0 },
      }).connect();
      const r = await pool.request().query('SELECT DB_NAME() AS base');
      if (r.recordset[0].base !== BASE) {
        await pool.close();
        throw new Error('la conexión de pruebas no apunta a la base de pruebas.');
      }
      return pool;
    })();
    poolPromise.catch(() => { poolPromise = null; });
  }
  return poolPromise;
}

async function cerrar() {
  if (!poolPromise) return;
  const pool = await poolPromise.catch(() => null);
  poolPromise = null;
  if (pool) await pool.close();
}

/** Todas las filas de vales y abonos (o solo las de las tiendas indicadas). */
async function leerValesYAbonos(tiendaIds) {
  const pool = await abrir();
  const peticion = pool.request();
  let filtro = '';
  if (Array.isArray(tiendaIds)) {
    if (!tiendaIds.length) return { vales: [], abonos: [] };
    const marcas = tiendaIds.map((id, i) => {
      peticion.input(`t${i}`, sql.UniqueIdentifier, id);
      return `@t${i}`;
    });
    filtro = ` WHERE v.tiendaId IN (${marcas.join(',')})`;
  }
  const vales = (await peticion.query(
    `SELECT CONVERT(NVARCHAR(36), v.id) AS id, CONVERT(NVARCHAR(36), v.tiendaId) AS tiendaId,
            v.montoTotal, v.saldoPendiente, v.estado
     FROM dbo.vales v${filtro}`
  )).recordset;
  const abonos = (await pool.request().query(
    `SELECT CONVERT(NVARCHAR(36), a.valeId) AS valeId, a.monto, a.anulado FROM dbo.abonos a`
  )).recordset;
  const conocidos = new Set(vales.map((v) => v.id.toUpperCase()));
  return { vales, abonos: abonos.filter((a) => conocidos.has(a.valeId.toUpperCase())) };
}

module.exports = { sql, abrir, cerrar, leerValesYAbonos };
