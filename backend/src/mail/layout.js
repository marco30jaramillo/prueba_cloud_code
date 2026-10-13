/**
 * Diseño común de todos los correos: encabezado, saludo, cuerpo, botón de acción, firma y pie.
 * Una plantilla solo aporta su contenido; la firma y el pie salen de aquí, de modo que ningún
 * correo puede omitirlos.
 *
 * Todo dato que entra al HTML pasa por `escapeHtml`; el asunto pasa por `cleanSubject`.
 */

const BRAND = 'Mi Valecito';
const SIGNATURE = 'Atentamente, el equipo de soporte';
const FOOTER_LINES = [
  'Este correo es autogenerado; por favor no lo respondas.',
  'Tratamos tus datos personales conforme a la normativa colombiana de protección de datos personales.',
];

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

// Caracteres de control (0x00-0x1f y 0x7f), armados sin escribirlos en el código fuente.
const CONTROL_CHARS = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']+',
  'g'
);

/** Texto de una sola línea y sin caracteres de control (asunto y saludos). */
function singleLine(value, max = 200) {
  return String(value === undefined || value === null ? '' : value)
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanSubject(value) {
  return singleLine(value, 150) || BRAND;
}

function assertHttpUrl(url) {
  if (typeof url !== 'string' || !/^https?:\/\/[^\s"'<>]+$/i.test(url)) {
    throw new Error('El enlace del correo no es una URL http(s) válida');
  }
  return url;
}

/**
 * @param {object} opts
 * @param {string} opts.name        Nombre del destinatario (sin confiar: se escapa).
 * @param {string[]} opts.paragraphs Párrafos antes del botón (texto plano; se escapan).
 * @param {{label:string,url:string}} [opts.action] Botón con enlace.
 * @param {string[]} [opts.after]   Párrafos después del botón.
 * @param {string} [opts.preheader] Resumen que ve la bandeja de entrada.
 * @returns {{html:string,text:string}}
 */
function renderLayout({ name, paragraphs = [], action = null, after = [], preheader = '' }) {
  const who = singleLine(name, 120);
  const greeting = who ? `Hola, ${who}` : 'Hola';
  const url = action ? assertHttpUrl(action.url) : null;

  const p = (text) =>
    `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#1f2937;">${escapeHtml(text)}</p>`;

  const button = action
    ? `<p style="margin:24px 0;text-align:center;">
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 28px;border-radius:6px;">${escapeHtml(action.label)}</a>
      </p>
      <p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:#4b5563;word-break:break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${escapeHtml(url)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(BRAND)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(singleLine(preheader, 140))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
  <tr><td align="center" style="padding:16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;">
      <tr><td style="padding:20px 24px;background:#2563eb;border-radius:8px 8px 0 0;font-size:20px;font-weight:bold;color:#ffffff;">${escapeHtml(BRAND)}</td></tr>
      <tr><td style="padding:24px;">
        <p style="margin:0 0 16px 0;font-size:18px;font-weight:bold;color:#1f2937;">${escapeHtml(greeting)}</p>
        ${paragraphs.map(p).join('\n        ')}
        ${button}
        ${after.map(p).join('\n        ')}
        <p style="margin:24px 0 0 0;font-size:16px;line-height:1.5;color:#1f2937;">${escapeHtml(SIGNATURE)}</p>
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">
        ${FOOTER_LINES.map((line) => `<p style="margin:0 0 6px 0;">${escapeHtml(line)}</p>`).join('\n        ')}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const textParts = [greeting, '', ...paragraphs.flatMap((t) => [t, ''])];
  if (action) textParts.push(`${action.label}: ${url}`, '');
  after.forEach((t) => textParts.push(t, ''));
  textParts.push(SIGNATURE, '', '--', ...FOOTER_LINES);

  return { html, text: textParts.join('\n') };
}

module.exports = { BRAND, SIGNATURE, FOOTER_LINES, escapeHtml, singleLine, cleanSubject, renderLayout };
