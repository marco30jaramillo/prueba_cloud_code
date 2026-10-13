/**
 * Fechas de calendario (sin hora) para formularios: el vencimiento de un vale es un día, no un
 * instante. Todo se calcula en la hora local del teléfono; `aISO` no pasa por UTC para que a las
 * 8 p. m. en Colombia "hoy" no se convierta en mañana.
 */

/** Medianoche local del día de `d`. */
export function inicioDelDia(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * El mismo día del mes siguiente; si ese mes es más corto, su último día
 * (31 de enero -> 28 o 29 de febrero, nunca 3 de marzo).
 */
export function unMesDespues(d: Date = new Date()): Date {
  const base = inicioDelDia(d);
  const ultimoDiaSiguiente = new Date(base.getFullYear(), base.getMonth() + 2, 0).getDate();
  return new Date(base.getFullYear(), base.getMonth() + 1, Math.min(base.getDate(), ultimoDiaSiguiente));
}

/** "YYYY-MM-DD" en hora local, el formato que recibe la API. */
export function aISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Nunca antes de hoy: una fecha pasada se lleva a hoy. */
export function noAntesDeHoy(d: Date, hoy: Date = new Date()): Date {
  const dia = inicioDelDia(d);
  const minimo = inicioDelDia(hoy);
  return dia < minimo ? minimo : dia;
}

/** Texto para mostrar: "13 nov 2026". */
export function fechaLegible(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
