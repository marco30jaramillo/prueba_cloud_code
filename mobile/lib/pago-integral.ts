/**
 * Lógica pura del pago integral (sin React ni red). En la app la usa la pestaña Cartera; las
 * pruebas de `tests/pago-integral.test.mjs` la cubren. El backend es quien decide: esto solo
 * anticipa lo que el usuario verá y evita enviar peticiones que se sabe que serán rechazadas.
 */

export interface ValeCobrable {
  id: string;
  saldoPendiente: number | string;
  fechaVale: string;
  estado: string;
}

export interface Reparto<T extends ValeCobrable = ValeCobrable> {
  vale: T;
  aplicado: number;
  quedaPendiente: number;
}

export type ResultadoValidacion =
  | { ok: true }
  | { ok: false; motivo: 'monto-invalido' | 'sin-seleccion' | 'excede-total'; total: number };

const ESTADOS_COBRABLES = ['pendiente', 'parcial'];
/** Tolerancia de redondeo con la que el cliente compara contra el total (la misma del modal). */
const TOLERANCIA = 0.01;

export function saldoDe(vale: ValeCobrable): number {
  return parseFloat(String(vale.saldoPendiente));
}

/** Solo vales pendientes o parciales, del más antiguo al más reciente (RN-11). */
export function valesCobrables<T extends ValeCobrable>(vales: T[]): T[] {
  return vales
    .filter((v) => ESTADOS_COBRABLES.includes(v.estado))
    .sort((a, b) => new Date(a.fechaVale).getTime() - new Date(b.fechaVale).getTime());
}

export function totalSaldos(vales: ValeCobrable[]): number {
  return vales.reduce((suma, v) => suma + saldoDe(v), 0);
}

/** Reparte `monto` entre los vales en el orden recibido, hasta agotarlo (RN-11). */
export function distribuirPago<T extends ValeCobrable>(monto: number, vales: T[]): Reparto<T>[] {
  if (!(monto > 0) || vales.length === 0) return [];
  let restante = monto;
  return vales.map((vale) => {
    const saldo = saldoDe(vale);
    const aplicado = Math.min(restante, saldo);
    restante = Math.max(0, restante - saldo);
    return { vale, aplicado, quedaPendiente: Math.max(0, saldo - aplicado) };
  });
}

/** Validación previa al envío: monto mayor a cero, algún vale y sin exceder el total (RN-04, RN-09). */
export function validarPago(monto: number, seleccionados: ValeCobrable[]): ResultadoValidacion {
  const total = totalSaldos(seleccionados);
  if (!(monto > 0)) return { ok: false, motivo: 'monto-invalido', total };
  if (seleccionados.length === 0) return { ok: false, motivo: 'sin-seleccion', total };
  if (monto > total + TOLERANCIA) return { ok: false, motivo: 'excede-total', total };
  return { ok: true };
}
