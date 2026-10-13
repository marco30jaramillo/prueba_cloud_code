const express = require('express');
const Module = require('../models/Module');
const Role   = require('../models/Role');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /modules — módulos del rol de la sesión con su nivel (read | write | full) y los
// permisos efectivos, para que web y app muestren solo lo que el rol puede hacer.
router.get('/', authMiddleware, async (req, res) => {
  const modules = await Module.getForRole(req.user.role);
  const access = await Role.getModuleAccess(req.user.role);
  const levelOf = (id) => access.find(a => String(a.id) === String(id))?.level ?? 'read';
  return ResponseFormatter.success(res, {
    modules: modules.map(m => ({ ...m.toJSON(), level: levelOf(m.id) })),
    permissions: await Role.getEffectivePermissions(req.user.role),
  });
});

// GET /modules/all — superuser only: all modules + roles summary
router.get('/all', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superuser') {
    return ResponseFormatter.forbidden(res, 'Solo el superusuario puede ver la configuración completa');
  }

  const modules = (await Module.getAll()).map(m => m.toJSON());
  const roles   = (await Role.getAll()).map(async r => ({
    id:                   r.id,
    name:                 r.name,
    moduleAccess:         r.moduleAccess,
    effectivePermissions: await Role.getEffectivePermissions(r.name),
  }));

  return ResponseFormatter.success(res, { modules, roles: await Promise.all(roles) });
});

module.exports = router;
