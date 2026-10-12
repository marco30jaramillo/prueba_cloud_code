import { ICONOS, type NombreIcono } from '@/lib/marca-datos';

const ICONO_POR_RUTA: Record<string, NombreIcono> = {
  '/dashboard': 'grafica',
  '/dashboard/cartera': 'cartera',
  '/dashboard/mis-vales': 'vale',
  '/dashboard/vale-nuevo': 'agregar',
  '/dashboard/tienda': 'tienda',
  '/dashboard/users': 'equipo',
  '/dashboard/roles': 'escudo',
  '/dashboard/audit': 'nota',
  '/dashboard/profile': 'cliente',
};

/** El módulo trae su icono del servidor: si no es un nombre del set de marca, se usa uno por ruta. */
export function iconoDeModulo(icono: string, href = ''): NombreIcono {
  if (icono in ICONOS) return icono as NombreIcono;
  return ICONO_POR_RUTA[href] ?? 'informacion';
}
