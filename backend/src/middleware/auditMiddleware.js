const AuditLog = require('../models/AuditLog');

const auditMiddleware = {
  logLogin: (userId, ipAddress, userAgent, success, failureReason = null) => {
    const log = new AuditLog(
      'login',
      userId,
      userId, // El usuario es tanto quien ejecuta como quien es afectado
      ipAddress,
      success,
      failureReason,
      null,
      'web'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  logLogout: (userId, ipAddress, userAgent) => {
    const log = new AuditLog(
      'logout',
      userId,
      null,
      ipAddress,
      true,
      null,
      null,
      'web'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  logPasswordChange: (adminId, targetUserId, ipAddress, userAgent, changedByAdmin = false) => {
    const log = new AuditLog(
      'password_change',
      adminId || targetUserId,
      targetUserId,
      ipAddress,
      true,
      null,
      { changedByAdmin },
      'web'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  logProfileUpdate: (userId, ipAddress, userAgent, changes) => {
    const log = new AuditLog(
      'profile_update',
      userId,
      userId,
      ipAddress,
      true,
      null,
      { changes },
      'web'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  logUserStatusChange: (adminId, targetUserId, newStatus, ipAddress, userAgent) => {
    const log = new AuditLog(
      newStatus ? 'user_enable' : 'user_disable',
      adminId,
      targetUserId,
      ipAddress,
      true,
      null,
      { previousStatus: !newStatus, newStatus },
      'admin'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  logUserCreation: (adminId, newUserId, userEmail, userRole, ipAddress, userAgent) => {
    const log = new AuditLog(
      'user_created',
      adminId,
      newUserId,
      ipAddress,
      true,
      null,
      { email: userEmail, role: userRole },
      'admin'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  logPasswordGeneration: (adminId, targetUserId, ipAddress, userAgent) => {
    const log = new AuditLog(
      'password_generated',
      adminId,
      targetUserId,
      ipAddress,
      true,
      null,
      { action: 'admin_generated_password' },
      'admin'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  logFailedLoginAttempt: (email, ipAddress, userAgent, reason) => {
    const log = new AuditLog(
      'login',
      'unknown',
      null,
      ipAddress,
      false,
      reason,
      { email },
      'web'
    );
    log.userAgent = userAgent;
    AuditLog.create(log);
  },

  getIpAddress: (req) => {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'
    );
  },

  getUserAgent: (req) => {
    return req.headers['user-agent'] || 'unknown';
  }
};

module.exports = auditMiddleware;
