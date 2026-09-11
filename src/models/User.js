const crypto = require('crypto');
const PasswordUtils = require('../utils/passwordUtils');
const CSVDatabase = require('../utils/csvDatabase');

class User {
  constructor(email, password, name) {
    this.id = crypto.randomUUID();
    this.email = email;
    this.password = PasswordUtils.hashPassword(password);
    this.name = name;
    this.createdAt = new Date().toISOString();
    this.resetToken = null;
    this.resetTokenExpiry = null;
  }

  static create(email, password, name) {
    const user = new User(email, password, name);
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
}

module.exports = User;
