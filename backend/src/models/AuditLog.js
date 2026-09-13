const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(process.cwd(), 'audit_logs.csv');
const AUDIT_FIELDS = [
  'id', 'action', 'actionLabel',
  'actorId', 'actorEmail', 'actorName',
  'targetId', 'targetEmail',
  'ipAddress', 'userAgent',
  'timestamp', 'success', 'failureReason',
  'details', 'method'
];

// Human-readable Spanish labels for each action
const ACTION_LABELS = {
  login:                      'Inicio de sesión',
  logout:                     'Cierre de sesión',
  password_change:            'Cambio de contraseña',
  profile_update:             'Actualización de perfil',
  user_created:               'Usuario creado',
  user_enable:                'Usuario habilitado',
  user_disable:               'Usuario deshabilitado',
  password_generated:         'Contraseña generada por admin',
  failed_login_attempt:       'Intento de acceso fallido',
  password_reset_requested:   'Solicitud de recuperación de contraseña',
  superuser_created:          'Superusuario creado',
};

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseLine(line) {
  const result = [];
  let inQuotes = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

class AuditLog {
  constructor({
    action,
    actorId = 'desconocido',
    actorEmail = '',
    actorName = '',
    targetId = null,
    targetEmail = '',
    ipAddress = '0.0.0.0',
    userAgent = '',
    success = true,
    failureReason = null,
    details = null,
    method = 'web'
  }) {
    this.id = require('crypto').randomUUID();
    this.action = action;
    this.actionLabel = ACTION_LABELS[action] || action;
    this.actorId = actorId;
    this.actorEmail = actorEmail;
    this.actorName = actorName;
    this.targetId = targetId || '';
    this.targetEmail = targetEmail;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.timestamp = new Date().toISOString();
    this.success = success;
    this.failureReason = failureReason || '';
    this.details = details ? JSON.stringify(details) : '';
    this.method = method;
  }

  static create(log) {
    AuditLog.initializeCSV();
    const line = AUDIT_FIELDS.map(f => escapeCSV(log[f])).join(',');
    fs.appendFileSync(AUDIT_FILE, line + '\n');
    return log;
  }

  static readAll() {
    AuditLog.initializeCSV();
    const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1)
      .filter(l => l.trim())
      .map(line => {
        const values = parseLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? values[i] : ''; });
        return obj;
      });
  }

  static getAll() { return this.readAll(); }

  static getByActorId(actorId) {
    return this.readAll().filter(l => l.actorId === actorId);
  }

  static getByTargetId(targetId) {
    return this.readAll().filter(l => l.targetId === targetId);
  }

  static getByAction(action) {
    return this.readAll().filter(l => l.action === action);
  }

  static getFailedLogins(limit = 50) {
    return this.readAll()
      .filter(l => (l.action === 'login' || l.action === 'failed_login_attempt') && l.success === 'false')
      .slice(-limit);
  }

  static getRecentActivity(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.readAll().filter(l => new Date(l.timestamp) >= cutoff);
  }

  static generateSecurityReport(days = 7) {
    const logs = this.getRecentActivity(days * 24);
    return {
      period: `Últimos ${days} días`,
      totalEvents: logs.length,
      failedLogins: logs.filter(l => l.action === 'failed_login_attempt').length,
      passwordChanges: logs.filter(l => l.action === 'password_change').length,
      userDisables: logs.filter(l => l.action === 'user_disable').length,
      profileUpdates: logs.filter(l => l.action === 'profile_update').length,
      adminActions: logs.filter(l => l.method === 'admin').length,
      uniqueActors: new Set(logs.map(l => l.actorId)).size,
      suspiciousIPs: this.detectSuspiciousActivity(logs)
    };
  }

  static detectSuspiciousActivity(logs) {
    const ipFailures = {};
    logs
      .filter(l => l.action === 'failed_login_attempt')
      .forEach(l => {
        ipFailures[l.ipAddress] = (ipFailures[l.ipAddress] || 0) + 1;
      });
    return Object.entries(ipFailures)
      .filter(([, count]) => count > 5)
      .map(([ip, count]) => ({
        ipAddress: ip,
        failedAttempts: count,
        risk: count > 10 ? 'alto' : count > 7 ? 'medio' : 'bajo'
      }));
  }

  static initializeCSV() {
    if (!fs.existsSync(AUDIT_FILE)) {
      fs.writeFileSync(AUDIT_FILE, AUDIT_FIELDS.join(',') + '\n');
    }
  }
}

AuditLog.initializeCSV();

module.exports = AuditLog;
