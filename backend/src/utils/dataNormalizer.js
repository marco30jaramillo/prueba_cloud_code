class DataNormalizer {
  static normalizeEmail(email) {
    if (!email) return email;
    return email.toLowerCase().trim();
  }

  static normalizeName(name) {
    if (!name) return name;
    return name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  static normalizeUser(user) {
    return {
      ...user,
      email: this.normalizeEmail(user.email),
      name: this.normalizeName(user.name)
    };
  }

  static isEmailNormalized(email) {
    return email === this.normalizeEmail(email);
  }

  static isNameNormalized(name) {
    return name === this.normalizeName(name);
  }
}

module.exports = DataNormalizer;
