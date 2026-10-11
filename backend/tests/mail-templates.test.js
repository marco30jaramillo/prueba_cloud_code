/**
 * Plantillas de correo (requerimiento 003): escapado, firma, pie, asunto y contenido.
 * Sin base de datos ni red. Ejecutar con: node --test
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const templates = require('../src/mail/templates');
const { escapeHtml, cleanSubject, FOOTER_LINES, SIGNATURE } = require('../src/mail/layout');

const NOMBRE_HOSTIL = '<script>x</script>';
const ENLACE = 'https://web-ficticia.example.net/activar#token=' + 'a1'.repeat(32);
const DATOS = {
  name: NOMBRE_HOSTIL,
  role: 'tendero',
  link: ENLACE,
  changedAt: new Date('2026-10-10T15:30:00Z'),
  // Datos que nunca deben llegar al correo.
  password: 'Secreto-ficticio-9!',
  saldo: 123456,
  vale: 'VALE-ficticio',
};

test('hay cinco plantillas registradas (C-1 a C-5)', () => {
  assert.deepEqual(Object.keys(templates).sort(),
    ['activationByOther', 'activationSelf', 'activationStaff', 'passwordChanged', 'passwordReset']);
});

for (const [nombre, plantilla] of Object.entries(templates)) {
  test(`${nombre}: escapa el nombre y no deja HTML activo`, () => {
    const { html, text } = plantilla.render(DATOS);
    assert.ok(!html.includes('<script>'), 'el HTML no debe contener <script>');
    assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
    // En texto plano no hay HTML que ejecutar.
    assert.ok(text.includes(NOMBRE_HOSTIL));
  });

  test(`${nombre}: lleva la firma y el pie de dos líneas`, () => {
    const { html, text } = plantilla.render(DATOS);
    for (const salida of [html, text]) {
      assert.ok(salida.includes('Atentamente, el equipo de soporte'));
      assert.ok(salida.includes('Este correo es autogenerado; por favor no lo responda.'));
      assert.ok(salida.includes('Sus datos personales serán tratados conforme a la normativa colombiana de protección de datos personales.'));
    }
    assert.equal(SIGNATURE, 'Atentamente, el equipo de soporte');
    assert.equal(FOOTER_LINES.length, 2);
  });

  test(`${nombre}: no incluye contraseñas ni datos de vales`, () => {
    const { html, text } = plantilla.render(DATOS);
    for (const salida of [html, text]) {
      assert.ok(!salida.includes('Secreto-ficticio-9!'));
      assert.ok(!salida.includes('123456'));
      assert.ok(!salida.includes('VALE-ficticio'));
    }
  });

  test(`${nombre}: asunto de una línea`, () => {
    const asunto = plantilla.subject(DATOS);
    assert.ok(asunto.length > 0);
    assert.ok(!/[\r\n]/.test(asunto));
  });

  test(`${nombre}: es legible en celular (viewport y ancho máximo)`, () => {
    const { html } = plantilla.render(DATOS);
    assert.match(html, /name="viewport"/);
    assert.match(html, /max-width:600px/);
  });
}

test('las plantillas con enlace lo muestran como botón y como texto', () => {
  for (const nombre of ['activationSelf', 'activationByOther', 'activationStaff', 'passwordReset']) {
    const { html, text } = templates[nombre].render(DATOS);
    assert.ok(html.includes(`href="${ENLACE}"`), `${nombre}: href`);
    assert.ok(text.includes(ENLACE), `${nombre}: texto`);
  }
});

test('el aviso de contraseña cambiada no lleva enlace y muestra fecha y hora', () => {
  const { html, text } = templates.passwordChanged.render(DATOS);
  assert.ok(!html.includes('href='));
  assert.match(text, /2026/);
  assert.match(text, /hora de Colombia/);
});

test('la recuperación dice que sirve una vez y vence en una hora', () => {
  const { text } = templates.passwordReset.render(DATOS);
  assert.match(text, /una sola vez/);
  assert.match(text, /una hora/);
});

test('el correo del personal nombra el rol y trae el enlace', () => {
  const { text } = templates.activationStaff.render({ ...DATOS, name: 'Ana' });
  assert.match(text, /tendero/);
  assert.match(text, /registrar vales/);
});

test('un rol personalizado con HTML se escapa y no rompe la plantilla', () => {
  const { html } = templates.activationStaff.render({ ...DATOS, name: 'Ana', role: '<b>jefe</b>' });
  assert.ok(!html.includes('<b>jefe</b>'));
});

test('el enlace debe ser http(s): un javascript: no se renderiza', () => {
  assert.throws(() => templates.activationSelf.render({ name: 'Ana', link: 'javascript:alert(1)' }));
});

test('el asunto no admite saltos de línea (inyección de cabeceras)', () => {
  assert.equal(cleanSubject('Hola\r\nBcc: x@y.zz'), 'Hola Bcc: x@y.zz');
});

test('escapeHtml cubre los caracteres peligrosos', () => {
  assert.equal(escapeHtml(`<a href="x">'&\``), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#96;');
});
