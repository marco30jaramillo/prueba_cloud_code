/**
 * Guarda común de los scripts de desarrollo (`seed.js`, `db-setup.js`): solo trabajan contra
 * un SQL Server de bucle local configurado con la familia `DB_*` (H-4).
 *
 * Reutiliza la detección de familias y la normalización del host de `src/database/dbConfig.js`.
 * Ningún mensaje incluye contraseñas ni la cadena de conexión.
 */

const path = require('path');
const {
  FAMILY_DB,
  LOOPBACK_HOSTS,
  detectFamilies,
  resolveDbConfig,
  normalizeHost,
  isLoopbackHost,
} = require('../../src/database/dbConfig');

class EntornoNoLocalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EntornoNoLocalError';
  }
}

/**
 * Carga `backend/.env` si `dotenv` está instalado. Devuelve si lo cargó. Las variables ya
 * presentes en el proceso no se sobrescriben.
 */
function cargarEnv() {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    return true;
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return false;
  }
}

/**
 * Lanza si el entorno no es exclusivamente `DB_*` hacia un host de bucle local.
 *
 * - Con `AZURE_SQL_CONNECTION_STRING` o cualquier `AZURE_SQL_*` presente: se niega siempre.
 * - `exigirConexion: true` (seed): además la familia `DB_*` debe estar completa y válida.
 * - `exigirConexion: false` (db-setup, que usa `sqlcmd -E` y no lee `DB_*`): si `DB_SERVER`
 *   está definido, debe ser de bucle local.
 *
 * Devuelve `{ family, host }`; `host` es `null` si no hay `DB_SERVER`.
 */
function assertEntornoLocal(env = process.env, { exigirConexion = true, nombre = 'Este script' } = {}) {
  const ajenas = detectFamilies(env).filter((family) => family !== FAMILY_DB);
  if (ajenas.length) {
    throw new EntornoNoLocalError(
      `${nombre} solo corre contra la base local (familia ${FAMILY_DB}). Se niega: el entorno define ${ajenas.join(' y ')}.`
    );
  }

  const servidor = typeof env.DB_SERVER === 'string' && env.DB_SERVER !== '' ? env.DB_SERVER : null;
  if (servidor && !isLoopbackHost(servidor)) {
    throw new EntornoNoLocalError(
      `${nombre} solo corre contra un host de bucle local (${LOOPBACK_HOSTS.join(', ')}). Se niega: DB_SERVER apunta a "${normalizeHost(servidor)}".`
    );
  }

  if (!exigirConexion) {
    return { family: FAMILY_DB, host: servidor ? normalizeHost(servidor) : null };
  }

  // Lanza DbConfigError si la familia está incompleta o viola la guarda de TLS.
  const { family, host } = resolveDbConfig(env);
  return { family, host };
}

module.exports = { EntornoNoLocalError, cargarEnv, assertEntornoLocal };
