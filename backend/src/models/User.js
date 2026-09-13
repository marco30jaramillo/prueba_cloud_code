const crypto = require('crypto');
const PasswordUtils = require('../utils/passwordUtils');
const CSVDatabase = require('../utils/csvDatabase');
const DataNormalizer = require('../utils/dataNormalizer');
const { sql, usingSql, request } = require('../database/sqlPool');

function fromSql(row) {
  return row ? {
    ...row,
    id: String(row.id),
    isActive: Boolean(row.isActive),
    mustChangePassword: Boolean(row.mustChangePassword),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    resetTokenExpiry: row.resetTokenExpiry instanceof Date ? row.resetTokenExpiry.toISOString() : row.resetTokenExpiry,
  } : null;
}

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

  static async create(email, password, name, role = 'cliente', photo = null) {
    const user = new User(email, password, name, role, photo);
    if (!usingSql()) return new CSVDatabase().create(user);
    const db = await request();
    await db.input('id', sql.UniqueIdentifier, user.id).input('email', sql.NVarChar(320), user.email)
      .input('password', sql.NVarChar(512), user.password).input('name', sql.NVarChar(300), user.name)
      .input('role', sql.NVarChar(100), user.role).input('photo', sql.NVarChar(2048), user.photo)
      .input('isActive', sql.Bit, true).input('mustChangePassword', sql.Bit, false)
      .input('createdAt', sql.DateTime2, new Date(user.createdAt))
      .query(`INSERT INTO dbo.users (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt)
              VALUES (@id,@email,@password,@name,@role,@photo,@isActive,@mustChangePassword,@createdAt)`);
    return user;
  }

  static async findByEmail(email) {
    if (!usingSql()) return new CSVDatabase().findByEmail(email);
    const result = await (await request()).input('email', sql.NVarChar(320), email)
      .query('SELECT TOP 1 * FROM dbo.users WHERE email = @email');
    return fromSql(result.recordset[0]);
  }

  static async findById(id) {
    if (!usingSql()) return new CSVDatabase().findById(id);
    const result = await (await request()).input('id', sql.UniqueIdentifier, id)
      .query('SELECT TOP 1 * FROM dbo.users WHERE id = @id');
    return fromSql(result.recordset[0]);
  }

  static async authenticate(email, password) {
    const user = await User.findByEmail(DataNormalizer.normalizeEmail(email));
    if (!user || !PasswordUtils.verifyPassword(password, user.password)) return { user: null, reason: 'invalid_credentials' };
    if (!user.isActive && user.isActive !== 'true') return { user: null, reason: 'account_disabled' };
    return { user, reason: null };
  }

  static generatePasswordResetToken() { return crypto.randomBytes(32).toString('hex'); }

  static async update(userId, updates) {
    if (!usingSql()) return new CSVDatabase().update(userId, updates);
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

  static async setResetToken(userId, resetToken) { return User.update(userId, { resetToken, resetTokenExpiry: new Date(Date.now() + 3600000) }); }
  static async findByResetToken(token) {
    if (!usingSql()) {
      const user = (await User.getAll()).find((item) => item.resetToken === token);
      return user && user.resetTokenExpiry && new Date(user.resetTokenExpiry) >= new Date() ? user : null;
    }
    const result = await (await request()).input('token', sql.NVarChar(128), token)
      .query('SELECT TOP 1 * FROM dbo.users WHERE resetToken = @token AND resetTokenExpiry >= SYSUTCDATETIME()');
    return fromSql(result.recordset[0]);
  }
  static async resetPassword(userId, newPassword) { return User.update(userId, { password: PasswordUtils.hashPassword(newPassword), resetToken: null, resetTokenExpiry: null }); }
  static async countByRole(role) {
    if (!usingSql()) return (await User.getAll()).filter((user) => user.role === role).length;
    const result = await (await request()).input('role', sql.NVarChar(100), role).query('SELECT COUNT(*) AS total FROM dbo.users WHERE role = @role');
    return result.recordset[0].total;
  }
  static async isSuperuserExists() { return (await User.countByRole('superuser')) > 0; }
  static async getAll() {
    if (!usingSql()) return new CSVDatabase().readAll();
    const result = await (await request()).query('SELECT * FROM dbo.users ORDER BY createdAt');
    return result.recordset.map(fromSql);
  }
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) return null;
    if (!PasswordUtils.verifyPassword(currentPassword, user.password)) return { error: 'Contraseña actual incorrecta' };
    return User.update(userId, { password: PasswordUtils.hashPassword(newPassword) });
  }
  static generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }
  static async setPasswordForUser(userId, newPassword) { return User.update(userId, { password: PasswordUtils.hashPassword(newPassword), mustChangePassword: true }); }
  static async completeTemporaryPasswordChange(userId, newPassword) { return User.update(userId, { password: PasswordUtils.hashPassword(newPassword), mustChangePassword: false }); }
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

module.exports = User;
