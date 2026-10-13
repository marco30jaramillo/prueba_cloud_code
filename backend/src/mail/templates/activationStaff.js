/**
 * C-3: bienvenida y activación del personal creado desde el módulo de usuarios
 * (administrador, tendero, encargado, vendedor, superusuario u otro rol).
 * data: { name, role, link }
 */
const { renderLayout, singleLine } = require('../layout');

const ROLE_INFO = {
  superuser: {
    label: 'superusuario',
    can: 'Con tu rol tienes acceso a toda la administración de la aplicación.',
  },
  administrador: {
    label: 'administrador',
    can: 'Con tu rol puedes gestionar personas y tiendas, registrar vales y cobros, y consultar los roles y la auditoría.',
  },
  tendero: {
    label: 'tendero',
    can: 'Con tu rol puedes operar tu tienda: registrar vales, recibir abonos, consultar la cartera de tus clientes y armar tu equipo.',
  },
  encargado: {
    label: 'encargado',
    can: 'Con tu rol atiendes la tienda en nombre del dueño: registras vales y recibes abonos.',
  },
  vendedor: {
    label: 'vendedor',
    can: 'Con tu rol puedes registrar vales y consultar la cartera de la tienda a la que te asignen.',
  },
  cliente: {
    label: 'cliente',
    can: 'Con tu rol puedes consultar tus vales y abonos en las tiendas donde tienes vales.',
  },
};

function describeRole(role) {
  const key = singleLine(role, 60).toLowerCase();
  if (ROLE_INFO[key]) return ROLE_INFO[key];
  return {
    label: singleLine(role, 60) || 'usuario',
    can: 'Con tu rol podrás usar las funciones de la aplicación que el administrador te haya asignado.',
  };
}

module.exports = {
  group: 'activation',
  subject: () => 'Tu cuenta de Mi Valecito está lista: actívala',
  render: ({ name, role, link }) => {
    const info = describeRole(role);
    return renderLayout({
      name,
      preheader: 'Activa tu cuenta de Mi Valecito',
      paragraphs: [
        `Gracias por confiar en Mi Valecito para la gestión de créditos. Se creó tu cuenta con el rol de ${info.label}.`,
        info.can,
        'Para empezar, activa tu cuenta con el siguiente enlace. Al abrirlo entrarás directamente a la aplicación y te pediremos que definas tu contraseña.',
      ],
      action: { label: 'Activar mi cuenta', url: link },
      after: [
        'El enlace es personal y vence una semana después de crear la cuenta. Si no esperabas este registro, puedes ignorar este correo.',
      ],
    });
  },
};
