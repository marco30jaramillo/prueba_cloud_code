// Qué ve cada rol en la app según los módulos de sus permisos (lib/modulos.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accesosDeModulos, accesosPorRol, RUTA_MODULO } from '../lib/modulos.ts';

const PERFIL = '/dashboard/profile';

test('cliente con Mis vales: solo la pestaña Vales con sus propios vales', () => {
  assert.deepEqual(accesosDeModulos([PERFIL, RUTA_MODULO.misVales]), {
    vales: true, valesDeTienda: false, nuevoVale: false, cartera: false, equipo: false,
  });
});

test('vendedor con Nueva venta: registra vales y ve los de la tienda, sin cartera ni equipo', () => {
  assert.deepEqual(accesosDeModulos([PERFIL, RUTA_MODULO.nuevoVale]), {
    vales: true, valesDeTienda: true, nuevoVale: true, cartera: false, equipo: false,
  });
});

test('al extender el permiso de Cartera a un rol, la app muestra la pestaña Cartera', () => {
  const a = accesosDeModulos([PERFIL, RUTA_MODULO.nuevoVale, RUTA_MODULO.cartera]);
  assert.equal(a.cartera, true);
  assert.equal(a.equipo, false);
});

test('el módulo Mi tienda habilita la pestaña Equipo', () => {
  assert.equal(accesosDeModulos([RUTA_MODULO.tienda]).equipo, true);
});

test('sin módulos no se muestra nada salvo Perfil e Inicio (que no dependen de módulos)', () => {
  assert.deepEqual(accesosDeModulos([]), {
    vales: false, valesDeTienda: false, nuevoVale: false, cartera: false, equipo: false,
  });
});

test('mientras cargan, se usa lo que antes decidía el rol', () => {
  assert.equal(accesosPorRol('tendero').cartera, true);
  assert.equal(accesosPorRol('vendedor').cartera, false);
  assert.equal(accesosPorRol('cliente').nuevoVale, false);
});
