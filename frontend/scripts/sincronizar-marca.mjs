/**
 * Copia a `frontend/` los recursos de marca que la web necesita, desde la fuente de verdad
 * `Mi Valecito/marca/` (requerimiento 008, tarea 5b).
 *
 *   node scripts/sincronizar-marca.mjs          (o: npm run marca:sincronizar)
 *
 * Qué deja:
 *   assets/marca/fuentes/   Plus Jakarta Sans (woff2 de 400, 600 y 800) con OFL.txt y AUTHORS.txt
 *   assets/marca/logo/      isotipo, logos y nombre en SVG
 *   assets/marca/iconos/    un SVG por icono y nodos.json
 *   public/marca/           favicon (svg y png)         public/favicon.ico   favicon clásico
 *   lib/marca-datos.ts      módulo generado con los nodos de los iconos y los SVG del logo, para
 *                           que `Icon` y `Logo` los dibujen en línea sin HTML inyectado
 *
 * Nada de esto se edita a mano: los cambios se hacen en `marca/` y se vuelve a correr el script.
 * La prueba `tests/marca-copias.test.mjs` falla si una copia difiere de su fuente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND = path.resolve(AQUI, '..');
export const MARCA = path.resolve(FRONTEND, '..', 'marca');

const FUENTE = 'tipografia/plus-jakarta-sans';
const PESOS = ['Regular', 'SemiBold', 'ExtraBold'];
const LOGOS = {
  horizontal: 'logo-horizontal.svg',
  apilado: 'logo-apilado.svg',
  isotipo: 'logo-isotipo.svg',
  unColor: 'logo-un-color.svg'
};

/** Lista de [ruta relativa en marca/, ruta relativa en frontend/] */
export function listaCopias() {
  const copias = [];
  for (const peso of PESOS) {
    copias.push([`${FUENTE}/woff2/PlusJakartaSans-${peso}.woff2`, `assets/marca/fuentes/PlusJakartaSans-${peso}.woff2`]);
  }
  copias.push([`${FUENTE}/OFL.txt`, 'assets/marca/fuentes/OFL.txt']);
  copias.push([`${FUENTE}/AUTHORS.txt`, 'assets/marca/fuentes/AUTHORS.txt']);

  for (const archivo of ['isotipo-cuaderno-vale.svg', 'nombre.svg', ...Object.values(LOGOS)]) {
    copias.push([`logo/${archivo}`, `assets/marca/logo/${archivo}`]);
  }

  const iconos = fs.readdirSync(path.join(MARCA, 'iconos')).filter((f) => f.endsWith('.svg') || f === 'nodos.json').sort();
  for (const archivo of iconos) copias.push([`iconos/${archivo}`, `assets/marca/iconos/${archivo}`]);

  for (const archivo of ['favicon.svg', 'favicon-16.png', 'favicon-32.png', 'favicon-48.png']) {
    copias.push([`logo/expo/${archivo}`, `public/marca/${archivo}`]);
  }
  copias.push(['logo/expo/favicon.ico', 'public/favicon.ico']);
  return copias;
}

/** Carpetas cuyo contenido es solo copia: lo que sobre ahí se borra. */
const CARPETAS_GESTIONADAS = ['assets/marca/fuentes', 'assets/marca/logo', 'assets/marca/iconos', 'public/marca'];

export const RUTA_DATOS = 'lib/marca-datos.ts';

/** Contenido de `lib/marca-datos.ts`, calculado solo desde `marca/`. */
export function generarDatos() {
  const nodos = JSON.parse(fs.readFileSync(path.join(MARCA, 'iconos', 'nodos.json'), 'utf8'));
  const nombres = Object.keys(nodos).sort();
  const iconos = nombres.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(nodos[n].nodos)}`).join(',\n');
  const logos = Object.entries(LOGOS)
    .map(([clave, archivo]) => `  ${clave}: ${JSON.stringify(fs.readFileSync(path.join(MARCA, 'logo', archivo), 'utf8').trim())}`)
    .join(',\n');
  return `/**
 * GENERADO por scripts/sincronizar-marca.mjs desde Mi Valecito/marca/. No se edita a mano.
 * Nodos internos de cada icono (viewBox 24 x 24) y SVG de las cuatro versiones del logo.
 */

export const ICONOS = {
${iconos}
} as const;

export type NombreIcono = keyof typeof ICONOS;

export const LOGOS = {
${logos}
} as const;

export type VarianteLogo = keyof typeof LOGOS;
`;
}

function podar(carpetaRel, esperados) {
  const carpeta = path.join(FRONTEND, carpetaRel);
  if (!fs.existsSync(carpeta)) return;
  for (const f of fs.readdirSync(carpeta)) {
    const rel = `${carpetaRel}/${f}`;
    if (!esperados.has(rel)) fs.rmSync(path.join(carpeta, f), { recursive: true, force: true });
  }
}

export function sincronizar() {
  if (!fs.existsSync(MARCA)) throw new Error(`No existe la fuente de marca: ${MARCA}`);
  const copias = listaCopias();
  for (const [origen, destino] of copias) {
    const a = path.join(FRONTEND, destino);
    fs.mkdirSync(path.dirname(a), { recursive: true });
    fs.copyFileSync(path.join(MARCA, origen), a);
  }
  const esperados = new Set(copias.map(([, d]) => d));
  for (const carpeta of CARPETAS_GESTIONADAS) podar(carpeta, esperados);
  fs.writeFileSync(path.join(FRONTEND, RUTA_DATOS), generarDatos());
  return copias.length + 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const n = sincronizar();
  console.log(`Marca sincronizada: ${n} archivos en frontend/ desde ${path.relative(process.cwd(), MARCA) || MARCA}`);
}
