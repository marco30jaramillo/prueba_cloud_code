import React from 'react';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import nodos from '@/lib/iconos-nodos.json';

export type NombreIcono = keyof typeof nodos;

interface IconProps {
  name: NombreIcono;
  size?: number;
  color?: string;
}

const FORMAS: Record<string, React.ComponentType<any>> = { path: Path, circle: Circle, ellipse: Ellipse, line: Line, polyline: Polyline, polygon: Polygon, rect: Rect };
const RE_NODO = /<(\w+)((?:\s+[\w-]+="[^"]*")*)\s*\/>/g;
const RE_ATTR = /([\w-]+)="([^"]*)"/g;

function leerNodos(texto: string): { forma: string; props: Record<string, string> }[] {
  const lista: { forma: string; props: Record<string, string> }[] = [];
  for (const m of texto.matchAll(RE_NODO)) {
    const props: Record<string, string> = {};
    for (const a of m[2].matchAll(RE_ATTR)) props[a[1]] = a[2];
    if (FORMAS[m[1]]) lista.push({ forma: m[1], props });
  }
  return lista;
}

const CACHE: Partial<Record<NombreIcono, ReturnType<typeof leerNodos>>> = {};

/** Icono del set propio de la marca: 24 x 24, trazo 2, extremos redondos, sin relleno. */
export function Icon({ name, size = 20, color = '#1F2937' }: IconProps) {
  const lista = (CACHE[name] ??= leerNodos((nodos as Record<string, { nodos: string }>)[name]?.nodos ?? ''));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {lista.map((n, i) => {
        const Forma = FORMAS[n.forma];
        return <Forma key={i} {...n.props} />;
      })}
    </Svg>
  );
}
