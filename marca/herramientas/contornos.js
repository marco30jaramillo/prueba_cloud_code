// Convierte texto a contornos SVG leyendo un TTF estático (glyf, cmap formato 4 o 12).
// Sin dependencias. Uso: const { cargar } = require('./contornos');
//   const fuente = cargar(rutaTTF);
//   const t = fuente.texto('Mi Valecito', { ajustes: { 'V': -20 } });  // unidades de la fuente
// Devuelve { d, ancho, alto, ... } con y hacia abajo (coordenadas SVG), origen en la línea base = 0.
const fs = require('fs');

function cargar(ruta) {
  const b = fs.readFileSync(ruta);
  const u16 = (o) => b.readUInt16BE(o), i16 = (o) => b.readInt16BE(o), u32 = (o) => b.readUInt32BE(o);
  const numTablas = u16(4);
  const T = {};
  for (let i = 0; i < numTablas; i++) {
    const o = 12 + i * 16;
    T[b.toString('ascii', o, o + 4)] = { off: u32(o + 8), len: u32(o + 12) };
  }
  const head = T.head.off;
  const upm = u16(head + 18);
  const locFmt = i16(head + 50);
  const nGlifos = u16(T.maxp.off + 4);
  const nMetricas = u16(T.hhea.off + 34);

  // cmap
  const cm = T.cmap.off;
  const nSub = u16(cm + 2);
  let sub = null;
  for (let i = 0; i < nSub; i++) {
    const pid = u16(cm + 4 + i * 8), eid = u16(cm + 6 + i * 8), off = u32(cm + 8 + i * 8);
    const fmt = u16(cm + off);
    if ((pid === 3 && (eid === 1 || eid === 10)) || pid === 0) {
      if (!sub || fmt === 12 || (fmt === 4 && sub.fmt !== 12)) sub = { off: cm + off, fmt };
    }
  }
  if (!sub) throw new Error('cmap no soportado');
  function glifoDe(cp) {
    const o = sub.off;
    if (sub.fmt === 4) {
      const segX2 = u16(o + 6), fin = o + 14, ini = fin + segX2 + 2, delta = ini + segX2, rango = delta + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const e = u16(fin + s * 2);
        if (cp <= e) {
          const st = u16(ini + s * 2);
          if (cp < st) return 0;
          const ro = u16(rango + s * 2), dl = u16(delta + s * 2);
          if (ro === 0) return (cp + dl) & 0xffff;
          const g = u16(rango + s * 2 + ro + (cp - st) * 2);
          return g === 0 ? 0 : (g + dl) & 0xffff;
        }
      }
      return 0;
    }
    const n = u32(o + 12);
    for (let g = 0; g < n; g++) {
      const p = o + 16 + g * 12, s = u32(p), e = u32(p + 4), sg = u32(p + 8);
      if (cp >= s && cp <= e) return sg + (cp - s);
    }
    return 0;
  }

  const loca = (g) => (locFmt === 0 ? u16(T.loca.off + g * 2) * 2 : u32(T.loca.off + g * 4));
  const avance = (g) => u16(T.hmtx.off + Math.min(g, nMetricas - 1) * 4);

  // Contornos de un glifo: lista de contornos, cada uno lista de puntos {x, y, on}
  function contornos(g, nivel = 0) {
    const ini = loca(g), fin = loca(g + 1);
    if (ini === fin || nivel > 4) return [];
    let o = T.glyf.off + ini;
    const nc = i16(o);
    if (nc >= 0) {
      const finales = [];
      for (let i = 0; i < nc; i++) finales.push(u16(o + 10 + i * 2));
      const nPts = nc ? finales[nc - 1] + 1 : 0;
      const nIns = u16(o + 10 + nc * 2);
      let p = o + 12 + nc * 2 + nIns;
      const flags = [];
      while (flags.length < nPts) {
        const f = b[p++]; flags.push(f);
        if (f & 8) { let r = b[p++]; while (r--) flags.push(f); }
      }
      const xs = [], ys = [];
      let v = 0;
      for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 2) { const d = b[p++]; v += f & 16 ? d : -d; } else if (!(f & 16)) { v += i16(p); p += 2; }
        xs.push(v);
      }
      v = 0;
      for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 4) { const d = b[p++]; v += f & 32 ? d : -d; } else if (!(f & 32)) { v += i16(p); p += 2; }
        ys.push(v);
      }
      const res = [];
      let s = 0;
      for (const e of finales) {
        const c = [];
        for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
        res.push(c); s = e + 1;
      }
      return res;
    }
    // compuesto
    o += 10;
    let res = [], mas = true;
    while (mas) {
      const fl = u16(o), gi = u16(o + 2); o += 4;
      let dx, dy;
      if (fl & 1) { dx = i16(o); dy = i16(o + 2); o += 4; } else { dx = b.readInt8(o); dy = b.readInt8(o + 1); o += 2; }
      if (!(fl & 2)) { dx = 0; dy = 0; }
      let a = 1, bb = 0, c = 0, d = 1;
      const f2 = (x) => x / 16384;
      if (fl & 8) { a = d = f2(i16(o)); o += 2; }
      else if (fl & 0x40) { a = f2(i16(o)); d = f2(i16(o + 2)); o += 4; }
      else if (fl & 0x80) { a = f2(i16(o)); bb = f2(i16(o + 2)); c = f2(i16(o + 4)); d = f2(i16(o + 6)); o += 8; }
      for (const cn of contornos(gi, nivel + 1)) {
        res.push(cn.map((q) => ({ x: a * q.x + c * q.y + dx, y: bb * q.x + d * q.y + dy, on: q.on })));
      }
      mas = !!(fl & 0x20);
    }
    return res;
  }

  const f = (n) => String(+n.toFixed(2));
  // Contorno TrueType (cuadráticas) -> comandos SVG. dx desplazamiento, esc escala; y se invierte.
  function aPath(cn, dx, esc) {
    const P = cn.map((q) => ({ x: dx + q.x * esc, y: -q.y * esc, on: q.on }));
    const n = P.length;
    if (!n) return '';
    const medio = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, on: true });
    let i0 = P.findIndex((p) => p.on);
    let ini;
    let lista;
    if (i0 === -1) { ini = medio(P[0], P[n - 1]); lista = P; } else {
      ini = P[i0]; lista = [];
      for (let k = 1; k <= n; k++) lista.push(P[(i0 + k) % n]);
    }
    let d = `M${f(ini.x)} ${f(ini.y)}`;
    let ctrl = null;
    const fin = i0 === -1 ? lista : lista.slice(0, -1);
    const cierre = i0 === -1 ? ini : ini;
    for (const p of fin) {
      if (p.on) {
        d += ctrl ? `Q${f(ctrl.x)} ${f(ctrl.y)} ${f(p.x)} ${f(p.y)}` : `L${f(p.x)} ${f(p.y)}`;
        ctrl = null;
      } else {
        if (ctrl) { const m = medio(ctrl, p); d += `Q${f(ctrl.x)} ${f(ctrl.y)} ${f(m.x)} ${f(m.y)}`; }
        ctrl = p;
      }
    }
    if (ctrl) d += `Q${f(ctrl.x)} ${f(ctrl.y)} ${f(cierre.x)} ${f(cierre.y)}`;
    return d + 'Z';
  }

  // texto: ajustes = { 'V': 20 } suma unidades de fuente de espacio DESPUÉS de esa letra.
  // tracking: unidades de fuente entre todas las letras. size: alto de em en unidades del lienzo (por defecto = upm).
  function texto(cadena, { size = upm, tracking = 0, ajustes = {}, x = 0 } = {}) {
    const esc = size / upm;
    let cursor = 0, d = '';
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const cajas = [];
    for (const ch of cadena) {
      const g = glifoDe(ch.codePointAt(0));
      const cs = contornos(g);
      for (const cn of cs) {
        d += aPath(cn, x + cursor * esc, esc);
        for (const q of cn) {
          const X = x + (cursor + q.x) * esc, Y = -q.y * esc;
          minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y);
        }
      }
      cajas.push({ ch, g, avance: avance(g) });
      cursor += avance(g) + tracking + (ajustes[ch] || 0);
    }
    return { d, minX, maxX, minY, maxY, ancho: maxX - minX, alto: maxY - minY, avance: cursor * esc, cajas };
  }

  return { upm, texto, glifoDe, contornos };
}

module.exports = { cargar };
