const TokenUtils = require('../utils/tokenUtils');
const TokenManager = require('../utils/tokenManager');
const ResponseFormatter = require('../utils/responseFormatter');

const tokenUtils = new TokenUtils();
const tokenManager = new TokenManager();

// D-2: mientras la cuenta tenga el cambio de contraseña forzado (mustChangePassword), el
// servidor solo atiende estas rutas, por método y ruta exactos (no por prefijo). La bandera
// se lee de la base en cada petición: el JWT no la lleva.
const PASSWORD_CHANGE_ALLOWLIST = new Set([
  'PATCH /auth/change-password-temporary',
  'GET /auth/validate',
  'POST /auth/logout',
  'POST /auth/logout-all',
]);

function isAllowedWhilePasswordChangePending(method, originalUrl) {
  const pathOnly = String(originalUrl || '').split('?')[0].replace(/\/+$/, '');
  return PASSWORD_CHANGE_ALLOWLIST.has(`${String(method || '').toUpperCase()} ${pathOnly}`);
}

function extractToken(req) {
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
  return token;
}

const authMiddleware = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return ResponseFormatter.unauthorized(res, 'Sesión no iniciada. Inicia sesión para continuar');
  }

  const payload = tokenUtils.verifyToken(token);
  if (!payload) {
    return ResponseFormatter.unauthorized(res, 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente');
  }

  const valid = await tokenManager.isTokenValid(token);
  if (!valid) {
    return ResponseFormatter.unauthorized(res, 'Sesión no válida o cerrada. Inicia sesión nuevamente');
  }

  // Estado actual de la cuenta (D-2): deshabilitada o eliminada no pasa; con cambio de
  // contraseña forzado solo pasan las rutas de la lista blanca.
  const User = require('../models/User');
  let account;
  try {
    account = await User.findById(payload.userId);
  } catch {
    return ResponseFormatter.internalError(res, 'No se pudo verificar la sesión');
  }
  if (!account || account.isActive === false) {
    return ResponseFormatter.unauthorized(res, 'Sesión no válida o cerrada. Inicia sesión nuevamente');
  }
  if (account.mustChangePassword === true && !isAllowedWhilePasswordChangePending(req.method, req.originalUrl)) {
    return res.status(403).json({
      status: 'error',
      statusCode: 403,
      error: 'FORBIDDEN',
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Debes cambiar tu contraseña antes de continuar',
      timestamp: new Date().toISOString()
    });
  }

  req.user = payload;
  req.token = token;
  next();
};

// Sin uso hoy. Si alguna ruta lo adopta, respeta la revocación igual que `authMiddleware`.
const optionalAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    const payload = tokenUtils.verifyToken(token);
    if (payload && await tokenManager.isTokenValid(token)) {
      req.user = payload;
      req.token = token;
    }
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  isAllowedWhilePasswordChangePending,
  tokenUtils,
  tokenManager
};
