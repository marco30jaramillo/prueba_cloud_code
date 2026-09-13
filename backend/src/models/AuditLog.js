const fs = require('fs');
const path = require('path');
const { sql, usingSql, request } = require('../database/sqlPool');

const AUDIT_FILE = path.join(process.cwd(), 'audit_logs.csv');
const AUDIT_FIELDS = [
  'id', 'action', 'actionLabel',
  'actorId', 'actorEmail', 'actorName',
  'targetId', 'targetEmail',
  'ipAddress', 'userAgent',
  'timestamp', 'success', 'failureReason',
  'details', 'method'
];

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
  role_created:               'Rol creado',
  role_permissions_updated:   'Permisos de rol actualizados',
  role_modules_updated:       'Módulos de rol actualizados',
  user_role_changed:          'Rol de usuario cambiado',
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

function fromSql(row) {
  return {
    id:            String(row.id),
    action:        row.action        || '',
    actionLabel:   row.actionLabel   || '',
    actorId:       row.actorId       || '',
    actorEmail:    row.actorEmail    || '',
    actorName:     row.actorName     || '',
    targetId:      row.targetId      || '',
    targetEmail:   row.targetEmail   || '',
    ipAddress:     row.ipAddress     || '',
    userAgent:     row.userAgent     || '',
    timestamp:     row.timestamp instanceof Date ? row.timestamp.toISOString() : (row.timestamp || ''),
    success:       Boolean(row.success),
    failureReason: row.failureReason || '',
    details:       row.details       || '',
    method:        row.method        || '',
  };
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

  static async create(log) {
    if (!usingSql()) {
      AuditLog.initializeCSV();
      const line = AUDIT_FIELDS.map(f => escapeCSV(log[f])).join(',');
      fs.appendFileSync(AUDIT_FILE, line + '\n');
      return log;
    }
    try {
      const db = await request();
      await db
        .input('id',            sql.UniqueIdentifier,    log.id)
        .input('action',        sql.NVarChar(100),       log.action)
        .input('actionLabel',   sql.NVarChar(300),       log.actionLabel)
        .input('actorId',       sql.NVarChar(100),       log.actorId    || null)
        .input('actorEmail',    sql.NVarChar(320),       log.actorEmail || null)
        .input('actorName',     sql.NVarChar(300),       log.actorName  || null)
        .input('targetId',      sql.NVarChar(100),       log.targetId   || null)
        .input('targetEmail',   sql.NVarChar(320),       log.targetEmail|| null)
        .input('ipAddress',     sql.NVarChar(64),        log.ipAddress  || null)
        .input('userAgent',     sql.NVarChar(sql.MAX),   log.userAgent  || null)
        .input('timestamp',     sql.DateTime2,           new Date(log.timestamp))
        .input('success',       sql.Bit,                 log.success)
        .input('failureReason', sql.NVarChar(1000),      log.failureReason || null)
        .input('details',       sql.NVarChar(sql.MAX),   log.details    || null)
        .input('method',        sql.NVarChar(50),        log.method     || null)
        .query(`INSERT INTO dbo.audit_logs
                  (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,
                   ipAddress,userAgent,[timestamp],success,failureReason,details,method)
                VALUES
                  (@id,@action,@actionLabel,@actorId,@actorEmail,@actorName,@targetId,@targetEmail,
                   @ipAddress,@userAgent,@timestamp,@success,@failureReason,@details,@method)`);
    } catch (err) {
      console.error('[AuditLog] Error writing to SQL:', err.message);
    }
    return log;
  }

  static async getAll() {
    if (!usingSql()) return AuditLog.readAll();
    const result = await (await request())
      .query('SELECT TOP 100 * FROM dbo.audit_logs ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static readAll() {
    AuditLog.initializeCSV();
    const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const values = parseLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? values[i] : ''; });
      return obj;
    });
  }

  static async getByActorId(actorId) {
    if (!usingSql()) return AuditLog.readAll().filter(l => l.actorId === actorId);
    const result = await (await request()).input('actorId', sql.NVarChar(100), actorId)
      .query('SELECT TOP 200 * FROM dbo.audit_logs WHERE actorId = @actorId ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static async getByTargetId(targetId) {
    if (!usingSql()) return AuditLog.readAll().filter(l => l.targetId === targetId);
    const result = await (await request()).input('targetId', sql.NVarChar(100), targetId)
      .query('SELECT TOP 200 * FROM dbo.audit_logs WHERE targetId = @targetId ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static async getByAction(action) {
    if (!usingSql()) return AuditLog.readAll().filter(l => l.action === action);
    const result = await (await request()).input('action', sql.NVarChar(100), action)
      .query('SELECT TOP 200 * FROM dbo.audit_logs WHERE action = @action ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static async getFailedLogins(limit = 50) {
    if (!usingSql()) {
      return AuditLog.readAll()
        .filter(l => (l.action === 'login' || l.action === 'failed_login_attempt') && l.success === 'false')
        .slice(-limit);
    }
    const result = await (await request()).input('limit', sql.Int, limit)
      .query(`SELECT TOP (@limit) * FROM dbo.audit_logs
              WHERE action IN ('login','failed_login_attempt') AND success = 0
              ORDER BY [timestamp] DESC`);
    return result.recordset.map(fromSql);
  }

  static async getRecentActivity(hours = 24) {
    if (!usingSql()) {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      return AuditLog.readAll().filter(l => new Date(l.timestamp) >= cutoff);
    }
    const result = await (await request()).input('hours', sql.Int, hours)
      .query(`SELECT * FROM dbo.audit_logs
              WHERE [timestamp] >= DATEADD(HOUR, -@hours, SYSUTCDATETIME())
              ORDER BY [timestamp] DESC`);
    return result.recordset.map(fromSql);
  }

  static async generateSecurityReport(days = 7) {
    const logs = await AuditLog.getRecentActivity(days * 24);
    const isSuccess = l => l.success === true || l.success === 'true';
    return {
      period: `Últimos ${days} días`,
      totalEvents: logs.length,
      failedLogins: logs.filter(l => l.action === 'failed_login_attempt').length,
      passwordChanges: logs.filter(l => l.action === 'password_change').length,
      userDisables: logs.filter(l => l.action === 'user_disable').length,
      profileUpdates: logs.filter(l => l.action === 'profile_update').length,
      adminActions: logs.filter(l => l.method === 'admin').length,
      uniqueActors: new Set(logs.map(l => l.actorId)).size,
      suspiciousIPs: AuditLog.detectSuspiciousActivity(logs),
    };
  }

  static detectSuspiciousActivity(logs) {
    const ipFailures = {};
    logs.filter(l => l.action === 'failed_login_attempt')
      .forEach(l => { ipFailures[l.ipAddress] = (ipFailures[l.ipAddress] || 0) + 1; });
    return Object.entries(ipFailures)
      .filter(([, count]) => count > 5)
      .map(([ip, count]) => ({ ipAddress: ip, failedAttempts: count, risk: count > 10 ? 'alto' : count > 7 ? 'medio' : 'bajo' }));
  }

  static initializeCSV() {
    if (!fs.existsSync(AUDIT_FILE)) {
      fs.writeFileSync(AUDIT_FILE, AUDIT_FIELDS.join(',') + '\n');
    }
  }
}

if (!usingSql()) AuditLog.initializeCSV();

module.exports = AuditLog;
