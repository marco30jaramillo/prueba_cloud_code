/**
 * Servicio de correo (requerimiento 003): que `send` nunca lance, auditoría sin enlaces,
 * límites persistentes, transportes y enlaces. Sin base de datos ni red.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createMailService } = require('../src/mail/mailService');
const { createMailLimits } = require('../src/mail/mailLimits');
const { createOutboxTransport } = require('../src/mail/transports/outbox');
const { createAzureTransport } = require('../src/mail/transports/azure');
const { buildLink } = require('../src/mail/links');
const { resolveMailConfig } = require('../src/mail/mailConfig');
const templates = require('../src/mail/templates');

const TOKEN = 'ab'.repeat(32);

function armar({ transport, usage = {} } = {}) {
  const auditados = [];
  const enviados = [];
  const transporte = transport || {
    name: 'prueba',
    async send(message) { enviados.push(message); return { id: 'id-1' }; },
  };
  const limits = createMailLimits({
    countActivity: async () => ({ inGap: 0, lastHour: 0, lastDay: 0, globalHour: 0, ...usage }),
  });
  const service = createMailService({
    transport: transporte,
    from: 'DoNotReply@ficticio.azurecomm.net',
    templates,
    limits,
    audit: async (entry) => { auditados.push(entry); },
  });
  return { service, auditados, enviados };
}

const DATOS = { name: 'Ana', link: `https://web.example.net/activar#token=${TOKEN}` };

test('send envía, devuelve sent y audita sin el enlace ni el token', async () => {
  const { service, auditados, enviados } = armar();
  const r = await service.send('activationSelf', { to: 'Ana@Example.com', data: DATOS });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'sent');
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, 'ana@example.com');
  assert.equal(enviados[0].from, 'DoNotReply@ficticio.azurecomm.net');
  assert.equal(auditados.length, 1);
  assert.equal(auditados[0].outcome, 'sent');
  assert.equal(auditados[0].type, 'activationSelf');
  const serializado = JSON.stringify(auditados[0]);
  assert.ok(!serializado.includes(TOKEN));
  assert.ok(!serializado.includes('activar#token'));
});

test('con el transporte caído send no lanza, devuelve failed y audita el fallo sin enlaces', async () => {
  const transport = {
    name: 'roto',
    async send() {
      const e = new Error(`fallo con ${DATOS.link}`);
      e.code = 'ServiceUnavailable';
      throw e;
    },
  };
  const { service, auditados } = armar({ transport });
  const r = await service.send('activationSelf', { to: 'ana@example.com', data: DATOS });
  assert.equal(r.ok, false);
  assert.equal(r.status, 'failed');
  assert.equal(auditados[0].outcome, 'failed');
  assert.equal(auditados[0].failureReason, 'ServiceUnavailable');
  assert.ok(!JSON.stringify(auditados[0]).includes(TOKEN));
});

test('send no lanza ni con plantilla desconocida, destinatario inválido o auditoría rota', async () => {
  const { service } = armar();
  assert.equal((await service.send('noExiste', { to: 'a@b.co' })).status, 'failed');
  assert.equal((await service.send('activationSelf', { to: 'no-es-correo', data: DATOS })).reason, 'invalid_recipient');
  assert.equal((await service.send('activationSelf', { to: 'a@b.co\r\nBcc: x@y.zz', data: DATOS })).reason, 'invalid_recipient');
  const roto = createMailService({
    transport: { name: 't', async send() { return {}; } },
    from: 'a@b.co',
    templates,
    limits: { check: async () => ({ allowed: true }) },
    audit: async () => { throw new Error('base caída'); },
  });
  assert.equal((await roto.send('activationSelf', { to: 'a@b.co', data: DATOS })).ok, true);
});

test('una plantilla que no renderiza (enlace inválido) devuelve failed sin enviar', async () => {
  const { service, enviados } = armar();
  const r = await service.send('activationSelf', { to: 'ana@example.com', data: { name: 'Ana', link: 'javascript:1' } });
  assert.equal(r.status, 'failed');
  assert.equal(enviados.length, 0);
});

test('límites: espera mínima, 3 por hora, 10 por día y tope global descartan en silencio', async () => {
  const casos = [
    [{ inGap: 1 }, 'min_gap'],
    [{ lastHour: 3 }, 'recipient_hour_cap'],
    [{ lastDay: 10 }, 'recipient_day_cap'],
    [{ globalHour: 200 }, 'global_hour_cap'],
  ];
  for (const [usage, motivo] of casos) {
    const { service, auditados, enviados } = armar({ usage });
    const r = await service.send('passwordReset', { to: 'ana@example.com', data: DATOS });
    assert.equal(r.status, 'throttled');
    assert.equal(r.reason, motivo);
    assert.equal(enviados.length, 0);
    assert.equal(auditados[0].outcome, 'throttled');
  }
});

test('límites: la cuarta solicitud en una hora no envía; las tres primeras sí', async () => {
  let enviadosEnLaHora = 0;
  const enviados = [];
  const limits = createMailLimits({
    countActivity: async () => ({ inGap: 0, lastHour: enviadosEnLaHora, lastDay: enviadosEnLaHora, globalHour: 0 }),
  });
  const service = createMailService({
    transport: { name: 't', async send(m) { enviados.push(m); enviadosEnLaHora += 1; return {}; } },
    from: 'a@b.co', templates, limits, audit: async () => {},
  });
  const estados = [];
  for (let i = 0; i < 4; i += 1) {
    estados.push((await service.send('passwordReset', { to: 'ana@example.com', data: DATOS })).status);
  }
  assert.deepEqual(estados, ['sent', 'sent', 'sent', 'throttled']);
  assert.equal(enviados.length, 3);
});

test('límites: si no se puede contar, no se envía (falla cerrada)', async () => {
  const limits = createMailLimits({ countActivity: async () => { throw new Error('sin base'); } });
  const r = await limits.check({ to: 'a@b.co', group: 'activation' });
  assert.equal(r.allowed, false);
});

test('el aviso de contraseña cambiada usa sus propios límites (sin espera mínima)', async () => {
  const { service } = armar({ usage: { inGap: 1, lastHour: 5 } });
  const r = await service.send('passwordChanged', { to: 'ana@example.com', data: { name: 'Ana', changedAt: new Date() } });
  assert.equal(r.status, 'sent');
});

test('agregar un correo nuevo solo requiere una plantilla (CA-18)', async () => {
  const ejemplo = {
    group: 'ejemplo',
    subject: () => 'Correo de ejemplo',
    render: ({ name }) => require('../src/mail/layout').renderLayout({ name, paragraphs: ['Texto de ejemplo.'] }),
  };
  const { service, enviados } = (() => {
    const e = [];
    return {
      enviados: e,
      service: createMailService({
        transport: { name: 't', async send(m) { e.push(m); return {}; } },
        from: 'a@b.co',
        templates: { ...templates, ejemplo },
        limits: { check: async () => ({ allowed: true }) },
        audit: async () => {},
      }),
    };
  })();
  assert.equal((await service.send('ejemplo', { to: 'a@b.co', data: { name: 'Ana' } })).ok, true);
  assert.match(enviados[0].text, /Atentamente, el equipo de soporte/);
});

test('outbox escribe un archivo JSON por correo, sin datos del destinatario en el nombre', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outbox-'));
  try {
    const t = createOutboxTransport({ dir });
    const r = await t.send({ from: 'a@b.co', to: 'ana@example.com', subject: 'S', html: '<p>h</p>', text: 't' });
    const archivos = fs.readdirSync(dir);
    assert.equal(archivos.length, 1);
    assert.ok(!archivos[0].includes('ana'));
    const contenido = JSON.parse(fs.readFileSync(path.join(dir, archivos[0]), 'utf8'));
    assert.equal(contenido.to, 'ana@example.com');
    assert.equal(contenido.id, r.id);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('transporte azure: envía con el SDK inyectado y no filtra el mensaje del SDK en el error', async () => {
  const llamadas = [];
  class ClienteFalso {
    constructor(cadena) { this.cadena = cadena; }
    async beginSend(msg) {
      llamadas.push(msg);
      return { pollUntilDone: async () => ({ id: 'op-1', status: 'Succeeded' }) };
    }
  }
  const ok = createAzureTransport({ connectionString: 'endpoint=https://x;accesskey=y', EmailClient: ClienteFalso });
  const r = await ok.send({ from: 'a@b.co', to: 'ana@example.com', subject: 'S', html: 'h', text: 't' });
  assert.equal(r.id, 'op-1');
  assert.equal(llamadas[0].senderAddress, 'a@b.co');
  assert.deepEqual(llamadas[0].recipients.to, [{ address: 'ana@example.com' }]);

  class ClienteRoto {
    async beginSend() { const e = new Error('contenido secreto ana@example.com'); e.code = 'Unauthorized'; throw e; }
  }
  const malo = createAzureTransport({ connectionString: 'x', EmailClient: ClienteRoto });
  await assert.rejects(
    () => malo.send({ from: 'a@b.co', to: 'ana@example.com', subject: 'S', html: 'h', text: 't' }),
    (e) => e.code === 'Unauthorized' && !e.message.includes('ana@example.com')
  );
});

test('los enlaces salen de FRONTEND_URL, nunca de APP_URL ni de la petición', () => {
  const env = { NODE_ENV: 'development', FRONTEND_URL: 'https://web-qa.example.net/', APP_URL: 'https://api-qa.example.net', HOST: 'evil.example' };
  const activar = buildLink('activate', TOKEN, env);
  assert.equal(activar, `https://web-qa.example.net/activar#token=${TOKEN}`);
  const reset = buildLink('resetPassword', TOKEN, env);
  assert.equal(reset, `https://web-qa.example.net/reset-password#token=${TOKEN}`);
  assert.ok(!activar.includes('api-qa'));
});

test('buildLink rechaza tokens con caracteres inesperados', () => {
  assert.throws(() => buildLink('activate', 'a b&c=d', { FRONTEND_URL: 'http://localhost:3000' }));
});

test('en local sin FRONTEND_URL el enlace usa localhost:3000', () => {
  assert.equal(buildLink('activate', TOKEN, { NODE_ENV: 'development' }), `http://localhost:3000/activar#token=${TOKEN}`);
});

test('resolveMailConfig: outbox por defecto en local, con remitente de ejemplo', () => {
  const c = resolveMailConfig({ NODE_ENV: 'development' });
  assert.equal(c.transport, 'outbox');
  assert.match(c.from, /@/);
});
