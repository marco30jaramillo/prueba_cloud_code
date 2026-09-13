const fs = require('fs');
const path = require('path');
const CSVDatabase = require('../utils/csvDatabase');

class AuditLog {
  constructor(
    action,
    userId,
    targetUserId = null,
    ipAddress = '0.0.0.0',
    success = true,
    reason = null,
    details = null,
    method = 'web'
  ) {
    this.id = require('crypto').randomUUID();
    this.action = action; // login, logout, password_change, profile_update, user_disable, etc
    this.userId = userId; // Usuario que realiza la acción
    this.targetUserId = targetUserId; // Usuario afectado por la acción (si aplica)
    this.ipAddress = ipAddress;
    this.userAgent = null; // Se asigna desde middleware
    this.timestamp = new Date().toISOString();
    this.success = success;
    this.failureReason = reason;
    this.details = details; // JSON con detalles de cambios realizados
    this.method = method; // web, api, admin
    this.duration = 0; // Tiempo de ejecución en ms
  }

  static create(auditLog) {
    const db = new CSVDatabase('audit_logs');
    return db.create(auditLog);
  }

  static getAll() {
    const db = new CSVDatabase('audit_logs');
    return db.readAll();
  }

  static getByUserId(userId) {
    const db = new CSVDatabase('audit_logs');
    const logs = db.readAll();
    return logs.filter(log => log.userId === userId);
  }

  static getByTargetUserId(targetUserId) {
    const db = new CSVDatabase('audit_logs');
    const logs = db.readAll();
    return logs.filter(log => log.targetUserId === targetUserId);
  }

  static getByAction(action) {
    const db = new CSVDatabase('audit_logs');
    const logs = db.readAll();
    return logs.filter(log => log.action === action);
  }

  static getFailedLogins(limit = 10) {
    const db = new CSVDatabase('audit_logs');
    const logs = db.readAll();
    return logs
      .filter(log => log.action === 'login' && log.success === 'false')
      .slice(-limit);
  }

  static getRecentActivity(hours = 24) {
    const db = new CSVDatabase('audit_logs');
    const logs = db.readAll();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return logs.filter(log => new Date(log.timestamp) >= cutoff);
  }

  static generateSecurityReport(days = 7) {
    const logs = this.getRecentActivity(days * 24);

    return {
      period: `Últimos ${days} días`,
      totalEvents: logs.length,
      failedLogins: logs.filter(l => l.action === 'login' && l.success === 'false').length,
      passwordChanges: logs.filter(l => l.action === 'password_change').length,
      userDisables: logs.filter(l => l.action === 'user_disable').length,
      profileUpdates: logs.filter(l => l.action === 'profile_update').length,
      adminActions: logs.filter(l => l.method === 'admin').length,
      uniqueUsers: new Set(logs.map(l => l.userId)).size,
      suspiciousIPs: this.detectSuspiciousActivity(logs)
    };
  }

  static detectSuspiciousActivity(logs) {
    const ipFailures = {};
    logs
      .filter(l => l.action === 'login' && l.success === 'false')
      .forEach(log => {
        ipFailures[log.ipAddress] = (ipFailures[log.ipAddress] || 0) + 1;
      });

    return Object.entries(ipFailures)
      .filter(([ip, count]) => count > 5)
      .map(([ip, count]) => ({
        ipAddress: ip,
        failedAttempts: count,
        risk: count > 10 ? 'alto' : count > 7 ? 'medio' : 'bajo'
      }));
  }

  static initializeCSV() {
    const dbPath = path.join(process.cwd(), 'audit_logs.csv');
    if (!fs.existsSync(dbPath)) {
      const headers = 'id,action,userId,targetUserId,ipAddress,userAgent,timestamp,success,failureReason,details,method,duration\n';
      fs.writeFileSync(dbPath, headers);
    }
  }
}

AuditLog.initializeCSV();

module.exports = AuditLog;
