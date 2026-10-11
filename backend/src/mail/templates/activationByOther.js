/**
 * C-2: cuenta de cliente creada por otra persona (tendero o administrador).
 * También se usa en el reenvío de la activación de un cliente.
 * data: { name, link }
 */
const { renderLayout } = require('../layout');

module.exports = {
  group: 'activation',
  subject: () => 'Se creó una cuenta para ti en Mi Valecito',
  render: ({ name, link }) =>
    renderLayout({
      name,
      preheader: 'Se registró una cuenta en Mi Valecito con este correo',
      paragraphs: [
        'Se registró una cuenta en Mi Valecito con este correo electrónico, la aplicación para llevar el crédito de la tienda de barrio.',
        'Si quieres usar tu cuenta, actívala con el siguiente enlace. Al abrirlo entrarás a la aplicación y te pediremos que definas tu contraseña.',
      ],
      action: { label: 'Activar mi cuenta', url: link },
      after: [
        'El enlace es personal y vence una semana después de crear la cuenta. Si no esperabas este registro, puedes ignorar este correo.',
      ],
    }),
};
