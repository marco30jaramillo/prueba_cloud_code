import { useMemo } from 'react';
import { ICONOS, type NombreIcono } from '@/lib/marca-datos';
import { parsearSvg } from '@/lib/marca-svg';
import { dibujarNodos } from './marca-svg';

export type { NombreIcono };

interface IconProps {
  /** Nombre del icono en `marca/iconos/` (sin .svg). */
  name: NombreIcono;
  /** Tamaño en px o con unidad. Por defecto `1.25em`: sigue al texto que lo acompaña. */
  size?: number | string;
  /**
   * Texto accesible. Si se pasa, el icono informa por sí mismo (`role="img"` + `aria-label`).
   * Si no, es decorativo y va con `aria-hidden` (el texto vecino dice lo que significa).
   */
  title?: string;
  className?: string;
}

/**
 * Icono del set propio de la marca (docs/marca.md, Iconografía): SVG en línea, 24 x 24, trazo 2,
 * extremos redondos, sin relleno. Hereda el color del texto (`currentColor`).
 */
export function Icon({ name, size = '1.25em', title, className }: IconProps) {
  const nodos = useMemo(() => dibujarNodos(parsearSvg(ICONOS[name] ?? '')), [name]);
  const lado = typeof size === 'number' ? `${size}px` : size;
  const accesible = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const, focusable: false };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={lado}
      height={lado}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ verticalAlign: '-0.25em', flexShrink: 0 }}
      {...accesible}
    >
      {nodos}
    </svg>
  );
}
