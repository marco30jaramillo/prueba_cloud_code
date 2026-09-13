// Simple in-memory rate limiter. Resets on server restart.
// Key: IP address. Tracks failed attempts within a sliding window.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;   // 15 minutes
const BLOCK_MS   = 15 * 60 * 1000;  // block for 15 minutes

const store = new Map();

function getRecord(ip) {
  const now = Date.now();
  let rec = store.get(ip);

  if (!rec) {
    rec = { count: 0, windowStart: now, blockedUntil: null };
    store.set(ip, rec);
    return rec;
  }

  // If block expired, reset
  if (rec.blockedUntil && now >= rec.blockedUntil) {
    rec = { count: 0, windowStart: now, blockedUntil: null };
    store.set(ip, rec);
    return rec;
  }

  // If window expired, reset counter (but not block)
  if (!rec.blockedUntil && now - rec.windowStart >= WINDOW_MS) {
    rec.count = 0;
    rec.windowStart = now;
  }

  return rec;
}

const rateLimiter = {
  check(ip) {
    const rec = getRecord(ip);
    const now = Date.now();

    if (rec.blockedUntil && now < rec.blockedUntil) {
      const retryAfterSec = Math.ceil((rec.blockedUntil - now) / 1000);
      return { blocked: true, retryAfterSec, attemptsLeft: 0 };
    }

    return { blocked: false, attemptsLeft: MAX_ATTEMPTS - rec.count };
  },

  recordFailure(ip) {
    const rec = getRecord(ip);
    rec.count += 1;

    if (rec.count >= MAX_ATTEMPTS) {
      rec.blockedUntil = Date.now() + BLOCK_MS;
    }

    store.set(ip, rec);
  },

  reset(ip) {
    store.delete(ip);
  },

  // Express middleware
  middleware(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    req._rateLimitIp = ip;
    const result = rateLimiter.check(ip);

    if (result.blocked) {
      res.setHeader('Retry-After', String(result.retryAfterSec));
      return res.status(429).json({
        success: false,
        message: `Demasiados intentos fallidos. Intenta nuevamente en ${Math.ceil(result.retryAfterSec / 60)} minutos.`,
        retryAfterSec: result.retryAfterSec
      });
    }

    next();
  }
};

module.exports = rateLimiter;
