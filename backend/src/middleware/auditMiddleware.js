const AuditLog = require('../models/AuditLog');

async function lookupUser(userId) {
  if (!userId || userId === 'desconocido') return { email: '', name: '' };
  try {
    const User = require('../models/User');
    const u = await User.findById(userId);
    return u ? { email: u.email || '', name: u.name || '' } : { email: '', name: '' };
  } catch { return { email: '', name: '' }; }
}

const auditMiddleware = {
  async logLogin(userId, ipAddress, userAgent, success, actorEmail = '') {
    const actor = await lookupUser(userId);
    const log = new AuditLog({
      action: 'login',
      actorId: userId,
      actorEmail: actor.email || actorEmail,
      actorName: actor.name,
      targetId: userId,
      targetEmail: actor.email || actorEmail,
      ipAddress,
      userAgent,
      success,
      method: 'web'
    });
    await AuditLog.create(log);
  },

  async logLogout(userId, ipAddress, userAgent) {
    const actor = await lookupUser(userId);
    const log = new AuditLog({
      action: 'logout',
      actorId: userId,
      actorEmail: actor.email,
      actorName: actor.name,
      ipAddress,
      userAgent,
      success: true,
      method: 'web'
    });
    await AuditLog.create(log);
  },

  async logPasswordChange(adminId, targetUserId, ipAddress, userAgent, changedByAdmin = false) {
    const actor = await lookupUser(adminId || targetUserId);
    const target = changedByAdmin ? await lookupUser(targetUserId) : actor;
    const log = new AuditLog({
      action: 'password_change',
      actorId: adminId || targetUserId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: targetUserId,
      targetEmail: target.email,
      ipAddress,
      userAgent,
      success: true,
      details: { changedByAdmin },
      method: changedByAdmin ? 'admin' : 'web'
    });
    await AuditLog.create(log);
  },

  async logProfileUpdate(userId, ipAddress, userAgent, changes) {
    const actor = await lookupUser(userId);
    const log = new AuditLog({
      action: 'profile_update',
      actorId: userId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: userId,
      targetEmail: actor.email,
      ipAddress,
      userAgent,
      success: true,
      details: { changes },
      method: 'web'
    });
    await AuditLog.create(log);
  },

  async logUserStatusChange(adminId, targetUserId, newStatus, ipAddress, userAgent) {
    const actor = await lookupUser(adminId);
    const target = await lookupUser(targetUserId);
    const log = new AuditLog({
      action: newStatus ? 'user_enable' : 'user_disable',
      actorId: adminId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: targetUserId,
      targetEmail: target.email,
      ipAddress,
      userAgent,
      success: true,
      details: { newStatus },
      method: 'admin'
    });
    await AuditLog.create(log);
  },

  async logUserCreation(adminId, newUserId, userEmail, userRole, ipAddress, userAgent) {
    const actor = await lookupUser(adminId);
    const log = new AuditLog({
      action: 'user_created',
      actorId: adminId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: newUserId,
      targetEmail: userEmail,
      ipAddress,
      userAgent,
      success: true,
      details: { email: userEmail, role: userRole },
      method: 'admin'
    });
    await AuditLog.create(log);
  },

  async logPasswordGeneration(adminId, targetUserId, ipAddress, userAgent) {
    const actor = await lookupUser(adminId);
    const target = await lookupUser(targetUserId);
    const log = new AuditLog({
      action: 'password_generated',
      actorId: adminId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: targetUserId,
      targetEmail: target.email,
      ipAddress,
      userAgent,
      success: true,
      method: 'admin'
    });
    await AuditLog.create(log);
  },

  async logFailedLoginAttempt(email, ipAddress, userAgent, reason) {
    const log = new AuditLog({
      action: 'failed_login_attempt',
      actorId: 'desconocido',
      actorEmail: email,
      actorName: '',
      ipAddress,
      userAgent,
      success: false,
      failureReason: reason,
      details: { email },
      method: 'web'
    });
    await AuditLog.create(log);
  },

  async logPasswordResetRequest(email, ipAddress, userAgent) {
    const log = new AuditLog({
      action: 'password_reset_requested',
      actorId: 'desconocido',
      actorEmail: email,
      actorName: '',
      ipAddress,
      userAgent,
      success: true,
      details: { email },
      method: 'web'
    });
    await AuditLog.create(log);
  },

  async logRoleCreated(adminId, roleName, moduleAccess, ipAddress, userAgent) {
    const actor = await lookupUser(adminId);
    const log = new AuditLog({
      action: 'role_created',
      actorId: adminId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: roleName,
      ipAddress,
      userAgent,
      success: true,
      details: { roleName, moduleAccess },
      method: 'admin',
    });
    await AuditLog.create(log);
  },

  async logRolePermissionsUpdated(adminId, roleId, roleName, changes, ipAddress, userAgent) {
    const actor = await lookupUser(adminId);
    const log = new AuditLog({
      action: 'role_permissions_updated',
      actorId: adminId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: String(roleId),
      ipAddress,
      userAgent,
      success: true,
      details: { roleId, roleName, ...changes },
      method: 'admin',
    });
    await AuditLog.create(log);
  },

  async logRoleModulesUpdated(adminId, roleId, roleName, changes, ipAddress, userAgent) {
    const actor = await lookupUser(adminId);
    const log = new AuditLog({
      action: 'role_modules_updated',
      actorId: adminId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: String(roleId),
      ipAddress,
      userAgent,
      success: true,
      details: { roleId, roleName, ...changes },
      method: 'admin',
    });
    await AuditLog.create(log);
  },

  async logUserRoleChanged(adminId, targetUserId, oldRole, newRole, ipAddress, userAgent) {
    const actor = await lookupUser(adminId);
    const target = await lookupUser(targetUserId);
    const log = new AuditLog({
      action: 'user_role_changed',
      actorId: adminId,
      actorEmail: actor.email,
      actorName: actor.name,
      targetId: targetUserId,
      targetEmail: target.email,
      ipAddress,
      userAgent,
      success: true,
      details: { oldRole, newRole },
      method: 'admin',
    });
    await AuditLog.create(log);
  },

  getIpAddress(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'
    );
  },

  getUserAgent(req) {
    return req.headers['user-agent'] || 'unknown';
  }
};

module.exports = auditMiddleware;
