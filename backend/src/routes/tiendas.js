const crypto = require('crypto');
const express = require('express');
const Tienda = require('../models/Tienda');
const User = require('../models/User');
const accountMail = require('../mail/accountMail');
const auditMiddleware = require('../middleware/auditMiddleware');
const DataNormalizer = require('../utils/dataNormalizer');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roleMiddleware');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const router = express.Router();

const isAdmin = role => role === 'superuser' || role === 'administrador';

async function checkAcceso(req, res, tiendaId) {
  if (isAdmin(req.user.role)) return true;
  const ok = await Tienda.hasAcceso(tiendaId, req.user.userId);
  if (!ok) ResponseFormatter.forbidden(res, 'No tienes acceso a esta tienda');
  return ok;
}

// GET /tiendas — todas (admin/superuser), con resumen de equipo
router.get('/', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  try {
    return ResponseFormatter.success(res, { tiendas: await Tienda.getAllWithSummary() });
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
  } catch { return ResponseFormatter.internalError(res, 'No pudimos cargar a las personas'); }
});

// POST /tiendas/:id/usuarios — asignar tendero/vendedor
router.post('/:id/usuarios', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  const { userId, esPropietario } = req.body;
  if (!userId) return ResponseFormatter.badRequest(res, 'Falta elegir a la persona');
  try {
    const user = await User.findById(userId);
    if (!user) return ResponseFormatter.notFound(res, 'No encontramos a esa persona');
    if (!['tendero', 'vendedor'].includes(user.role))
      return ResponseFormatter.badRequest(res, 'Solo tenderos y vendedores pueden asignarse a una tienda');
    const entry = await Tienda.addUsuario(req.params.id, userId, esPropietario, req.user.userId);
    return ResponseFormatter.success(res, { entry, message: 'Persona asignada a la tienda' }, 201);
  } catch (err) {
    if (err.message?.includes('UQ_') || err.number === 2627)
      return ResponseFormatter.conflict(res, 'Esa persona ya está en esta tienda');
    return ResponseFormatter.internalError(res, 'No pudimos asignar a la persona');
  }
});

// ── EQUIPO DE VENDEDORES ────────────────────────────────────────────────────
// El propietario de la tienda (tendero) arma su equipo sin depender del administrador:
// suma vendedores ya registrados por su correo exacto o crea la cuenta de uno nuevo.
// Solo vendedores, solo en su tienda; administrador y superusuario, en cualquiera.

async function puedeGestionarEquipo(req, res, tiendaId) {
  if (isAdmin(req.user.role)) {
    if (await Tienda.findById(tiendaId)) return true;
    ResponseFormatter.notFound(res, 'Tienda no encontrada');
    return false;
  }
  if (req.user.role === 'tendero' && await Tienda.esPropietario(tiendaId, req.user.userId)) return true;
  ResponseFormatter.forbidden(res, 'Solo el propietario de la tienda puede gestionar su equipo');
  return false;
}

const esDuplicado = err => err?.message?.includes('UQ_') || err?.number === 2627;
const resumenUsuario = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// POST /tiendas/:id/vendedores — agrega un vendedor ya registrado, por su correo exacto
router.post('/:id/vendedores', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  const email = typeof req.body?.email === 'string' ? DataNormalizer.normalizeEmail(req.body.email) : '';
  if (!EMAIL_REGEX.test(email)) return ResponseFormatter.badRequest(res, 'Escribe el correo completo del vendedor');
  try {
    if (!await puedeGestionarEquipo(req, res, req.params.id)) return;
    const user = await User.findByEmail(email);
    // Misma respuesta si el correo no existe o es de otro rol: no se revela qué cuentas hay.
    if (!user || user.role !== 'vendedor')
      return ResponseFormatter.notFound(res, 'No hay un vendedor registrado con ese correo');
    if (!user.isActive)
      return ResponseFormatter.badRequest(res, 'La cuenta de ese vendedor está deshabilitada');
    const entry = await Tienda.addUsuario(req.params.id, user.id, false, req.user.userId);
    return ResponseFormatter.success(res, {
      entry, usuario: resumenUsuario(user), message: `${user.name} ya es parte de tu equipo`,
    }, 201);
  } catch (err) {
    if (esDuplicado(err)) return ResponseFormatter.conflict(res, 'Ese vendedor ya está en esta tienda');
    return ResponseFormatter.internalError(res, 'No pudimos agregar al vendedor');
  }
});

// POST /tiendas/:id/vendedores/nuevo — crea la cuenta de un vendedor y lo deja en la tienda.
// La cuenta nace pendiente con una contraseña aleatoria que nadie conoce: el vendedor la
// activa con el enlace del correo y ahí define la suya (cambio forzado).
router.post('/:id/vendedores/nuevo', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? DataNormalizer.normalizeEmail(req.body.email) : '';
  if (name.length < 2) return ResponseFormatter.badRequest(res, 'Escribe el nombre del vendedor');
  if (!EMAIL_REGEX.test(email)) return ResponseFormatter.badRequest(res, 'Escribe un correo válido');
  try {
    if (!await puedeGestionarEquipo(req, res, req.params.id)) return;
    if (await User.findByEmail(email))
      return ResponseFormatter.conflict(res, 'Ese correo ya está registrado. Si es un vendedor, agrégalo con «Agregar vendedor».');

    const user = await User.create(email, crypto.randomBytes(32).toString('base64url'), name, 'vendedor', null,
      { pending: true, mustChangePassword: true });
    const ipAddress = auditMiddleware.getIpAddress(req);
    const userAgent = auditMiddleware.getUserAgent(req);
    await auditMiddleware.logUserCreation(req.user.userId, user.id, user.email, 'vendedor', ipAddress, userAgent);
    const entry = await Tienda.addUsuario(req.params.id, user.id, false, req.user.userId);
    const mail = await accountMail.sendActivation(user, user.activationToken, {
      origin: 'byOther',
      context: { actorId: req.user.userId, ipAddress, userAgent },
    });

    return ResponseFormatter.success(res, {
      entry,
      usuario: resumenUsuario(user),
      pendingActivation: true,
      activationEmailSent: mail.ok === true,
      message: mail.ok === true
        ? `Creamos la cuenta de ${user.name}. Le enviamos un correo para activarla y crear su contraseña.`
        : `Creamos la cuenta de ${user.name}, pero el correo de activación no pudo enviarse. Puede pedirlo de nuevo desde el inicio de sesión.`,
    }, 201);
  } catch (err) {
    if (esDuplicado(err)) return ResponseFormatter.conflict(res, 'Ese correo ya está registrado');
    return ResponseFormatter.internalError(res, 'No pudimos crear al vendedor');
  }
});

// DELETE /tiendas/:id/usuarios/:userId
router.delete('/:id/usuarios/:userId', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  try {
    await Tienda.removeUsuario(req.params.id, req.params.userId);
    return ResponseFormatter.success(res, { message: 'Persona quitada de la tienda' });
  } catch { return ResponseFormatter.internalError(res, 'No pudimos quitar a la persona'); }
});

module.exports = router;
