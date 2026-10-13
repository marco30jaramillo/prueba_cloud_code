/**
 * Fixture de las pruebas de crédito: un «mundo» propio por archivo de pruebas.
 *
 *   superusuario (lo crea el corredor) → 2 tiendas (A y B)
 *   por tienda: un tendero y un vendedor; en la tienda A además un encargado
 *   dos clientes activos (X, Y) y un cliente pendiente de activación
 *
 * Todo se crea por la API real (tiendas, usuarios, asignaciones). Lo único que se hace por
 * SQL es marcar las cuentas como activadas: el enlace de activación llega por correo y no
 * es el objeto de estas pruebas (RN-50).
 *
 * Sin credenciales en el repositorio: las contraseñas se generan en cada corrida, viven solo
 * en memoria y no se imprimen. Los datos son sintéticos (dominio reservado `.example`).
 */

const crypto = require('node:crypto');
const { api, iniciarSesion, esperarEstado } = require('./api');
const bd = require('./baseDatos');
const { afirmarConciliado } = require('./conciliacion');

const mayusculas = (id) => String(id).toUpperCase();
const aleatorio = (n) => crypto.randomBytes(n).toString('hex');
const contrasena = () => `Aa1!${crypto.randomBytes(18).toString('base64url')}`;
const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Crea el mundo de pruebas de un archivo. Devuelve utilidades para operar y conciliar.
 */
async function crearMundo() {
  const sufijo = aleatorio(4);
  const suEmail = process.env.MV_TEST_SU_EMAIL;
  const suPassword = process.env.MV_TEST_SU_PASSWORD;
  if (!suEmail || !suPassword) {
    throw new Error('Estas pruebas no se ejecutan solas: usa `npm run test:db` en backend/.');
  }
  const tokenSu = await iniciarSesion(suEmail, suPassword);
  const tokens = new Map();

  async function crearTienda(etiqueta) {
    const r = await api.post('/tiendas', { nombre: `Tienda ${etiqueta} ${sufijo}`, ciudad: 'Ciudad de pruebas' }, tokenSu);
    esperarEstado(r, 201, 'crear tienda');
    return { id: mayusculas(r.body.tienda.id), nombre: r.body.tienda.nombre };
  }

  async function crearUsuario(rol, etiqueta) {
    const password = contrasena();
    const email = `${rol}.${etiqueta}.${sufijo}@mvtest.example`.toLowerCase();
    const r = await api.post('/auth/create-user', { email, password, name: `${rol} ${etiqueta} (prueba)`, role: rol }, tokenSu);
    esperarEstado(r, 201, `crear ${rol}`);
    return { id: mayusculas(r.body.user.id), idOriginal: r.body.user.id, email, password, rol };
  }

  async function asignar(tienda, usuario, esPropietario) {
    const r = await api.post(`/tiendas/${tienda.id}/usuarios`, { userId: usuario.id, esPropietario }, tokenSu);
    esperarEstado(r, 201, `asignar ${usuario.rol} a la tienda`);
  }

  const tiendaA = await crearTienda('A');
  const tiendaB = await crearTienda('B');
  const tenderoA = await crearUsuario('tendero', 'a');
  const vendedorA = await crearUsuario('vendedor', 'a');
  const encargadoA = await crearUsuario('encargado', 'a');
  const tenderoB = await crearUsuario('tendero', 'b');
  const vendedorB = await crearUsuario('vendedor', 'b');
  const clienteX = await crearUsuario('cliente', 'x');
  const clienteY = await crearUsuario('cliente', 'y');
  const clientePendiente = await crearUsuario('cliente', 'pendiente');

  await asignar(tiendaA, tenderoA, true);
  await asignar(tiendaA, vendedorA, false);
  await asignar(tiendaA, encargadoA, false);
  await asignar(tiendaB, tenderoB, true);
  await asignar(tiendaB, vendedorB, false);

  // Activa las cuentas del mundo, salvo la del cliente pendiente.
  const pool = await bd.abrir();
  for (const usuario of [tenderoA, vendedorA, encargadoA, tenderoB, vendedorB, clienteX, clienteY]) {
    const r = await pool.request()
      .input('id', bd.sql.UniqueIdentifier, usuario.id)
      .query(`UPDATE dbo.users SET activatedAt = SYSUTCDATETIME(), mustChangePassword = 0,
                     activationTokenHash = NULL, activationExpiresAt = NULL
              WHERE id = @id AND activatedAt IS NULL`);
    if (r.rowsAffected[0] !== 1) throw new Error(`no se pudo activar la cuenta de fixture (${usuario.rol})`);
  }

  async function token(usuario) {
    if (!tokens.has(usuario.id)) tokens.set(usuario.id, await iniciarSesion(usuario.email, usuario.password));
    return tokens.get(usuario.id);
  }

  /** Registra un vale como `quien` y devuelve su id (en mayúsculas, como lo lee la base). */
  async function crearVale({ tienda, cliente, monto, quien = null, descripcion = 'Compra de prueba' }) {
    const actor = quien || tendero(tienda);
    const r = await api.post('/vales', {
      tiendaId: tienda.id, clienteId: cliente.id, descripcion, montoTotal: monto,
    }, await token(actor));
    esperarEstado(r, 201, 'registrar vale');
    // Los vales de una misma prueba deben quedar en orden estable por fecha (RN-11).
    await pausa(15);
    return { id: mayusculas(r.body.vale.id), tiendaId: tienda.id, montoTotal: monto };
  }

  function tendero(tienda) {
    return tienda.id === tiendaA.id ? tenderoA : tenderoB;
  }
  function vendedor(tienda) {
    return tienda.id === tiendaA.id ? vendedorA : vendedorB;
  }

  async function abonar(vale, monto, quien) {
    return api.post(`/vales/${vale.id}/abonos`, { monto }, await token(quien));
  }

  /** Lee el vale con el superusuario. */
  async function leerVale(vale) {
    const r = await api.get(`/vales/${vale.id}`, tokenSu);
    esperarEstado(r, 200, 'leer vale');
    return { ...r.body.vale, abonos: r.body.abonos };
  }

  /**
   * Concilia saldo contra abonos y cartera contra saldos de las tiendas del mundo, contra la
   * base y contra lo que responde la API. Lanza si hay una diferencia.
   */
  async function conciliar(contexto = 'conciliación') {
    const tiendas = [tiendaA, tiendaB];
    const base = await bd.leerValesYAbonos(tiendas.map((t) => t.id));
    const saldosPorVale = {};
    const carteraPorTienda = {};
    const valesPorTienda = {};
    for (const tienda of tiendas) {
      const r = await api.get(`/vales/tienda/${tienda.id}`, tokenSu);
      esperarEstado(r, 200, 'listar cartera de la tienda');
      carteraPorTienda[tienda.id] = r.body.totalPendiente;
      valesPorTienda[tienda.id] = r.body.vales.map((v) => v.id);
      for (const v of r.body.vales) saldosPorVale[v.id] = v.saldoPendiente;
    }
    afirmarConciliado(base, { saldosPorVale, carteraPorTienda, valesPorTienda }, contexto);
  }

  return {
    sufijo,
    tokenSu,
    tiendaA, tiendaB,
    tenderoA, vendedorA, encargadoA, tenderoB, vendedorB,
    clienteX, clienteY, clientePendiente,
    token, crearVale, abonar, leerVale, conciliar, tendero, vendedor,
    mayusculas,
  };
}

module.exports = { crearMundo, mayusculas };
