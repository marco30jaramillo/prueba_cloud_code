/**
 * Estado visible de un vale (docs/marca.md, «Estados del vale»; regla RN-08).
 *
 * «En mora» no es un estado guardado: se calcula con la fecha de vencimiento y el estado que ya
 * devuelve la API. Cuando aplica REEMPLAZA a Pendiente o Parcial: nunca se muestran los dos.
 * La comparación es la misma que hace la API (`new Date(fechaVencimiento) < new Date()`), para que
 * web y servidor coincidan.
 */

export type EstadoValeApi = 'pendiente' | 'parcial' | 'pagado' | 'anulado';
export type EstadoValeVisible = EstadoValeApi | 'mora';

export const ETIQUETA_ESTADO: Record<EstadoValeVisible, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
  anulado: 'Anulado',
  mora: 'En mora'
};

export function estaEnMora(
  estado: EstadoValeApi | string,
  fechaVencimiento?: string | Date | null,
  ahora: Date = new Date()
): boolean {
  if (estado !== 'pendiente' && estado !== 'parcial') return false;
  if (!fechaVencimiento) return false;
  const fecha = new Date(fechaVencimiento);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha < ahora;
}

export function estadoVisible(
  estado: EstadoValeApi | string,
  fechaVencimiento?: string | Date | null,
  ahora: Date = new Date()
): EstadoValeVisible {
  if (estaEnMora(estado, fechaVencimiento, ahora)) return 'mora';
  if (estado === 'pendiente' || estado === 'parcial' || estado === 'pagado' || estado === 'anulado') return estado;
  return 'pendiente';
}
