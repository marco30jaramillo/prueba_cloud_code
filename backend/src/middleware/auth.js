const TokenUtils = require('../utils/tokenUtils');
const TokenManager = require('../utils/tokenManager');
const ResponseFormatter = require('../utils/responseFormatter');

const tokenUtils = new TokenUtils();
const tokenManager = new TokenManager();

const authMiddleware = (req, res, next) => {
  console.log('🔐 Headers recibidos:', req.headers);
  console.log('🔐 Authorization header:', req.headers.authorization);

  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    console.log('🔐 Partes del header:', parts);
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    } else if (parts.length === 1) {
      token = parts[0];
    }
  }

  console.log('🔐 Token extraído:', token ? '✅' : '❌');

  if (!token) {
    console.log('❌ Token no proporcionado');
    return ResponseFormatter.unauthorized(res, 'Token no proporcionado en header Authorization');
  }

  console.log('🔐 [1] Verificando firma JWT...');
  const payload = tokenUtils.verifyToken(token);
  if (!payload) {
    console.log('❌ [1] JWT inválido o expirado');
    return ResponseFormatter.unauthorized(res, 'Token inválido o expirado (verifica que sea un JWT válido)');
  }
  console.log('✅ [1] JWT válido:', payload);

  console.log('🔐 [2] Verificando si está en lista de otorgados...');
  const grantedTokens = tokenManager.readGrantedTokens();
  const revokedTokens = tokenManager.readRevokedTokens();
  const inGranted = grantedTokens.some(t => t.token === token);
  const inRevoked = revokedTokens.some(t => t.token === token);

  console.log('   Token en granted?', inGranted);
  console.log('   Token en revoked?', inRevoked);

  if (!inGranted) {
    console.log('❌ [2] Token no en lista de otorgados');
    return ResponseFormatter.unauthorized(res, 'Token no válido (no está en lista de sesiones activas)');
  }

  if (inRevoked) {
    console.log('❌ [2] Token está revocado');
    return ResponseFormatter.unauthorized(res, 'Token revocado (cerraste sesión con este token)');
  }

  console.log('✅ [2] Token válido en lista de otorgados');

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
