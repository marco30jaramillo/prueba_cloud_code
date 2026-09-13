class Mailer {
  static async sendPasswordResetEmail(email, resetToken) {
    const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    const message = `
      Hola,

      Recibiste esta solicitud porque olvidaste tu contraseña.
      Haz clic en el siguiente enlace para restablecer tu contraseña:

      ${resetLink}

      Este enlace expira en 1 hora.

      Si no solicitaste esto, ignora este correo.
    `;

    console.log(`📧 Email enviado a: ${email}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`Mensaje:\n${message}\n`);

    return { success: true, message: 'Email de recuperación enviado' };
  }

  static async sendWelcomeEmail(email, name) {
    const message = `
      ¡Bienvenido ${name}!

      Tu cuenta ha sido creada exitosamente.
      Puedes iniciar sesión con tus credenciales.
    `;

    console.log(`📧 Email de bienvenida enviado a: ${email}`);
    console.log(`Mensaje:\n${message}\n`);

    return { success: true, message: 'Email de bienvenida enviado' };
  }
}

module.exports = Mailer;
