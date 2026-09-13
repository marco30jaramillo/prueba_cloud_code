const express = require('express');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Mailer = require('../utils/mailer');
const ResponseFormatter = require('../utils/responseFormatter');
const { tokenUtils, authMiddleware, tokenManager } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');
const AuditLog = require('../models/AuditLog');
const PasswordValidator = require('../utils/passwordValidator');
const DataNormalizer = require('../utils/dataNormalizer');
const rateLimiter = require('../utils/rateLimiter');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const router = express.Router();

Role.initializeRoles();
Permission.initializePermissions();

router.post('/register', async (req, res) => {
  const { email, password, name, photo } = req.body;

  if (!email || !password || !name) {
    return ResponseFormatter.badRequest(res, 'Campos requeridos faltantes', {
      email: email ? '✅' : '❌ requerido',
      password: password ? '✅' : '❌ requerido',
      name: name ? '✅' : '❌ requerido'
    });
  }

  const passwordValidation = PasswordValidator.validatePassword(password);
  if (!passwordValidation.valid) {
    return ResponseFormatter.badRequest(res, 'La contraseña no cumple con los requisitos de seguridad', {
      requirements: PasswordValidator.getPasswordRequirements().requirements,
      errors: passwordValidation.errors
    });
  }

  const normalizedEmail = DataNormalizer.normalizeEmail(email);
  const existingUser = await User.findByEmail(normalizedEmail);
  if (existingUser) {
    return ResponseFormatter.conflict(res, `El email ${normalizedEmail} ya está registrado`);
  }

  const user = await User.create(email, password, name, 'cliente', photo);
  Mailer.sendWelcomeEmail(email, name);

  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  await tokenManager.addGrantedToken(tokenId, user.id, email, token, expiresAt);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logUserCreation(user.id, user.id, email, 'cliente', ipAddress, userAgent);

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

router.post('/login', rateLimiter.middleware, async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);

  if (!email || !password) {
    return ResponseFormatter.badRequest(res, 'Email y contraseña son requeridos');
  }

  if (!EMAIL_REGEX.test(email)) {
    return ResponseFormatter.badRequest(res, 'El formato del email es inválido');
  }

  const { user, reason } = await User.authenticate(email, password);

  if (!user) {
    await auditMiddleware.logFailedLoginAttempt(email, ipAddress, userAgent,
      reason === 'account_disabled' ? 'Cuenta deshabilitada' : 'Credenciales incorrectas'
    );
    rateLimiter.recordFailure(ipAddress);

    if (reason === 'account_disabled') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está deshabilitada. Contacta al administrador.',
        code: 'ACCOUNT_DISABLED'
      });
    }
    return ResponseFormatter.unauthorized(res, 'Email o contraseña incorrectos. Verifica tus datos e intenta nuevamente');
  }

  // Login correcto: resetear contador de intentos fallidos
  rateLimiter.reset(ipAddress);

  const tokenDuration = rememberMe ? 7 * 24 * 3600 : 24 * 3600;
  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId(
    { userId: user.id, email: user.email, role: user.role },
    tokenDuration
  );
  await tokenManager.addGrantedToken(tokenId, user.id, user.email, token, expiresAt);

  await auditMiddleware.logLogin(user.id, ipAddress, userAgent, true);

  return ResponseFormatter.success(res, {
    message: 'Sesión iniciada exitosamente',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword === 'true' || user.mustChangePassword === true
    },
    token
  });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // Respuesta genérica siempre para evitar user enumeration
  const GENERIC_RESPONSE = {
    message: 'Si ese email está registrado, recibirás un enlace de recuperación.',
    hint: 'Revisa tu bandeja de entrada y carpeta de spam'
  };

  if (!email || !EMAIL_REGEX.test(email)) {
    return ResponseFormatter.badRequest(res, 'Email inválido');
  }

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);

  const user = await User.findByEmail(DataNormalizer.normalizeEmail(email));
  if (!user) {
    // No revelar que el email no existe — respuesta idéntica al éxito
    return ResponseFormatter.success(res, GENERIC_RESPONSE);
  }

  const resetToken = User.generatePasswordResetToken();
  await User.setResetToken(user.id, resetToken);
  Mailer.sendPasswordResetEmail(email, resetToken);
  await auditMiddleware.logPasswordResetRequest(email, ipAddress, userAgent);

  return ResponseFormatter.success(res, GENERIC_RESPONSE);
});

router.post('/reset-password', async (req, res) => {
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

  const user = await User.findByResetToken(token);
  if (!user) {
    return ResponseFormatter.badRequest(res, 'Token de recuperación inválido o expirado', {
      hint: 'Solicita un nuevo enlace de recuperación'
    });
  }

  await User.resetPassword(user.id, newPassword);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordChange(user.id, user.id, ipAddress, userAgent, false);

  return ResponseFormatter.success(res, {
    message: 'Contraseña restablecida exitosamente',
    email: user.email,
    hint: 'Puedes iniciar sesión con tu nueva contraseña'
  });
});

router.post('/bootstrap-superuser', async (req, res) => {
  if (await User.isSuperuserExists()) {
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

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return ResponseFormatter.conflict(res, `El email ${email} ya está registrado`);
  }

  const user = await User.create(email, password, name, 'superuser');
  Mailer.sendWelcomeEmail(email, name);

  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  await tokenManager.addGrantedToken(tokenId, user.id, email, token, expiresAt);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logUserCreation(user.id, user.id, user.email, 'superuser', ipAddress, userAgent);

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

router.post('/create-user', authMiddleware, async (req, res) => {
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

  if (!await Role.canCreateRole(creatorRole, targetRole)) {
    return ResponseFormatter.forbidden(res, `Tu rol '${creatorRole}' no puede crear usuarios con rol '${targetRole}'`, {
      your_role: creatorRole,
      target_role: targetRole,
      allowed_roles: creatorRole === 'superuser' ? ['superuser', 'administrador', 'vendedor', 'cliente'] : ['vendedor', 'cliente']
    });
  }

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return ResponseFormatter.conflict(res, `El email ${email} ya está registrado`);
  }

  const user = await User.create(email, password, name, targetRole);
  Mailer.sendWelcomeEmail(email, name);

  const { token, tokenId, expiresAt } = tokenUtils.generateTokenWithId({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  await tokenManager.addGrantedToken(tokenId, user.id, email, token, expiresAt);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logUserCreation(req.user.userId, user.id, email, targetRole, ipAddress, userAgent);

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

router.get('/user-schema/:roleType', async (req, res) => {
  const { roleType } = req.params;
  const role = await Role.getByName(roleType);

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

router.get('/validate', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  return ResponseFormatter.success(res, {
    message: 'Sesión válida ✅',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword === 'true' || user.mustChangePassword === true
    },
    token_expires_at: new Date(req.user.exp * 1000).toISOString()
  });
});

router.post('/logout', authMiddleware, async (req, res) => {
  const token = req.token;
  const userId = req.user.userId;
  const email = req.user.email;

  await tokenManager.revokeToken(userId, token, req.user.exp);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logLogout(userId, ipAddress, userAgent);

  return ResponseFormatter.success(res, {
    message: 'Sesión cerrada exitosamente',
    email,
    details: 'Tu token ha sido revocado y no se puede usar más'
  });
});

router.post('/logout-all', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const email = req.user.email;

  const revokedCount = await tokenManager.revokeAllUserTokens(userId, email);

  return ResponseFormatter.success(res, {
    message: `Sesiones cerradas en todos los dispositivos`,
    email,
    sessionsRevoked: revokedCount,
    details: `Se revocaron ${revokedCount} sesiones activas. Necesitarás iniciar sesión nuevamente en todos tus dispositivos.`
  });
});

router.patch('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return ResponseFormatter.badRequest(res, 'Campos requeridos faltantes');
  }

  if (newPassword.length < 8) {
    return ResponseFormatter.badRequest(res, 'La nueva contraseña debe tener al menos 8 caracteres');
  }

  if (newPassword !== confirmPassword) {
    return ResponseFormatter.badRequest(res, 'Las contraseñas no coinciden');
  }

  const result = await User.changePassword(userId, currentPassword, newPassword);
  if (result && result.error) {
    return ResponseFormatter.badRequest(res, result.error);
  }

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordChange(userId, userId, ipAddress, userAgent, false);

  return ResponseFormatter.success(res, {
    message: 'Contraseña cambiada exitosamente'
  });
});

router.patch('/profile', authMiddleware, async (req, res) => {
  const { name, photo } = req.body;
  const userId = req.user.userId;

  if (!name) {
    return ResponseFormatter.badRequest(res, 'El nombre es requerido');
  }

  const updates = {};
  if (name) updates.name = name;
  if (photo) updates.photo = photo;

  const updatedUser = await User.updateProfile(userId, updates);
  if (!updatedUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logProfileUpdate(userId, ipAddress, userAgent, updates);

  return ResponseFormatter.success(res, {
    message: 'Perfil actualizado exitosamente',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      photo: updatedUser.photo,
      role: updatedUser.role
    }
  });
});

router.patch('/password/:userId', authMiddleware, roleMiddleware.requireRole(['superuser', 'administrador']), async (req, res) => {
  const { newPassword } = req.body;
  const { userId } = req.params;
  const requesterId = req.user.userId;

  if (!newPassword) {
    return ResponseFormatter.badRequest(res, 'Nueva contraseña es requerida');
  }

  if (newPassword.length < 8) {
    return ResponseFormatter.badRequest(res, 'La nueva contraseña debe tener al menos 8 caracteres');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const requester = await User.findById(requesterId);
  if (requester.role === 'administrador' && targetUser.role === 'superuser') {
    return ResponseFormatter.forbidden(res, 'No puedes cambiar la contraseña de un superuser');
  }

  await User.setPasswordForUser(userId, newPassword);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordChange(requesterId, userId, ipAddress, userAgent, true);

  return ResponseFormatter.success(res, {
    message: 'Contraseña del usuario actualizada exitosamente',
    userId: userId
  });
});

router.patch('/change-password-temporary', authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.userId;

  if (!newPassword) {
    return ResponseFormatter.badRequest(res, 'Nueva contraseña es requerida');
  }

  if (newPassword.length < 8) {
    return ResponseFormatter.badRequest(res, 'La nueva contraseña debe tener al menos 8 caracteres');
  }

  const updatedUser = await User.completeTemporaryPasswordChange(userId, newPassword);

  if (!updatedUser) {
    return ResponseFormatter.notFound(res, 'Usuario');
  }

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordChange(userId, userId, ipAddress, userAgent, false);

  return ResponseFormatter.success(res, {
    message: 'Contraseña actualizada exitosamente',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      mustChangePassword: false
    }
  });
});

module.exports = router;
