/**
 * Regla de permisos (KAN-75): lo que un rol puede hacer sale de sus módulos y del nivel de cada
 * uno (lectura = consultar, escritura = operar, total = anular o administrar). Como permiso
 * directo del rol solo se admiten los de sesión: así quitar un módulo siempre quita lo que daba.
 */

/** Permisos que un rol puede tener sin módulo (los de la sesión). */
const PERMISOS_SESION = Object.freeze([
  'auth:login',
  'auth:logout',
  'auth:validate',
  'auth:forgot-password',
  'auth:reset-password',
  'auth:register',
]);

/** Acceso total del sistema: solo el rol superuser lo tiene y nadie puede concederlo. */
const ACCESO_TOTAL = 'system:full-access';

/** Roles que el propietario de una tienda puede sumar a su equipo. */
const ROLES_EQUIPO = Object.freeze(['vendedor', 'encargado']);

module.exports = { PERMISOS_SESION, ACCESO_TOTAL, ROLES_EQUIPO };
