import { createElement, type ReactNode } from 'react';
import { type NodoSvg } from '@/lib/marca-svg';

/** Dibuja un árbol de `parsearSvg` como elementos de React (nunca como HTML). */
export function dibujarNodos(nodos: NodoSvg[], prefijo = 'n'): ReactNode[] {
  return nodos.map((n, i) =>
    createElement(n.etiqueta, { key: `${prefijo}-${i}`, ...n.atributos }, ...dibujarNodos(n.hijos, `${prefijo}-${i}`))
  );
}
