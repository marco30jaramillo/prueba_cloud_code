const TokenUtils = require('../utils/tokenUtils');
const TokenManager = require('../utils/tokenManager');
const ResponseFormatter = require('../utils/responseFormatter');

const tokenUtils = new TokenUtils();
const tokenManager = new TokenManager();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    } else if (parts.length === 1) {
      token = parts[0];
    }
  }

  if (!token) {
    return ResponseFormatter.unauthorized(res, 'Sesión no iniciada. Inicia sesión para continuar');
  }

  const payload = tokenUtils.verifyToken(token);
  if (!payload) {
    return ResponseFormatter.unauthorized(res, 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente');
  }

  const grantedTokens = tokenManager.readGrantedTokens();
  const revokedTokens = tokenManager.readRevokedTokens();
  const inGranted = grantedTokens.some(t => t.token === token);
  const inRevoked = revokedTokens.some(t => t.token === token);

  if (!inGranted) {
    return ResponseFormatter.unauthorized(res, 'Sesión no válida. Inicia sesión nuevamente');
  }

  if (inRevoked) {
    return ResponseFormatter.unauthorized(res, 'Tu sesión se cerró. Inicia sesión nuevamente');
  }

  req.user = payload;
  req.token = token;
  next();
};

const optionalAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    const payload = tokenUtils.verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  tokenUtils,
  tokenManager
};
