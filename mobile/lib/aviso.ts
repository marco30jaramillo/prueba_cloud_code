import { createStore } from 'zustand/vanilla';

/**
 * Cola de avisos y confirmaciones con el estilo de la marca (los pinta components/AvisoHost.tsx).
 * Sustituye a `Alert.alert` del sistema, que en Android e iOS no usa la fuente ni los colores de la app.
 * Misma forma de uso: `avisar(titulo, mensaje, botones)`, más un tono opcional.
 */

export type TonoAviso = 'exito' | 'error' | 'aviso' | 'info' | 'peligro';

export interface BotonAviso {
  text: string;
  /** Igual que en `Alert.alert`: `cancel` va como botón secundario y `destructive` en rojo. */
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface Aviso {
  id: number;
  titulo: string;
  mensaje?: string;
  botones: BotonAviso[];
  tono: TonoAviso;
}

interface EstadoAvisos {
  cola: Aviso[];
  /** Hosts montados; pinta solo el último (p. ej. el de una pantalla modal nativa, que tapa a la raíz). */
  hosts: number[];
}

export const avisosStore = createStore<EstadoAvisos>(() => ({ cola: [], hosts: [] }));

let siguienteHost = 1;

/** Registra un host de avisos; devuelve su id y la función para quitarlo al desmontar. */
export function registrarHost(): [number, () => void] {
  const id = siguienteHost++;
  avisosStore.setState((s) => ({ hosts: [...s.hosts, id] }));
  return [id, () => avisosStore.setState((s) => ({ hosts: s.hosts.filter((h) => h !== id) }))];
}

let siguienteId = 1;

/** Tono por defecto: rojo si algún botón es destructivo, informativo si no. */
export function tonoPorDefecto(botones: BotonAviso[]): TonoAviso {
  return botones.some((b) => b.style === 'destructive') ? 'peligro' : 'info';
}

export function avisar(titulo: string, mensaje?: string, botones?: BotonAviso[], tono?: TonoAviso): void {
  const lista = botones && botones.length > 0 ? botones : [{ text: 'Entendido' }];
  const aviso: Aviso = { id: siguienteId++, titulo, mensaje, botones: lista, tono: tono ?? tonoPorDefecto(lista) };
  avisosStore.setState((s) => ({ cola: [...s.cola, aviso] }));
}

/** Cierra el aviso visible y ejecuta la acción del botón (que puede abrir otro aviso). */
export function responder(id: number, boton?: BotonAviso): void {
  avisosStore.setState((s) => ({ cola: s.cola.filter((a) => a.id !== id) }));
  void boton?.onPress?.();
}

/**
 * Atrás de Android o toque fuera: cuenta como el botón `cancel`; si el aviso tiene un solo botón,
 * como ese botón (para no saltarse su acción, p. ej. volver atrás tras crear un vale). Con varios
 * botones y ninguno de cancelar, no hace nada: hay que elegir.
 */
export function descartar(aviso: Aviso): void {
  const boton = aviso.botones.find((b) => b.style === 'cancel') ?? (aviso.botones.length === 1 ? aviso.botones[0] : undefined);
  if (boton || aviso.botones.length === 0) responder(aviso.id, boton);
}
