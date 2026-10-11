/**
 * C-5: aviso de que la contraseña de la cuenta fue cambiada. Nunca incluye la contraseña.
 * data: { name, changedAt (Date | ISO string) }
 */
const { renderLayout } = require('../layout');

const FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

function formatWhen(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${FORMATTER.format(date)} (hora de Colombia)`;
}

module.exports = {
  group: 'password-changed',
  // El aviso es de seguridad: no debe silenciarse por el espaciado de 60 s de otros correos.
  limits: { perHour: 10, perDay: 20, minGapSeconds: 0 },
  subject: () => 'Tu contraseña de Mi Valecito fue cambiada',
  render: ({ name, changedAt }) => {
    const when = formatWhen(changedAt);
    return renderLayout({
      name,
      preheader: 'La contraseña de tu cuenta fue cambiada',
      paragraphs: [
        when
          ? `La contraseña de tu cuenta de Mi Valecito fue cambiada el ${when}.`
          : 'La contraseña de tu cuenta de Mi Valecito fue cambiada.',
        'Si fuiste tú, no necesitas hacer nada.',
      ],
      after: [
        'Si no fuiste tú, restablece tu contraseña de inmediato desde la opción «Olvidé mi contraseña» de la aplicación y avisa a la tienda o al administrador.',
      ],
    });
  },
};
