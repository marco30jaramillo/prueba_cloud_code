/**
 * C-4: recuperar la contraseña.
 * data: { name, link }
 */
const { renderLayout } = require('../layout');

module.exports = {
  group: 'password-reset',
  subject: () => 'Recupera tu contraseña de Mi Valecito',
  render: ({ name, link }) =>
    renderLayout({
      name,
      preheader: 'Enlace para definir una contraseña nueva',
      paragraphs: [
        'Recibimos una solicitud para recuperar la contraseña de tu cuenta de Mi Valecito.',
        'Usa el siguiente enlace para definir una contraseña nueva. El enlace sirve una sola vez y vence en una hora.',
      ],
      action: { label: 'Definir una contraseña nueva', url: link },
      after: ['Si no lo solicitaste, puedes ignorar este correo: tu contraseña actual no cambia.'],
    }),
};
