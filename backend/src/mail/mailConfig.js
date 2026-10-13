/**
 * Configuración del correo, resuelta desde variables de entorno. Función pura: sin red ni base.
 * Los mensajes de error nunca incluyen la cadena de conexión ni ningún secreto.
 *
 * Variables:
 *  - MAIL_TRANSPORT            `azure` | `outbox`. En producción/App Service solo `azure`.
 *  - ACS_EMAIL_CONNECTION_STRING  Cadena de Azure Communication Services (secreto, solo en el ambiente).
 *  - MAIL_FROM                 Remitente (dirección del dominio verificado en el servicio).
 *  - MAIL_OUTBOX_DIR           Carpeta del transporte `outbox` (por defecto backend/.mail-outbox).
 *  - FRONTEND_URL              Origen de la web: arma todos los enlaces de los correos.
 */

const path = require('path');

const TRANSPORTS = ['azure', 'outbox'];
const EMAIL_FORMAT = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const DEFAULT_OUTBOX_FROM = 'no-reply@mivalecito.local';
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_OUTBOX_DIR = path.resolve(__dirname, '../../.mail-outbox');

class MailConfigError extends Error {
  constructor(errors) {
    super(errors.join(' | '));
    this.name = 'MailConfigError';
    this.errors = errors;
  }
}

/** Producción estricta: `NODE_ENV=production` o proceso dentro de App Service (QA incluido). */
function isStrictEnvironment(env) {
  return env.NODE_ENV === 'production' || Boolean(env.WEBSITE_SITE_NAME);
}

function isValidSender(value) {
  return typeof value === 'string' && value.length <= 320 && !/[\r\n]/.test(value) && EMAIL_FORMAT.test(value.trim());
}

function parseFrontendUrl(value, strict) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { error: 'FRONTEND_URL no es una URL válida.' };
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && !strict)) {
    return { error: strict ? 'FRONTEND_URL debe ser https en producción.' : 'FRONTEND_URL debe ser http o https.' };
  }
  if (url.username || url.password) return { error: 'FRONTEND_URL no debe llevar credenciales.' };
  // Sin barra final: los enlaces se arman con `${base}/ruta`.
  return { value: (url.origin + url.pathname).replace(/\/+$/, '') };
}

/**
 * Devuelve `{ errors, config }`. `config` solo es utilizable si `errors` está vacío.
 */
function inspectMailConfig(env = process.env) {
  const errors = [];
  const strict = isStrictEnvironment(env);
  const rawTransport = String(env.MAIL_TRANSPORT || '').trim().toLowerCase();
  let transport = rawTransport;

  if (!rawTransport) {
    if (strict) {
      errors.push('MAIL_TRANSPORT es obligatorio en producción y debe ser "azure".');
    } else {
      transport = 'outbox';
    }
  } else if (!TRANSPORTS.includes(rawTransport)) {
    errors.push('MAIL_TRANSPORT debe ser "azure" o "outbox".');
  } else if (strict && rawTransport !== 'azure') {
    errors.push('MAIL_TRANSPORT debe ser "azure" en producción: el transporte "outbox" no envía correos reales.');
  }

  const connectionString = String(env.ACS_EMAIL_CONNECTION_STRING || '').trim();
  const from = String(env.MAIL_FROM || '').trim();

  if (transport === 'azure') {
    if (!connectionString) {
      errors.push('ACS_EMAIL_CONNECTION_STRING es obligatoria con MAIL_TRANSPORT=azure.');
    } else if (!/endpoint=https?:\/\/[^;]+;\s*accesskey=[^;]+/i.test(connectionString)) {
      errors.push('ACS_EMAIL_CONNECTION_STRING no tiene el formato de una cadena de conexión de Communication Services.');
    }
    if (!from) errors.push('MAIL_FROM es obligatorio con MAIL_TRANSPORT=azure.');
  }
  if (from && !isValidSender(from)) {
    errors.push('MAIL_FROM no es una dirección de correo válida.');
  }

  let frontendUrl = DEFAULT_FRONTEND_URL;
  const rawFrontend = String(env.FRONTEND_URL || '').trim();
  if (rawFrontend) {
    const parsed = parseFrontendUrl(rawFrontend, strict);
    if (parsed.error) errors.push(parsed.error);
    else frontendUrl = parsed.value;
  } else if (strict) {
    errors.push('FRONTEND_URL es obligatoria en producción: arma los enlaces de los correos.');
  }

  return {
    errors,
    config: {
      transport,
      from: from || (transport === 'outbox' ? DEFAULT_OUTBOX_FROM : ''),
      connectionString,
      outboxDir: env.MAIL_OUTBOX_DIR ? path.resolve(env.MAIL_OUTBOX_DIR) : DEFAULT_OUTBOX_DIR,
      frontendUrl,
      strict,
    },
  };
}

/** Origen de la web, ya validado (sin barra final). Lanza si FRONTEND_URL es inválida. */
function resolveFrontendUrl(env = process.env) {
  const strict = isStrictEnvironment(env);
  const raw = String(env.FRONTEND_URL || '').trim();
  if (!raw) {
    if (strict) throw new MailConfigError(['FRONTEND_URL es obligatoria en producción.']);
    return DEFAULT_FRONTEND_URL;
  }
  const parsed = parseFrontendUrl(raw, strict);
  if (parsed.error) throw new MailConfigError([parsed.error]);
  return parsed.value;
}

/** Lanza `MailConfigError` si la configuración no es válida. */
function resolveMailConfig(env = process.env) {
  const { errors, config } = inspectMailConfig(env);
  if (errors.length) throw new MailConfigError(errors);
  return config;
}

function collectMailErrors(env = process.env) {
  return inspectMailConfig(env).errors;
}

module.exports = {
  MailConfigError,
  isStrictEnvironment,
  isValidSender,
  inspectMailConfig,
  resolveMailConfig,
  resolveFrontendUrl,
  collectMailErrors,
  DEFAULT_OUTBOX_DIR,
};
