/**
 * Constructor de los enlaces de los correos. La base sale SIEMPRE de FRONTEND_URL (mailConfig):
 * nunca de `Host`, `Origin`, `Referer` ni de datos de la petición, y nunca de APP_URL, que es
 * la URL del backend.
 */

const { resolveFrontendUrl } = require('./mailConfig');

/** Rutas de la web a las que apuntan los correos. */
const LINK_PATHS = {
  activate: '/activar',
  resetPassword: '/reset-password',
};

function buildLink(kind, token, env = process.env) {
  const route = LINK_PATHS[kind];
  if (!route) throw new Error(`Tipo de enlace desconocido: ${kind}`);
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(token)) {
    throw new Error('Token de enlace inválido');
  }
  const frontendUrl = resolveFrontendUrl(env);
  // H-4: el token va en el FRAGMENTO (#token=...): el navegador no lo envía al servidor ni
  // lo manda en `Referer`, y no queda en los registros de acceso.
  return `${frontendUrl}${route}#token=${encodeURIComponent(token)}`;
}

module.exports = { buildLink, LINK_PATHS };
