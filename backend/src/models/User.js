const crypto = require('crypto');
const PasswordUtils = require('../utils/passwordUtils');
const CSVDatabase = require('../utils/csvDatabase');

class User {
  constructor(email, password, name, role = 'cliente', photo = null) {
    this.id = crypto.randomUUID();
    this.email = email;
    this.password = PasswordUtils.hashPassword(password);
    this.name = name;
    this.role = role;
    this.photo = photo || 'https://via.placeholder.com/40?text=👤';
    this.isActive = true;
    this.createdAt = new Date().toISOString();
    this.resetToken = null;
    this.resetTokenExpiry = null;
  }

  static create(email, password, name, role = 'cliente', photo = null) {
    const user = new User(email, password, name, role, photo);
    const db = new CSVDatabase();
    return db.create(user);
  }

  static findByEmail(email) {
    const db = new CSVDatabase();
    return db.findByEmail(email);
  }

  static findById(id) {
    const db = new CSVDatabase();
    return db.findById(id);
  }

  static authenticate(email, password) {
    const user = User.findByEmail(email);
    if (!user) return null;

    const isValid = PasswordUtils.verifyPassword(password, user.password);
    if (!isValid) return null;

    return user;
  }

  static generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static setResetToken(userId, resetToken) {
    const expiry = new Date(Date.now() + 3600000).toISOString();
    const db = new CSVDatabase();
    return db.update(userId, { resetToken, resetTokenExpiry: expiry });
  }

  static findByResetToken(token) {
    const db = new CSVDatabase();
    const users = db.readAll();
    const user = users.find(u => u.resetToken === token);

    if (!user || !user.resetTokenExpiry) return null;

    const expiry = new Date(user.resetTokenExpiry);
    if (expiry < new Date()) return null;

    return user;
  }

  static resetPassword(userId, newPassword) {
    const hashedPassword = PasswordUtils.hashPassword(newPassword);
    const db = new CSVDatabase();
    return db.update(userId, {
      password: hashedPassword,
      resetToken: '',
      resetTokenExpiry: ''
    });
  }

  static countByRole(role) {
    const db = new CSVDatabase();
    const users = db.readAll();
    return users.filter(u => u.role === role).length;
  }

  static isSuperuserExists() {
    return User.countByRole('superuser') > 0;
  }

  static getAll() {
    const db = new CSVDatabase();
    return db.readAll();
  }

  static changePassword(userId, currentPassword, newPassword) {
    const user = User.findById(userId);
    if (!user) return null;

    const isValid = PasswordUtils.verifyPassword(currentPassword, user.password);
    if (!isValid) return { error: 'Contraseña actual incorrecta' };

    const hashedPassword = PasswordUtils.hashPassword(newPassword);
    const db = new CSVDatabase();
    return db.update(userId, { password: hashedPassword });
  }

  static generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static setPasswordForUser(userId, newPassword) {
    const hashedPassword = PasswordUtils.hashPassword(newPassword);
    const db = new CSVDatabase();
    return db.update(userId, { password: hashedPassword });
  }

  static updateProfile(userId, updates) {
    const user = User.findById(userId);
    if (!user) return null;

    const allowedFields = ['name', 'photo'];
    const filteredUpdates = {};

    for (const key of allowedFields) {
      if (updates.hasOwnProperty(key)) {
        filteredUpdates[key] = updates[key];
      }
    }

    const db = new CSVDatabase();
    return db.update(userId, filteredUpdates);
  }

  static toggleActive(userId, isActive) {
    const db = new CSVDatabase();
    return db.update(userId, { isActive: isActive ? 'true' : 'false' });
  }

  static findByEmailInactive(email) {
    const db = new CSVDatabase();
    const users = db.readAll();
    return users.find(u => u.email === email && u.isActive === 'false');
  }
}

module.exports = User;
