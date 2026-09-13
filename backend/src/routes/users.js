const express = require('express');
const User = require('../models/User');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware, tokenManager } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), (req, res) => {
  const users = User.getAll();

  const safeUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    photo: user.photo || 'https://via.placeholder.com/40?text=👤',
    isActive: user.isActive === 'true' || user.isActive === true,
    createdAt: user.createdAt
  }));

  return ResponseFormatter.success(res, {
    message: 'Usuarios obtenidos exitosamente',
    total: safeUsers.length,
    users: safeUsers
  });
});

router.get('/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user.userId;

  const user = User.findById(userId);
  if (!user) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = User.findById(requesterId);
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

router.patch('/:userId', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), (req, res) => {
  const { userId } = req.params;
  const { name, photo } = req.body;
  const requesterId = req.user.userId;

  const targetUser = User.findById(userId);
  if (!targetUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = User.findById(requesterId);
  if (requester.role === 'administrador' && targetUser.role === 'superuser') {
    return ResponseFormatter.forbidden(res, 'No puedes editar a un superuser');
  }

  if (!name) {
    return ResponseFormatter.badRequest(res, 'El nombre es requerido');
  }

  const updates = {};
  if (name) updates.name = name;
  if (photo) updates.photo = photo;

  const updatedUser = User.updateProfile(userId, updates);
  if (!updatedUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  return ResponseFormatter.success(res, {
    message: 'Usuario actualizado exitosamente',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      photo: updatedUser.photo,
      role: updatedUser.role,
      isActive: updatedUser.isActive === 'true' || updatedUser.isActive === true
    }
  });
});

router.patch('/:userId/status', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  const requesterId = req.user.userId;

  if (typeof isActive !== 'boolean') {
    return ResponseFormatter.badRequest(res, 'El campo isActive debe ser un booleano');
  }

  if (userId === requesterId) {
    return ResponseFormatter.badRequest(res, 'No puedes cambiar tu propio estado');
  }

  const targetUser = User.findById(userId);
  if (!targetUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = User.findById(requesterId);
  if (requester.role === 'administrador' && targetUser.role === 'superuser') {
    return ResponseFormatter.forbidden(res, 'No puedes deshabilitar un superuser');
  }

  const updatedUser = User.toggleActive(userId, isActive);

  if (!isActive) {
    tokenManager.revokeAllUserTokens(userId, targetUser.email);
  }

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

router.post('/:userId/generate-password', authMiddleware, roleMiddleware.requireRole('superuser', 'administrador'), (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user.userId;

  const targetUser = User.findById(userId);
  if (!targetUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = User.findById(requesterId);
  if (requester.role === 'administrador' && targetUser.role === 'superuser') {
    return ResponseFormatter.forbidden(res, 'No puedes generar contraseña para un superuser');
  }

  const newPassword = User.generateRandomPassword();
  User.setPasswordForUser(userId, newPassword);

  return ResponseFormatter.success(res, {
    message: 'Contraseña generada exitosamente',
    userId: userId,
    newPassword: newPassword,
    warning: '⚠️ Comparte esta contraseña de forma segura. El usuario debe cambiarla en su primer login.'
  });
});

module.exports = router;
