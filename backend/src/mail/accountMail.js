/**
 * Correos de cuenta: puntos de disparo de C-1 a C-5. Las rutas llaman a estas funciones y
 * no conocen plantillas, enlaces ni transporte. Ninguna lanza.
 */

const mailService = require('./mailService');
const { buildLink } = require('./links');

/**
 * Qué correo de activación corresponde:
 *  - `self`: autorregistro (C-1)
 *  - `byOther`: la creó otra persona (C-2 si es cliente, C-3 si es personal)
 *  - sin origen (reenvío): por rol; cliente -> C-2 (texto neutro), otro rol -> C-3
 */
function activationTemplate(role, origin) {
  if (origin === 'self') return 'activationSelf';
  return role === 'cliente' ? 'activationByOther' : 'activationStaff';
}

async function sendActivation(user, token, { origin = null, context = {} } = {}) {
  try {
    const link = buildLink('activate', token);
    return await mailService.send(activationTemplate(user.role, origin), {
      to: user.email,
      data: { name: user.name, role: user.role, link },
      context: { ...context, targetId: user.id },
    });
  } catch {
    return { ok: false, status: 'failed', reason: 'link_error' };
  }
}

async function sendPasswordReset(user, token, context = {}) {
  try {
    const link = buildLink('resetPassword', token);
    return await mailService.send('passwordReset', {
      to: user.email,
      data: { name: user.name, link },
      context: { ...context, targetId: user.id },
    });
  } catch {
    return { ok: false, status: 'failed', reason: 'link_error' };
  }
}

/** C-5: aviso de contraseña cambiada, por cualquier vía. No lleva la contraseña. */
async function notifyPasswordChanged(user, context = {}) {
  if (!user || !user.email) return { ok: false, status: 'failed', reason: 'no_user' };
  return mailService.send('passwordChanged', {
    to: user.email,
    data: { name: user.name, changedAt: new Date() },
    context: { ...context, targetId: user.id },
  });
}

module.exports = { sendActivation, sendPasswordReset, notifyPasswordChanged, activationTemplate };
