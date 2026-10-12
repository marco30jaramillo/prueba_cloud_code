const express = require('express');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const accountMail = require('../mail/accountMail');
const mailService = require('../mail/mailService');
const ResponseFormatter = require('../utils/responseFormatter');
const { tokenUtils, authMiddleware, tokenManager } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');
const AuditLog = require('../models/AuditLog');
const PasswordValidator = require('../utils/passwordValidator');
const DataNormalizer = require('../utils/dataNormalizer');
const rateLimiter = require('../utils/rateLimiter');
const { createRequestLimiter } = require('../utils/requestLimiter');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const router = express.Router();

// 20 solicitudes por hora por IP en los endpoints que pueden enviar correo (register,
// forgot-password, resend-activation); 10 activaciones fallidas por 15 minutos por IP.
const mailRequestLimiter = createRequestLimiter({ name: 'mail', max: 20, windowMs: 60 * 60 * 1000, mode: 'hit' });
const activateLimiter = createRequestLimiter({ name: 'activate', max: 10, windowMs: 15 * 60 * 1000, mode: 'fail' });

const TOKEN_FORMAT = /^[0-9a-f]{64}$/i;
const ACTIVATION_INVALID_MESSAGE = 'El enlace de activación no es válido o ya venció. Solicita que te enviemos uno nuevo.';
const ACTIVATION_RESEND_GENERIC = {
  message: 'Si existe una cuenta pendiente de activación con ese correo, te enviaremos un nuevo enlace.',
  hint: 'Revisa tu bandeja de entrada y la carpeta de spam'
};

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

/** Trabajo diferido: responde primero y no deja que un fallo llegue al proceso. */
function inBackground(label, work) {
  setImmediate(() => {
    Promise.resolve().then(work).catch((err) => {
      console.error(`[auth] ${label} falló:`, (err && (err.code || err.name)) || 'error');
    });
  });
}

function requestContext(req) {
  return { ipAddress: auditMiddleware.getIpAddress(req), userAgent: auditMiddleware.getUserAgent(req) };
}

/**
 * Reenvía la activación de una cuenta pendiente, habilitada y vigente. No rota el token si
 * el envío se va a descartar por límite (evita invalidar el enlace de la víctima a base de
 * solicitudes). Nunca lanza hacia la petición: se usa en trabajo diferido.
 */
async function resendActivation(user, context) {
  if (!user || !user.isActive || user.activatedAt) return;
  const template = accountMail.activationTemplate(user.role, null);
  const verdict = await mailService.check(template, { to: user.email });
  if (!verdict.allowed) return;
  const rotated = await User.rotateActivationToken(user.id);
  if (!rotated) return;
  await accountMail.sendActivation(rotated.user, rotated.token, { context });
}

/** Respuesta 400 de contraseña que no cumple RN-43 (misma forma que el registro). */
function weakPasswordResponse(res, validation) {
  return ResponseFormatter.badRequest(res, 'La contraseña no cumple con los requisitos de seguridad', {
    requirements: PasswordValidator.getPasswordRequirements().requirements,
    errors: validation.errors
  });
}


router.post('/register', mailRequestLimiter.middleware, async (req, res) => {
  const { email, password, name, photo } = req.body;

  if (!email || !password || !name) {
    return ResponseFormatter.badRequest(res, 'Campos requeridos faltantes', {
      email: email ? 'ok' : 'es obligatorio',
      password: password ? 'ok' : 'es obligatorio',
      name: name ? 'ok' : 'es obligatorio'
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
    // Respuesta idéntica para cuenta activa, pendiente o deshabilitada. Si está pendiente,
    // se le reenvía la activación a su dueño sin avisar (trabajo diferido, sujeto a límites).
    if (existingUser.isActive && !existingUser.activatedAt) {
      const context = requestContext(req);
      inBackground('reenvío de activación (registro)', () => resendActivation(existingUser, context));
    }
    return ResponseFormatter.conflict(res, `El correo ${normalizedEmail} ya está registrado`);
  }

  // Toda cuenta nace pendiente y con cambio de contraseña forzado (también el autorregistro).
  const user = await User.create(email, password, name, 'cliente', photo, { pending: true, mustChangePassword: true });

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logUserCreation(user.id, user.id, user.email, 'cliente', ipAddress, userAgent);

  await accountMail.sendActivation(user, user.activationToken, {
    origin: 'self',
    context: { actorId: user.id, ipAddress, userAgent }
  });

  return ResponseFormatter.success(res, {
    message: 'Registro listo. Revisa tu correo para activar tu cuenta.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    pendingActivation: true
  }, 201);
});

router.post('/login', rateLimiter.middleware, async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);

  if (!email || !password) {
    return ResponseFormatter.badRequest(res, 'Escribe tu correo y tu contraseña');
  }

  if (!EMAIL_REGEX.test(email)) {
    return ResponseFormatter.badRequest(res, 'El correo no es válido');
  }

  const { user, reason } = await User.authenticate(email, password);

  if (!user) {
    if (reason === 'pending_activation') {
      // La contraseña es correcta: no cuenta como intento fallido. Solo puede abrir su enlace.
      await auditMiddleware.logFailedLoginAttempt(email, ipAddress, userAgent, 'Cuenta pendiente de activación');
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está pendiente de activación. Revisa tu correo (y la carpeta de spam) o solicita que te reenviemos el enlace.',
        code: 'ACCOUNT_PENDING_ACTIVATION'
      });
    }

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
    return ResponseFormatter.unauthorized(res, 'El correo o la contraseña no coinciden. Revisa tus datos e intenta de nuevo');
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
      photo: user.photo,
      role: user.role,
      mustChangePassword: user.mustChangePassword === 'true' || user.mustChangePassword === true
    },
    token
  });
});

router.post('/resend-activation', mailRequestLimiter.middleware, async (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return ResponseFormatter.badRequest(res, 'El correo no es válido');
  }

  const context = requestContext(req);
  const normalizedEmail = DataNormalizer.normalizeEmail(email);

  // La solicitud se registra siempre, exista o no la cuenta; el resto es trabajo diferido,
  // de modo que la respuesta tarda lo mismo en ambos casos.
  await auditMiddleware.logActivationResendRequested(normalizedEmail, context.ipAddress, context.userAgent);
  const user = await User.findByEmail(normalizedEmail);
  if (user) {
    inBackground('reenvío de activación', () => resendActivation(user, context));
  }

  return ResponseFormatter.success(res, ACTIVATION_RESEND_GENERIC);
});

router.post('/activate', activateLimiter.middleware, async (req, res) => {
  noStore(res);
  const { token } = req.body || {};

  // Mismo mensaje y código para: token mal formado, inexistente, vencido, reemplazado,
  // usado después del primer cambio de contraseña o cuenta deshabilitada.
  const result = typeof token === 'string' && TOKEN_FORMAT.test(token)
    ? await User.activateWithToken(token)
    : null;
  if (!result) {
    activateLimiter.fail(req);
    return ResponseFormatter.badRequest(res, ACTIVATION_INVALID_MESSAGE);
  }

  const { user, firstTime } = result;
  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);

  const session = tokenUtils.generateTokenWithId(
    { userId: user.id, email: user.email, role: user.role },
    24 * 3600
  );
  await tokenManager.addGrantedToken(session.tokenId, user.id, user.email, session.token, session.expiresAt);

  if (firstTime) await auditMiddleware.logAccountActivated(user.id, ipAddress, userAgent);
  await auditMiddleware.logLogin(user.id, ipAddress, userAgent, true);

  return ResponseFormatter.success(res, {
    message: 'Cuenta activada exitosamente',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      photo: user.photo,
      role: user.role,
      mustChangePassword: user.mustChangePassword === true || user.mustChangePassword === 'true'
    },
    token: session.token
  });
});

router.post('/forgot-password', mailRequestLimiter.middleware, async (req, res) => {
  const { email } = req.body;
  // Respuesta genérica siempre para evitar user enumeration
  const GENERIC_RESPONSE = {
    message: 'Si ese correo está registrado, recibirás un enlace para recuperar tu contraseña.',
    hint: 'Revisa tu bandeja de entrada y carpeta de spam'
  };

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return ResponseFormatter.badRequest(res, 'El correo no es válido');
  }

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);

  // La solicitud se registra siempre y la respuesta es idéntica exista o no la cuenta; token,
  // envío y auditoría del envío van en trabajo diferido para que tarde lo mismo en ambos casos.
  const normalizedEmail = DataNormalizer.normalizeEmail(email);
  await auditMiddleware.logPasswordResetRequest(normalizedEmail, ipAddress, userAgent);
  const user = await User.findByEmail(normalizedEmail);

  // Una cuenta deshabilitada no restablece contraseña. Una pendiente recibe la activación,
  // no el enlace de recuperación (evita activar por la puerta de atrás).
  if (user && user.isActive) {
    const context = { ipAddress, userAgent };
    inBackground('recuperación de contraseña', async () => {
      if (!user.activatedAt) {
        await resendActivation(user, context);
        return;
      }
      const verdict = await mailService.check('passwordReset', { to: user.email });
      if (!verdict.allowed) return;
      const resetToken = User.generatePasswordResetToken();
      await User.setResetToken(user.id, resetToken);
      await accountMail.sendPasswordReset(user, resetToken, context);
    });
  }

  return ResponseFormatter.success(res, GENERIC_RESPONSE);
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return ResponseFormatter.badRequest(res, 'Falta el enlace de recuperación o la contraseña nueva', {
      token: token ? 'ok' : 'es obligatorio',
      newPassword: newPassword ? 'ok' : 'es obligatorio'
    });
  }

  if (typeof token !== 'string' || typeof newPassword !== 'string') {
    return ResponseFormatter.badRequest(res, 'Falta el enlace de recuperación o la contraseña nueva');
  }

  // RN-43: la complejidad completa, antes de gastar el token.
  const passwordValidation = PasswordValidator.validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return weakPasswordResponse(res, passwordValidation);
  }

  // Una sola sentencia: el token sirve una vez, vence en una hora, y no sirve para cuentas
  // pendientes ni deshabilitadas.
  const user = await User.resetPasswordWithToken(token, newPassword);
  if (!user) {
    return ResponseFormatter.badRequest(res, 'El enlace de recuperación no es válido o ya venció', {
      hint: 'Solicita un nuevo enlace de recuperación'
    });
  }

  // D-5: quien restablece asume que alguien más pudo entrar; se cierran todas las sesiones.
  await tokenManager.revokeAllUserTokens(user.id, user.email);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordChange(user.id, user.id, ipAddress, userAgent, false);
  inBackground('aviso de contraseña cambiada', () =>
    accountMail.notifyPasswordChanged(user, { actorId: user.id, ipAddress, userAgent }));

  return ResponseFormatter.success(res, {
    message: 'Contraseña restablecida exitosamente',
    email: user.email,
    hint: 'Puedes iniciar sesión con tu nueva contraseña'
  });
});

router.post('/bootstrap-superuser', async (req, res) => {
  if (await User.isSuperuserExists()) {
    return ResponseFormatter.badRequest(res, 'Ya existe un superusuario', {
      hint: 'Para crear más superusuarios, tu sesión debe ser de superusuario'
    });
  }

  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return ResponseFormatter.badRequest(res, 'Campos requeridos faltantes', {
      email: email ? 'ok' : 'es obligatorio',
      password: password ? 'ok' : 'es obligatorio',
      name: name ? 'ok' : 'es obligatorio'
    });
  }

  if (password.length < 8) {
    return ResponseFormatter.badRequest(res, 'La contraseña debe tener al menos 8 caracteres', {
      password: `${password.length}/8 caracteres`
    });
  }

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return ResponseFormatter.conflict(res, `El correo ${email} ya está registrado`);
  }

  // Único caso de cuenta que nace activada y sin correo: el primer superusuario del arranque.
  const user = await User.create(email, password, name, 'superuser');

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
    message: 'Superusuario creado',
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
      email: email ? 'ok' : 'es obligatorio',
      password: password ? 'ok' : 'es obligatorio',
      name: name ? 'ok' : 'es obligatorio',
      role: targetRole ? 'ok' : 'es obligatorio'
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
    return ResponseFormatter.conflict(res, `El correo ${email} ya está registrado`);
  }

  // Cuenta pendiente y con cambio forzado; no se devuelve sesión de la cuenta creada.
  const user = await User.create(email, password, name, targetRole, null, { pending: true, mustChangePassword: true });

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logUserCreation(req.user.userId, user.id, user.email, targetRole, ipAddress, userAgent);

  const mail = await accountMail.sendActivation(user, user.activationToken, {
    origin: 'byOther',
    context: { actorId: req.user.userId, ipAddress, userAgent }
  });

  return ResponseFormatter.success(res, {
    message: mail.ok === true
      ? `Usuario con rol '${targetRole}' creado exitosamente. Se envió el correo de activación.`
      : `Usuario con rol '${targetRole}' creado exitosamente, pero el correo de activación no pudo enviarse. Puedes reenviarlo desde el inicio de sesión (reenviar activación).`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    pendingActivation: true,
    activationEmailSent: mail.ok === true
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
    message: 'Tu sesión está activa',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      photo: user.photo,
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
    details: 'Tu sesión se cerró. Inicia sesión de nuevo'
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
  if (result) {
    inBackground('aviso de contraseña cambiada', () =>
      accountMail.notifyPasswordChanged(result, { actorId: userId, ipAddress, userAgent }));
  }

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
    return ResponseFormatter.forbidden(res, 'No puedes cambiar la contraseña de un superusuario');
  }

  await User.setPasswordForUser(userId, newPassword);
  // H-2: ninguna sesión previa del dueño sobrevive al cambio hecho por un administrador.
  await tokenManager.revokeAllUserTokens(userId, targetUser.email);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordChange(requesterId, userId, ipAddress, userAgent, true);
  inBackground('aviso de contraseña cambiada', () =>
    accountMail.notifyPasswordChanged(targetUser, { actorId: requesterId, ipAddress, userAgent }));

  return ResponseFormatter.success(res, {
    message: 'Contraseña actualizada',
    userId: userId
  });
});

router.patch('/change-password-temporary', authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.userId;

  if (!newPassword) {
    return ResponseFormatter.badRequest(res, 'Nueva contraseña es requerida');
  }

  if (typeof newPassword !== 'string') {
    return ResponseFormatter.badRequest(res, 'Nueva contraseña es requerida');
  }

  // RN-43: complejidad completa (función compartida con reset-password).
  const passwordValidation = PasswordValidator.validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return weakPasswordResponse(res, passwordValidation);
  }

  // Una sola sentencia que exige mustChangePassword = true: si no hay un cambio forzado
  // pendiente, no cambia nada. También invalida el enlace de activación.
  const updatedUser = await User.completeTemporaryPasswordChange(userId, newPassword);

  if (!updatedUser) {
    return ResponseFormatter.badRequest(res, 'Tu cuenta no tiene un cambio de contraseña pendiente');
  }

  // Se conserva la sesión actual y se revocan todas las demás de la cuenta.
  await tokenManager.revokeAllUserTokens(userId, updatedUser.email, req.token);

  const ipAddress = auditMiddleware.getIpAddress(req);
  const userAgent = auditMiddleware.getUserAgent(req);
  await auditMiddleware.logPasswordChange(userId, userId, ipAddress, userAgent, false);
  inBackground('aviso de contraseña cambiada', () =>
    accountMail.notifyPasswordChanged(updatedUser, { actorId: userId, ipAddress, userAgent }));

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
