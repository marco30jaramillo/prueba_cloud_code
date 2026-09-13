const Role = require('../models/Role');
const ResponseFormatter = require('../utils/responseFormatter');

const roleMiddleware = {
  requireRole: (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Token requerido para esta acción');
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
    return (req, res, next) => {
      if (!req.user) {
        return ResponseFormatter.unauthorized(res, 'Token requerido para esta acción');
      }

      const userRole = req.user.role || 'cliente';
      if (!Role.hasPermission(userRole, permissionName)) {
        return ResponseFormatter.forbidden(res, `No tienes permiso para '${permissionName}'`, {
          required_permission: permissionName,
          your_role: userRole
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
