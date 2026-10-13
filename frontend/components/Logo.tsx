import { useMemo } from 'react';
import { LOGOS, type VarianteLogo } from '@/lib/marca-datos';
import { parsearSvg } from '@/lib/marca-svg';
import { dibujarNodos } from './marca-svg';

export type { VarianteLogo };

interface LogoProps {
  /**
   * horizontal: isotipo + nombre · apilado: isotipo sobre el nombre · isotipo: solo el cuaderno
   * con el vale · unColor: horizontal en `currentColor` (sobre fondos que no son claros).
   */
  variante?: VarianteLogo;
  /** Alto en px; el ancho sale de la proporción del dibujo. */
  alto?: number;
  /** Si el nombre ya está escrito al lado, el logo es decorativo. */
  decorativo?: boolean;
  className?: string;
}

/**
 * Logo de Mi Valecito (docs/marca.md, Logo y nombre). El nombre es dibujo en contornos, no texto:
 * se ve igual aunque la fuente no cargue. Tamaños mínimos: isotipo 24 px; horizontal 96 px de ancho
 * (propuesta de subirlo a 120 px).
 */
export function Logo({ variante = 'horizontal', alto = 28, decorativo = false, className }: LogoProps) {
  const arbol = useMemo(() => parsearSvg(LOGOS[variante])[0], [variante]);
  const [, , w, h] = (arbol.atributos.viewBox || '0 0 24 24').split(' ').map(Number);
  const ancho = (w / h) * alto;
  const accesible = decorativo ? { 'aria-hidden': true as const, focusable: false } : { role: 'img' as const, 'aria-label': 'Mi Valecito' };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={arbol.atributos.viewBox}
      width={ancho}
      height={alto}
      className={className}
      style={{ flexShrink: 0 }}
      {...accesible}
    >
      {dibujarNodos(arbol.hijos)}
    </svg>
  );
}
