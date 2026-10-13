import { estadoVisible, ETIQUETA_ESTADO, type EstadoValeApi } from '@/lib/estado-vale';
import { Icon } from './Icon';
import styles from './EstadoVale.module.scss';

interface EstadoValeProps {
  /** Estado que devuelve la API. */
  estado: EstadoValeApi;
  /** Fecha de vencimiento que devuelve la API; con ella se calcula «En mora» (RN-08). */
  fechaVencimiento?: string | Date | null;
  className?: string;
}

/**
 * Chip del estado del vale. «En mora» se calcula y REEMPLAZA a Pendiente o Parcial: nunca se
 * muestran los dos. El significado va siempre en el texto, no solo en el color.
 */
export function EstadoVale({ estado, fechaVencimiento, className }: EstadoValeProps) {
  const visible = estadoVisible(estado, fechaVencimiento);
  return (
    <span className={`${styles.chip} ${styles[visible]}${className ? ` ${className}` : ''}`}>
      {visible === 'mora' && <Icon name="mora" size="1em" />}
      {ETIQUETA_ESTADO[visible]}
    </span>
  );
}
