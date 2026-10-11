/**
 * Transporte `outbox` (desarrollo local): escribe cada correo como un archivo JSON en una
 * carpeta ignorada por Git. No sale a la red y no sirve para producción (mailConfig lo veta).
 * El archivo SÍ contiene el enlace completo: es lo que permite probar el flujo en local.
 * El nombre del archivo no lleva datos del destinatario.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createOutboxTransport({ dir }) {
  return {
    name: 'outbox',
    async send({ from, to, subject, html, text }) {
      await fs.promises.mkdir(dir, { recursive: true });
      const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const file = path.join(dir, `${id}.json`);
      const payload = { id, createdAt: new Date().toISOString(), from, to, subject, text, html };
      await fs.promises.writeFile(file, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });
      return { id };
    },
  };
}

module.exports = { createOutboxTransport };
