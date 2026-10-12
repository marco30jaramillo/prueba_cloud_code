/**
 * Inventario de marca como pruebas (requerimiento 008, tarea 5; criterio CA-18).
 *
 * Convierte la auditoría inicial en mediciones repetibles sobre web, móvil, mensajes de la API
 * y plantillas de correo. No necesita base de datos ni servidor: solo lee archivos, por eso vive
 * en `tests/` y la corre el despliegue a QA (`node --test tests/*.test.js`).
 *
 * TRES GRUPOS DE PRUEBAS
 *
 *   1. Instrumento (siempre activas, deben pasar): el alcance no se encogió, los detectores
 *      reconocen muestras sembradas, el contraste se calcula bien y los pares de la paleta de
 *      marca cumplen AA.
 *   2. Línea base (siempre activas): ninguna métrica puede estar peor que la línea base
 *      registrada en `fixtures/marca-linea-base.json`. Solo pueden bajar.
 *   3. Objetivo (CA-3 a CA-22): cada métrica debe llegar a su valor esperado, normalmente cero.
 *      Hoy el estado aún no cumple, así que estas pruebas están marcadas `todo` con el
 *      identificador T-27: se ejecutan y se muestran, pero un incumplimiento NO rompe la
 *      corrida ni el despliegue a QA.
 *
 * CÓMO SE ACTIVAN AL CIERRE (tarea 17 del requerimiento 008)
 *
 *   - Cambiar `"estricto": false` por `"estricto": true` en `fixtures/marca-linea-base.json`.
 *     Desde ese momento cada prueba de objetivo es una prueba normal y un incumplimiento falla
 *     la corrida (exit code distinto de cero).
 *   - Para verlas en rojo sin editar nada, en cualquier momento:
 *       MARCA_ESTRICTA=1 node --test tests/marca-inventario.test.js
 *     (PowerShell: `$env:MARCA_ESTRICTA='1'; node --test tests/marca-inventario.test.js`)
 *
 * Detalle de cada hallazgo (archivo y línea):
 *   node tests/fixtures/marca-inventario.js --detalle
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const inventario = require('./fixtures/marca-inventario');
const BASE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'marca-linea-base.json'), 'utf8'));

const ESTRICTO = process.env.MARCA_ESTRICTA === '1' || BASE.estricto === true;
const PENDIENTE = ESTRICTO ? false : 'T-27 línea base 008: el estado aún no cumple; se activa al cierre (estricto: true)';

const R = inventario.medir();
const valor = (metrica) => {
  assert.ok(R.metricas[metrica], `la métrica ${metrica} no existe en el inventario`);
  return R.metricas[metrica].valor;
};
const detalle = (metrica, n = 8) => {
  const lista = R.metricas[metrica].detalle.slice(0, n).map((d) => `  ${d.archivo}:${d.linea}  ${d.texto}`);
  const resto = R.metricas[metrica].valor - lista.length;
  return lista.join('\n') + (resto > 0 && R.metricas[metrica].detalle.length > n ? `\n  ... y ${R.metricas[metrica].detalle.length - n} más` : '');
};

// ---------------------------------------------------------------------------------------
// 1. Instrumento
// ---------------------------------------------------------------------------------------

test('CA-18 · el inventario mide al menos los mismos archivos que la línea base', () => {
  for (const clave of ['web', 'movil', 'movilConfig', 'correos', 'api']) {
    assert.ok(R.alcance[clave] >= BASE.alcance[clave],
      `${clave}: ${R.alcance[clave]} archivos medidos y la línea base tiene ${BASE.alcance[clave]}; un alcance menor daría ceros falsos`);
  }
  assert.ok(R.alcance.web >= 40 && R.alcance.movil >= 10 && R.alcance.correos >= 6 && R.alcance.api >= 15);
});

test('CA-18 · el inventario encuentra texto visible en web, móvil, API y correos', () => {
  assert.ok(valor('textos.web.total') >= 300, `web: ${valor('textos.web.total')} textos`);
  assert.ok(valor('textos.movil.total') >= 100, `móvil: ${valor('textos.movil.total')} textos`);
  assert.ok(valor('textos.api.total') >= 100, `API: ${valor('textos.api.total')} mensajes`);
  assert.ok(valor('textos.correos.total') >= 25, `correos: ${valor('textos.correos.total')} textos`);
});

test('CA-18 · los detectores reconocen incumplimientos sembrados y dejan pasar texto correcto', () => {
  const d = inventario.detectores;
  // Incumplimientos que deben detectarse
  assert.match('Logout en este dispositivo', d.RE_INGLES);
  assert.match('Click here to continue', d.RE_INGLES);
  assert.match('No puedes editar a un superuser', d.RE_INGLES);
  assert.match('Ingrese su contraseña', d.RE_USTED_VERBO);
  assert.match('Si el botón no funciona, copie y pegue este enlace', d.RE_USTED_VERBO);
  assert.match('Usted debe pagar', d.RE_USTED_DIRECTO);
  assert.match('Nueva Venta al Fiado', d.RE_FIADO);
  assert.match('Error de base de datos al cargar tiendas', d.RE_JERGA);
  assert.match('Token de recuperación inválido', d.RE_JERGA);
  assert.match('Error 500 al cargar', d.RE_JERGA);
  assert.match('El campo isActive debe ser un booleano', d.RE_CAMPO_TECNICO);
  assert.match('Top deudores', d.RE_FUERA_GLOSARIO);
  assert.match('Nueva venta', d.RE_FUERA_GLOSARIO);
  assert.match('Sistema de crédito local', d.RE_FUERA_GLOSARIO);
  assert.match('Ingresa tu email', d.RE_INGLES);
  assert.match('Registrar usuario', d.RE_USUARIO);
  assert.match('Para tiendas de barrio en Cartagena', d.RE_CARTAGENA);
  assert.match('🧾 Mi Valecito', d.RE_EMOJI);
  assert.match('✓ Guardar abono', d.RE_EMOJI);
  assert.match('Bienvenido a Valencito', d.RE_VALECITO);
  // Texto correcto: no debe marcarse
  for (const bueno of ['Cerrar sesión', 'Tu vale está al día', 'Registra un abono', 'Tus vales en mora', 'Cartera de la tienda']) {
    assert.doesNotMatch(bueno, d.RE_INGLES, bueno);
    assert.doesNotMatch(bueno, d.RE_USTED_VERBO, bueno);
    assert.doesNotMatch(bueno, d.RE_USTED_DIRECTO, bueno);
    assert.doesNotMatch(bueno, d.RE_FIADO, bueno);
    assert.doesNotMatch(bueno, d.RE_JERGA, bueno);
    assert.doesNotMatch(bueno, d.RE_FUERA_GLOSARIO, bueno);
    assert.doesNotMatch(bueno, d.RE_EMOJI, bueno);
  }
  assert.doesNotMatch('Ingresa tu correo', d.RE_USTED_VERBO, '«Ingresa» es de tú');
  assert.doesNotMatch('Para tiendas de barrio en las ciudades de la costa', d.RE_CARTAGENA);
});

test('CA-18 · la medición de colores separa paleta, fuera de paleta y sombras', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'marca-inv-'));
  try {
    const archivo = path.join(dir, 'muestra.scss');
    fs.writeFileSync(archivo, [
      '.a { color: #2563EB; background: #fff; }',            // paleta (y blanco corto)
      '.b { color: #10b981; }',                                // fuera
      '.c { background: #3B82F6; border: 1px solid #E5E7EB; }', // 1 fuera, 1 paleta
      '.d { box-shadow: 0 1px 2px #000; }',                    // sombra negra: permitida
      '.e { color: #000; }',                                   // negro fuera de sombra: fuera
      '// comentario #ff0000 cuenta como línea (método de la auditoría)',
    ].join('\n'));
    const r = inventario.funciones.medirHex([archivo]);
    assert.equal(r.dentro, 3, 'dentro de paleta');
    assert.equal(r.sombras, 1, 'sombras');
    assert.deepEqual(r.fuera.map((x) => x.texto).sort(), ['#000000', '#10B981', '#3B82F6', '#FF0000']);
    assert.equal(r.tonos.size, 4);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CA-18 · la extracción de texto toma texto visible y deja fuera comentarios, clases y consola', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'marca-inv-'));
  try {
    const archivo = path.join(dir, 'Muestra.tsx');
    fs.writeFileSync(archivo, [
      "import { Button } from 'react-bootstrap';",
      '// Logout en un comentario no cuenta',
      'export default function Muestra() {',
      "  console.log('Logout en consola no cuenta');",
      "  const rx = /`/g;",
      "  const mensaje = 'Error de base de datos';",
      '  return (',
      '    <div className="btn btn-success mt-2">',
      '      <Button variant="success">Cerrar sesión</Button>',
      '      <p>Texto visible en JSX</p>',
      '    </div>',
      '  );',
      '}',
    ].join('\n'));
    const textos = inventario.funciones.textosVisibles(archivo).map((t) => t.texto);
    assert.ok(textos.includes('Error de base de datos'), 'literal de texto');
    assert.ok(textos.includes('Cerrar sesión'), 'texto de botón');
    assert.ok(textos.includes('Texto visible en JSX'), 'texto JSX');
    assert.ok(!textos.some((t) => /btn-success/.test(t)), 'clase CSS');
    assert.ok(!textos.some((t) => /Logout/.test(t)), 'comentario o consola');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CA-6 · el cálculo de contraste da las relaciones WCAG conocidas', () => {
  assert.equal(Math.round(inventario.contraste('000000', 'FFFFFF') * 10) / 10, 21);
  assert.equal(inventario.contraste('FFFFFF', 'FFFFFF'), 1);
  const gris = inventario.contraste('9CA3AF', 'FFFFFF'); // gris de texto de Tailwind 400, citado en la auditoría
  assert.ok(gris > 2.4 && gris < 2.8, `9CA3AF sobre blanco: ${gris.toFixed(2)}`);
  const azul = inventario.contraste('FFFFFF', '2563EB');
  assert.ok(azul > 5.0 && azul < 5.5, `blanco sobre azul de marca: ${azul.toFixed(2)} (Brand Book: 5.2:1)`);
});

test('CA-6 · los pares de color de la paleta de marca cumplen el contraste que exige el Brand Book', () => {
  const bajos = inventario.PARES_MARCA
    .map(([nombre, fg, bg, min]) => ({ nombre, ratio: inventario.contraste(fg, bg), min }))
    .filter((x) => x.ratio < x.min);
  assert.deepEqual(bajos.map((x) => `${x.nombre}: ${x.ratio.toFixed(2)}:1 < ${x.min}`), []);
  assert.equal(valor('contraste.marca.paresBajoMinimo'), 0);
});

// ---------------------------------------------------------------------------------------
// 2. Línea base: ninguna métrica puede empeorar
// ---------------------------------------------------------------------------------------

// Métricas donde menos es mejor.
const METRICAS_A_CERO = Object.keys(BASE.metricas).filter((k) => !BASE.metricas[k].soloInforme && BASE.metricas[k].objetivo === 0);
// Métricas donde más es mejor (presencia de fuente, logo, icono, cifras tabulares).
const METRICAS_A_UNO = Object.keys(BASE.metricas).filter((k) => !BASE.metricas[k].soloInforme && BASE.metricas[k].objetivo === 'minimo-1');

for (const clave of METRICAS_A_CERO) {
  test(`CA-18 · línea base · ${clave} no supera ${BASE.metricas[clave].valor}`, () => {
    const actual = valor(clave);
    assert.ok(actual <= BASE.metricas[clave].valor,
      `${clave} subió de ${BASE.metricas[clave].valor} a ${actual}: el cambio introduce incumplimientos nuevos\n${detalle(clave)}`);
  });
}
for (const clave of METRICAS_A_UNO) {
  test(`CA-18 · línea base · ${clave} no baja de ${BASE.metricas[clave].valor}`, () => {
    const actual = valor(clave);
    assert.ok(actual >= BASE.metricas[clave].valor, `${clave} bajó de ${BASE.metricas[clave].valor} a ${actual}`);
  });
}

// ---------------------------------------------------------------------------------------
// 3. Objetivo por criterio de aceptación (pendientes hasta el cierre)
// ---------------------------------------------------------------------------------------

/** [id, descripción, métrica(s), tipo] — tipo 'cero' = igual a 0; 'uno' = al menos 1. */
const OBJETIVOS = [
  // CA-3 · botón principal azul, uno por pantalla
  ['CA-3', 'web: cero botones de acción en verde (hoy 24 con variante fija y 2 con variante condicional)', ['botones.web.verdes', 'botones.web.verdesDinamicos'], 'cero'],
  ['CA-3', 'web: ningún archivo de pantalla con más de un botón principal', 'botones.web.archivosConVariosPrincipales', 'cero'],
  // CA-4 · verde, rojo y ámbar solo con su significado
  ['CA-4', 'web: cero indicadores de carga en verde (hoy 5)', 'botones.web.cargaVerde', 'cero'],
  // CA-5 · paleta
  ['CA-5', 'web: cero colores hexadecimales fuera de la paleta (hoy 246 en la auditoría)', 'colores.web.fuera', 'cero'],
  ['CA-5', 'móvil: cero colores hexadecimales fuera de la paleta (hoy 126)', 'colores.movil.fuera', 'cero'],
  ['CA-5', 'móvil: cero colores fuera de la paleta en app.json (icono y pantalla de inicio)', 'colores.movilConfig.fuera', 'cero'],
  ['CA-5', 'web: cero colores rgb/hsl fuera de la paleta', 'colores.web.funcionales', 'cero'],
  ['CA-5', 'móvil: cero colores rgb/hsl fuera de la paleta', 'colores.movil.funcionales', 'cero'],
  ['CA-5', 'web y móvil: cero colores escritos con nombre (red, black...)', ['colores.web.nombres', 'colores.movil.nombres'], 'cero'],
  // CA-6 · contraste
  ['CA-6', 'web: ningún par texto/fondo del código baja de 4.5:1', 'contraste.web.paresBajoAA', 'cero'],
  ['CA-6', 'web: ningún texto oscuro sin fondo declarado baja de 4.5:1 sobre blanco', 'contraste.web.supuestosBajoAA', 'cero'],
  ['CA-6', 'móvil: ningún par texto/fondo del código baja de 4.5:1', 'contraste.movil.paresBajoAA', 'cero'],
  ['CA-6', 'móvil: ningún texto oscuro sin fondo declarado baja de 4.5:1 sobre blanco', 'contraste.movil.supuestosBajoAA', 'cero'],
  // CA-7 · tipografía propia, sin servicios externos
  ['CA-7', 'web: la fuente de marca se carga desde la aplicación (next/font/local o @font-face)', 'fuente.web.local', 'uno'],
  ['CA-7', 'web: ninguna solicitud a servicios externos de fuentes', 'fuente.web.solicitudesExternas', 'cero'],
  ['CA-7', 'móvil: la fuente de marca se carga con expo-font', 'fuente.movil.local', 'uno'],
  ['CA-7', 'móvil: ninguna solicitud a servicios externos de fuentes', 'fuente.movil.solicitudesExternas', 'cero'],
  // CA-8 · cifras tabulares
  ['CA-8', 'web: hay cifras tabulares (tabular-nums) activas', 'fuente.web.tabular', 'uno'],
  ['CA-8', 'móvil: hay cifras tabulares (fontVariant tabular-nums) activas', 'fuente.movil.tabular', 'uno'],
  // CA-9 · emojis
  ['CA-9', 'web: cero líneas con emoji como icono (hoy 182 en la auditoría)', 'emojis.web.lineas', 'cero'],
  ['CA-9', 'móvil: cero líneas con emoji como icono (hoy 19)', 'emojis.movil.lineas', 'cero'],
  // UI-ICONOS · el set propio reemplaza a las librerías ajenas
  ['UI-ICONOS', 'móvil: ningún icono de @expo/vector-icons (la barra inferior usa el set propio)', 'iconos.movil.libreriasExternas', 'cero'],
  ['UI-ICONOS', 'web: ninguna librería externa de iconos', 'iconos.web.libreriasExternas', 'cero'],
  // CA-10 · logo en barra, ingreso, icono, pantalla de inicio y pestaña
  ['CA-10', 'web: existe el componente Logo', 'logo.web.componente', 'uno'],
  ['CA-10', 'web: la pestaña del navegador tiene favicon propio', 'logo.web.favicon', 'uno'],
  ['CA-10', 'móvil: existe el componente Logo', 'logo.movil.componente', 'uno'],
  ['CA-10', 'móvil: app.json define el icono de la app', 'logo.movil.iconoDeApp', 'uno'],
  ['CA-10', 'móvil: app.json define la imagen de la pantalla de inicio', 'logo.movil.pantallaDeInicio', 'uno'],
  // CA-12 · inglés
  ['CA-12', 'web: ningún texto visible en inglés (hoy «Logout» en tres opciones)', 'ingles.web', 'cero'],
  ['CA-12', 'móvil: ningún texto visible en inglés', 'ingles.movil', 'cero'],
  ['CA-12', 'API: ningún mensaje en inglés', 'ingles.api', 'cero'],
  ['CA-12', 'correos: ningún texto en inglés', 'ingles.correos', 'cero'],
  // CA-13 · usted
  ['CA-13', 'web: ningún texto se dirige al usuario de usted', 'usted.web', 'cero'],
  ['CA-13', 'móvil: ningún texto se dirige al usuario de usted', 'usted.movil', 'cero'],
  ['CA-13', 'API: ningún mensaje se dirige al usuario de usted', 'usted.api', 'cero'],
  ['CA-13', 'correos: ningún texto se dirige al usuario de usted', 'usted.correos', 'cero'],
  // CA-14 · «fiado» fuera de la interfaz
  ['CA-14', 'web: «fiado» solo en la portada y la descripción del sitio (hoy 3 en el panel)', 'fiado.web', 'cero'],
  ['CA-14', 'móvil: ningún «fiado» en la interfaz', 'fiado.movil', 'cero'],
  ['CA-14', 'API: ningún «fiado» en los mensajes', 'fiado.api', 'cero'],
  ['CA-14', 'correos: ningún «fiado» en los textos', 'fiado.correos', 'cero'],
  // CA-14 / CA-18 · glosario
  ['CA-14', 'web, móvil, API y correos: ninguna palabra que el glosario prohíbe (ticket, recibo, deudor, venta, local, resto...)',
    ['glosario.web', 'glosario.movil', 'glosario.api', 'glosario.correos'], 'cero'],
  ['CA-14', 'web, móvil, API y correos: ningún «Valencito» en textos', ['valencito.web', 'valencito.movil', 'valencito.api', 'valencito.correos'], 'cero'],
  // CA-15 · jerga técnica
  ['CA-15', 'web: ningún mensaje con jerga técnica (base de datos, servidor, migración, token...)', 'jerga.web', 'cero'],
  ['CA-15', 'móvil: ningún mensaje con jerga técnica', 'jerga.movil', 'cero'],
  ['CA-15', 'API: ningún mensaje con jerga técnica ni nombres de campo (userId, isActive...)', 'jerga.api', 'cero'],
  ['CA-15', 'API: ningún mensaje reenvía el texto del error interno (err.message) al usuario', 'jerga.api.reenviosDeError', 'cero'],
  ['CA-15', 'correos: ningún texto con jerga técnica', 'jerga.correos', 'cero'],
  // CA-17 · ciudad
  ['CA-17', 'web: ninguna pantalla contiene «Cartagena» (hoy portada y formulario de tienda)', 'ciudad.web', 'cero'],
  ['CA-17', 'móvil: ninguna pantalla contiene «Cartagena»', 'ciudad.movil', 'cero'],
  // CA-20 · ciudad sin valor por defecto
  ['CA-20', 'API y base de datos: la ciudad de la tienda no tiene valor por defecto «Cartagena»', 'ciudad.defectos', 'cero'],
  // CA-21 · correos
  ['CA-21', 'correos: cero colores fuera de la paleta de marca en las plantillas', 'colores.correos.fuera', 'cero'],
  ['CA-21', 'correos: ningún emoji en los textos', 'emojis.correos.textos', 'cero'],
  // CA-22 · página de creación del superusuario
  ['CA-22', 'web: la página de creación del superusuario no contiene emojis (hoy 61 líneas)', 'emojis.web.bootstrap', 'cero'],
  // CA-9 · mensajes de la API
  ['CA-16', 'API: ningún emoji en los mensajes que ve el usuario', 'emojis.api.mensajes', 'cero'],
];

for (const [id, descripcion, metricas, tipo] of OBJETIVOS) {
  const lista = Array.isArray(metricas) ? metricas : [metricas];
  test(`${id} · ${descripcion}`, { todo: PENDIENTE }, () => {
    for (const metrica of lista) {
      const actual = valor(metrica);
      if (tipo === 'cero') {
        assert.equal(actual, 0, `${metrica}: ${actual} hallazgos, se esperaba 0\n${detalle(metrica)}`);
      } else {
        assert.ok(actual >= 1, `${metrica}: ${actual}, se esperaba al menos 1`);
      }
    }
  });
}

// Marcas de que la línea base cubre todas las métricas con objetivo (si alguien agrega una al
// inventario y olvida registrarla, esta prueba lo dice).
test('CA-18 · toda métrica con objetivo está en la línea base', () => {
  const enObjetivos = new Set(OBJETIVOS.flatMap(([, , m]) => (Array.isArray(m) ? m : [m])));
  const faltan = [...enObjetivos].filter((m) => !BASE.metricas[m]);
  assert.deepEqual(faltan, [], 'métricas con objetivo que no figuran en fixtures/marca-linea-base.json');
});
