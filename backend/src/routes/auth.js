const express = require('express');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Mailer = require('../utils/mailer');
const ResponseFormatter = require('../utils/responseFormatter');
const { tokenUtils, authMiddleware, tokenManager } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

Role.initializeRoles();
Permission.initializePermissions();

router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return ResponseFormatter.badRequest(res, 'Campos requeridos faltantes', {
      email: email ? '✅' : '❌ requerido',
      password: password ? '✅' : '❌ requerido',
      name: name ? '✅' : '❌ requerido'
    });
  }

  if (password.length < 8) {
    return ResponseFormatter.badRequest(res, 'La contraseña debe tener al menos 8 caracteres', {
      password: `${password.length}/8 caracteres`
    });
  }

  const existingUser = User.findByEmail(email);
  if (existingUser) {
    return ResponseFormatter.conflict(res, `El email ${email} ya está registrado`);
  }

  const user = User.create(email, password, name, 'cliente');
  Mailer.sendWelcomeEmail(email, name);

  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  tokenManager.addGrantedToken(tokenId, user.id, email, token, expiresAt);

  return ResponseFormatter.success(res, {
    message: 'Usuario registrado exitosamente',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token
  }, 201);
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return ResponseFormatter.badRequest(res, 'Email y contraseña son requeridos', {
      email: email ? '✅' : '❌ requerido',
      password: password ? '✅' : '❌ requerido'
    });
  }

  const user = User.authenticate(email, password);
  if (!user) {
    return ResponseFormatter.unauthorized(res, 'Email o contraseña incorrectos');
  }

  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  tokenManager.addGrantedToken(tokenId, user.id, email, token, expiresAt);

  return ResponseFormatter.success(res, {
    message: 'Sesión iniciada exitosamente',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token
  });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return ResponseFormatter.badRequest(res, 'Email requerido');
  }

  const user = User.findByEmail(email);
  if (!user) {
    return ResponseFormatter.notFound(res, `Usuario con email ${email}`);
  }

  const resetToken = User.generatePasswordResetToken();
  User.setResetToken(user.id, resetToken);
  Mailer.sendPasswordResetEmail(email, resetToken);

  return ResponseFormatter.success(res, {
    message: 'Se envió un enlace de recuperación a tu email',
    email,
    hint: 'Revisa tu bandeja de entrada'
  });
});

router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return ResponseFormatter.badRequest(res, 'Token y contraseña nueva son requeridos', {
      token: token ? '✅' : '❌ requerido',
      newPassword: newPassword ? '✅' : '❌ requerido'
    });
  }

  if (newPassword.length < 8) {
    return ResponseFormatter.badRequest(res, 'La contraseña debe tener al menos 8 caracteres', {
      newPassword: `${newPassword.length}/8 caracteres`
    });
  }

  const user = User.findByResetToken(token);
  if (!user) {
    return ResponseFormatter.badRequest(res, 'Token de recuperación inválido o expirado', {
      hint: 'Solicita un nuevo enlace de recuperación'
    });
  }

  User.resetPassword(user.id, newPassword);

  return ResponseFormatter.success(res, {
    message: 'Contraseña restablecida exitosamente',
    email: user.email,
    hint: 'Puedes iniciar sesión con tu nueva contraseña'
  });
});

router.post('/bootstrap-superuser', (req, res) => {
  if (User.isSuperuserExists()) {
    return ResponseFormatter.badRequest(res, 'Ya existe un super usuario en el sistema', {
      hint: 'Para crear más super usuarios, necesitas tener un token de super usuario'
    });
  }

  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return ResponseFormatter.badRequest(res, 'Campos requeridos faltantes', {
      email: email ? '✅' : '❌ requerido',
      password: password ? '✅' : '❌ requerido',
      name: name ? '✅' : '❌ requerido'
    });
  }

  if (password.length < 8) {
    return ResponseFormatter.badRequest(res, 'La contraseña debe tener al menos 8 caracteres', {
      password: `${password.length}/8 caracteres`
    });
  }

  const existingUser = User.findByEmail(email);
  if (existingUser) {
    return ResponseFormatter.conflict(res, `El email ${email} ya está registrado`);
  }

  const user = User.create(email, password, name, 'superuser');
  Mailer.sendWelcomeEmail(email, name);

  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  tokenManager.addGrantedToken(tokenId, user.id, email, token, expiresAt);

  return ResponseFormatter.success(res, {
    message: 'Super usuario creado exitosamente',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token
  }, 201);
});

router.post('/create-user', authMiddleware, (req, res) => {
  const { email, password, name, role: targetRole } = req.body;
  const creatorRole = req.user.role;

  if (!email || !password || !name || !targetRole) {
    return ResponseFormatter.badRequest(res, 'Campos requeridos faltantes', {
      email: email ? '✅' : '❌ requerido',
      password: password ? '✅' : '❌ requerido',
      name: name ? '✅' : '❌ requerido',
      role: targetRole ? '✅' : '❌ requerido'
    });
  }

  if (password.length < 8) {
    return ResponseFormatter.badRequest(res, 'La contraseña debe tener al menos 8 caracteres', {
      password: `${password.length}/8 caracteres`
    });
  }

  if (!Role.canCreateRole(creatorRole, targetRole)) {
    return ResponseFormatter.forbidden(res, `Tu rol '${creatorRole}' no puede crear usuarios con rol '${targetRole}'`, {
      your_role: creatorRole,
      target_role: targetRole,
      allowed_roles: creatorRole === 'superuser' ? ['superuser', 'administrador', 'vendedor', 'cliente'] : ['vendedor', 'cliente']
    });
  }

  const existingUser = User.findByEmail(email);
  if (existingUser) {
    return ResponseFormatter.conflict(res, `El email ${email} ya está registrado`);
  }

  const user = User.create(email, password, name, targetRole);
  Mailer.sendWelcomeEmail(email, name);

  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  tokenManager.addGrantedToken(tokenId, user.id, email, token, expiresAt);

  return ResponseFormatter.success(res, {
    message: `Usuario con rol '${targetRole}' creado exitosamente`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token
  }, 201);
});

router.get('/user-schema/:roleType', (req, res) => {
  const { roleType } = req.params;
  const role = Role.getByName(roleType);

  if (!role) {
    return ResponseFormatter.notFound(res, `Rol '${roleType}'`, {
      available_roles: ['superuser', 'administrador', 'vendedor', 'cliente']
    });
  }

  const userSchema = {
    roleType: role.name,
    description: role.description,
    permissions: role.permissions,
    formFields: {
      superuser: ['email', 'password', 'name', 'role'],
      administrador: ['email', 'password', 'name', 'role'],
      vendedor: ['email', 'password', 'name'],
      cliente: ['email', 'password', 'name']
    }[roleType] || ['email', 'password', 'name'],
    constraints: {
      email: { type: 'string', required: true, pattern: 'email' },
      password: { type: 'string', required: true, minLength: 8 },
      name: { type: 'string', required: true, minLength: 2 },
      role: { type: 'enum', required: false, values: ['superuser', 'administrador', 'vendedor', 'cliente'] }
    }
  };

  return ResponseFormatter.success(res, userSchema);
});

router.get('/validate', authMiddleware, (req, res) => {
  const user = User.findById(req.user.userId);

  if (!user) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  return ResponseFormatter.success(res, {
    message: 'Sesión válida ✅',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token_expires_at: new Date(req.user.exp * 1000).toISOString()
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  const token = req.token;
  const userId = req.user.userId;
  const email = req.user.email;

  tokenManager.revokeToken(userId, token, req.user.exp);

  return ResponseFormatter.success(res, {
    message: 'Sesión cerrada exitosamente',
    email,
    details: 'Tu token ha sido revocado y no se puede usar más'
  });
});

module.exports = router;
