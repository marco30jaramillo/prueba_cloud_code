const crypto = require('crypto');
const PasswordUtils = require('../utils/passwordUtils');
const DataNormalizer = require('../utils/dataNormalizer');
const { sql, request, isGuid } = require('../database/sqlPool');

const ACTIVATION_DAYS = 7;
const TOKEN_FORMAT = /^[0-9a-f]{64}$/i;

function iso(value) {
  return value instanceof Date ? value.toISOString() : (value || null);
}

function fromSql(row) {
  return row ? {
    ...row,
    id: String(row.id),
    isActive: Boolean(row.isActive),
    mustChangePassword: Boolean(row.mustChangePassword),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    resetTokenExpiry: row.resetTokenExpiry instanceof Date ? row.resetTokenExpiry.toISOString() : row.resetTokenExpiry,
    activatedAt: iso(row.activatedAt),
    activationExpiresAt: iso(row.activationExpiresAt),
  } : null;
}

/** Los tokens (activación y recuperación) viajan en claro solo en el enlace; en base va su hash. */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
}

function generateToken() { return crypto.randomBytes(32).toString('hex'); }

const PASSWORD_CLASSES = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '!@#$%^&*',
];

class User {
  constructor(email, password, name, role = 'cliente', photo = null) {
    this.id = crypto.randomUUID();
    this.email = DataNormalizer.normalizeEmail(email);
    this.password = PasswordUtils.hashPassword(password);
    this.name = DataNormalizer.normalizeName(name);
    this.role = role;
    this.photo = photo || '/datos/default/default-avatar.svg';
    this.isActive = true;
    this.mustChangePassword = false;
    this.createdAt = new Date().toISOString();
    this.resetToken = null;
    this.resetTokenExpiry = null;
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.pending]  Cuenta pendiente de activación (token de siete días).
   *        Sin opciones la cuenta nace activada (primer superusuario, datos de prueba).
   * @param {boolean} [options.mustChangePassword]
   * @returns el usuario; si es pendiente trae `activationToken` (en claro, no se guarda).
   */
  static async create(email, password, name, role = 'cliente', photo = null, options = {}) {
    const user = new User(email, password, name, role, photo);
    const pending = Boolean(options.pending);
    user.mustChangePassword = Boolean(options.mustChangePassword);
    let activationTokenHash = null;
    let activationExpiresAt = null;
    let activatedAt = new Date(user.createdAt);
    if (pending) {
      user.activationToken = generateToken();
      activationTokenHash = hashToken(user.activationToken);
      activationExpiresAt = new Date(Date.now() + ACTIVATION_DAYS * 24 * 3600 * 1000);
      activatedAt = null;
    }
    user.activatedAt = activatedAt ? activatedAt.toISOString() : null;
    const db = await request();
    await db.input('id', sql.UniqueIdentifier, user.id).input('email', sql.NVarChar(320), user.email)
      .input('password', sql.NVarChar(512), user.password).input('name', sql.NVarChar(300), user.name)
      .input('role', sql.NVarChar(100), user.role).input('photo', sql.NVarChar(2048), user.photo)
      .input('isActive', sql.Bit, true).input('mustChangePassword', sql.Bit, user.mustChangePassword)
      .input('createdAt', sql.DateTime2, new Date(user.createdAt))
      .input('activatedAt', sql.DateTime2, activatedAt)
      .input('activationTokenHash', sql.NVarChar(128), activationTokenHash)
      .input('activationExpiresAt', sql.DateTime2, activationExpiresAt)
      .query(`INSERT INTO dbo.users (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,activatedAt,activationTokenHash,activationExpiresAt)
              VALUES (@id,@email,@password,@name,@role,@photo,@isActive,@mustChangePassword,@createdAt,@activatedAt,@activationTokenHash,@activationExpiresAt)`);
    return user;
  }

  /**
   * Cuenta con ese correo. Un correo puede repetirse solo entre cuentas deshabilitadas y a lo sumo
   * una activa: si hay una activa se devuelve esa; si no, la deshabilitada más reciente (sirve para
   * decir «cuenta deshabilitada»). Para comprobar disponibilidad usa `findActiveByEmail`.
   */
  static async findByEmail(email) {
    const result = await (await request()).input('email', sql.NVarChar(320), email)
      .query('SELECT TOP 1 * FROM dbo.users WHERE email = @email ORDER BY isActive DESC, createdAt DESC');
    return fromSql(result.recordset[0]);
  }

  /** Solo la cuenta activa con ese correo (como mucho una: índice único filtrado). */
  static async findActiveByEmail(email) {
    const result = await (await request()).input('email', sql.NVarChar(320), email)
      .query('SELECT TOP 1 * FROM dbo.users WHERE email = @email AND isActive = 1');
    return fromSql(result.recordset[0]);
  }

  static async findById(id) {
    if (!isGuid(id)) return null;
    const result = await (await request()).input('id', sql.UniqueIdentifier, id)
      .query('SELECT TOP 1 * FROM dbo.users WHERE id = @id');
    return fromSql(result.recordset[0]);
  }

  static async authenticate(email, password) {
    const user = await User.findByEmail(DataNormalizer.normalizeEmail(email));
    if (!user || !PasswordUtils.verifyPassword(password, user.password)) return { user: null, reason: 'invalid_credentials' };
    if (!user.isActive && user.isActive !== 'true') return { user: null, reason: 'account_disabled' };
    // «Pendiente» y «deshabilitada» son estados distintos; la deshabilitada se evalúa primero.
    if (!user.activatedAt) return { user: null, reason: 'pending_activation' };
    return { user, reason: null };
  }

  static generatePasswordResetToken() { return generateToken(); }
  static hashToken(token) { return hashToken(token); }
  /** Cuenta que aún no ha abierto su enlace de activación. */
  static isPending(user) { return Boolean(user) && !user.activatedAt; }

  static async update(userId, updates) {
    const allowed = ['password', 'name', 'photo', 'isActive', 'mustChangePassword', 'resetToken', 'resetTokenExpiry'];
    const fields = Object.entries(updates).filter(([key]) => allowed.includes(key));
    if (!fields.length) return User.findById(userId);
    const db = await request();
    db.input('id', sql.UniqueIdentifier, userId);
    const assignments = fields.map(([key], index) => {
      const parameter = `v${index}`;
      const value = updates[key];
      const type = key === 'isActive' || key === 'mustChangePassword' ? sql.Bit : key === 'resetTokenExpiry' ? sql.DateTime2 : sql.NVarChar(key === 'photo' ? 2048 : 512);
      db.input(parameter, type, value === '' ? null : value);
      return `[${key}] = @${parameter}`;
    });
    const result = await db.query(`UPDATE dbo.users SET ${assignments.join(', ')} OUTPUT inserted.* WHERE id = @id`);
    return fromSql(result.recordset[0]);
  }

  /** Cambia el rol. Aparte de `update` para que un cambio de rol nunca viaje por otro camino. */
  static async updateRole(userId, role) {
    if (!isGuid(userId)) return null;
    const result = await (await request()).input('id', sql.UniqueIdentifier, userId)
      .input('role', sql.NVarChar(100), role)
      .query('UPDATE dbo.users SET [role] = @role OUTPUT inserted.* WHERE id = @id');
    return fromSql(result.recordset[0]);
  }

  /** Guarda solo el hash del token de recuperación; vence en una hora. */
  static async setResetToken(userId, resetToken) {
    return User.update(userId, { resetToken: hashToken(resetToken), resetTokenExpiry: new Date(Date.now() + 3600000) });
  }

  /**
   * Restablece la contraseña con un token de recuperación, en una sola sentencia: el token
   * sirve una vez aunque lleguen dos peticiones a la vez. Solo cuentas habilitadas y activadas.
   * Es una contraseña que la persona eligió: apaga el cambio forzado y el enlace de activación.
   * @returns el usuario actualizado o null si el token no sirve.
   */
  static async resetPasswordWithToken(token, newPassword) {
    if (typeof token !== 'string' || !token || token.length > 256) return null;
    const result = await (await request())
      .input('hash', sql.NVarChar(128), hashToken(token))
      .input('password', sql.NVarChar(512), PasswordUtils.hashPassword(newPassword))
      .query(`UPDATE dbo.users
              SET password = @password, resetToken = NULL, resetTokenExpiry = NULL,
                  mustChangePassword = 0, activationTokenHash = NULL, activationExpiresAt = NULL
              OUTPUT inserted.*
              WHERE resetToken = @hash AND resetTokenExpiry >= SYSUTCDATETIME()
                AND isActive = 1 AND activatedAt IS NOT NULL`);
    return fromSql(result.recordset[0]);
  }

  // ── Activación de cuenta ───────────────────────────────────────────────────────────
  /**
   * Activa la cuenta con el token, en una sola sentencia. Cuenta habilitada y con enlace
   * vigente. El token NO se consume al abrirlo: sigue sirviendo hasta el primer cambio de
   * contraseña (y como máximo hasta `activationExpiresAt`).
   *
   * H-1 (pre-secuestro): en la PRIMERA activación, y en el mismo UPDATE atómico, la contraseña
   * guardada se reemplaza por el hash de un valor aleatorio que nadie conoce. Así la
   * contraseña con la que alguien registró el correo de otra persona deja de servir y la
   * cuenta solo entra por el enlace hasta que la persona fije la suya con
   * change-password-temporary (que no pide la actual). Las activaciones repetidas con el
   * mismo enlace no vuelven a tocar la contraseña. Quien no cambie la contraseña tras
   * activar, entra de nuevo con el enlace (si no venció) o con «olvidé mi contraseña».
   * @returns { user, firstTime } o null si el token no sirve.
   */
  static async activateWithToken(token) {
    if (typeof token !== 'string' || !TOKEN_FORMAT.test(token)) return null;
    const unusablePassword = PasswordUtils.hashPassword(crypto.randomBytes(48).toString('hex'));
    const result = await (await request()).input('hash', sql.NVarChar(128), hashToken(token))
      .input('unusablePassword', sql.NVarChar(512), unusablePassword)
      .query(`UPDATE dbo.users
              SET password = CASE WHEN activatedAt IS NULL THEN @unusablePassword ELSE password END,
                  activatedAt = COALESCE(activatedAt, SYSUTCDATETIME())
              OUTPUT inserted.*, deleted.activatedAt AS previousActivatedAt
              WHERE activationTokenHash = @hash AND isActive = 1
                AND activationExpiresAt IS NOT NULL AND activationExpiresAt >= SYSUTCDATETIME()`);
    const row = result.recordset[0];
    if (!row) return null;
    return { user: fromSql(row), firstTime: row.previousActivatedAt === null };
  }

  /**
   * Cuenta pendiente, habilitada y vigente: genera un token nuevo (el anterior deja de
   * servir) con el MISMO vencimiento de la cuenta (D-4).
   * @returns { user, token } o null.
   */
  static async rotateActivationToken(userId) {
    if (!isGuid(userId)) return null;
    const token = generateToken();
    const result = await (await request())
      .input('id', sql.UniqueIdentifier, userId).input('hash', sql.NVarChar(128), hashToken(token))
      .query(`UPDATE dbo.users SET activationTokenHash = @hash
              OUTPUT inserted.*
              WHERE id = @id AND activatedAt IS NULL AND isActive = 1
                AND activationExpiresAt IS NOT NULL AND activationExpiresAt >= SYSUTCDATETIME()`);
    const row = result.recordset[0];
    return row ? { user: fromSql(row), token } : null;
  }

  /**
   * Vuelve a armar la activación de una cuenta pendiente que un administrador acaba de
   * habilitar (por ejemplo, una deshabilitada por vencimiento): siete días y token nuevos.
   */
  static async rearmActivation(userId) {
    if (!isGuid(userId)) return null;
    const token = generateToken();
    const result = await (await request())
      .input('id', sql.UniqueIdentifier, userId).input('hash', sql.NVarChar(128), hashToken(token))
      .input('expires', sql.DateTime2, new Date(Date.now() + ACTIVATION_DAYS * 24 * 3600 * 1000))
      .query(`UPDATE dbo.users SET activationTokenHash = @hash, activationExpiresAt = @expires
              OUTPUT inserted.*
              WHERE id = @id AND activatedAt IS NULL AND isActive = 1`);
    const row = result.recordset[0];
    return row ? { user: fromSql(row), token } : null;
  }

  static async countByRole(role) {
    const result = await (await request()).input('role', sql.NVarChar(100), role).query('SELECT COUNT(*) AS total FROM dbo.users WHERE role = @role');
    return result.recordset[0].total;
  }
  /**
   * Superusuarios que pueden operar: activos y con la cuenta activada. Una cuenta deshabilitada o
   * pendiente de activación no cuenta, de modo que el bootstrap siga disponible mientras no haya
   * ningún superusuario activo.
   */
  static async countActiveByRole(role) {
    const result = await (await request()).input('role', sql.NVarChar(100), role)
      .query('SELECT COUNT(*) AS total FROM dbo.users WHERE role = @role AND isActive = 1 AND activatedAt IS NOT NULL');
    return result.recordset[0].total;
  }
  static async isSuperuserExists() { return (await User.countActiveByRole('superuser')) > 0; }
  static async getAll() {
    const result = await (await request()).query('SELECT * FROM dbo.users ORDER BY createdAt');
    return result.recordset.map(fromSql);
  }
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) return null;
    if (!PasswordUtils.verifyPassword(currentPassword, user.password)) return { error: 'Contraseña actual incorrecta' };
    return User.update(userId, { password: PasswordUtils.hashPassword(newPassword) });
  }

  /** Contraseña generada con aleatoriedad criptográfica y al menos un carácter de cada clase. */
  static generateRandomPassword(length = 12) {
    const all = PASSWORD_CLASSES.join('');
    const size = Math.max(length, PASSWORD_CLASSES.length);
    const chars = PASSWORD_CLASSES.map((set) => set[crypto.randomInt(set.length)]);
    while (chars.length < size) chars.push(all[crypto.randomInt(all.length)]);
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  static async setPasswordForUser(userId, newPassword) { return User.update(userId, { password: PasswordUtils.hashPassword(newPassword), mustChangePassword: true }); }

  /**
   * Primer cambio de contraseña (cuenta con cambio forzado): fija la contraseña, apaga la
   * bandera e invalida el enlace de activación. Una sola sentencia que exige la bandera activa.
   * @returns el usuario o null si no había un cambio forzado pendiente.
   */
  static async completeTemporaryPasswordChange(userId, newPassword) {
    if (!isGuid(userId)) return null;
    const result = await (await request())
      .input('id', sql.UniqueIdentifier, userId)
      .input('password', sql.NVarChar(512), PasswordUtils.hashPassword(newPassword))
      .query(`UPDATE dbo.users
              SET password = @password, mustChangePassword = 0,
                  activationTokenHash = NULL, activationExpiresAt = NULL
              OUTPUT inserted.*
              WHERE id = @id AND mustChangePassword = 1 AND activatedAt IS NOT NULL`);
    return fromSql(result.recordset[0]);
  }

  static async updateProfile(userId, updates) {
    const filtered = {};
    ['name', 'photo'].forEach((key) => { if (Object.prototype.hasOwnProperty.call(updates, key)) filtered[key] = updates[key]; });
    return User.update(userId, filtered);
  }
  static async toggleActive(userId, isActive) { return User.update(userId, { isActive }); }
  static async findByEmailInactive(email) {
    const user = await User.findByEmail(email);
    return user && (user.isActive === false || user.isActive === 'false') ? user : undefined;
  }
}

User.ACTIVATION_DAYS = ACTIVATION_DAYS;

module.exports = User;
