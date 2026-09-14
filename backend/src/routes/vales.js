const express = require('express');
const Vale = require('../models/Vale');
const Abono = require('../models/Abono');
const Tienda = require('../models/Tienda');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roleMiddleware');

const router = express.Router();

const isAdmin = role => role === 'superuser' || role === 'administrador';

async function tiendaAcceso(userId, role, tiendaId) {
  if (isAdmin(role)) return true;
  return Tienda.hasAcceso(tiendaId, userId);
}

// ── VALES ────────────────────────────────────────────────────────────────────

// POST /vales — registrar vale al fiado
router.post('/', authMiddleware, requirePermission('vale:crear'), async (req, res) => {
  const { tiendaId, clienteId, descripcion, montoTotal } = req.body;
  if (!tiendaId || !clienteId || !descripcion?.trim() || !montoTotal)
    return ResponseFormatter.badRequest(res, 'tiendaId, clienteId, descripcion y montoTotal son requeridos');
  if (parseFloat(montoTotal) <= 0)
    return ResponseFormatter.badRequest(res, 'El monto debe ser mayor a 0');
  try {
    if (!await tiendaAcceso(req.user.userId, req.user.role, tiendaId))
      return ResponseFormatter.forbidden(res, 'No tienes acceso a esta tienda');
    const vale = await Vale.create(req.body, req.user.userId);
    return ResponseFormatter.success(res, { vale, message: 'Vale registrado exitosamente' }, 201);
  } catch { return ResponseFormatter.internalError(res, 'Error al registrar el vale'); }
});

// POST /vales/pago-integral — distribuye un pago entre varios vales (más viejo primero)
router.post('/pago-integral', authMiddleware, requirePermission('abono:crear'), async (req, res) => {
  const { clienteId, monto, valeIds } = req.body;
  const montoNum = parseFloat(monto);
  if (!clienteId || !montoNum || montoNum <= 0 || !Array.isArray(valeIds) || valeIds.length === 0)
    return ResponseFormatter.badRequest(res, 'clienteId, monto y al menos un valeId son requeridos');

  try {
    // Carga y valida cada vale
    const valesValidos = [];
    for (const vid of valeIds) {
      const v = await Vale.findById(vid);
      if (!v) continue;
      if (v.clienteId !== clienteId) continue;
      if (!['pendiente', 'parcial'].includes(v.estado)) continue;
      if (!await tiendaAcceso(req.user.userId, req.user.role, v.tiendaId)) continue;
      valesValidos.push(v);
    }
    if (valesValidos.length === 0)
      return ResponseFormatter.badRequest(res, 'No hay créditos válidos accesibles');

    // Más viejo primero
    valesValidos.sort((a, b) => new Date(a.fechaVale) - new Date(b.fechaVale));

    let restante = montoNum;
    const abonosCreados = [];
    const valesActualizados = [];

    for (const vale of valesValidos) {
      if (restante <= 0) break;
      const saldo = parseFloat(vale.saldoPendiente);
      if (saldo <= 0) continue;
      const abonoMonto = Math.min(restante, saldo);
      const result = await Abono.create(
        { valeId: vale.id, monto: abonoMonto, notas: 'Pago integral' },
        req.user.userId
      );
      abonosCreados.push(result.abono);
      valesActualizados.push(result.vale);
      restante -= abonoMonto;
    }

    return ResponseFormatter.success(res, {
      abonos: abonosCreados,
      vales: valesActualizados,
      montoAplicado: montoNum - restante,
      montoNoAplicado: restante,
      message: `Pago de $${montoNum.toLocaleString()} aplicado a ${abonosCreados.length} vale(s)`,
    }, 201);
  } catch (err) {
    console.error(err);
    return ResponseFormatter.internalError(res, 'Error al registrar el pago integral');
  }
});

// GET /vales/mis-vales — cliente: sus propios vales
router.get('/mis-vales', authMiddleware, requirePermission('vale:ver-propio'), async (req, res) => {
  try {
    const vales = await Vale.getByCliente(req.user.userId);
    const totalPendiente = vales
      .filter(v => ['pendiente', 'parcial'].includes(v.estado))
      .reduce((s, v) => s + parseFloat(v.saldoPendiente || 0), 0);
    return ResponseFormatter.success(res, { vales, totalPendiente });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener tus vales'); }
});

// GET /vales/usuario/:userId — admin/tendero ve los vales de un cliente específico
// Tendero: solo ve los que pertenecen a sus tiendas.
// Admin/superuser: ve todos.
router.get('/usuario/:userId', authMiddleware, requirePermission('vale:ver-tienda'), async (req, res) => {
  try {
    const { userId, role } = req.user;
    const targetId = req.params.userId;

    let tiendaIds;
    if (!isAdmin(role)) {
      const Tienda = require('../models/Tienda');
      const misTiendas = await Tienda.getTiendasByUsuario(userId);
      tiendaIds = misTiendas.map(t => t.id);
      if (tiendaIds.length === 0)
        return ResponseFormatter.success(res, { vales: [], totalPendiente: 0, enMora: 0 });
    }

    const vales = await Vale.getByClienteVista(targetId, { tiendaIds });
    const totalPendiente = vales
      .filter(v => ['pendiente', 'parcial'].includes(v.estado))
      .reduce((s, v) => s + parseFloat(v.saldoPendiente || 0), 0);
    const enMora = vales.filter(v =>
      ['pendiente', 'parcial'].includes(v.estado) &&
      v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date()
    ).length;
    return ResponseFormatter.success(res, { vales, totalPendiente, enMora });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener vales del usuario'); }
});

// GET /vales/tienda/:tiendaId — cartera de la tienda
router.get('/tienda/:tiendaId', authMiddleware, requirePermission('vale:ver-tienda'), async (req, res) => {
  try {
    if (!await tiendaAcceso(req.user.userId, req.user.role, req.params.tiendaId))
      return ResponseFormatter.forbidden(res, 'No tienes acceso a esta tienda');
    const vales = await Vale.getByTienda(req.params.tiendaId, { estado: req.query.estado });
    const totalPendiente = vales
      .filter(v => ['pendiente', 'parcial'].includes(v.estado))
      .reduce((s, v) => s + parseFloat(v.saldoPendiente || 0), 0);
    const enMora = vales.filter(v =>
      ['pendiente', 'parcial'].includes(v.estado) &&
      v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date()
    ).length;
    return ResponseFormatter.success(res, { vales, totalPendiente, enMora });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener la cartera'); }
});

// GET /vales/:id — detalle de un vale
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const vale = await Vale.findById(req.params.id);
    if (!vale) return ResponseFormatter.notFound(res, 'Vale no encontrado');
    const { userId, role } = req.user;
    const esCliente = vale.clienteId === userId;
    if (!esCliente && !await tiendaAcceso(userId, role, vale.tiendaId))
      return ResponseFormatter.forbidden(res, 'No tienes acceso a este vale');
    const abonos = await Abono.getByVale(req.params.id);
    return ResponseFormatter.success(res, { vale, abonos });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener el vale'); }
});

// PATCH /vales/:id/anular
router.patch('/:id/anular', authMiddleware, requirePermission('vale:anular'), async (req, res) => {
  try {
    const vale = await Vale.findById(req.params.id);
    if (!vale) return ResponseFormatter.notFound(res, 'Vale no encontrado');
    if (vale.estado === 'anulado') return ResponseFormatter.badRequest(res, 'El vale ya está anulado');
    if (!await tiendaAcceso(req.user.userId, req.user.role, vale.tiendaId))
      return ResponseFormatter.forbidden(res, 'No tienes acceso a esta tienda');
    return ResponseFormatter.success(res, { vale: await Vale.anular(req.params.id, req.user.userId), message: 'Vale anulado' });
  } catch { return ResponseFormatter.internalError(res, 'Error al anular el vale'); }
});

// ── ABONOS ───────────────────────────────────────────────────────────────────

// POST /vales/:id/abonos — registrar abono
router.post('/:id/abonos', authMiddleware, requirePermission('abono:crear'), async (req, res) => {
  const monto = parseFloat(req.body.monto);
  if (!monto || monto <= 0) return ResponseFormatter.badRequest(res, 'El monto del abono debe ser mayor a 0');
  try {
    const vale = await Vale.findById(req.params.id);
    if (!vale) return ResponseFormatter.notFound(res, 'Vale no encontrado');
    if (vale.estado === 'anulado') return ResponseFormatter.badRequest(res, 'No se puede abonar a un vale anulado');
    if (vale.estado === 'pagado') return ResponseFormatter.badRequest(res, 'El vale ya está totalmente pagado');
    if (!await tiendaAcceso(req.user.userId, req.user.role, vale.tiendaId))
      return ResponseFormatter.forbidden(res, 'No tienes acceso a esta tienda');
    if (monto > parseFloat(vale.saldoPendiente))
      return ResponseFormatter.badRequest(res, `El abono ($${monto}) supera el saldo pendiente ($${vale.saldoPendiente})`);
    const result = await Abono.create({ valeId: req.params.id, monto, notas: req.body.notas }, req.user.userId);
    return ResponseFormatter.success(res, { ...result, message: 'Abono registrado exitosamente' }, 201);
  } catch { return ResponseFormatter.internalError(res, 'Error al registrar el abono'); }
});

// GET /vales/:id/abonos — historial de abonos
router.get('/:id/abonos', authMiddleware, requirePermission('abono:ver'), async (req, res) => {
  try {
    const vale = await Vale.findById(req.params.id);
    if (!vale) return ResponseFormatter.notFound(res, 'Vale no encontrado');
    const { userId, role } = req.user;
    const esCliente = vale.clienteId === userId;
    if (!esCliente && !await tiendaAcceso(userId, role, vale.tiendaId))
      return ResponseFormatter.forbidden(res, 'No tienes acceso');
    return ResponseFormatter.success(res, { abonos: await Abono.getByVale(req.params.id) });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener abonos'); }
});

// PATCH /vales/:valeId/abonos/:abonoId/anular
router.patch('/:valeId/abonos/:abonoId/anular', authMiddleware, requirePermission('abono:anular'), async (req, res) => {
  try {
    const vale = await Vale.findById(req.params.valeId);
    if (!vale) return ResponseFormatter.notFound(res, 'Vale no encontrado');
    if (!await tiendaAcceso(req.user.userId, req.user.role, vale.tiendaId))
      return ResponseFormatter.forbidden(res, 'No tienes acceso a esta tienda');
    const result = await Abono.anular(req.params.abonoId, req.user.userId);
    if (!result) return ResponseFormatter.notFound(res, 'Abono no encontrado o ya anulado');
    return ResponseFormatter.success(res, { ...result, message: 'Abono anulado' });
  } catch { return ResponseFormatter.internalError(res, 'Error al anular el abono'); }
});

module.exports = router;
