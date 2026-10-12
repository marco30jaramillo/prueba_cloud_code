/**
 * Lector mínimo y seguro de los SVG de marca (iconos y logo).
 *
 * Los activos de `marca/` llegan como texto (`lib/marca-datos.ts`). Aquí se convierten en un árbol
 * de nodos con etiquetas y atributos de una lista cerrada; los componentes `Icon` y `Logo` los
 * dibujan con `React.createElement`. Nunca se inyecta HTML: lo que no está en la lista se descarta.
 */

export interface NodoSvg {
  etiqueta: string;
  atributos: Record<string, string>;
  hijos: NodoSvg[];
}

const ETIQUETAS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse']);

/** Atributo SVG -> propiedad de React. Lo que no esté aquí se descarta. */
const ATRIBUTOS: Record<string, string> = {
  d: 'd',
  cx: 'cx',
  cy: 'cy',
  r: 'r',
  rx: 'rx',
  ry: 'ry',
  x: 'x',
  y: 'y',
  x1: 'x1',
  y1: 'y1',
  x2: 'x2',
  y2: 'y2',
  width: 'width',
  height: 'height',
  points: 'points',
  fill: 'fill',
  stroke: 'stroke',
  transform: 'transform',
  viewBox: 'viewBox',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin'
};

const RE_ETIQUETA = /<(\/)?([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/)?>/g;
const RE_ATRIBUTO = /([\w:-]+)="([^"]*)"/g;

/** Valores que no se aceptan en ningún atributo (enlaces, scripts, referencias externas). */
const RE_PELIGROSO = /javascript:|data:|url\(|https?:/i;

export function parsearSvg(texto: string): NodoSvg[] {
  const raiz: NodoSvg = { etiqueta: '#raiz', atributos: {}, hijos: [] };
  const pila: { nodo: NodoSvg; descartar: boolean }[] = [{ nodo: raiz, descartar: false }];
  RE_ETIQUETA.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_ETIQUETA.exec(texto)) !== null) {
    const [, cierre, nombre, resto, autocierre] = m;
    if (cierre) {
      if (pila.length > 1) pila.pop();
      continue;
    }
    const permitida = ETIQUETAS.has(nombre);
    const atributos: Record<string, string> = {};
    if (permitida) {
      RE_ATRIBUTO.lastIndex = 0;
      let a: RegExpExecArray | null;
      while ((a = RE_ATRIBUTO.exec(resto || '')) !== null) {
        const propiedad = ATRIBUTOS[a[1]];
        if (propiedad && !RE_PELIGROSO.test(a[2])) atributos[propiedad] = a[2];
      }
    }
    const padre = pila[pila.length - 1];
    const nodo: NodoSvg = { etiqueta: nombre, atributos, hijos: [] };
    const descartar = padre.descartar || !permitida;
    if (!descartar) padre.nodo.hijos.push(nodo);
    if (!autocierre) pila.push({ nodo, descartar });
  }
  return raiz.hijos;
}
