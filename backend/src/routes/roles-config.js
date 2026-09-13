const express = require('express');
const Role    = require('../models/Role');
const Module  = require('../models/Module');
const ResponseFormatter  = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const roleMiddleware     = require('../middleware/roleMiddleware');
const auditMiddleware    = require('../middleware/auditMiddleware');

const router = express.Router();

// ── GET /roles-config ─────────────────────────────────────
router.get('/', authMiddleware, roleMiddleware.requirePermission('admin:view-roles'), async (req, res) => {
  const modules = await Module.getAll();
  const roles   = await Role.getAll();

  const modulePermSet = new Set();
  modules.forEach(mod => {
    [...mod.permRead, ...mod.permWrite, ...mod.permFull].forEach(p => modulePermSet.add(p));
  });

  const rolesData = await Promise.all(roles.map(async (role) => {
    const effective   = await Role.getEffectivePermissions(role.name);
    const directPerms = role.permissions;
    const orphan = directPerms.filter(p => p !== 'system:full-access' && !modulePermSet.has(p));
    return {
      id:                   role.id,
      name:                 role.name,
      description:          role.description,
      moduleAccess:         role.moduleAccess,
      directPermissions:    directPerms,
      orphanPermissions:    orphan,
      effectivePermissions: effective,
    };
  }));

  return ResponseFormatter.success(res, {
    modules:        modules.map(m => m.toJSON()),
    roles:          rolesData,
    allModulePerms: [...modulePermSet].sort(),
  });
});

// ── POST /roles-config — create a new role ────────────────
router.post('/', authMiddleware, roleMiddleware.requirePermission('admin:manage-roles'), async (req, res) => {
  const { name, description, moduleAccess = [], directPermissions = [] } = req.body;

  if (!name || !name.trim()) {
    return ResponseFormatter.badRequest(res, 'El nombre del rol es requerido');
  }

  const safeName = name.trim().toLowerCase().replace(/\s+/g, '_');

  if (await Role.getByName(safeName)) {
    return ResponseFormatter.conflict(res, `Ya existe un rol con el nombre "${safeName}"`);
  }

  const VALID_LEVELS = new Set(['read', 'write', 'full']);
  for (const entry of moduleAccess) {
    if (!VALID_LEVELS.has(entry.level)) {
      return ResponseFormatter.badRequest(res, `Nivel inválido: ${entry.level}. Use read, write o full`);
    }
  }

  await Role.createRole({
    name:        safeName,
    description: description || `Rol ${safeName}`,
    moduleAccess,
    permissions: directPermissions,
    canManage:   [],
  });

  const created = await Role.getByName(safeName);

  auditMiddleware.logRoleCreated(
    req.user.userId,
    safeName,
    moduleAccess,
    auditMiddleware.getIpAddress(req),
    auditMiddleware.getUserAgent(req),
  ).catch(() => {});

  return ResponseFormatter.success(res, {
    message: `Rol "${safeName}" creado correctamente`,
    role: {
      id:                   created.id,
      name:                 created.name,
      description:          created.description,
      moduleAccess:         created.moduleAccess,
      directPermissions:    created.permissions,
      effectivePermissions: await Role.getEffectivePermissions(created.name),
    },
  });
});

// ── PATCH /roles-config/:roleId — update a role ──────────
router.patch('/:roleId', authMiddleware, roleMiddleware.requirePermission('admin:manage-roles'), async (req, res) => {
  const { roleId } = req.params;
  const { moduleAccess, directPermissions } = req.body;

  const role = await Role.getById(roleId);
  if (!role) return ResponseFormatter.notFound(res, 'Rol no encontrado');

  let perms = directPermissions;
  if (role.name === 'superuser' && perms !== undefined && !perms.includes('system:full-access')) {
    perms = ['system:full-access', ...perms];
  }

  const VALID_LEVELS = new Set(['read', 'write', 'full']);
  if (moduleAccess) {
    for (const entry of moduleAccess) {
      if (!VALID_LEVELS.has(entry.level)) {
        return ResponseFormatter.badRequest(res, `Nivel inválido: ${entry.level}. Use read, write o full`);
      }
    }
  }

  await Role.updateRole(roleId, {
    moduleAccess: moduleAccess !== undefined ? moduleAccess : undefined,
    permissions:  perms        !== undefined ? perms        : undefined,
  });

  const updated = await Role.getById(roleId);
  const ip = auditMiddleware.getIpAddress(req);
  const ua = auditMiddleware.getUserAgent(req);

  if (moduleAccess !== undefined) {
    auditMiddleware.logRoleModulesUpdated(
      req.user.userId, roleId, role.name,
      { before: role.moduleAccess, after: moduleAccess }, ip, ua,
    ).catch(() => {});
  }
  if (perms !== undefined) {
    auditMiddleware.logRolePermissionsUpdated(
      req.user.userId, roleId, role.name,
      { before: role.permissions, after: perms }, ip, ua,
    ).catch(() => {});
  }

  return ResponseFormatter.success(res, {
    message: 'Rol actualizado correctamente',
    role: {
      id:                   updated.id,
      name:                 updated.name,
      moduleAccess:         updated.moduleAccess,
      directPermissions:    updated.permissions,
      effectivePermissions: await Role.getEffectivePermissions(updated.name),
    },
  });
});

module.exports = router;
