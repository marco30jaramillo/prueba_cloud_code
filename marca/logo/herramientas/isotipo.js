// Genera el isotipo "cuaderno + vale en diagonal" con el cuaderno recortado donde el vale lo tapa.
const fs = require('fs');
const f = (n) => String(+n.toFixed(2));

function build(p) {
  const { nb, tk, ticks, gap = 3, perf = false } = p;
  const th = (tk.deg * Math.PI) / 180;
  const cos = Math.cos(th), sin = Math.sin(th);
  // local (x right, y down) -> canvas, rotado en sentido antihorario visual (sube a la derecha)
  const R = (x, y) => [tk.cx + x * cos + y * sin, tk.cy - x * sin + y * cos];
  // distancia de un punto al rectángulo del vale (relleno)
  const dist = (px, py) => {
    const dx = px - tk.cx, dy = py - tk.cy;
    const lx = dx * cos - dy * sin;   // inversa de R
    const ly = dx * sin + dy * cos;
    const qx = Math.max(Math.abs(lx) - tk.w / 2, 0);
    const qy = Math.max(Math.abs(ly) - tk.h / 2, 0);
    return Math.hypot(qx, qy);
  };
  const { x0, y0, x1, y1, r } = nb;
  // primitivas, en sentido horario, empezando por el borde inferior
  const P = [
    { t: 'L', a: [x1 - r, y1], b: [x0 + r, y1] },
    { t: 'A', c: [x0 + r, y1 - r], a0: 90, a1: 180 },
    { t: 'L', a: [x0, y1 - r], b: [x0, y0 + r] },
    { t: 'A', c: [x0 + r, y0 + r], a0: 180, a1: 270 },
    { t: 'L', a: [x0 + r, y0], b: [x1 - r, y0] },
    { t: 'A', c: [x1 - r, y0 + r], a0: 270, a1: 360 },
    { t: 'L', a: [x1, y0 + r], b: [x1, y1 - r] },
    { t: 'A', c: [x1 - r, y1 - r], a0: 0, a1: 90 },
  ];
  const at = (pr, t) => {
    if (pr.t === 'L') return [pr.a[0] + (pr.b[0] - pr.a[0]) * t, pr.a[1] + (pr.b[1] - pr.a[1]) * t];
    const ang = ((pr.a0 + (pr.a1 - pr.a0) * t) * Math.PI) / 180;
    return [pr.c[0] + r * Math.cos(ang), pr.c[1] + r * Math.sin(ang)];
  };
  const vis = (pr, t) => { const [x, y] = at(pr, t); return dist(x, y) >= gap; };
  const N = 4000;
  let d = '', chains = 0, open = false, last = null;
  P.forEach((pr) => {
    let inside = null, startT = 0;
    const emitTo = (t) => {
      const [x, y] = at(pr, t);
      d += pr.t === 'L' ? `L${f(x)} ${f(y)}` : `A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)}`;
    };
    for (let i = 0; i <= N; i++) {
      const t = i / N, v = vis(pr, t);
      if (v && !open) { const [x, y] = at(pr, t); d += `M${f(x)} ${f(y)}`; open = true; chains++; }
      else if (v && open && inside === false) { /* continuando */ }
      if (!v && open) { emitTo((i - 1) / N); open = false; }
      inside = !v;
      if (v && open && i === N) emitTo(1);
    }
  });
  // punta de ticks (anillas)
  let tickD = '';
  (ticks || []).forEach((y) => {
    const a = [x0 - 2, y], b = [x0 + 2, y];
    if (dist(a[0], a[1]) >= gap && dist(b[0], b[1]) >= gap) tickD += `M${f(a[0])} ${f(a[1])}H${f(b[0])}`;
  });
  // vale
  const W = tk.w / 2, H = tk.h / 2, rc = 1, n = tk.n;
  const pts = [];
  const pt = (x, y) => { const [X, Y] = R(x, y); return `${f(X)} ${f(Y)}`; };
  const tkD =
    `M${pt(-W + rc, -H)}L${pt(W - rc, -H)}A${rc} ${rc} 0 0 1 ${pt(W, -H + rc)}` +
    `L${pt(W, -n)}A${n} ${n} 0 0 0 ${pt(W, n)}L${pt(W, H - rc)}A${rc} ${rc} 0 0 1 ${pt(W - rc, H)}` +
    `L${pt(-W + rc, H)}A${rc} ${rc} 0 0 1 ${pt(-W, H - rc)}L${pt(-W, n)}A${n} ${n} 0 0 0 ${pt(-W, -n)}` +
    `L${pt(-W, -H + rc)}A${rc} ${rc} 0 0 1 ${pt(-W + rc, -H)}Z`;
  let perfD = '';
  if (perf) perfD = `M${pt(-W + 4, -H)}L${pt(-W + 4, H)}`;
  return { nbD: d, tickD, tkD, perfD, chains };
}

const variants = {
  A: { nb: { x0: 4, y0: 2, x1: 17, y1: 20, r: 2 }, tk: { cx: 15.5, cy: 16.5, deg: 25, w: 13, h: 7, n: 1.5 }, ticks: [7, 11.5] },
  B: { nb: { x0: 4, y0: 2, x1: 16, y1: 18, r: 2 }, tk: { cx: 15, cy: 16, deg: 30, w: 14, h: 7, n: 1.5 }, ticks: [6.5, 10.5] },
  C: { nb: { x0: 3, y0: 2, x1: 15, y1: 19, r: 2 }, tk: { cx: 15, cy: 16.5, deg: 35, w: 14, h: 7, n: 1.5 }, ticks: [6, 10], perf: true },
};

let out = '';
const svgFor = (k, size, extra = '') => {
  const v = build(variants[k]);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}><path d="${v.nbD}"/>${v.tickD ? `<path d="${v.tickD}"/>` : ''}<path d="${v.tkD}"/>${v.perfD ? `<path d="${v.perfD}" stroke-dasharray="0.01 2.6"/>` : ''}</svg>`;
};
const rows = Object.keys(variants).map((k) => {
  const v = build(variants[k]);
  return `<div style="margin:12px;color:#2563EB;display:flex;align-items:center;gap:20px;font:12px sans-serif"><b>${k}</b>${svgFor(k, 24)}${svgFor(k, 48)}${svgFor(k, 128)}<span>cadenas: ${v.chains}</span></div>`;
}).join('');
if(process.argv[2])fs.writeFileSync(process.argv[2], `<!doctype html><meta charset="utf-8"><body style="background:#fff">${rows}</body>`);

module.exports={build};
