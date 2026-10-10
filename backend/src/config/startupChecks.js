/**
 * Validación de configuración al arrancar. Sin dependencias externas ni conexión a la base.
 *
 * - JWT_SECRET: obligatorio, mínimo 32 caracteres (H-9).
 * - Base de datos: siempre; familias sin mezcla y guarda de TLS (H-3, H-4).
 *
 * Los mensajes nunca incluyen secretos ni la cadena de conexión.
 */

const TokenUtils = require('../utils/tokenUtils');
const { resolveDbConfig, DbConfigError } = require('../database/dbConfig');

/**
 * Devuelve la lista de errores de configuración (vacía si todo está bien).
 */
function collectStartupErrors(env = process.env) {
  const errors = [];

  try {
    TokenUtils.assertSecret(env.JWT_SECRET);
  } catch (error) {
    if (!(error instanceof TokenUtils.JwtSecretError)) throw error;
    errors.push(error.message);
  }

  try {
    resolveDbConfig(env);
  } catch (error) {
    if (!(error instanceof DbConfigError)) throw error;
    errors.push(error.message);
  }

  return errors;
}

/**
 * Termina el proceso con código 1 si la configuración es inválida.
 */
function enforceStartupConfig(env = process.env) {
  const errors = collectStartupErrors(env);
  if (!errors.length) return;

  console.error('Configuración inválida. El backend no arranca:');
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}

module.exports = { collectStartupErrors, enforceStartupConfig };
