const AuditLog = require('../models/AuditLog');

function lookupUser(userId) {
  if (!userId || userId === 'desconocido') return { email: '', name: '' };
  try {
    const User = require('../models/User');
    const u = User.findById(userId);
    return u ? { email: u.email || '', name: u.name || '' } : { email: '', name: '' };
  } catch { return { email: '', name: '' }; }
}

const auditMiddleware = {
  logLogin(userId, ipAddress, userAgent, success, actorEmail = '') {
    const actor = lookupUser(userId);
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
    AuditLog.create(log);
  },

  logLogout(userId, ipAddress, userAgent) {
    const actor = lookupUser(userId);
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
    AuditLog.create(log);
  },

  logPasswordChange(adminId, targetUserId, ipAddress, userAgent, changedByAdmin = false) {
    const actor = lookupUser(adminId || targetUserId);
    const target = changedByAdmin ? lookupUser(targetUserId) : actor;
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
    AuditLog.create(log);
  },

  logProfileUpdate(userId, ipAddress, userAgent, changes) {
    const actor = lookupUser(userId);
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
    AuditLog.create(log);
  },

  logUserStatusChange(adminId, targetUserId, newStatus, ipAddress, userAgent) {
    const actor = lookupUser(adminId);
    const target = lookupUser(targetUserId);
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
    AuditLog.create(log);
  },

  logUserCreation(adminId, newUserId, userEmail, userRole, ipAddress, userAgent) {
    const actor = lookupUser(adminId);
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
    AuditLog.create(log);
  },

  logPasswordGeneration(adminId, targetUserId, ipAddress, userAgent) {
    const actor = lookupUser(adminId);
    const target = lookupUser(targetUserId);
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
    AuditLog.create(log);
  },

  logFailedLoginAttempt(email, ipAddress, userAgent, reason) {
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
    AuditLog.create(log);
  },

  logPasswordResetRequest(email, ipAddress, userAgent) {
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
    AuditLog.create(log);
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
