/**
 * Lógica pura del campo de monto en pesos enteros (sin React ni navegador).
 * La usa `components/MontoInput.tsx`; las pruebas de `tests/monto.test.mjs` la cubren.
 */

/** Conserva solo los dígitos: lo que el usuario escribe nunca entrega signo ni decimales. */
export function soloDigitos(texto: string): string {
  return texto.replace(/[^\d]/g, '');
}

/** "25000" → "$ 25.000" (es-CO). Un valor vacío se muestra vacío. */
export function formatearMonto(valor: string): string {
  return valor ? '$ ' + parseInt(valor, 10).toLocaleString('es-CO') : '';
}
