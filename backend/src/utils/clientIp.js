/**
 * Dirección IP del cliente, sin confiar en lo que el cliente escribe.
 *
 * `X-Forwarded-For` lo controla quien hace la petición: el primer valor es el que el cliente
 * quiera poner. Detrás del front de Azure App Service el balanceador **agrega al final** la
 * dirección que vio (a veces con el puerto), así que ese último valor es el confiable.
 *
 * - En App Service (WEBSITE_SITE_NAME definida) se toma el último valor de la cabecera.
 * - Fuera de App Service no hay proxy de confianza: se usa la dirección del socket y la
 *   cabecera se ignora.
 */

function stripPort(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  // [::1]:1234
  const bracketed = text.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) return bracketed[1];
  // 1.2.3.4:5678 (un solo ":" significa IPv4 con puerto; IPv6 tiene varios)
  if ((text.match(/:/g) || []).length === 1) return text.replace(/:\d+$/, '');
  return text;
}

function getClientIp(req, env = process.env) {
  const behindAppService = Boolean(env.WEBSITE_SITE_NAME);
  if (behindAppService) {
    const header = req.headers && req.headers['x-forwarded-for'];
    if (header) {
      const hops = String(header).split(',').map((hop) => hop.trim()).filter(Boolean);
      const last = stripPort(hops[hops.length - 1]);
      if (last) return last.slice(0, 64);
    }
  }
  const remote = req.socket && req.socket.remoteAddress;
  return String(remote || 'unknown').slice(0, 64);
}

module.exports = { getClientIp, stripPort };
