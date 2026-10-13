/**
 * Conciliación de saldos y cartera (RN-04). Función pura: sin base de datos, sin red.
 *
 * Recalcula, a partir de las filas de la base (vales y abonos), lo que la aplicación debe
 * mostrar y lo compara con lo que la base y la API dicen:
 *
 *   saldo esperado de un vale  = monto − Σ abonos no anulados      (0 ≤ saldo ≤ monto)
 *   cartera esperada de tienda = Σ saldos esperados de vales pendientes o parciales
 *
 * Devuelve la lista de diferencias (vacía si todo cuadra). Los mensajes llevan identificadores
 * y montos, nunca datos de personas ni tokens. `afirmarConciliado` lanza si hay diferencias:
 * una diferencia hace fallar la prueba y, con ella, la corrida.
 *
 * Los montos se comparan en centavos enteros para no depender de la aritmética de coma
 * flotante.
 */

const ESTADOS_EN_CARTERA = ['pendiente', 'parcial'];

const centavos = (valor) => Math.round(Number(valor) * 100);
const dinero = (c) => (c / 100).toFixed(2);
const clave = (id) => String(id).toUpperCase();

/**
 * @param {{ vales: Array<{id:string,tiendaId:string,montoTotal:number|string,saldoPendiente:number|string,estado:string}>,
 *           abonos: Array<{valeId:string,monto:number|string,anulado:boolean|number}> }} base
 * @param {{ saldosPorVale?: Record<string, number|string>,
 *           carteraPorTienda?: Record<string, number|string>,
 *           valesPorTienda?: Record<string, string[]> }} [api] lo que respondió la API
 * @returns {string[]} diferencias encontradas
 */
function conciliar(base, api = {}) {
  const diferencias = [];
  const abonado = new Map();
  for (const abono of base.abonos) {
    if (abono.anulado === true || abono.anulado === 1 || abono.anulado === '1' || abono.anulado === 'true') continue;
    const id = clave(abono.valeId);
    abonado.set(id, (abonado.get(id) || 0) + centavos(abono.monto));
  }

  const saldosApi = api.saldosPorVale || {};
  const saldosApiPorClave = new Map(Object.entries(saldosApi).map(([id, saldo]) => [clave(id), saldo]));
  const carteraBase = new Map();
  const carteraEsperada = new Map();

  for (const vale of base.vales) {
    const id = clave(vale.id);
    const tienda = clave(vale.tiendaId);
    const monto = centavos(vale.montoTotal);
    const esperado = monto - (abonado.get(id) || 0);
    const saldoBase = centavos(vale.saldoPendiente);

    if (esperado < 0 || esperado > monto) {
      diferencias.push(`vale ${id}: saldo esperado ${dinero(esperado)} fuera de [0, ${dinero(monto)}] (RN-04)`);
    }
    if (saldoBase !== esperado) {
      diferencias.push(`vale ${id}: saldo en base ${dinero(saldoBase)} ≠ monto − abonos ${dinero(esperado)}`);
    }
    if (saldosApiPorClave.has(id) && centavos(saldosApiPorClave.get(id)) !== esperado) {
      diferencias.push(`vale ${id}: saldo en la API ${dinero(centavos(saldosApiPorClave.get(id)))} ≠ monto − abonos ${dinero(esperado)}`);
    }

    // Estado coherente con el saldo (RN-05); un vale anulado conserva su estado.
    if (vale.estado !== 'anulado') {
      const estadoEsperado = esperado === 0 ? 'pagado' : esperado < monto ? 'parcial' : 'pendiente';
      if (vale.estado !== estadoEsperado) {
        diferencias.push(`vale ${id}: estado "${vale.estado}" ≠ "${estadoEsperado}" que corresponde al saldo (RN-05)`);
      }
    }

    if (ESTADOS_EN_CARTERA.includes(vale.estado)) {
      carteraBase.set(tienda, (carteraBase.get(tienda) || 0) + saldoBase);
      carteraEsperada.set(tienda, (carteraEsperada.get(tienda) || 0) + esperado);
    } else if (!carteraEsperada.has(tienda)) {
      carteraEsperada.set(tienda, 0);
      carteraBase.set(tienda, 0);
    }
  }

  for (const [tienda, total] of carteraEsperada) {
    if ((carteraBase.get(tienda) || 0) !== total) {
      diferencias.push(`tienda ${tienda}: cartera en base ${dinero(carteraBase.get(tienda) || 0)} ≠ Σ saldos esperados ${dinero(total)}`);
    }
  }
  for (const [tienda, totalApi] of Object.entries(api.carteraPorTienda || {})) {
    const esperado = carteraEsperada.get(clave(tienda)) || 0;
    if (centavos(totalApi) !== esperado) {
      diferencias.push(`tienda ${clave(tienda)}: cartera en la API ${dinero(centavos(totalApi))} ≠ Σ saldos esperados ${dinero(esperado)}`);
    }
  }

  // La API no debe ocultar ni inventar vales de las tiendas que lista.
  for (const [tienda, ids] of Object.entries(api.valesPorTienda || {})) {
    const enBase = new Set(base.vales.filter((v) => clave(v.tiendaId) === clave(tienda)).map((v) => clave(v.id)));
    const enApi = new Set(ids.map(clave));
    for (const id of enBase) if (!enApi.has(id)) diferencias.push(`vale ${id}: está en la base y la API no lo lista en su tienda`);
    for (const id of enApi) if (!enBase.has(id)) diferencias.push(`vale ${id}: la API lo lista pero no existe en la base`);
  }

  return diferencias;
}

/** Lanza un error con la lista de diferencias, sin cuerpos de respuesta ni tokens. */
function afirmarConciliado(base, api, contexto = 'conciliación') {
  const diferencias = conciliar(base, api);
  if (diferencias.length) {
    const error = new Error(`${contexto}: ${diferencias.length} diferencia(s). ${diferencias.slice(0, 5).join(' | ')}`);
    error.diferencias = diferencias;
    throw error;
  }
}

module.exports = { conciliar, afirmarConciliado, centavos };
