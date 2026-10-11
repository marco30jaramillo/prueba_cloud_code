/**
 * C-1: bienvenida y activación tras el autorregistro.
 * data: { name, link }
 */
const { renderLayout } = require('../layout');

module.exports = {
  group: 'activation',
  subject: () => 'Bienvenido a Mi Valecito: activa tu cuenta',
  render: ({ name, link }) =>
    renderLayout({
      name,
      preheader: 'Activa tu cuenta para empezar a usar Mi Valecito',
      paragraphs: [
        'Bienvenido a Mi Valecito y gracias por confiar en nosotros.',
        'Para empezar, activa tu cuenta con el siguiente enlace. Al abrirlo entrarás directamente a la aplicación y te pediremos que definas tu contraseña.',
      ],
      action: { label: 'Activar mi cuenta', url: link },
      after: [
        'El enlace es personal y vence una semana después de crear la cuenta. Si no creaste esta cuenta, puedes ignorar este correo.',
      ],
    }),
};
