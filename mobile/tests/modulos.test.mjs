// Qué ve cada rol en la app según los módulos de sus permisos (lib/modulos.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accesosDeModulos, accesosPorRol, RUTA_MODULO } from '../lib/modulos.ts';

const m = (href, level = 'read') => ({ href, level });

const PERFIL = '/dashboard/profile';

test('cliente con Mis vales: solo la pestaña Vales con sus propios vales', () => {
  assert.deepEqual(accesosDeModulos([m(PERFIL), m(RUTA_MODULO.misVales)]), {
    vales: true, valesDeTienda: false, nuevoVale: false, cartera: false, cobrarEnCartera: false, equipo: false,
  });
});

test('vendedor con Nueva venta: registra vales y ve los de la tienda, sin cartera ni equipo', () => {
  assert.deepEqual(accesosDeModulos([m(PERFIL), m(RUTA_MODULO.nuevoVale, 'write')]), {
    vales: true, valesDeTienda: true, nuevoVale: true, cartera: false, cobrarEnCartera: false, equipo: false,
  });
});

test('al extender el permiso de Cartera a un rol, la app muestra la pestaña Cartera', () => {
  const a = accesosDeModulos([m(PERFIL), m(RUTA_MODULO.nuevoVale, 'write'), m(RUTA_MODULO.cartera, 'read')]);
  assert.equal(a.cartera, true);
  assert.equal(a.equipo, false);
});

test('Cartera en solo lectura muestra la cartera pero no permite cobrar; escritura o total, sí', () => {
  assert.equal(accesosDeModulos([m(RUTA_MODULO.cartera, 'read')]).cobrarEnCartera, false);
  assert.equal(accesosDeModulos([m(RUTA_MODULO.cartera, 'write')]).cobrarEnCartera, true);
  assert.equal(accesosDeModulos([m(RUTA_MODULO.cartera, 'full')]).cobrarEnCartera, true);
  assert.equal(accesosDeModulos([{ href: RUTA_MODULO.cartera }]).cobrarEnCartera, false, 'sin nivel = lectura');
});

test('el módulo Mi tienda habilita la pestaña Equipo', () => {
  assert.equal(accesosDeModulos([m(RUTA_MODULO.tienda)]).equipo, true);
});

test('sin módulos no se muestra nada salvo Perfil e Inicio (que no dependen de módulos)', () => {
  assert.deepEqual(accesosDeModulos([]), {
    vales: false, valesDeTienda: false, nuevoVale: false, cartera: false, cobrarEnCartera: false, equipo: false,
  });
});

test('mientras cargan, se usa lo que antes decidía el rol', () => {
  assert.equal(accesosPorRol('tendero').cartera, true);
  assert.equal(accesosPorRol('vendedor').cartera, false);
  assert.equal(accesosPorRol('cliente').nuevoVale, false);
  assert.equal(accesosPorRol('tendero').cobrarEnCartera, false, 'cobrar espera a conocer el nivel');
});
