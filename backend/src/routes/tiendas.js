const express = require('express');
const Tienda = require('../models/Tienda');
const User = require('../models/User');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roleMiddleware');

const router = express.Router();

const isAdmin = role => role === 'superuser' || role === 'administrador';

async function checkAcceso(req, res, tiendaId) {
  if (isAdmin(req.user.role)) return true;
  const ok = await Tienda.hasAcceso(tiendaId, req.user.userId);
  if (!ok) ResponseFormatter.forbidden(res, 'No tienes acceso a esta tienda');
  return ok;
}

// GET /tiendas — todas (admin/superuser)
router.get('/', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  try {
    return ResponseFormatter.success(res, { tiendas: await Tienda.getAll() });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener tiendas'); }
});

// GET /tiendas/mis-tiendas — tiendas del usuario autenticado
router.get('/mis-tiendas', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  try {
    return ResponseFormatter.success(res, { tiendas: await Tienda.getTiendasByUsuario(req.user.userId) });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener tus tiendas'); }
});

// POST /tiendas — crear tienda
router.post('/', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  if (!req.body.nombre?.trim())
    return ResponseFormatter.badRequest(res, 'El nombre de la tienda es requerido');
  try {
    const tienda = await Tienda.create(req.body, req.user.userId);
    return ResponseFormatter.success(res, { tienda, message: 'Tienda creada exitosamente' }, 201);
  } catch { return ResponseFormatter.internalError(res, 'Error al crear la tienda'); }
});

// GET /tiendas/:id
router.get('/:id', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  try {
    const tienda = await Tienda.findById(req.params.id);
    if (!tienda) return ResponseFormatter.notFound(res, 'Tienda no encontrada');
    if (!await checkAcceso(req, res, req.params.id)) return;
    return ResponseFormatter.success(res, { tienda });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener la tienda'); }
});

// PATCH /tiendas/:id
router.patch('/:id', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  try {
    const tienda = await Tienda.update(req.params.id, req.body);
    if (!tienda) return ResponseFormatter.notFound(res, 'Tienda no encontrada');
    return ResponseFormatter.success(res, { tienda, message: 'Tienda actualizada' });
  } catch { return ResponseFormatter.internalError(res, 'Error al actualizar la tienda'); }
});

// PATCH /tiendas/:id/status
router.patch('/:id/status', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  try {
    const tienda = await Tienda.toggleActive(req.params.id);
    if (!tienda) return ResponseFormatter.notFound(res, 'Tienda no encontrada');
    return ResponseFormatter.success(res, { tienda });
  } catch { return ResponseFormatter.internalError(res, 'Error al cambiar estado'); }
});

// GET /tiendas/:id/usuarios
router.get('/:id/usuarios', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  try {
    if (!await checkAcceso(req, res, req.params.id)) return;
    return ResponseFormatter.success(res, { usuarios: await Tienda.getUsuariosByTienda(req.params.id) });
  } catch { return ResponseFormatter.internalError(res, 'Error al obtener usuarios'); }
});

// POST /tiendas/:id/usuarios — asignar tendero/vendedor
router.post('/:id/usuarios', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  const { userId, esPropietario } = req.body;
  if (!userId) return ResponseFormatter.badRequest(res, 'userId es requerido');
  try {
    const user = await User.findById(userId);
    if (!user) return ResponseFormatter.notFound(res, 'Usuario no encontrado');
    if (!['tendero', 'vendedor'].includes(user.role))
      return ResponseFormatter.badRequest(res, 'Solo tenderos y vendedores pueden asignarse a una tienda');
    const entry = await Tienda.addUsuario(req.params.id, userId, esPropietario, req.user.userId);
    return ResponseFormatter.success(res, { entry, message: 'Usuario asignado a la tienda' }, 201);
  } catch (err) {
    if (err.message?.includes('UQ_') || err.number === 2627)
      return ResponseFormatter.conflict(res, 'El usuario ya está asignado a esta tienda');
    return ResponseFormatter.internalError(res, 'Error al asignar usuario');
  }
});

// DELETE /tiendas/:id/usuarios/:userId
router.delete('/:id/usuarios/:userId', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  try {
    await Tienda.removeUsuario(req.params.id, req.params.userId);
    return ResponseFormatter.success(res, { message: 'Usuario removido de la tienda' });
  } catch { return ResponseFormatter.internalError(res, 'Error al remover usuario'); }
});

module.exports = router;
