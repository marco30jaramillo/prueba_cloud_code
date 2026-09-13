class PasswordValidator {
  static validatePassword(password) {
    const errors = [];

    if (!password) {
      return { valid: false, errors: ['La contraseña es requerida'] };
    }

    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Al menos una letra mayúscula (A-Z)');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Al menos una letra minúscula (a-z)');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Al menos un número (0-9)');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Al menos un carácter especial (!@#$%^&* etc)');
    }

    return {
      valid: errors.length === 0,
      errors,
      strength: this.getPasswordStrength(password)
    };
  }

  static getPasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    if (strength <= 2) return 'débil';
    if (strength <= 4) return 'media';
    if (strength <= 6) return 'fuerte';
    return 'muy fuerte';
  }

  static getPasswordRequirements() {
    return {
      minLength: 8,
      requirements: [
        'Mínimo 8 caracteres',
        'Una letra mayúscula (A-Z)',
        'Una letra minúscula (a-z)',
        'Un número (0-9)',
        'Un carácter especial (!@#$%^&* etc)'
      ]
    };
  }
}

module.exports = PasswordValidator;
