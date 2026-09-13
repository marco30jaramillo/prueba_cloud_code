const crypto = require('crypto');

class PasswordUtils {
  static hashPassword(password, salt = crypto.randomBytes(16)) {
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  static verifyPassword(password, hashedPassword) {
    const [saltHex, hashHex] = hashedPassword.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return hash.toString('hex') === hashHex;
  }
}

module.exports = PasswordUtils;
