const express = require('express');
const Module = require('../models/Module');
const Role   = require('../models/Role');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /modules — modules accessible to the current user's role
router.get('/', authMiddleware, (req, res) => {
  const modules = Module.getForRole(req.user.role);
  return ResponseFormatter.success(res, { modules: modules.map(m => m.toJSON()) });
});

// GET /modules/all — superuser only: all modules + roles summary
router.get('/all', authMiddleware, (req, res) => {
  if (req.user.role !== 'superuser') {
    return ResponseFormatter.forbidden(res, 'Solo el superusuario puede ver la configuración completa');
  }

  const modules = Module.getAll().map(m => m.toJSON());
  const roles   = Role.getAll().map(r => ({
    id:                   r.id,
    name:                 r.name,
    moduleAccess:         r.moduleAccess,
    effectivePermissions: Role.getEffectivePermissions(r.name),
  }));

  return ResponseFormatter.success(res, { modules, roles });
});

module.exports = router;
