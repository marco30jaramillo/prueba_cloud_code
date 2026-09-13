const express = require('express');
const fs      = require('fs');
const path    = require('path');
const Role    = require('../models/Role');
const Module  = require('../models/Module');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const roleMiddleware     = require('../middleware/roleMiddleware');

const router = express.Router();

// ── GET /roles-config ─────────────────────────────────────
router.get('/', authMiddleware, roleMiddleware.requirePermission('admin:view-roles'), (req, res) => {
  const modules = Module.getAll();
  const roles   = Role.getAll();

  const modulePermSet = new Set();
  modules.forEach(mod => {
    [...mod.permRead, ...mod.permWrite, ...mod.permFull].forEach(p => modulePermSet.add(p));
  });

  const rolesData = roles.map(role => {
    const effective  = Role.getEffectivePermissions(role.name);
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
  });

  return ResponseFormatter.success(res, {
    modules:        modules.map(m => m.toJSON()),
    roles:          rolesData,
    allModulePerms: [...modulePermSet].sort(),
  });
});

// ── POST /roles-config — create a new role ────────────────
router.post('/', authMiddleware, roleMiddleware.requirePermission('admin:manage-roles'), (req, res) => {
  const { name, description, moduleAccess = [], directPermissions = [] } = req.body;

  if (!name || !name.trim()) {
    return ResponseFormatter.badRequest(res, 'El nombre del rol es requerido');
  }

  const safeName = name.trim().toLowerCase().replace(/\s+/g, '_');

  // Check duplicate
  const existing = Role.getByName(safeName);
  if (existing) {
    return ResponseFormatter.conflict(res, `Ya existe un rol con el nombre "${safeName}"`);
  }

  // Validate levels
  const VALID_LEVELS = new Set(['read', 'write', 'full']);
  for (const entry of moduleAccess) {
    if (!VALID_LEVELS.has(entry.level)) {
      return ResponseFormatter.badRequest(res, `Nivel inválido: ${entry.level}. Use read, write o full`);
    }
  }

  Role.createRole({
    name:         safeName,
    description:  description || `Rol ${safeName}`,
    moduleAccess,
    permissions:  directPermissions,
    canManage:    [],
  });

  const created = Role.getByName(safeName);
  return ResponseFormatter.success(res, {
    message: `Rol "${safeName}" creado correctamente`,
    role: {
      id:                   created.id,
      name:                 created.name,
      description:          created.description,
      moduleAccess:         created.moduleAccess,
      directPermissions:    created.permissions,
      effectivePermissions: Role.getEffectivePermissions(created.name),
    },
  });
});

// ── PATCH /roles-config/:roleId — update a role ──────────
router.patch('/:roleId', authMiddleware, roleMiddleware.requirePermission('admin:manage-roles'), (req, res) => {
  const { roleId } = req.params;
  const { moduleAccess, directPermissions } = req.body;

  const role = Role.getById(roleId);
  if (!role) return ResponseFormatter.notFound(res, 'Rol no encontrado');

  // Never strip system:full-access from superuser
  let perms = directPermissions;
  if (role.name === 'superuser' && perms !== undefined) {
    if (!perms.includes('system:full-access')) {
      perms = ['system:full-access', ...perms];
    }
  }

  const VALID_LEVELS = new Set(['read', 'write', 'full']);
  if (moduleAccess) {
    for (const entry of moduleAccess) {
      if (!VALID_LEVELS.has(entry.level)) {
        return ResponseFormatter.badRequest(res, `Nivel inválido: ${entry.level}. Use read, write o full`);
      }
    }
  }

  Role.updateRole(roleId, {
    moduleAccess: moduleAccess !== undefined ? moduleAccess : undefined,
    permissions:  perms        !== undefined ? perms        : undefined,
  });

  const updated = Role.getById(roleId);
  return ResponseFormatter.success(res, {
    message: 'Rol actualizado correctamente',
    role: {
      id:                   updated.id,
      name:                 updated.name,
      moduleAccess:         updated.moduleAccess,
      directPermissions:    updated.permissions,
      effectivePermissions: Role.getEffectivePermissions(updated.name),
    },
  });
});

module.exports = router;
