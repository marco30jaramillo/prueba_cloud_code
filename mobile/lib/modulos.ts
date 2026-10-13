/**
 * Qué ve cada persona en la app sale de los módulos de su rol (GET /modules), igual que el menú
 * de la web: al cambiar los permisos de un rol en «Roles y permisos», la app los sigue sin
 * publicar otra versión. Los módulos se identifican por su ruta web (dbo.modules.href).
 */

export const RUTA_MODULO = {
  misVales: '/dashboard/mis-vales',
  nuevoVale: '/dashboard/vale-nuevo',
  cartera: '/dashboard/cartera',
  tienda: '/dashboard/tienda',
} as const;

/** Un módulo del rol, como lo devuelve GET /modules. Sin nivel cuenta como lectura. */
export interface ModuloRol {
  href: string;
  level?: 'read' | 'write' | 'full' | string;
}

export interface Accesos {
  /** Pestaña Vales. */
  vales: boolean;
  /** La pestaña Vales lista los de la tienda (si no, los propios del cliente). */
  valesDeTienda: boolean;
  /** Botón y pantalla «Nuevo vale». */
  nuevoVale: boolean;
  /** Pestaña Cartera. */
  cartera: boolean;
  /** Cobrar desde Cartera (pagar seleccionados / pago integral): Cartera en escritura o total. */
  cobrarEnCartera: boolean;
  /** Pestaña Equipo (módulo «Mi tienda»). */
  equipo: boolean;
}

export function accesosDeModulos(modulos: ModuloRol[]): Accesos {
  const nivel = (r: string) => modulos.find((m) => m.href === r)?.level ?? (modulos.some((m) => m.href === r) ? 'read' : null);
  const tiene = (r: string) => nivel(r) !== null;
  const cartera = tiene(RUTA_MODULO.cartera);
  const nivelCartera = nivel(RUTA_MODULO.cartera);
  const nuevoVale = tiene(RUTA_MODULO.nuevoVale);
  return {
    vales: tiene(RUTA_MODULO.misVales) || cartera || nuevoVale,
    valesDeTienda: cartera || nuevoVale,
    nuevoVale,
    cartera,
    cobrarEnCartera: nivelCartera === 'write' || nivelCartera === 'full',
    equipo: tiene(RUTA_MODULO.tienda),
  };
}

/**
 * Mientras los módulos no han cargado (o sin conexión), lo que la app mostraba por rol, para no
 * dejar la pantalla vacía. En cuanto llega la respuesta, mandan los permisos.
 */
export function accesosPorRol(role?: string): Accesos {
  const personal = ['superuser', 'administrador', 'tendero'].includes(role ?? '');
  const vendedor = role === 'vendedor';
  return {
    vales: true,
    valesDeTienda: personal || vendedor,
    nuevoVale: personal || vendedor,
    cartera: personal,
    // Cobrar depende del nivel de Cartera: no se ofrece hasta conocerlo (el servidor lo exige igual).
    cobrarEnCartera: false,
    equipo: personal,
  };
}
