// Valida cada marca/iconos/*.svg contra las reglas de iconografía de docs/marca.md.
// Uso: node marca/herramientas/validar-iconos.js [--hoja ruta.png]
// Requiere `sharp` (ya instalado en backend/node_modules; no se descarga nada).
// Sale con código 1 si algún icono incumple.
const fs = require('fs');
const path = require('path');

function cargarSharp() {
  const candidatos = ['sharp', path.join(__dirname, '..', '..', 'backend', 'node_modules', 'sharp')];
  for (const c of candidatos) { try { return require(c); } catch (e) { /* siguiente */ } }
  throw new Error('No se encontró sharp (backend/node_modules/sharp).');
}

const REQ = {
  xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
};
const MAX_NODOS = 4;

async function main() {
  const sharp = cargarSharp();
  const dir = path.join(__dirname, '..', 'iconos');
  const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
  let fallos = 0;
  const filas = [];
  for (const f of archivos) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const errores = [];
    const raiz = txt.match(/<svg\b([^>]*)>/);
    if (!raiz) { errores.push('sin <svg>'); } else {
      const attrs = Object.fromEntries([...raiz[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
      for (const [k, v] of Object.entries(REQ)) if (attrs[k] !== v) errores.push(`${k} debe ser "${v}" (es "${attrs[k]}")`);
    }
    const cuerpo = txt.replace(/<svg\b[^>]*>/, '').replace('</svg>', '');
    const nodos = [...cuerpo.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/g)];
    if (nodos.length === 0) errores.push('sin nodos');
    if (nodos.length > MAX_NODOS) errores.push(`${nodos.length} nodos (máximo ${MAX_NODOS})`);
    if (/\b(fill|stroke)="(?!none|currentColor)/.test(cuerpo)) errores.push('color propio en un nodo');
    if (/#[0-9a-fA-F]{3,8}\b|rgb\(/.test(txt)) errores.push('color fijo');
    if (/<text\b|<image\b|<style\b|transform=/.test(txt)) errores.push('elemento no permitido (text, image, style o transform)');

    // Caja pintada: render a 20 px por unidad, trazo negro. Debe caer dentro de 1..23.
    const k = 20;
    const svg = txt.replace(/currentColor/g, '#000000').replace(/width="24" height="24"/, `width="${24 * k}" height="${24 * k}"`);
    const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const caja = [x0 / k, y0 / k, (x1 + 1) / k, (y1 + 1) / k].map((n) => +n.toFixed(1));
    if (caja[0] < 1 - 0.05 || caja[1] < 1 - 0.05 || caja[2] > 23 + 0.05 || caja[3] > 23 + 0.05) errores.push(`dibujo fuera del cuadro 1..23: ${caja.join(',')}`);
    if (errores.length) fallos++;
    filas.push({ f, nodos: nodos.length, caja, errores });
  }
  for (const r of filas) {
    console.log(`${r.errores.length ? 'FALLA' : 'ok   '}  ${r.f.padEnd(34)} nodos:${r.nodos}  caja:[${r.caja.join(', ')}]${r.errores.length ? '  ' + r.errores.join('; ') : ''}`);
  }
  console.log(`\n${archivos.length} iconos, ${fallos} con fallas`);

  const i = process.argv.indexOf('--hoja');
  if (i > -1) {
    // Hoja de contacto: cada icono a 96, 48, 24 y 16 px, en azul de marca sobre blanco.
    const celda = 150, cols = 6, filasN = Math.ceil(archivos.length / cols);
    const W = cols * celda, H = filasN * celda;
    let cuerpoSvg = '';
    archivos.forEach((f, n) => {
      const txt = fs.readFileSync(path.join(dir, f), 'utf8');
      const inner = txt.replace(/<svg\b[^>]*>/, '').replace('</svg>', '');
      const ox = (n % cols) * celda, oy = Math.floor(n / cols) * celda;
      const g = (s, x, y) => `<g transform="translate(${ox + x},${oy + y}) scale(${s / 24})" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
      cuerpoSvg += g(72, 6, 6) + g(24, 88, 10) + g(16, 120, 14) + g(48, 88, 40) +
        `<text x="${ox + 6}" y="${oy + 100}" font-size="11" font-family="sans-serif" fill="#1F2937">${f.replace('.svg', '')}</text>`;
    });
    const hoja = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff"/>${cuerpoSvg}</svg>`;
    await sharp(Buffer.from(hoja)).png().toFile(process.argv[i + 1]);
    console.log('Hoja de contacto: ' + process.argv[i + 1]);
  }
  process.exit(fallos ? 1 : 0);
}
main();
