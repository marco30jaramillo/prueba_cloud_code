// Fuente de los iconos de interfaz. Genera marca/iconos/<nombre>.svg y marca/iconos/nodos.json.
// Uso (desde cualquier carpeta):  node marca/herramientas/iconos.js
// Reglas (docs/marca.md, Iconografía): viewBox 24x24, trazo 2, extremos y uniones redondos,
// fill none, stroke currentColor, geometría dentro de 2..22, pocos nodos.
const fs = require('fs');
const path = require('path');

const p = (d) => `<path d="${d}"/>`;
const c = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;

// nombre -> { desc, nodos }
const ICONOS = {
  // ---- Set base (tarea 2) ----
  'cuaderno': { desc: 'Cuaderno abierto: dos hojas con el lomo al centro y renglones', nodos: [
    p('M12 7c-1.5-1.5-4-2-9-2v14c5 0 7.5.5 9 2 1.5-1.5 4-2 9-2V5c-5 0-7.5.5-9 2z'), p('M12 7v14'), p('M6 9.5h3M6 13h3M15 9.5h3M15 13h3')] },
  'panel': { desc: 'Panel: cuadrícula de tres por tres cuadros', nodos: [
    p('M4 4h2v2H4zM11 4h2v2h-2zM18 4h2v2h-2zM4 11h2v2H4zM11 11h2v2h-2zM18 11h2v2h-2zM4 18h2v2H4zM11 18h2v2h-2zM18 18h2v2h-2z')] },
  'vale': { desc: 'Vale: recibo alargado con borde dentado y tres renglones', nodos: [
    p('M6 3h12v18l-3-2-3 2-3-2-3 2z'), p('M9 8h6M9 12h6M9 16h3')] },
  'abono': { desc: 'Abono: billete ancho con una moneda con signo más dentro', nodos: [
    p('M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'), c(12, 12, 4), p('M12 10.4v3.2M10.4 12h3.2')] },
  'saldo': { desc: 'Saldo: mano abierta con una moneda y una flecha hacia arriba', nodos: [
    c(9, 7, 3.5), p('M18 10V3M15 6l3-3 3 3'),
    p('M2 15h4l3.5-1.5 5 .5a1.5 1.5 0 0 1 0 3H11M2 20h5l4 1.5h5l5-4.5a1.5 1.5 0 0 0-2-2L17 17')] },
  'cartera': { desc: 'Cartera: billetera de la que sale un billete', nodos: [
    p('M3 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'), p('M21 12h-4a2 2 0 0 0 0 4h4'),
    p('M7 8V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3')] },
  'tienda': { desc: 'Tienda: toldo, muros y puerta', nodos: [
    p('M3 9l2-5h14l2 5z'), p('M5 9v12h14V9'), p('M10 21v-6h4v6')] },
  'cliente': { desc: 'Cliente: persona (cabeza y hombros)', nodos: [
    c(12, 8, 4), p('M4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1')] },
  'mora': { desc: 'Mora: reloj (vale vencido)', nodos: [c(12, 12, 9), p('M12 7v5l3.5 2')] },
  'anular': { desc: 'Anular: círculo tachado', nodos: [c(12, 12, 9), p('M5.6 5.6l12.8 12.8')] },
  'cerrar-sesion': { desc: 'Cerrar sesión: salir por la puerta', nodos: [
    p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), p('M16 17l5-5-5-5M21 12H9')] },
  'cerrar-sesion-todos': { desc: 'Cerrar sesión en todos los dispositivos: salir con doble flecha', nodos: [
    p('M8 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3'), p('M11 8l4 4-4 4M16 8l4 4-4 4')] },

  // ---- Reemplazos de emojis (tarea 3) ----
  'ver': { desc: 'Ver (mostrar contraseña)', nodos: [p('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z'), c(12, 12, 3)] },
  'ocultar': { desc: 'Ocultar (ocultar contraseña)', nodos: [p('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z'), p('M4 4l16 16')] },
  'ubicacion': { desc: 'Ubicación de la tienda', nodos: [p('M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z'), c(12, 10, 2.5)] },
  'calendario': { desc: 'Fecha de vencimiento', nodos: [
    p('M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'), p('M3 10h18'), p('M8 3v4M16 3v4')] },
  'nota': { desc: 'Notas del vale', nodos: [
    p('M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z'), p('M14 3v5h5'), p('M9 13h6M9 17h4')] },
  'alerta': { desc: 'Alerta o advertencia', nodos: [p('M12 4L21 20H3z'), p('M12 10v4M12 17h.01')] },
  'exito': { desc: 'Éxito o confirmación', nodos: [c(12, 12, 9), p('M8 12.5l3 3 5-6')] },
  'error': { desc: 'Error', nodos: [c(12, 12, 9), p('M9 9l6 6M15 9l-6 6')] },
  'informacion': { desc: 'Información', nodos: [c(12, 12, 9), p('M12 11v5M12 8h.01')] },
  'idioma': { desc: 'Idioma o sitio web', nodos: [
    c(12, 12, 9), p('M3 12h18'), p('M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3z')] },
  'agregar': { desc: 'Agregar, crear', nodos: [p('M12 5v14M5 12h14')] },
  'cerrar': { desc: 'Cerrar, limpiar', nodos: [p('M6 6l12 12M18 6L6 18')] },
  'buscar': { desc: 'Buscar', nodos: [c(10.5, 10.5, 7), p('M15.5 15.5L21 21')] },
  'candado': { desc: 'Contraseña, acceso protegido', nodos: [
    p('M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z'), p('M8 11V7a4 4 0 0 1 8 0v4')] },
  'editar': { desc: 'Editar', nodos: [p('M15 5l4 4L8.5 19.5 4 20l.5-4.5z')] },
  'copiar': { desc: 'Copiar', nodos: [
    p('M10 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z'),
    p('M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3')] },
  'actualizar': { desc: 'Actualizar, recargar', nodos: [p('M19 12a7 7 0 1 1-2.05-4.95'), p('M17 3v4h-4')] },
  'correo': { desc: 'Correo', nodos: [
    p('M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'), p('M3 8l9 6 9-6')] },
  'equipo': { desc: 'Equipo: una persona al centro y otra más pequeña a cada lado', nodos: [
    c(12, 8, 3), c(4, 11, 2), c(20, 11, 2),
    p('M9 21v-3a3 3 0 0 1 3-3 3 3 0 0 1 3 3v3M2 21v-1a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1M18 21v-1a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1')] },
  'ajustes': { desc: 'Ajustes', nodos: [p('M4 8h3M13 8h7M4 16h8M18 16h2'), c(10, 8, 3), c(15, 16, 3)] },
  'escudo': { desc: 'Roles y permisos', nodos: [p('M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z')] },
  'grafica': { desc: 'Indicadores, gráfica de barras', nodos: [p('M5 20v-8M12 20V5M19 20v-5')] },
  'volver': { desc: 'Volver', nodos: [p('M19 12H5M11 6l-6 6 6 6')] },
  'siguiente': { desc: 'Siguiente, ir', nodos: [p('M5 12h14M13 6l6 6-6 6')] },
  'check': { desc: 'Marca de verificación', nodos: [p('M5 12.5l4.5 4.5L19 7')] },
  'celular': { desc: 'App móvil', nodos: [
    p('M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'), p('M11 18h2')] },
  'nube': { desc: 'Nube, disponible en cualquier lugar', nodos: [
    p('M7 19a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 9.9 4.6 4.6 0 0 1 17 19z')] },
  'subir': { desc: 'Subir foto', nodos: [p('M12 15V4M7 8.5l5-5 5 5'), p('M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3')] },
};

const ATRIBUTOS = 'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const svgDe = (nodos) => `<svg ${ATRIBUTOS}>${nodos.join('')}</svg>\n`;

function generar(dir) {
  const salida = {};
  for (const [nombre, def] of Object.entries(ICONOS)) {
    fs.writeFileSync(path.join(dir, nombre + '.svg'), svgDe(def.nodos));
    salida[nombre] = { descripcion: def.desc, nodos: def.nodos.join('') };
  }
  fs.writeFileSync(path.join(dir, 'nodos.json'), JSON.stringify(salida, null, 2) + '\n');
  return salida;
}

module.exports = { ICONOS, svgDe, generar };

if (require.main === module) {
  const dir = path.join(__dirname, '..', 'iconos');
  fs.mkdirSync(dir, { recursive: true });
  const r = generar(dir);
  console.log(Object.keys(r).length + ' iconos escritos en ' + dir);
}
