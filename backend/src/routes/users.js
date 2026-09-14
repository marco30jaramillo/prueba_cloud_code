const express = require('express');
const User = require('../models/User');
const Role = require('../models/Role');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware, tokenManager } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');

const router = express.Router();

// Returns the roles that the current user can create/manage
// Superuser always gets ALL roles (including custom ones)
router.get('/manageable-roles', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), async (req, res) => {
  if (req.user.role === 'superuser') {
    const allRoles = (await Role.getAll()).map(r => r.name);
    return ResponseFormatter.success(res, { roles: allRoles });
  }
  const manageableRoles = await Role.getManageableRoles(req.user.role);
  return ResponseFormatter.success(res, { roles: manageableRoles });
});

router.get('/', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), async (req, res) => {
  const requesterRole = req.user.role;
  const allUsers = await User.getAll();

  const allowed = await Role.getManageableRoles(requesterRole);
  const filtered = allUsers.filter(u => allowed.includes(u.role));

  const safeUsers = filtered.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    photo: user.photo || '/datos/default/default-avatar.svg',
    isActive: user.isActive === 'true' || user.isActive === true,
    mustChangePassword: user.mustChangePassword === 'true' || user.mustChangePassword === true,
    createdAt: user.createdAt
  }));

  return ResponseFormatter.success(res, {
    message: 'Usuarios obtenidos exitosamente',
    total: safeUsers.length,
    users: safeUsers
  });
});

// GET /users/clientes/buscar?q= — busca clientes para registrar vales; requiere solo vale:crear
router.get('/clientes/buscar', authMiddleware, roleMiddleware.requirePermission('vale:crear'), async (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (q.length < 2) return ResponseFormatter.success(res, { clientes: [] });
  try {
    const allUsers = await User.getAll();
    const clientes = allUsers
      .filter(u => u.role === 'cliente' && (u.isActive === true || u.isActive === 'true'))
      .filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 10)
      .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
    return ResponseFormatter.success(res, { clientes });
  } catch { return ResponseFormatter.internalError(res, 'Error al buscar clientes'); }
});

router.get('/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user.userId;

  const user = await User.findById(userId);
  if (!user) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = await User.findById(requesterId);
  if (requester.role !== 'superuser' && requester.role !== 'administrador' && userId !== requesterId) {
    return ResponseFormatter.forbidden(res, 'No tienes permiso para ver este usuario');
  }

  return ResponseFormatter.success(res, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      photo: user.photo || 'https://via.placeholder.com/40?text=👤',
      isActive: user.isActive === 'true' || user.isActive === true,
      createdAt: user.createdAt
    }
  });
});

router.patch('/:userId', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), async (req, res) => {
  const { userId } = req.params;
  const { name, photo, role } = req.body;
  const requesterId = req.user.userId;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = await User.findById(requesterId);
  if (requester.role === 'administrador' && targetUser.role === 'superuser') {
    return ResponseFormatter.forbidden(res, 'No puedes editar a un superuser');
  }

  if (!name && !photo && !role) {
    return ResponseFormatter.badRequest(res, 'Se requiere al menos un campo para actualizar');
  }

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);

  // Handle role change
  if (role && role !== targetUser.role) {
    if (requester.role !== 'superuser') {
      const canManage = await Role.getManageableRoles(requester.role);
      if (!canManage.includes(role)) {
        return ResponseFormatter.forbidden(res, `No tienes permiso para asignar el rol "${role}"`);
      }
    }
    await User.update(userId, { role });
    auditMiddleware.logUserRoleChanged(requesterId, userId, targetUser.role, role, ipAddress, userAgent).catch(() => {});
  }

  const profileUpdates = {};
  if (name) profileUpdates.name = name;
  if (photo) profileUpdates.photo = photo;

  let updatedUser = await User.findById(userId);
  if (Object.keys(profileUpdates).length) {
    updatedUser = await User.updateProfile(userId, profileUpdates) || updatedUser;
    await auditMiddleware.logProfileUpdate(requesterId, ipAddress, userAgent, profileUpdates);
  }

  return ResponseFormatter.success(res, {
    message: 'Usuario actualizado exitosamente',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      photo: updatedUser.photo,
      role: updatedUser.role,
      isActive: updatedUser.isActive === 'true' || updatedUser.isActive === true,
    },
  });
});

router.patch('/:userId/status', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  const requesterId = req.user.userId;

  if (typeof isActive !== 'boolean') {
    return ResponseFormatter.badRequest(res, 'El campo isActive debe ser un booleano');
  }

  if (userId === requesterId) {
    return ResponseFormatter.badRequest(res, 'No puedes cambiar tu propio estado');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = await User.findById(requesterId);
  if (requester.role === 'administrador' && targetUser.role === 'superuser') {
    return ResponseFormatter.forbidden(res, 'No puedes deshabilitar un superuser');
  }

  const updatedUser = await User.toggleActive(userId, isActive);

  if (!isActive) {
    await tokenManager.revokeAllUserTokens(userId, targetUser.email);
  }

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logUserStatusChange(requesterId, userId, isActive, ipAddress, userAgent);

  return ResponseFormatter.success(res, {
    message: `Usuario ${isActive ? 'habilitado' : 'deshabilitado'} exitosamente`,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive === 'true' || updatedUser.isActive === true
    }
  });
});

router.post('/:userId/generate-password', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user.userId;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = await User.findById(requesterId);
  if (requester.role === 'administrador' && targetUser.role === 'superuser') {
    return ResponseFormatter.forbidden(res, 'No puedes generar contraseña para un superuser');
  }

  const newPassword = User.generateRandomPassword();
  await User.setPasswordForUser(userId, newPassword);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordGeneration(requesterId, userId, ipAddress, userAgent);

  return ResponseFormatter.success(res, {
    message: 'Contraseña generada exitosamente',
    userId: userId,
    newPassword: newPassword,
    warning: '⚠️ Comparte esta contraseña de forma segura. El usuario debe cambiarla en su primer login.'
  });
});

module.exports = router;
