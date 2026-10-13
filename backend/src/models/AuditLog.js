const { sql, request } = require('../database/sqlPool');

const ACTION_LABELS = {
  login:                      'Inicio de sesión',
  logout:                     'Cierre de sesión',
  password_change:            'Cambio de contraseña',
  profile_update:             'Actualización de perfil',
  user_created:               'Usuario creado',
  user_enable:                'Usuario habilitado',
  user_disable:               'Usuario deshabilitado',
  password_generated:         'Contraseña generada por admin',
  user_sessions_closed:       'Sesiones de usuario cerradas por admin',
  failed_login_attempt:       'Intento de acceso fallido',
  password_reset_requested:   'Solicitud de recuperación de contraseña',
  superuser_created:          'Superusuario creado',
  role_created:               'Rol creado',
  role_permissions_updated:   'Permisos de rol actualizados',
  role_modules_updated:       'Módulos de rol actualizados',
  user_role_changed:          'Rol de usuario cambiado',
  mail_sent:                  'Correo enviado',
  mail_failed:                'Correo no enviado (fallo)',
  mail_throttled:             'Correo no enviado (límite de envíos)',
  account_activated:          'Cuenta activada',
  activation_resend_requested:'Solicitud de reenvío de activación',
  account_pending_deleted:    'Cuenta pendiente eliminada por vencimiento',
  account_pending_disabled:   'Cuenta pendiente deshabilitada por vencimiento',
  pending_purge_run:          'Corrida de limpieza de cuentas pendientes',
};

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

  /**
   * Conteo persistente de envíos de correo, leído de la propia auditoría (sobrevive a
   * reinicios y es común a todas las instancias). Cuenta `mail_sent` y `mail_failed`.
   * `group` sale del registro de plantillas (valores fijos), nunca de la petición.
   */
  static async countMailActivity({ to, group, gapSeconds }) {
    const pattern = `%"group":"${String(group).replace(/[^a-z0-9_-]/gi, '')}"%`;
    const result = await (await request())
      .input('to', sql.NVarChar(320), String(to).toLowerCase())
      .input('pattern', sql.NVarChar(200), pattern)
      .input('gap', sql.Int, Math.max(0, Math.floor(gapSeconds)))
      .query(`SELECT
                SUM(CASE WHEN targetEmail = @to AND details LIKE @pattern
                          AND [timestamp] >= DATEADD(SECOND, -@gap, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS inGap,
                SUM(CASE WHEN targetEmail = @to AND details LIKE @pattern
                          AND [timestamp] >= DATEADD(HOUR, -1, SYSUTCDATETIME()) THEN 1 ELSE 0 END)      AS lastHour,
                SUM(CASE WHEN targetEmail = @to AND details LIKE @pattern THEN 1 ELSE 0 END)             AS lastDay,
                SUM(CASE WHEN [timestamp] >= DATEADD(HOUR, -1, SYSUTCDATETIME()) THEN 1 ELSE 0 END)      AS globalHour
              FROM dbo.audit_logs
              WHERE action IN ('mail_sent','mail_failed')
                AND [timestamp] >= DATEADD(DAY, -1, SYSUTCDATETIME())`);
    const row = result.recordset[0] || {};
    return {
      inGap: Number(row.inGap || 0),
      lastHour: Number(row.lastHour || 0),
      lastDay: Number(row.lastDay || 0),
      globalHour: Number(row.globalHour || 0),
    };
  }

  static async getAll() {
    const result = await (await request())
      .query('SELECT TOP 100 * FROM dbo.audit_logs ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static async getByActorId(actorId) {
    const result = await (await request()).input('actorId', sql.NVarChar(100), actorId)
      .query('SELECT TOP 200 * FROM dbo.audit_logs WHERE actorId = @actorId ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static async getByTargetId(targetId) {
    const result = await (await request()).input('targetId', sql.NVarChar(100), targetId)
      .query('SELECT TOP 200 * FROM dbo.audit_logs WHERE targetId = @targetId ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static async getByAction(action) {
    const result = await (await request()).input('action', sql.NVarChar(100), action)
      .query('SELECT TOP 200 * FROM dbo.audit_logs WHERE action = @action ORDER BY [timestamp] DESC');
    return result.recordset.map(fromSql);
  }

  static async getFailedLogins(limit = 50) {
    const result = await (await request()).input('limit', sql.Int, limit)
      .query(`SELECT TOP (@limit) * FROM dbo.audit_logs
              WHERE action IN ('login','failed_login_attempt') AND success = 0
              ORDER BY [timestamp] DESC`);
    return result.recordset.map(fromSql);
  }

  static async getRecentActivity(hours = 24) {
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
}

module.exports = AuditLog;
