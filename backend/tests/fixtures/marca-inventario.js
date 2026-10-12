/**
 * Inventario repetible de marca (requerimiento 008, tarea 5; criterio CA-18).
 *
 * Mide, con lectura estática y sin base de datos, cuánto del código incumple `docs/marca.md`:
 * colores fuera de paleta, emojis, texto en inglés, «usted», «fiado», glosario, jerga técnica,
 * «Cartagena», botones verdes, contraste y fuente. Cubre web, móvil, mensajes de la API y
 * plantillas de correo. NO ejecuta ni modifica código de la aplicación: solo lo lee.
 *
 * Dos usos:
 *   - como biblioteca: `const { medir } = require('./fixtures/marca-inventario')` (lo usa
 *     `tests/marca-inventario.test.js`);
 *   - como comando, para ver la tabla y los hallazgos con archivo y línea:
 *       node tests/fixtures/marca-inventario.js              (tabla de métricas)
 *       node tests/fixtures/marca-inventario.js --detalle    (más cada hallazgo)
 *       node tests/fixtures/marca-inventario.js --json       (todo en JSON)
 *
 * Reglas de conteo (para que la corrida de cierre sea comparable con la línea base):
 *   - «aparición» = una coincidencia; «línea» = una línea con al menos una coincidencia.
 *   - Colores: se miden literales hexadecimales (#rgb, #rrggbb, #rrggbbaa). `#000` solo se
 *     acepta en líneas de sombra (shadow). Los `rgb()/rgba()/hsl()` y los colores con nombre
 *     se miden aparte, porque la auditoría inicial no los contó.
 *   - Texto visible: texto JSX y literales de cadena que parecen texto de persona; se excluyen
 *     importaciones, `console.*`, nombres de cabecera HTTP y valores técnicos.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ_REPO = path.resolve(__dirname, '..', '..', '..'); // .../Mi Valecito
const rel = (...p) => path.join(RAIZ_REPO, ...p);

// ---------------------------------------------------------------------------------------
// Paleta de marca (docs/marca.md, «Color»). Fuente única para el inventario.
// ---------------------------------------------------------------------------------------

const PALETA = {
  // marca: tono de marca, tono de texto/botón, hover/presionado, pastel y texto sobre pastel
  azul: ['2563EB', '1D4ED8', '1E40AF', 'DBEAFE'],
  verde: ['059669', '047857', 'D1FAE5', '065F46'],
  rojo: ['DC2626', 'B91C1C', 'FEE2E2', '991B1B'],
  ambar: ['D97706', 'B45309', 'FEF3C7', '92400E'],
  // neutros
  neutros: ['1F2937', '4B5563', '6B7280', 'E5E7EB', 'F8FAFC', 'FFFFFF', 'F3F4F6', '374151'],
};
const SET_PALETA = new Set(Object.values(PALETA).flat());

// Pares texto/fondo declarados en el Brand Book, con su relación mínima exigida.
// (3 = texto grande o elemento gráfico; 4.5 = texto normal.)
const PARES_MARCA = [
  ['Título sobre tarjeta', '1F2937', 'FFFFFF', 4.5],
  ['Título sobre fondo de la app', '1F2937', 'F8FAFC', 4.5],
  ['Texto secundario sobre tarjeta', '4B5563', 'FFFFFF', 4.5],
  ['Texto secundario sobre fondo de la app', '4B5563', 'F8FAFC', 4.5],
  ['Texto mínimo sobre tarjeta', '6B7280', 'FFFFFF', 4.5],
  ['Texto mínimo sobre fondo de la app', '6B7280', 'F8FAFC', 4.5],
  ['Botón principal: blanco sobre azul', 'FFFFFF', '2563EB', 4.5],
  ['Botón principal presionado: blanco sobre azul oscuro', 'FFFFFF', '1E40AF', 4.5],
  ['Botón principal hover: blanco sobre azul', 'FFFFFF', '1D4ED8', 4.5],
  ['Enlace azul sobre tarjeta', '2563EB', 'FFFFFF', 4.5],
  ['Enlace azul sobre fondo de la app', '2563EB', 'F8FAFC', 4.5],
  ['Verde de texto sobre tarjeta', '047857', 'FFFFFF', 4.5],
  ['Rojo de texto sobre tarjeta', 'DC2626', 'FFFFFF', 4.5],
  ['Ámbar de texto sobre tarjeta', 'B45309', 'FFFFFF', 4.5],
  ['Botón destructivo: blanco sobre rojo', 'FFFFFF', 'DC2626', 4.5],
  ['Chip Pendiente', '92400E', 'FEF3C7', 4.5],
  ['Chip Parcial', '1E40AF', 'DBEAFE', 4.5],
  ['Chip Pagado', '065F46', 'D1FAE5', 4.5],
  ['Chip Anulado', '374151', 'F3F4F6', 4.5],
  ['Chip En mora', '991B1B', 'FEE2E2', 4.5],
  ['Icono azul sobre tarjeta (no texto)', '2563EB', 'FFFFFF', 3],
  ['Icono verde de marca sobre tarjeta (no texto)', '059669', 'FFFFFF', 3],
  ['Icono ámbar de marca sobre tarjeta (no texto)', 'D97706', 'FFFFFF', 3],
  ['Borde sobre tarjeta (no texto)', 'E5E7EB', 'FFFFFF', 1], // el Brand Book no exige 3:1 al borde de tarjeta
];

// ---------------------------------------------------------------------------------------
// Alcance: qué archivos se miden
// ---------------------------------------------------------------------------------------

const EXCLUIR_DIR = new Set(['node_modules', '.next', '.expo', '.e2e-resultados', 'e2e', 'tests', 'public', '.git']);

function listar(dir, extensiones) {
  const salida = [];
  if (!fs.existsSync(dir)) return salida;
  (function recorrer(d) {
    for (const nombre of fs.readdirSync(d)) {
      if (EXCLUIR_DIR.has(nombre)) continue;
      const p = path.join(d, nombre);
      const st = fs.statSync(p);
      if (st.isDirectory()) recorrer(p);
      else if (extensiones.test(nombre) && !/\.d\.ts$/.test(nombre)) salida.push(p);
    }
  })(dir);
  return salida.sort();
}

function alcance() {
  const web = ['app', 'components', 'hooks', 'lib', 'styles', 'types'].flatMap((d) => listar(rel('frontend', d), /\.(tsx?|scss|css)$/));
  for (const f of ['middleware.ts']) if (fs.existsSync(rel('frontend', f))) web.push(rel('frontend', f));
  const movil = ['app', 'lib'].flatMap((d) => listar(rel('mobile', d), /\.(tsx?|scss|css)$/));
  const movilConfig = ['app.json'].map((f) => rel('mobile', f)).filter((f) => fs.existsSync(f));
  const src = rel('backend', 'src');
  const correos = [rel('backend', 'src', 'mail', 'layout.js'), rel('backend', 'src', 'mail', 'accountMail.js'),
    ...listar(rel('backend', 'src', 'mail', 'templates'), /\.js$/)].filter((f) => fs.existsSync(f));
  const api = [
    ...listar(path.join(src, 'routes'), /\.js$/).filter((f) => path.basename(f) !== 'docs.js'),
    ...listar(path.join(src, 'middleware'), /\.js$/),
    ...listar(path.join(src, 'models'), /\.js$/),
    ...['responseFormatter.js', 'rateLimiter.js', 'requestLimiter.js', 'passwordValidator.js']
      .map((f) => path.join(src, 'utils', f)),
    path.join(src, 'server.js'),
  ].filter((f) => fs.existsSync(f));
  const origenes = [
    ...listar(src, /\.js$/),
    ...listar(rel('backend', 'scripts'), /\.js$/),
    ...listar(rel('backend', 'tests-db'), /\.js$/),
    ...listar(rel('backend', 'tests-web'), /\.js$/),
    ...listar(rel('database'), /\.sql$/),
  ];
  return { web, movil, movilConfig, correos, api, origenes };
}

// ---------------------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------------------

const leer = (f) => fs.readFileSync(f, 'utf8');
const relativo = (f) => path.relative(RAIZ_REPO, f).split(path.sep).join('/');

/** Número de línea (1-based) de un índice dentro de un texto. */
function lineaDe(texto, indice) {
  let n = 1;
  for (let i = 0; i < indice; i++) if (texto.charCodeAt(i) === 10) n++;
  return n;
}

/** Índice de inicio de cada línea, para búsquedas rápidas. */
function indiceLineas(texto) {
  const inicios = [0];
  for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 10) inicios.push(i + 1);
  return inicios;
}
function lineaEn(inicios, indice) {
  let lo = 0, hi = inicios.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (inicios[mid] <= indice) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

/**
 * Sustituye comentarios (// y /* *\/) por espacios, conservando saltos de línea y posiciones,
 * sin tocar el interior de cadenas. Sirve para JS, TS, TSX y SCSS.
 */
/** ¿El `/` de la posición i abre una expresión regular? (heurística por el carácter anterior). */
function abreRegex(texto, i) {
  const d = texto[i + 1];
  if (d === '/' || d === '*' || d === '>') return false;
  let j = i - 1;
  while (j >= 0 && (texto[j] === ' ' || texto[j] === '\t')) j--;
  if (j < 0) return true;
  if ('(,=:[!&|?{};\n'.includes(texto[j])) return true;
  return /(?:return|typeof|case)$/.test(texto.slice(Math.max(0, j - 6), j + 1));
}
function finRegex(texto, i) {
  let k = i + 1;
  let clase = false;
  while (k < texto.length && texto[k] !== '\n') {
    const e = texto[k];
    if (e === '\\') { k += 2; continue; }
    if (e === '[') clase = true;
    else if (e === ']') clase = false;
    else if (e === '/' && !clase) { k++; while (/[a-z]/i.test(texto[k] || '')) k++; return k; }
    k++;
  }
  return -1;
}

function sinComentarios(texto, { scss = false } = {}) {
  let salida = '';
  let i = 0;
  const n = texto.length;
  while (i < n) {
    const c = texto[i];
    const d = texto[i + 1];
    if (c === '/' && d !== '/' && d !== '*' && !scss && abreRegex(texto, i) && finRegex(texto, i) > 0) {
      const fin = finRegex(texto, i);
      salida += texto.slice(i, fin);
      i = fin;
    } else if (c === '/' && d === '/' && !(i > 0 && texto[i - 1] === ':')) {
      while (i < n && texto[i] !== '\n') { salida += ' '; i++; }
    } else if (c === '/' && d === '*') {
      while (i < n && !(texto[i] === '*' && texto[i + 1] === '/')) { salida += texto[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { salida += '  '; i += 2; }
    } else if (c === '"' || c === "'" || c === '`') {
      // En JSX un apóstrofo suelto no abre cadena: las comillas simples y dobles terminan en salto de línea.
      const q = c;
      salida += c; i++;
      while (i < n) {
        const e = texto[i];
        if (e === '\\') { salida += e + (texto[i + 1] || ''); i += 2; continue; }
        if (e === q) { salida += e; i++; break; }
        if (e === '\n' && q !== '`') break;
        salida += e; i++;
      }
    } else {
      salida += c; i++;
    }
  }
  return salida;
}

/** Literales de cadena de un código (ya sin comentarios): [{ texto, indice }]. */
function literales(codigo) {
  const salida = [];
  let i = 0;
  const n = codigo.length;
  while (i < n) {
    const c = codigo[i];
    if (c === '/' && codigo[i + 1] !== '/' && codigo[i + 1] !== '*' && abreRegex(codigo, i) && finRegex(codigo, i) > 0) {
      i = finRegex(codigo, i);
    } else if (c === '"' || c === "'" || c === '`') {
      const q = c;
      const inicio = i;
      let buf = '';
      i++;
      let profundidad = 0;
      while (i < n) {
        const e = codigo[i];
        if (e === '\\') { buf += codigo[i + 1] || ''; i += 2; continue; }
        if (q === '`' && e === '$' && codigo[i + 1] === '{') { profundidad++; i += 2; buf += ' '; continue; }
        if (q === '`' && profundidad > 0) { if (e === '}') profundidad--; i++; continue; }
        if (e === q) { i++; break; }
        if (e === '\n' && q !== '`') break;
        buf += e; i++;
      }
      salida.push({ texto: buf, indice: inicio });
    } else i++;
  }
  return salida;
}

// ---------------------------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------------------------

function normalizarHex(h) {
  let x = h.toUpperCase();
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  if (x.length === 8) x = x.slice(0, 6);
  return x;
}

const RE_HEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;

function medirHex(archivos) {
  let dentro = 0;
  let sombras = 0;
  const fuera = [];
  const tonos = new Map();
  for (const f of archivos) {
    const texto = leer(f);
    const lineas = texto.split('\n');
    lineas.forEach((linea, k) => {
      for (const m of linea.matchAll(RE_HEX)) {
        const h = normalizarHex(m[1]);
        if (SET_PALETA.has(h)) { dentro++; continue; }
        if (h === '000000' && /shadow/i.test(linea)) { sombras++; continue; }
        fuera.push({ archivo: relativo(f), linea: k + 1, texto: `#${h}` });
        tonos.set(h, (tonos.get(h) || 0) + 1);
      }
    });
  }
  return { dentro, sombras, fuera, tonos };
}

function hexDeFuncional(m) {
  // rgb()/rgba()/hsl(): solo se resuelve rgb con enteros; hsl se cuenta como fuera.
  if (/^hsla?/i.test(m[1])) return null;
  const partes = m[2].split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map(Number);
  if (partes.length < 3 || partes.some((x) => Number.isNaN(x))) return null;
  return partes.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function medirFuncionales(archivos) {
  const fuera = [];
  for (const f of archivos) {
    leer(f).split('\n').forEach((linea, k) => {
      for (const m of linea.matchAll(/\b(rgba?|hsla?)\(([^)]*)\)/gi)) {
        const hex = hexDeFuncional(m);
        if (hex && SET_PALETA.has(hex)) continue;
        if (hex === '000000' || hex === 'FFFFFF') continue; // velos y sombras neutras
        if (/shadow/i.test(linea) && hex === null) { /* hsl en sombra: se cuenta */ }
        fuera.push({ archivo: relativo(f), linea: k + 1, texto: m[0] });
      }
    });
  }
  return fuera;
}

const COLORES_CON_NOMBRE = ['red', 'green', 'blue', 'orange', 'purple', 'yellow', 'gray', 'grey', 'black', 'pink', 'teal',
  'cyan', 'brown', 'navy', 'violet', 'indigo', 'gold', 'lime', 'maroon', 'olive', 'silver', 'crimson'];

function medirNombres(archivos) {
  const fuera = [];
  const re = new RegExp(`(?:^|[:\\s'"(])(${COLORES_CON_NOMBRE.join('|')})(?=[;'",)\\s}]|$)`, 'i');
  for (const f of archivos) {
    const codigo = sinComentarios(leer(f));
    codigo.split('\n').forEach((linea, k) => {
      // Solo declaraciones de color: `color: red`, `backgroundColor: 'black'`, `background: green`.
      const m = linea.match(/\b(?:color|background(?:-?color)?|border(?:-?color)?|fill|stroke|shadowColor|tintColor)\b\s*:\s*['"]?([a-zA-Z]+)['"]?/i);
      if (m && re.test(` ${m[1]};`)) fuera.push({ archivo: relativo(f), linea: k + 1, texto: m[1] });
    });
  }
  return fuera;
}

// ---------------------------------------------------------------------------------------
// Contraste (WCAG 2.x)
// ---------------------------------------------------------------------------------------

function luminancia(hex) {
  const v = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
  const la = luminancia(normalizarHex(a));
  const lb = luminancia(normalizarHex(b));
  const [alto, bajo] = la >= lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

/** Bloques anidados de SCSS/TS: devuelve el texto propio (sin hijos) de cada bloque. */
function bloquesPropios(codigo) {
  const pila = [{ propio: '', inicio: 0 }];
  const salida = [];
  for (let i = 0; i < codigo.length; i++) {
    const c = codigo[i];
    if (c === '{') pila.push({ propio: '', inicio: i });
    else if (c === '}' && pila.length > 1) {
      const b = pila.pop();
      salida.push(b);
      // lo que sigue pertenece al padre; los selectores de hijos no importan para color:
    } else pila[pila.length - 1].propio += c;
  }
  return salida;
}

/** Pares texto/fondo con literales hexadecimales en el mismo bloque. */
function medirContrasteCodigo(archivos) {
  const pares = [];
  const supuestos = [];
  for (const f of archivos) {
    const texto = leer(f);
    const codigo = sinComentarios(texto);
    const inicios = indiceLineas(codigo);
    for (const b of bloquesPropios(codigo)) {
      const col = b.propio.match(/(?:^|[;\s{,])color\s*:\s*['"]?(#[0-9a-fA-F]{3,8})\b/);
      if (!col) continue;
      const bg = b.propio.match(/background(?:-?color)?\s*:\s*[^;,]*?(#[0-9a-fA-F]{3,8})\b/i);
      const fg = normalizarHex(col[1].slice(1));
      const linea = lineaEn(inicios, b.inicio);
      if (bg) {
        const fondo = normalizarHex(bg[1].slice(1));
        pares.push({ archivo: relativo(f), linea, texto: `#${fg} sobre #${fondo}`, ratio: contraste(fg, fondo) });
      } else if (luminancia(fg) < 0.5) {
        // Texto oscuro sin fondo declarado: se asume tarjeta blanca (peor caso razonable).
        supuestos.push({ archivo: relativo(f), linea, texto: `#${fg} sobre blanco (supuesto)`, ratio: contraste(fg, 'FFFFFF') });
      }
    }
  }
  return { pares, supuestos };
}

// ---------------------------------------------------------------------------------------
// Emojis
// ---------------------------------------------------------------------------------------

// Extended_Pictographic cubre emojis; se excluyen © ® ™ y se suman marcas de verificación
// y cruces (✓ ✗ ✕ ✖ ✘) que se usan como icono.
const RE_EMOJI = /(?![©®™])\p{Extended_Pictographic}|[✓✗✕✖✘✔✅]/u;

function lineasConEmoji(archivos, { sinComentario = false } = {}) {
  const salida = [];
  for (const f of archivos) {
    const texto = leer(f);
    const base = sinComentario ? sinComentarios(texto) : texto;
    base.split('\n').forEach((linea, k) => {
      if (RE_EMOJI.test(linea)) salida.push({ archivo: relativo(f), linea: k + 1, texto: linea.trim().slice(0, 100) });
    });
  }
  return salida;
}

// ---------------------------------------------------------------------------------------
// Texto visible
// ---------------------------------------------------------------------------------------

const LETRA = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const NO_TEXTO_EXACTO = new Set(['Authorization', 'Content-Type', 'Accept', 'application/json', 'multipart/form-data']);

function pareceTexto(s) {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!new RegExp(`[${LETRA}]{2}`).test(t)) return false;
  if (NO_TEXTO_EXACTO.has(t)) return false;
  if (/^(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)(?:[\s,]|$)/.test(t) && !/[a-záéíóúñ]{4,}\s+[a-záéíóúñ]{3,}/.test(t.replace(/\/\S+/g, ''))) return false; // rutas HTTP
  if (/^[A-Z][A-Za-z]*(?:-[A-Z][A-Za-z]*)+(?:,\s*[A-Z][A-Za-z-]+)*$/.test(t)) return false; // cabeceras HTTP
  if (/^(https?:|\/|\.|#|@|~)/.test(t)) return false;
  if (/^[\w.-]+\.(tsx?|jsx?|json|svg|png|jpe?g|scss|css|sql|woff2?)$/i.test(t)) return false;
  if (/^[a-z0-9_.:/\-@#?&=%+,]+$/.test(t)) return false; // identificador, ruta o clase en minúsculas
  if (/^[A-Z0-9_]+$/.test(t)) return false; // CODIGO_DE_ERROR
  if (/^[a-z]+(?:[A-Z][a-z0-9]+)+$/.test(t)) return false; // camelCase
  if (/^(?:flex|grid|row|col|btn|d-|me-|ms-|mb-|mt-|px-|py-|text-|bg-|align|justify)/.test(t) && !/[A-ZÁÉÍÓÚ¿¡]/.test(t)) return false;
  return /\s/.test(t) || new RegExp(`^[A-ZÁÉÍÓÚÑ¿¡]`).test(t);
}

/** Textos visibles de un archivo TS/TSX: [{ texto, linea }]. */
function textosVisibles(archivo) {
  const original = leer(archivo);
  const codigo = sinComentarios(original);
  const inicios = indiceLineas(codigo);
  const lineasCodigo = codigo.split('\n');
  const salida = [];
  const vistos = new Set();
  const agregar = (texto, indice) => {
    const linea = lineaEn(inicios, indice);
    const clave = `${linea}|${texto}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    salida.push({ archivo: relativo(archivo), linea, texto: texto.trim().replace(/\s+/g, ' ') });
  };

  for (const lit of literales(codigo)) {
    const linea = lineasCodigo[lineaEn(inicios, lit.indice) - 1] || '';
    if (/^\s*(import|export\s+.*\s+from)\b/.test(linea) || /\brequire\(/.test(linea)) continue;
    if (/\bconsole\.(log|error|warn|info|debug)\b/.test(linea)) continue;
    const antes = codigo.slice(Math.max(0, lit.indice - 40), lit.indice);
    // Atributos y claves técnicas: clases, rutas, tipos, ids; se dejan placeholder, title, label y aria-label.
    if (/\b(className|class|id|key|name|type|href|src|htmlFor|role|variant|size|bg|as|autoComplete|inputMode|method|rel|target|animation|style|data-[\w-]+|aria-(?!label)[\w-]+|value|accept|pathname|router\.(push|replace)|useRouter|useState<[^>]*>)\s*(=|:)\s*\{?\s*$/.test(antes)) continue;
    if (/\b(push|replace|prefetch|includes|startsWith|endsWith|getItem|setItem|removeItem|fetch|request|get|post|put|patch|delete)\(\s*$/.test(antes)) continue;
    if (/(?:===?|!==?)\s*$/.test(antes)) continue; // comparación con constante
    if (/\bcase\s*$/.test(antes)) continue;
    if (/(?:headers|Headers)\s*\[\s*$/.test(antes)) continue;
    if (!pareceTexto(lit.texto)) continue;
    if (/^use (client|strict|server)$/.test(lit.texto.trim())) continue;
    if (/^Bearer(\s|$)/.test(lit.texto.trim()) || /(?:path=\/|expires=|SameSite)/.test(lit.texto)) continue; // cabecera y cookie
    agregar(lit.texto, lit.indice);
  }

  // Texto JSX: entre `>` o `}` y el siguiente `<` o `{`.
  if (/\.tsx$/.test(archivo)) {
    const re = /[>}]([^<>{}]+)(?=[<{])/g;
    let m;
    while ((m = re.exec(codigo))) {
      const t = m[1];
      if (/[()=;&|$\[\]]/.test(t) || /=>/.test(t)) continue;
      if (/^\s*[,)]/.test(t) || /^\s*[\w$]+\s*:\s*$/.test(t) && m[0][0] === '}') continue; // `}, clave: {` de un objeto
      if (!new RegExp(`[${LETRA}]{2}`).test(t)) continue;
      const limpio = t.trim();
      if (!limpio) continue;
      if (!/\s/.test(limpio) && !/^[A-ZÁÉÍÓÚÑ¿¡]/.test(limpio)) continue; // palabra suelta en minúscula: probablemente código
      if (/^(else|return|catch|finally|try|default|break|continue)\b/.test(limpio)) continue;
      agregar(limpio, m.index + 1);
    }
  }
  return salida;
}

/** Mensajes de la API: literales de texto en rutas, middleware, utilidades y modelos. */
function mensajesApi(archivo) {
  const original = leer(archivo);
  const codigo = sinComentarios(original);
  const inicios = indiceLineas(codigo);
  const lineasCodigo = codigo.split('\n');
  const nombre = path.basename(archivo);
  const salida = [];
  const vistos = new Set();
  const agregar = (texto, indice, extra = {}) => {
    const linea = lineaEn(inicios, indice);
    const clave = `${linea}|${texto}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    salida.push({ archivo: relativo(archivo), linea, texto: texto.trim().replace(/\s+/g, ' '), ...extra });
  };
  const esModelo = /[\\/]models[\\/]/.test(archivo);

  const regiones = []; // [inicio, fin] donde hay mensajes
  if (esModelo || nombre === 'server.js') {
    // En modelos y servidor solo cuentan mensajes explícitos.
    for (const m of codigo.matchAll(/\b(?:message|hint|error|reason)\s*:\s*/g)) regiones.push([m.index + m[0].length, finExpresion(codigo, m.index + m[0].length)]);
    for (const m of codigo.matchAll(/new\s+Error\(/g)) regiones.push([m.index + m[0].length, cierreParentesis(codigo, m.index + m[0].length)]);
    for (const m of codigo.matchAll(/ResponseFormatter\.(?:success|error|unauthorized|forbidden|notFound|badRequest|conflict|internalError)\(/g)) regiones.push([m.index + m[0].length, cierreParentesis(codigo, m.index + m[0].length)]);
  } else {
    regiones.push([0, codigo.length]);
  }
  for (const [a, b] of regiones) {
    for (const lit of literales(codigo.slice(a, b))) {
      const indice = a + lit.indice;
      const linea = lineasCodigo[lineaEn(inicios, indice) - 1] || '';
      if (/\brequire\(/.test(linea) || /\bconsole\./.test(linea)) continue;
      if (/\b(?:error|status)\s*:\s*['"`][A-Z_]+['"`]/.test(linea) && !pareceTexto(lit.texto)) continue;
      if (/\b(?:router\.(?:get|post|put|patch|delete|use)|app\.(?:get|post|use))\(/.test(linea)) continue;
      if (/\b(?:authenticateToken|requirePermission|requireRole|roleMiddleware|module|permission)\b/.test(linea) && !/message|error|hint/.test(linea)) continue;
      if (/\.(?:includes|startsWith|endsWith|match|test|input|query|request)\(/.test(linea)) continue;
      if (/\b(?:Content-Type|application\/json|Authorization|Bearer)\b/.test(lit.texto) && !/hint/.test(linea)) continue;
      if (/\b(?:SELECT|INSERT|UPDATE|DELETE\s+FROM|FROM\s+\w+|WHERE|JOIN)\b/.test(lit.texto)) continue;
      if (!pareceTexto(lit.texto)) continue;
      agregar(lit.texto, indice);
    }
  }
  // Reenvío de `err.message` al usuario (puede traer detalle técnico del servidor).
  const reenvios = [];
  for (const m of codigo.matchAll(/ResponseFormatter\.\w+\(([\s\S]*?)\);/g)) {
    if (/\b(?:err|error|e|ex)\.message\b/.test(m[1])) reenvios.push({ archivo: relativo(archivo), linea: lineaEn(inicios, m.index), texto: m[0].replace(/\s+/g, ' ').slice(0, 110) });
  }
  for (const m of codigo.matchAll(/\bmessage\s*:\s*[^,\n]*\b(?:err|error|e|ex)\.message\b[^,\n]*/g)) {
    reenvios.push({ archivo: relativo(archivo), linea: lineaEn(inicios, m.index), texto: m[0].replace(/\s+/g, ' ').slice(0, 110) });
  }
  return { mensajes: salida, reenvios };
}

function cierreParentesis(codigo, desde) {
  let p = 1;
  for (let i = desde; i < codigo.length; i++) {
    const c = codigo[i];
    if (c === '(') p++;
    else if (c === ')') { p--; if (p === 0) return i; }
  }
  return codigo.length;
}
function finExpresion(codigo, desde) {
  let p = 0;
  let q = null;
  for (let i = desde; i < codigo.length; i++) {
    const c = codigo[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') p++;
    else if (c === ')' || c === ']' || c === '}') { if (p === 0) return i; p--; }
    else if ((c === ',' || c === ';') && p === 0) return i;
  }
  return codigo.length;
}

/** Texto de las plantillas de correo: todos los literales de texto, más la paleta del layout. */
function textosCorreo(archivo) {
  const codigo = sinComentarios(leer(archivo));
  const inicios = indiceLineas(codigo);
  const salida = [];
  for (const lit of literales(codigo)) {
    const t = lit.texto;
    if (/<[a-z!/]/i.test(t) && /style=|<\/?(?:html|head|body|table|tr|td|p|span|a|title|meta)\b/i.test(t)) {
      // HTML del diseño: se toma solo el texto fijo entre etiquetas.
      for (const m of t.matchAll(/>([^<>{}]*[A-Za-zÁÉÍÓÚáéíóúñ]{2}[^<>{}]*)</g)) {
        const x = m[1].trim();
        if (x && !/^\s*$/.test(x) && pareceTexto(x)) salida.push({ archivo: relativo(archivo), linea: lineaEn(inicios, lit.indice), texto: x });
      }
      continue;
    }
    if (/\brequire\(/.test(codigo.slice(Math.max(0, lit.indice - 12), lit.indice))) continue;
    if (/new\s+Error\(\s*$/.test(codigo.slice(Math.max(0, lit.indice - 20), lit.indice))) continue; // error interno, no llega al usuario
    if (/^(?:es-CO|long|short|America\/|activation|password-)/.test(t)) continue;
    if (/^(?:superuser|administrador|tendero|vendedor|cliente|group|subject|render)$/.test(t)) continue;
    if (pareceTexto(t)) salida.push({ archivo: relativo(archivo), linea: lineaEn(inicios, lit.indice), texto: t.trim().replace(/\s+/g, ' ') });
  }
  return salida;
}

// ---------------------------------------------------------------------------------------
// Detectores de texto
// ---------------------------------------------------------------------------------------

const p = (lista) => new RegExp(`(?<![${LETRA}\\w])(?:${lista.join('|')})(?![${LETRA}\\w])`, 'i');

// Inglés: palabras que no existen en español. Más amplio que la auditoría inicial.
const RE_INGLES = p([
  'logout', 'log\\s?out', 'log\\s?in', 'login', 'sign\\s?in', 'sign\\s?out', 'sign\\s?up', 'dashboard', 'loading', 'submit',
  'cancel', 'save', 'delete', 'remove', 'edit', 'search', 'settings', 'profile', 'password', 'username', 'welcome',
  'home', 'back', 'next', 'previous', 'confirm', 'success', 'warning', 'please', 'again', 'click', 'required',
  'invalid', 'failed', 'unauthorized', 'forbidden', 'not found', 'bad request', 'internal server error',
  'user', 'users', 'email', 'e-mail', 'superuser', 'super\\s?user', 'account', 'the', 'and', 'your', 'you', 'with', 'from', 'this',
  'that', 'were', 'will', 'been', 'are', 'upload', 'download', 'select', 'enable', 'disable', 'update', 'create',
  'new', 'yes', 'status', 'actions', 'details', 'name', 'phone', 'address', 'city', 'store', 'logs',
  'read', 'write', 'expired', 'denied',
]);

// «usted»: tratamiento de usted y verbos en imperativo de usted a inicio de frase.
const RE_USTED_DIRECTO = p(['usted', 'ustedes']);
const VERBOS_USTED = ['ingrese', 'copie', 'pegue', 'verifique', 'revise', 'contacte', 'comun[ií]quese', 'intente', 'seleccione',
  'escriba', 'presione', 'espere', 'aseg[uú]rese', 'utilice', 'responda', 'tenga', 'recuerde', 'consulte', 'inicie',
  'digite', 'elija', 'cambie', 'genere', 'haga', 'use', 'proporcione', 'confirme', 'descargue', 'guarde', 'cierre',
  'abra', 'siga', 'p[oó]ngase', 'comience', 'complete', 'agregue'];
const RE_USTED_VERBO = new RegExp(`(?:^|[.!?:;,]\\s*|[¡¿]\\s*|por favor,?\\s*|\\by\\s+)(?:${VERBOS_USTED.join('|')})(?![${LETRA}])`, 'i');
// «su cuenta» puede hablar de un tercero (correcto) o del lector (incumple): se informa aparte.
const RE_USTED_POSESIVO = /(?<![\wáéíóúñ])(?:sus datos|su cuenta|su contraseña|su correo|su navegador|su tienda|sus vales|su saldo)(?![\wáéíóúñ])/i;

const RE_FIADO = p(['fiado', 'fiados', 'fiar', 'fiada', 'fiadas']);

// Glosario: palabras que la marca NO usa (docs/marca.md, tabla del glosario). `fiado` va aparte (CA-14).
const RE_FUERA_GLOSARIO = p(['ticket', 'tickets', 'recibo', 'recibos', 'factura', 'facturas', 'pago parcial', 'pagos parciales',
  'cuota', 'cuotas', 'anticipo', 'anticipos', 'cuenta por cobrar', 'cuentas por cobrar', 'atraso', 'atrasos', 'impago', 'impagos',
  'portafolio', 'deudor', 'deudores', 'moroso', 'morosos', 'morosa', 'morosas', 'pendiente de pago',
  // Decisión de Marco 2026-10-12: se dice «vale», «tienda» y «saldo».
  'venta', 'ventas', 'local', 'locales', 'resto']);
// Palabras ambiguas del glosario (se informan, no se exigen): «usuario», «local», «comercio», «resto», «venta».
// «usuario» solo se permite como nombre del módulo de administración «Usuarios»; cualquier otro uso se informa.
const RE_USUARIO = p(['usuario', 'usuarios', 'comercio']);

const RE_JERGA = new RegExp([
  p(['base de datos', 'bases de datos', 'servidor', 'migraci[oó]n', 'migraciones', 'token', 'tokens', 'jwt', 'endpoint', 'endpoints',
    'api', 'backend', 'frontend', 'sql', 'query', 'timeout', 'excepci[oó]n', 'exception', 'http', 'payload', 'header', 'headers',
    'json', 'bearer', 'constraint', 'constraints', 'constrains', 'consola', 'stack', 'hash', 'cache', 'cach[eé]', 'null', 'undefined',
    'nan', 'simulado', 'schema', 'esquema', 'deploy', 'endpoints?', 'cors', 'jsonwebtoken', 'pool', 'rate limit']).source,
  /(?<![\wáéíóúñ])(?:error|c[oó]digo|status)\s*:?\s*[1-5]\d\d(?!\d)/i.source,
  /\[object\b/i.source,
].join('|'), 'i');
// Nombres de campo técnicos (camelCase o con _id) mostrados al usuario: userId, montoTotal, isActive.
const RE_CAMPO_TECNICO = /(?<![\wáéíóúñ])[a-z]+(?:[A-Z][a-z0-9]+)+(?![\wáéíóúñ])|(?<![\wáéíóúñ])[a-z]+_[a-z_]+(?![\wáéíóúñ])/;
const RE_VALECITO = /\bValencito\b/i;
const RE_EXCLAMACION = /!(?=\s|$|["')])|¡/;
const RE_CARTAGENA = /cartagena/i;

function aplicar(textos, re, { excluir = null } = {}) {
  return textos.filter((t) => re.test(t.texto) && !(excluir && excluir(t)));
}

// ---------------------------------------------------------------------------------------
// Verde de acción, variante azul y fuente
// ---------------------------------------------------------------------------------------

function medirVariantes(archivos) {
  const res = { botonVerde: [], alertaVerde: [], cargaVerde: [], insigniaVerde: [], otroVerde: [], dinamicoVerde: [], alertaDinamica: [], principal: [], pantallasConVariosPrincipales: [] };
  const re = /\bvariant=(?:"((?:outline-)?(?:success|primary))"|\{([^}]*)\})/g;
  for (const f of archivos.filter((x) => /\.tsx$/.test(x))) {
    const codigo = sinComentarios(leer(f));
    const inicios = indiceLineas(codigo);
    let principalesDelArchivo = 0;
    for (const m of codigo.matchAll(re)) {
      const valor = m[1] || '';
      const expr = m[2] || '';
      const abre = codigo.slice(0, m.index).lastIndexOf('<');
      const etiqueta = (codigo.slice(abre + 1, abre + 40).match(/^[A-Za-z][\w.]*/) || [''])[0];
      const item = { archivo: relativo(f), linea: lineaEn(inicios, m.index), texto: `<${etiqueta} variant=${valor ? `"${valor}"` : `{${expr.trim().slice(0, 40)}}`}>` };
      if (/success/.test(valor)) {
        if (etiqueta === 'Alert') res.alertaVerde.push(item);
        else if (etiqueta === 'Spinner') res.cargaVerde.push(item);
        else if (etiqueta === 'Badge') res.insigniaVerde.push(item);
        else if (etiqueta === 'Button') res.botonVerde.push(item);
        else res.otroVerde.push(item);
      } else if (/primary/.test(valor)) {
        res.principal.push(item);
        if (etiqueta === 'Button' && valor === 'primary') principalesDelArchivo++;
      } else if (/success/.test(expr)) {
        // variant={cond ? 'success' : ...}: los botones cuentan como verdes; las alertas, como informe.
        if (etiqueta === 'Button') res.dinamicoVerde.push(item);
        else res.alertaDinamica.push(item);
      }
    }
    for (const m of codigo.matchAll(/\bbg="success"/g)) {
      res.insigniaVerde.push({ archivo: relativo(f), linea: lineaEn(inicios, m.index), texto: 'bg="success"' });
    }
    if (principalesDelArchivo > 1) res.pantallasConVariosPrincipales.push({ archivo: relativo(f), linea: 1, texto: `${principalesDelArchivo} botones variant="primary"` });
  }
  return res;
}

function medirFuente() {
  const web = alcance().web;
  const movil = alcance().movil;
  const todoWeb = web.map((f) => ({ f, t: leer(f) }));
  const todoMovil = movil.map((f) => ({ f, t: leer(f) }));
  const hallazgos = (lista, re) => lista.flatMap(({ f, t }) => t.split('\n').map((l, k) => (re.test(l) ? { archivo: relativo(f), linea: k + 1, texto: l.trim().slice(0, 100) } : null)).filter(Boolean));
  const layoutWeb = fs.existsSync(rel('frontend', 'app', 'layout.tsx')) ? leer(rel('frontend', 'app', 'layout.tsx')) : '';
  const pkgMovil = fs.existsSync(rel('mobile', 'package.json')) ? leer(rel('mobile', 'package.json')) : '';
  return {
    webFuenteLocal: /next\/font\/local/.test(layoutWeb) || todoWeb.some(({ t }) => /next\/font\/local|@font-face/.test(t)),
    webSolicitudesFuentesExternas: hallazgos(todoWeb, /fonts\.googleapis|fonts\.gstatic|next\/font\/google|@import\s+url\(['"]?https?:/i),
    webTabular: hallazgos(todoWeb, /tabular-nums|font-variant-numeric/i),
    movilFuenteLocal: /expo-font/.test(pkgMovil) && todoMovil.some(({ t }) => /useFonts|Font\.loadAsync/.test(t)),
    movilSolicitudesFuentesExternas: hallazgos(todoMovil, /fonts\.googleapis|fonts\.gstatic|@expo-google-fonts/i),
    movilTabular: hallazgos(todoMovil, /tabular-nums|tabularNums/i),
    movilIcono: (() => {
      try {
        const e = JSON.parse(leer(rel('mobile', 'app.json'))).expo || {};
        return { icon: !!e.icon, splashImage: !!(e.splash && e.splash.image), adaptiveForeground: !!(e.android && e.android.adaptiveIcon && e.android.adaptiveIcon.foregroundImage) };
      } catch { return { icon: false, splashImage: false, adaptiveForeground: false }; }
    })(),
    webFavicon: (() => {
      const dirs = [rel('frontend', 'app'), rel('frontend', 'public')];
      const hay = dirs.some((d) => fs.existsSync(d) && fs.readdirSync(d).some((n) => /^(favicon|icon)\.(ico|png|svg)$/i.test(n)));
      return hay || /icons\s*:/.test(layoutWeb);
    })(),
    webLogoComponente: fs.existsSync(rel('frontend', 'components', 'Logo.tsx')),
    movilLogoComponente: fs.existsSync(rel('mobile', 'components')) && fs.readdirSync(rel('mobile', 'components')).some((n) => /^Logo\./.test(n)),
  };
}

// ---------------------------------------------------------------------------------------
// Medición completa
// ---------------------------------------------------------------------------------------

const FIADO_PERMITIDO = new Set(['frontend/app/page.tsx', 'frontend/app/layout.tsx']);

function medir() {
  const A = alcance();
  const m = {};
  const datosAlcance = {
    web: A.web.length, movil: A.movil.length, movilConfig: A.movilConfig.length, correos: A.correos.length,
    api: A.api.length, origenes: A.origenes.length,
  };

  // Colores
  const hexWeb = medirHex(A.web);
  const hexMovil = medirHex(A.movil);
  const hexConfig = medirHex(A.movilConfig);
  const hexCorreos = medirHex(A.correos);
  m['colores.web.fuera'] = hexWeb.fuera;
  m['colores.web.dentro'] = { valor: hexWeb.dentro };
  m['colores.web.tonos'] = { valor: hexWeb.tonos.size, detalle: [...hexWeb.tonos].sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ archivo: '-', linea: 0, texto: `#${t} x${n}` })) };
  m['colores.movil.fuera'] = hexMovil.fuera;
  m['colores.movil.dentro'] = { valor: hexMovil.dentro };
  m['colores.movil.sombras'] = { valor: hexMovil.sombras };
  m['colores.movil.tonos'] = { valor: hexMovil.tonos.size, detalle: [...hexMovil.tonos].sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ archivo: '-', linea: 0, texto: `#${t} x${n}` })) };
  m['colores.movilConfig.fuera'] = hexConfig.fuera;
  m['colores.correos.fuera'] = hexCorreos.fuera;
  m['colores.web.funcionales'] = medirFuncionales(A.web);
  m['colores.movil.funcionales'] = medirFuncionales(A.movil);
  m['colores.web.nombres'] = medirNombres(A.web);
  m['colores.movil.nombres'] = medirNombres(A.movil);

  // Botones y variantes
  const v = medirVariantes(A.web);
  m['botones.web.verdes'] = v.botonVerde;
  m['botones.web.verdesDinamicos'] = v.dinamicoVerde;
  m['botones.web.alertasDinamicas'] = v.alertaDinamica;
  m['botones.web.alertasVerdes'] = v.alertaVerde;
  m['botones.web.cargaVerde'] = v.cargaVerde;
  m['botones.web.insigniasVerdes'] = v.insigniaVerde;
  m['botones.web.otroVerde'] = v.otroVerde;
  m['botones.web.variantePrimary'] = v.principal;
  m['botones.web.archivosConVariosPrincipales'] = v.pantallasConVariosPrincipales;

  // Emojis
  const emojiWeb = lineasConEmoji(A.web);
  m['emojis.web.lineas'] = emojiWeb;
  m['emojis.web.lineasSinComentarios'] = lineasConEmoji(A.web, { sinComentario: true });
  m['emojis.web.bootstrap'] = emojiWeb.filter((e) => e.archivo === 'frontend/app/bootstrap/page.tsx');
  m['emojis.movil.lineas'] = lineasConEmoji(A.movil);
  m['emojis.movil.lineasSinComentarios'] = lineasConEmoji(A.movil, { sinComentario: true });
  const textosApi = A.api.map(mensajesApi);
  const mensajes = textosApi.flatMap((x) => x.mensajes);
  const textosCorreos = A.correos.flatMap(textosCorreo);
  m['emojis.api.mensajes'] = mensajes.filter((t) => RE_EMOJI.test(t.texto));
  m['emojis.correos.textos'] = [...textosCorreos.filter((t) => RE_EMOJI.test(t.texto)), ...lineasConEmoji(A.correos)].filter((x, i, a) => a.findIndex((y) => y.archivo === x.archivo && y.linea === x.linea) === i);

  // Textos
  const textosWeb = A.web.filter((f) => /\.tsx?$/.test(f) && !/middleware\.ts$/.test(f)).flatMap(textosVisibles);
  const textosMovil = A.movil.filter((f) => /\.tsx?$/.test(f)).flatMap(textosVisibles);
  const fuentes = { web: textosWeb, movil: textosMovil, api: mensajes, correos: textosCorreos };
  m['textos.web.total'] = { valor: textosWeb.length };
  m['textos.movil.total'] = { valor: textosMovil.length };
  m['textos.api.total'] = { valor: mensajes.length };
  m['textos.correos.total'] = { valor: textosCorreos.length };
  for (const [clave, lista] of Object.entries(fuentes)) {
    m[`ingles.${clave}`] = aplicar(lista, RE_INGLES);
    m[`usted.${clave}`] = lista.filter((t) => RE_USTED_DIRECTO.test(t.texto) || RE_USTED_VERBO.test(t.texto));
    m[`ustedPosesivo.${clave}`] = lista.filter((t) => RE_USTED_POSESIVO.test(t.texto));
    m[`fiado.${clave}`] = aplicar(lista, RE_FIADO, { excluir: (t) => FIADO_PERMITIDO.has(t.archivo) });
    m[`fiadoPermitido.${clave}`] = aplicar(lista, RE_FIADO).filter((t) => FIADO_PERMITIDO.has(t.archivo));
    m[`glosario.${clave}`] = aplicar(lista, RE_FUERA_GLOSARIO);
    m[`usuarioFueraDeModulo.${clave}`] = aplicar(lista, RE_USUARIO, { excluir: (t) => t.texto.trim() === 'Usuarios' });
    m[`jerga.${clave}`] = lista.filter((t) => RE_JERGA.test(t.texto) || (clave !== 'correos' && RE_CAMPO_TECNICO.test(t.texto)));
    m[`valencito.${clave}`] = aplicar(lista, RE_VALECITO);
    m[`exclamacion.${clave}`] = aplicar(lista, RE_EXCLAMACION);
  }
  m['jerga.api.reenviosDeError'] = textosApi.flatMap((x) => x.reenvios);

  // Ciudad
  const origenesWeb = A.web.filter((f) => /\.(tsx?|scss)$/.test(f));
  const buscarCiudad = (archivos) => archivos.flatMap((f) => leer(f).split('\n').map((l, k) => (RE_CARTAGENA.test(l) ? { archivo: relativo(f), linea: k + 1, texto: l.trim().slice(0, 110) } : null)).filter(Boolean));
  m['ciudad.web'] = buscarCiudad(origenesWeb);
  m['ciudad.movil'] = buscarCiudad(A.movil);
  const ciudadBackend = buscarCiudad(A.origenes.filter((f) => /backend[\\/](src|scripts)[\\/]/.test(f) || /\.sql$/.test(f)));
  const esDefecto = (h) => /DEFAULT\s+'cartagena'|\|\|\s*['"]cartagena['"]|\?\?\s*['"]cartagena['"]|ciudad\s*=\s*['"]cartagena['"]/i.test(h.texto);
  m['ciudad.defectos'] = ciudadBackend.filter(esDefecto);
  m['ciudad.backend.menciones'] = ciudadBackend;
  m['ciudad.pruebas'] = buscarCiudad(A.origenes.filter((f) => /backend[\\/]tests/.test(f)));

  // Contraste
  const cWeb = medirContrasteCodigo(A.web.filter((f) => /\.(scss|css|tsx?)$/.test(f)));
  const cMovil = medirContrasteCodigo(A.movil.filter((f) => /\.tsx?$/.test(f)));
  const UMBRAL = 4.5;
  m['contraste.web.paresMedidos'] = { valor: cWeb.pares.length };
  m['contraste.web.paresBajoAA'] = cWeb.pares.filter((x) => x.ratio < UMBRAL).map((x) => ({ ...x, texto: `${x.texto} = ${x.ratio.toFixed(2)}:1` }));
  m['contraste.web.supuestosBajoAA'] = cWeb.supuestos.filter((x) => x.ratio < UMBRAL).map((x) => ({ ...x, texto: `${x.texto} = ${x.ratio.toFixed(2)}:1` }));
  m['contraste.movil.paresMedidos'] = { valor: cMovil.pares.length };
  m['contraste.movil.paresBajoAA'] = cMovil.pares.filter((x) => x.ratio < UMBRAL).map((x) => ({ ...x, texto: `${x.texto} = ${x.ratio.toFixed(2)}:1` }));
  m['contraste.movil.supuestosBajoAA'] = cMovil.supuestos.filter((x) => x.ratio < UMBRAL).map((x) => ({ ...x, texto: `${x.texto} = ${x.ratio.toFixed(2)}:1` }));
  m['contraste.marca.paresBajoMinimo'] = PARES_MARCA.map(([nombre, fg, bg, min]) => ({ nombre, ratio: contraste(fg, bg), min }))
    .filter((x) => x.ratio < x.min).map((x) => ({ archivo: 'docs/marca.md', linea: 0, texto: `${x.nombre} = ${x.ratio.toFixed(2)}:1 (mínimo ${x.min})` }));

  // Fuente, icono y logo
  const f = medirFuente();
  m['fuente.web.local'] = { valor: f.webFuenteLocal ? 1 : 0 };
  m['fuente.web.solicitudesExternas'] = f.webSolicitudesFuentesExternas;
  m['fuente.web.tabular'] = f.webTabular;
  m['fuente.movil.local'] = { valor: f.movilFuenteLocal ? 1 : 0 };
  m['fuente.movil.solicitudesExternas'] = f.movilSolicitudesFuentesExternas;
  m['fuente.movil.tabular'] = f.movilTabular;
  m['logo.movil.iconoDeApp'] = { valor: f.movilIcono.icon ? 1 : 0 };
  m['logo.movil.pantallaDeInicio'] = { valor: f.movilIcono.splashImage ? 1 : 0 };
  m['logo.web.favicon'] = { valor: f.webFavicon ? 1 : 0 };
  m['logo.web.componente'] = { valor: f.webLogoComponente ? 1 : 0 };
  m['logo.movil.componente'] = { valor: f.movilLogoComponente ? 1 : 0 };

  // Iconos de librerías ajenas (el set propio los reemplaza; docs/marca.md, Iconografía)
  const buscarLineas = (archivos, re) => archivos.flatMap((f) => leer(f).split('\n')
    .map((l, k) => (re.test(l) ? { archivo: relativo(f), linea: k + 1, texto: l.trim().slice(0, 100) } : null)).filter(Boolean));
  m['iconos.movil.libreriasExternas'] = buscarLineas(A.movil, /from\s+['"](?:@expo\/vector-icons|react-native-vector-icons)/);
  m['iconos.web.libreriasExternas'] = buscarLineas(A.web, /from\s+['"](?:react-icons|@fortawesome|bootstrap-icons|lucide-react|@heroicons|@expo\/vector-icons)/);

  // Normalizar: cada métrica es { valor, detalle }
  const salida = {};
  for (const [k, x] of Object.entries(m)) {
    if (Array.isArray(x)) salida[k] = { valor: x.length, detalle: x };
    else salida[k] = { valor: x.valor, detalle: x.detalle || [] };
  }
  return { alcance: datosAlcance, metricas: salida };
}

module.exports = {
  medir, alcance, contraste, normalizarHex, PALETA, SET_PALETA, PARES_MARCA, RAIZ_REPO,
  // Para probar el instrumento con muestras conocidas
  detectores: { RE_INGLES, RE_USTED_DIRECTO, RE_USTED_VERBO, RE_USTED_POSESIVO, RE_FIADO, RE_FUERA_GLOSARIO, RE_USUARIO, RE_JERGA, RE_CAMPO_TECNICO, RE_EMOJI, RE_CARTAGENA, RE_VALECITO },
  funciones: { sinComentarios, literales, pareceTexto, medirHex, bloquesPropios, textosVisibles, mensajesApi, textosCorreo, medirVariantes, lineasConEmoji, medirContrasteCodigo },
};

// ---------------------------------------------------------------------------------------
// Uso como comando
// ---------------------------------------------------------------------------------------

if (require.main === module) {
  const resultado = medir();
  const args = new Set(process.argv.slice(2));
  if (args.has('--json')) {
    process.stdout.write(JSON.stringify(resultado, null, 2) + '\n');
  } else {
    console.log('Inventario de marca · alcance', JSON.stringify(resultado.alcance));
    const ancho = Math.max(...Object.keys(resultado.metricas).map((k) => k.length));
    for (const [k, x] of Object.entries(resultado.metricas)) console.log(`${k.padEnd(ancho)}  ${String(x.valor).padStart(5)}`);
    if (args.has('--detalle')) {
      for (const [k, x] of Object.entries(resultado.metricas)) {
        if (!x.detalle.length) continue;
        console.log(`\n## ${k} (${x.valor})`);
        for (const d of x.detalle) console.log(`  ${d.archivo}:${d.linea}  ${d.texto}`);
      }
    }
  }
}
