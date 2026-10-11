/**
 * Servicio de correo genérico.
 *
 *   mailService.send('<plantilla>', { to, data, context })
 *
 * - `send` NUNCA lanza: devuelve `{ ok, status }` (`sent` | `failed` | `throttled`) y deja
 *   constancia en la auditoría (tipo, destinatario, resultado; jamás el enlace ni el token).
 * - Una operación (registro, cambio de contraseña) no depende de que el correo salga.
 * - Plantillas por nombre en ./templates; transporte por configuración (azure | outbox).
 *
 * `createMailService` recibe sus dependencias para poder probarse sin red ni base de datos;
 * el singleton por defecto las arma de forma perezosa.
 */

const { cleanSubject } = require('./layout');

const EMAIL_FORMAT = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

function safeReason(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 80) || 'unknown';
}

/**
 * @param {object} deps
 * @param {{name:string, send:Function}} deps.transport
 * @param {string} deps.from                 Remitente (de configuración, nunca de la petición).
 * @param {object} deps.templates            Registro de plantillas por nombre.
 * @param {{check:Function}} deps.limits     Ver mailLimits.js.
 * @param {Function} deps.audit              async ({outcome,type,group,to,transport,...}) => void
 */
function createMailService({ transport, from, templates, limits, audit }) {
  async function record(entry) {
    try {
      await audit(entry);
    } catch (error) {
      // La auditoría tampoco debe romper la operación; sin datos del mensaje en el log.
      console.error('[mail] no se pudo auditar un envío:', safeReason(error && error.code));
    }
  }

  async function send(type, { to, data = {}, context = {} } = {}) {
    const base = {
      type: String(type),
      to: typeof to === 'string' ? to.trim().toLowerCase() : '',
      transport: transport.name,
      actorId: context.actorId,
      targetId: context.targetId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };

    const template = Object.prototype.hasOwnProperty.call(templates, type) ? templates[type] : null;
    if (!template) {
      await record({ ...base, group: 'unknown', outcome: 'failed', failureReason: 'unknown_template' });
      return { ok: false, status: 'failed', reason: 'unknown_template' };
    }
    base.group = template.group || String(type);

    if (!base.to || base.to.length > 320 || !EMAIL_FORMAT.test(base.to)) {
      await record({ ...base, to: '', outcome: 'failed', failureReason: 'invalid_recipient' });
      return { ok: false, status: 'failed', reason: 'invalid_recipient' };
    }

    const verdict = await limits.check({ to: base.to, group: base.group, templateLimits: template.limits });
    if (!verdict.allowed) {
      await record({ ...base, outcome: 'throttled', failureReason: verdict.reason });
      return { ok: false, status: 'throttled', reason: verdict.reason };
    }

    let message;
    try {
      const subject = cleanSubject(template.subject(data));
      const body = template.render(data);
      message = { from, to: base.to, subject, html: body.html, text: body.text };
    } catch {
      await record({ ...base, outcome: 'failed', failureReason: 'render_error' });
      return { ok: false, status: 'failed', reason: 'render_error' };
    }

    try {
      const result = await transport.send(message);
      await record({ ...base, outcome: 'sent' });
      return { ok: true, status: 'sent', id: (result && result.id) || null };
    } catch (error) {
      const reason = safeReason(error && (error.code || error.name));
      await record({ ...base, outcome: 'failed', failureReason: reason });
      return { ok: false, status: 'failed', reason };
    }
  }

  /** ¿Se enviaría ahora un correo de esta plantilla a este destinatario? (sin enviar ni auditar) */
  async function check(type, { to } = {}) {
    const template = Object.prototype.hasOwnProperty.call(templates, type) ? templates[type] : null;
    const address = typeof to === 'string' ? to.trim().toLowerCase() : '';
    if (!template || !address || !EMAIL_FORMAT.test(address)) return { allowed: false, reason: 'invalid' };
    return limits.check({ to: address, group: template.group || String(type), templateLimits: template.limits });
  }

  return { send, check, templates: Object.keys(templates) };
}

// ── Singleton por defecto ───────────────────────────────────────────────────────────────
let defaultService;

function getDefaultService() {
  if (defaultService) return defaultService;

  const { resolveMailConfig } = require('./mailConfig');
  const { createMailLimits } = require('./mailLimits');
  const templates = require('./templates');
  const config = resolveMailConfig(process.env);

  let transport;
  if (config.transport === 'azure') {
    transport = require('./transports/azure').createAzureTransport({ connectionString: config.connectionString });
  } else {
    transport = require('./transports/outbox').createOutboxTransport({ dir: config.outboxDir });
  }

  const AuditLog = require('../models/AuditLog');
  const auditMiddleware = require('../middleware/auditMiddleware');

  defaultService = createMailService({
    transport,
    from: config.from,
    templates,
    limits: createMailLimits({ countActivity: (args) => AuditLog.countMailActivity(args) }),
    audit: (entry) => auditMiddleware.logMail(entry),
  });
  return defaultService;
}

/** Fachada: `mailService.send(...)` no lanza ni siquiera si la configuración está rota. */
async function send(type, options) {
  try {
    return await getDefaultService().send(type, options);
  } catch {
    return { ok: false, status: 'failed', reason: 'mail_unavailable' };
  }
}

async function check(type, options) {
  try {
    return await getDefaultService().check(type, options);
  } catch {
    return { allowed: false, reason: 'mail_unavailable' };
  }
}

module.exports = { createMailService, send, check };
