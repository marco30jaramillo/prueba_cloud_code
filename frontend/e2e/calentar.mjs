/**
 * Calienta las rutas que recorre la prueba: `next dev` compila cada una la primera vez que se
 * pide, y esa compilación (de 10 a 95 s en un equipo con OneDrive) no debe descontarse del
 * tiempo de las pruebas. Corre una vez, después de que el servidor responde.
 */
const BASE = 'http://127.0.0.1:3100';
const RUTAS = ['/login', '/dashboard', '/dashboard/vale-nuevo', '/dashboard/cartera'];
const POR_RUTA_MS = 150_000;

export default async function calentar() {
  for (const ruta of RUTAS) {
    const inicio = Date.now();
    try {
      const r = await fetch(`${BASE}${ruta}`, { signal: AbortSignal.timeout(POR_RUTA_MS), redirect: 'manual' });
      await r.arrayBuffer();
      console.log(`[calentar] ${ruta} -> ${r.status} (${Math.round((Date.now() - inicio) / 1000)} s)`);
    } catch (error) {
      // No es motivo para fallar: la prueba misma dirá si la ruta no responde.
      console.log(`[calentar] ${ruta} -> sin respuesta (${error && error.name ? error.name : 'error'})`);
    }
  }
}
