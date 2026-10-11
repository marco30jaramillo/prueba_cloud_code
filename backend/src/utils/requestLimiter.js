/**
 * Limitador de peticiones por clave (IP), en memoria: ventana deslizante simple.
 * Se reinicia con el servidor y no se comparte entre instancias; el límite por destinatario
 * de los correos, que sí debe sobrevivir, es persistente (ver src/mail/mailLimits.js).
 *
 * Dos modos:
 *  - `hit` cuenta cada petición (endpoints que envían correo).
 *  - `fail` solo cuenta fallos (activación con un token inválido).
 */

const { getClientIp } = require('./clientIp');

function createRequestLimiter({ name, max, windowMs, mode = 'hit', now = () => Date.now() }) {
  const store = new Map();

  function record(key) {
    const t = now();
    let rec = store.get(key);
    if (!rec || t - rec.windowStart >= windowMs) {
      rec = { count: 0, windowStart: t };
      store.set(key, rec);
    }
    return rec;
  }

  function isBlocked(key) {
    const rec = record(key);
    if (rec.count >= max) {
      return { blocked: true, retryAfterSec: Math.max(1, Math.ceil((rec.windowStart + windowMs - now()) / 1000)) };
    }
    return { blocked: false, retryAfterSec: 0 };
  }

  function add(key) {
    record(key).count += 1;
  }

  function reset(key) {
    store.delete(key);
  }

  // Limpieza ocasional para que el mapa no crezca sin tope.
  function sweep() {
    const t = now();
    for (const [key, rec] of store) {
      if (t - rec.windowStart >= windowMs) store.delete(key);
    }
  }

  /** Middleware de Express. En modo `fail` solo comprueba; el llamador usa `fail()`. */
  function middleware(req, res, next) {
    if (store.size > 5000) sweep();
    const key = getClientIp(req);
    const state = isBlocked(key);
    if (state.blocked) {
      res.setHeader('Retry-After', String(state.retryAfterSec));
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
        retryAfterSec: state.retryAfterSec,
      });
    }
    if (mode === 'hit') add(key);
    return next();
  }

  return { name, middleware, isBlocked, add, reset, fail: (req) => add(getClientIp(req)), _store: store };
}

module.exports = { createRequestLimiter };
