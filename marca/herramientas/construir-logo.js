// Construye el nombre «Mi Valecito» en contornos y exporta el logo, el favicon y los PNG de Expo.
// Uso: node marca/herramientas/construir-logo.js
// Entradas:  marca/logo/isotipo-cuaderno-vale.svg (isotipo), marca/iconos/vale.svg,
//            marca/tipografia/plus-jakarta-sans/ttf/PlusJakartaSans-ExtraBold.ttf (OFL 1.1)
// Salidas:   marca/logo/*.svg, marca/logo/expo/*.png, marca/logo/expo/favicon.ico
// Requiere `sharp` (backend/node_modules; no se descarga nada).
const fs = require('fs');
const path = require('path');
const { cargar } = require('./contornos');

const RAIZ = path.join(__dirname, '..');
const LOGO = path.join(RAIZ, 'logo');
const EXPO = path.join(LOGO, 'expo');
const AZUL = '#2563EB';
const BLANCO = '#FFFFFF';

function cargarSharp() {
  for (const c of ['sharp', path.join(RAIZ, '..', 'backend', 'node_modules', 'sharp')]) { try { return require(c); } catch (e) { /* siguiente */ } }
  throw new Error('No se encontró sharp (backend/node_modules/sharp).');
}
const sharp = cargarSharp();
const f2 = (n) => String(+n.toFixed(2));

// ---- Isotipo: los tres trazos del SVG aprobado, tal cual ----
const isoSrc = fs.readFileSync(path.join(LOGO, 'isotipo-cuaderno-vale.svg'), 'utf8');
const isoPaths = [...isoSrc.matchAll(/<path d="([^"]+)"\/>/g)].map((m) => m[1]);
if (isoPaths.length !== 3) throw new Error('El isotipo debe tener tres trazos');
const isoNodos = isoPaths.map((d) => `<path d="${d}"/>`).join('');
const isoGrupo = (color, tx = 0, ty = 0, k = 1) =>
  `<g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f2(tx)} ${f2(ty)}) scale(${f2(k)})">${isoNodos}</g>`;

// ---- Nombre en contornos ----
const fuente = cargar(path.join(RAIZ, 'tipografia', 'plus-jakarta-sans', 'ttf', 'PlusJakartaSans-ExtraBold.ttf'));
// Ajustes finos de espaciado (unidades de la fuente, 1000 por em): cierra el hueco V-a y el espacio entre palabras.
const AJUSTES = { V: -55, ' ': -30 };
const CAP = (() => { const m = fuente.texto('M', { size: 1000 }); return -m.minY; })(); // alto de la M a 1000
function nombre(altoMayuscula, x = 0, baseline = 0) {
  const size = (altoMayuscula / CAP) * 1000;
  const t = fuente.texto('Mi Valecito', { size, ajustes: AJUSTES, x });
  return { ...t, size, baseline };
}

// Dibujo del nombre como un solo <path>, con la línea base en y = base
function nombrePath(t, base, color) {
  return `<g transform="translate(0 ${f2(base)})"><path fill="${color}" d="${t.d}"/></g>`;
}

const TITULO = '<title>Mi Valecito</title>';
const cab = (w, h, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f2(w)} ${f2(h)}" width="${f2(w)}" height="${f2(h)}" role="img" aria-label="Mi Valecito"${extra}>${TITULO}`;

// ---- Versión horizontal: isotipo (24) + nombre ----
const CAP_H = 13;       // alto de mayúscula del nombre en el horizontal, en unidades del isotipo
const SEP_H = 5;        // aire entre isotipo y nombre
function horizontal(color) {
  const x0 = 23.2 + SEP_H;
  const t = nombre(CAP_H, x0);
  const base = 12 + CAP_H / 2;
  const w = t.maxX + 0.3;
  return {
    svg: cab(w, 24) + isoGrupo(color) + nombrePath(t, base, color) + '</svg>\n',
    w,
  };
}

// ---- Versión apilada: isotipo arriba, nombre debajo, centrado ----
const K_APILADO = 2.6;       // isotipo a 62 unidades de alto (trazo 5.2)
const CAP_APILADO = CAP_H * 1.2;
const GAP_APILADO = 8;
function apilado(color) {
  const medida = nombre(CAP_APILADO, 0);
  const wNombre = medida.maxX - medida.minX;
  const isoW = 22.7 * K_APILADO;          // caja pintada del isotipo: x 0..22.7, y 1..23
  const W = Math.max(wNombre, isoW) + 0.6;
  const isoX = (W - isoW) / 2;
  const isoY = -1 * K_APILADO;            // el trazo superior queda en y = 0
  const yBase = 22 * K_APILADO + GAP_APILADO + CAP_APILADO;
  const t = nombre(CAP_APILADO, (W - wNombre) / 2 - medida.minX);
  const H = yBase + 0.3;
  return { svg: cab(W, H) + isoGrupo(color, isoX, isoY, K_APILADO) + nombrePath(t, yBase, color) + '</svg>\n', W, H };
}

// ---- Escribir los SVG ----
function escribir(archivo, contenido) { fs.writeFileSync(path.join(LOGO, archivo), contenido); return archivo; }
const salida = [];

const hAzul = horizontal(AZUL);
salida.push(escribir('logo-horizontal.svg', hAzul.svg));
salida.push(escribir('logo-un-color.svg', horizontal('currentColor').svg));
const aAzul = apilado(AZUL);
salida.push(escribir('logo-apilado.svg', aAzul.svg));
salida.push(escribir('logo-isotipo.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Mi Valecito">${TITULO}${isoGrupo(AZUL)}</svg>\n`));

// El nombre solo (contornos), de relleno con currentColor
{
  const t = nombre(CAP_H, 0);
  const base = CAP_H + 0.3;
  const w = t.maxX - t.minX + 0.6;
  const t2 = nombre(CAP_H, -t.minX + 0.3);
  salida.push(escribir('nombre.svg', cab(w, base + 0.3) + nombrePath(t2, base, 'currentColor') + '</svg>\n'));
}

// ---- Favicon: el vale solo, en blanco sobre azul ----
// Dibujo propio para 16 a 48 px: ticket ancho con muescas pequeñas y un solo renglón
// (el icono «vale» de 24 px, con dos renglones, se empasta a 16 px).
const VALE_FAVICON = 'M6.5 9h19a2.5 2.5 0 0 1 2.5 2.5v1.5a3 3 0 0 0 0 6v1.5a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 4 20.5V19a3 3 0 0 0 0-6v-1.5A2.5 2.5 0 0 1 6.5 9z';
const faviconSvg = (px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${px}" height="${px}">` +
  `<rect width="32" height="32" rx="7" fill="${AZUL}"/>` +
  `<g fill="none" stroke="${BLANCO}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="${VALE_FAVICON}"/><path d="M11 16h10"/></g></svg>\n`;

// ---- PNG de Expo ----
async function pngDe(svg, w, h, opciones = {}) {
  let img = sharp(Buffer.from(svg), { density: 72 });
  if (opciones.sinAlfa) img = img.flatten({ background: AZUL }).removeAlpha();
  return img.resize(w, h).png().toBuffer();
}

async function main() {
  fs.mkdirSync(EXPO, { recursive: true });
  // Caja pintada del isotipo (unidades): x 0..22.7, y 1..23. Centro (11.35, 12).
  const cx = 11.35, cy = 12;
  const lienzo = (n, nodos, fondo) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n}" height="${n}">${fondo ? `<rect width="${n}" height="${n}" fill="${fondo}"/>` : ''}${nodos}</svg>`;
  const centrado = (n, k, color) => isoGrupo(color, n / 2 - cx * k, n / 2 - cy * k, k);

  // icon.png: 1024, opaco (iOS no admite alfa). Isotipo blanco sobre azul, 62 % del alto.
  const kIcon = (1024 * 0.62) / 22;
  fs.writeFileSync(path.join(EXPO, 'icon.png'), await pngDe(lienzo(1024, centrado(1024, kIcon, BLANCO), AZUL), 1024, 1024, { sinAlfa: true }));
  // adaptive-icon.png: 1024, fondo transparente, isotipo blanco dentro de la zona segura (66 %): 50 % del alto.
  const kAd = (1024 * 0.5) / 22;
  fs.writeFileSync(path.join(EXPO, 'adaptive-icon.png'), await pngDe(lienzo(1024, centrado(1024, kAd, BLANCO), null), 1024, 1024));
  // splash-icon.png: 1024, transparente. Logo apilado en azul, 66 % del ancho.
  {
    const a = apilado(AZUL);
    const k = (1024 * 0.66) / a.W;
    const alto = a.H * k;
    const inner = a.svg.replace(/^<svg[^>]*>/, '').replace('</svg>\n', '').replace(TITULO, '');
    const svg = lienzo(1024, `<g transform="translate(${f2((1024 - a.W * k) / 2)} ${f2((1024 - alto) / 2)}) scale(${f2(k)})">${inner}</g>`, null);
    fs.writeFileSync(path.join(EXPO, 'splash-icon.png'), await pngDe(svg, 1024, 1024));
  }
  // favicon: SVG y PNG de 16, 32 y 48 px, más un .ico con los tres
  fs.writeFileSync(path.join(EXPO, 'favicon.svg'), faviconSvg(32));
  const tam = [16, 32, 48];
  const pngs = [];
  for (const n of tam) {
    const b = await sharp(Buffer.from(faviconSvg(n)), { density: 72 * 8 }).resize(n, n).png().toBuffer();
    pngs.push(b);
    fs.writeFileSync(path.join(EXPO, `favicon-${n}.png`), b);
  }
  // ICO con entradas PNG
  const cabIco = Buffer.alloc(6); cabIco.writeUInt16LE(0, 0); cabIco.writeUInt16LE(1, 2); cabIco.writeUInt16LE(tam.length, 4);
  let off = 6 + 16 * tam.length;
  const dirs = tam.map((n, i) => {
    const e = Buffer.alloc(16);
    e[0] = n; e[1] = n; e[2] = 0; e[3] = 0; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(off, 12); off += pngs[i].length; return e;
  });
  fs.writeFileSync(path.join(EXPO, 'favicon.ico'), Buffer.concat([cabIco, ...dirs, ...pngs]));

  console.log('SVG: ' + salida.join(', '));
  console.log('PNG y favicon en ' + EXPO);
  console.log(`horizontal ${f2(hAzul.w)} x 24 · apilado ${f2(aAzul.W)} x ${f2(aAzul.H)}`);
}
main();
