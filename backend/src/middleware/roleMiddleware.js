const Role = require('../models/Role');
const ResponseFormatter = require('../utils/responseFormatter');

const roleMiddleware = {
  requireRole: (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Inicia sesión para hacer esto');
      }

      const userRole = req.user.role || 'cliente';
      if (!allowedRoles.includes(userRole)) {
        return ResponseFormatter.forbidden(res, `Rol '${userRole}' no tiene permisos para esta acción`, {
          required_roles: allowedRoles,
          your_role: userRole
        });
      }

      next();
    };
  },

  requirePermission: (permissionName) => {
    return async (req, res, next) => {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Inicia sesión para hacer esto');
      }

      const userRole = req.user.role || 'cliente';
      if (!await Role.hasPermission(userRole, permissionName)) {
        return ResponseFormatter.forbidden(res, `No tienes permiso para '${permissionName}'`, {
          required_permission: permissionName,
          your_role: userRole
        });
      }

      next();
    };
  },

  /**
   * Exige el módulo de esa ruta con al menos `minLevel` (read < write < full). Para acciones que
   * el nivel de un módulo debe gobernar aunque el rol tenga el permiso por otra vía (por ejemplo,
   * cobrar desde Cartera con Cartera en solo lectura).
   */
  requireModuleLevel: (href, minLevel, accion = 'esta acción') => {
    const ORDEN = { read: 1, write: 2, full: 3 };
    return async (req, res, next) => {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Inicia sesión para hacer esto');
      }
      const Module = require('../models/Module');
      const nivel = await Module.getLevelForRole(req.user.role || 'cliente', href);
      if (!nivel || (ORDEN[nivel] || 0) < ORDEN[minLevel]) {
        return ResponseFormatter.forbidden(res, `Tu acceso a este módulo no permite ${accion}`, {
          required_module: href,
          required_level: minLevel,
          your_level: nivel || 'ninguno'
        });
      }
      next();
    };
  },

  attachUserRole: (req, res, next) => {
    if (req.user) {
      req.user.role = req.user.role || 'cliente';
    }
    next();
  }
};

const forbidden = (res, message, details = {}) => {
  return res.status(403).json({
    status: 'error',
    statusCode: 403,
    error: 'FORBIDDEN',
    message,
    ...details
  });
};

module.exports = roleMiddleware;
