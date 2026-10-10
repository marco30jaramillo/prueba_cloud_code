const crypto = require('crypto');

const MIN_SECRET_LENGTH = 32;

class JwtSecretError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JwtSecretError';
    this.code = 'JWT_SECRET_INVALID';
  }
}

class TokenUtils {
  // Sin valor por defecto: el secreto solo entra por JWT_SECRET (o por parámetro explícito).
  constructor(secret = process.env.JWT_SECRET) {
    TokenUtils.assertSecret(secret);
    this.secret = secret;
  }

  /**
   * Lanza si el secreto falta o es demasiado corto. El mensaje nunca incluye el valor.
   */
  static assertSecret(secret) {
    if (typeof secret !== 'string' || secret === '') {
      throw new JwtSecretError('JWT_SECRET no está definido. El backend no arranca sin un secreto de sesión.');
    }
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new JwtSecretError(`JWT_SECRET es demasiado corto: debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`);
    }
  }

  generateTokenWithId(payload, expiresIn = 86400) {
    const tokenId = crypto.randomUUID();
    const token = this.generateToken({ ...payload, tokenId }, expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return { token, tokenId, expiresAt };
  }

  generateToken(payload, expiresIn = 86400) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      ...payload,
      iat: now,
      exp: now + expiresIn
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(claims));
    const message = `${encodedHeader}.${encodedPayload}`;
    const signature = this.sign(message);

    return `${message}.${signature}`;
  }

  verifyToken(token) {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      if (!encodedHeader || !encodedPayload || !signature) return null;

      const message = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = this.sign(message);

      if (signature !== expectedSignature) return null;

      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp < now) return null;

      return payload;
    } catch {
      return null;
    }
  }

  sign(message) {
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(message);
    return this.base64UrlEncode(hmac.digest());
  }

  base64UrlEncode(str) {
    const buffer = typeof str === 'string' ? Buffer.from(str) : str;
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  base64UrlDecode(str) {
    let padding = 4 - (str.length % 4);
    if (padding !== 4) str += '='.repeat(padding);
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  }
}

TokenUtils.JwtSecretError = JwtSecretError;
TokenUtils.MIN_SECRET_LENGTH = MIN_SECRET_LENGTH;

module.exports = TokenUtils;
