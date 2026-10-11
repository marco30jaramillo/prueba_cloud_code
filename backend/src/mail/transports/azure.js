/**
 * Transporte `azure`: Azure Communication Services Email (SDK oficial).
 * La cadena de conexión solo entra por parámetro (viene de ACS_EMAIL_CONNECTION_STRING) y
 * nunca se imprime ni se incluye en un error.
 *
 * Los errores que se propagan son genéricos (código del servicio o nombre del error): el
 * mensaje original del SDK puede traer el destinatario o el contenido del correo.
 */

const SEND_TIMEOUT_MS = 20000;

class MailTransportError extends Error {
  constructor(code) {
    super(`Fallo del transporte de correo: ${code}`);
    this.name = 'MailTransportError';
    this.code = code;
  }
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new MailTransportError('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function safeCode(error) {
  const raw = (error && (error.code || error.statusCode || error.name)) || 'unknown';
  return String(raw).replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 60) || 'unknown';
}

/**
 * @param {{connectionString: string, EmailClient?: Function, timeoutMs?: number}} options
 *        `EmailClient` se inyecta en las pruebas; por defecto se carga el SDK.
 */
function createAzureTransport({ connectionString, EmailClient, timeoutMs = SEND_TIMEOUT_MS }) {
  const Client = EmailClient || require('@azure/communication-email').EmailClient;
  const client = new Client(connectionString);

  return {
    name: 'azure',
    async send({ from, to, subject, html, text }) {
      try {
        const poller = await client.beginSend({
          senderAddress: from,
          content: { subject, plainText: text, html },
          recipients: { to: [{ address: to }] },
        });
        const result = await withTimeout(poller.pollUntilDone(), timeoutMs);
        if (!result || result.status !== 'Succeeded') {
          throw new MailTransportError(result && result.status ? String(result.status) : 'not_succeeded');
        }
        return { id: result.id || null };
      } catch (error) {
        if (error instanceof MailTransportError) throw error;
        throw new MailTransportError(safeCode(error));
      }
    },
  };
}

module.exports = { createAzureTransport, MailTransportError };
