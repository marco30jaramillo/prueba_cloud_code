const crypto = require('crypto');
const express = require('express');
const Tienda = require('../models/Tienda');
const User = require('../models/User');
const accountMail = require('../mail/accountMail');
const auditMiddleware = require('../middleware/auditMiddleware');
const DataNormalizer = require('../utils/dataNormalizer');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const Role = require('../models/Role');
const { requirePermission } = require('../middleware/roleMiddleware');
const { ROLES_EQUIPO } = require('../config/permisos');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const router = express.Router();

async function checkAcceso(req, res, tiendaId) {
  // tienda:administrar («Mi tienda» en total) ve cualquier tienda; el resto, solo las suyas.
  if (await Role.hasPermission(req.user.role, 'tienda:administrar')) return true;
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

// POST /tiendas/:id/usuarios — asignar tendero, encargado o vendedor
router.post('/:id/usuarios', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  const { userId, esPropietario } = req.body;
  if (!userId) return ResponseFormatter.badRequest(res, 'Falta elegir a la persona');
  try {
    const user = await User.findById(userId);
    if (!user) return ResponseFormatter.notFound(res, 'No encontramos a esa persona');
    if (!['tendero', ...ROLES_EQUIPO].includes(user.role))
      return ResponseFormatter.badRequest(res, 'Solo tenderos, encargados y vendedores pueden asignarse a una tienda');
    if (esPropietario && user.role !== 'tendero')
      return ResponseFormatter.badRequest(res, 'Solo un tendero puede ser dueño de la tienda');
    const entry = await Tienda.addUsuario(req.params.id, userId, esPropietario, req.user.userId);
    return ResponseFormatter.success(res, { entry, message: 'Persona asignada a la tienda' }, 201);
  } catch (err) {
    if (err.message?.includes('UQ_') || err.number === 2627)
      return ResponseFormatter.conflict(res, 'Esa persona ya está en esta tienda');
    return ResponseFormatter.internalError(res, 'No pudimos asignar a la persona');
  }
});

// ── EQUIPO DE LA TIENDA ─────────────────────────────────────────────────────
// El dueño (equipo:gestionar, «Mi tienda» en escritura) arma el equipo de SU tienda sin
// depender del administrador: suma vendedores o encargados ya registrados por su correo
// exacto, crea la cuenta de uno nuevo o lo quita. Con tienda:administrar, en cualquier tienda.

async function puedeGestionarEquipo(req, res, tiendaId) {
  if (await Role.hasPermission(req.user.role, 'tienda:administrar')) {
    if (await Tienda.findById(tiendaId)) return true;
    ResponseFormatter.notFound(res, 'Tienda no encontrada');
    return false;
  }
  if (await Role.hasPermission(req.user.role, 'equipo:gestionar')
    && await Tienda.esPropietario(tiendaId, req.user.userId)) return true;
  ResponseFormatter.forbidden(res, 'Solo el dueño de la tienda puede gestionar su equipo');
  return false;
}

const esDuplicado = err => err?.message?.includes('UQ_') || err?.number === 2627;
const resumenUsuario = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const rolEquipo = r => (r === undefined || r === null || r === '' ? 'vendedor' : r);
const NOMBRE_ROL = { vendedor: 'vendedor', encargado: 'encargado' };

// POST /tiendas/:id/equipo — suma un vendedor o encargado ya registrado, por su correo exacto
router.post('/:id/equipo', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  const email = typeof req.body?.email === 'string' ? DataNormalizer.normalizeEmail(req.body.email) : '';
  if (!EMAIL_REGEX.test(email)) return ResponseFormatter.badRequest(res, 'Escribe el correo completo de la persona');
  try {
    if (!await puedeGestionarEquipo(req, res, req.params.id)) return;
    const user = await User.findByEmail(email);
    // Misma respuesta si el correo no existe o es de otro rol: no se revela qué cuentas hay.
    if (!user || !ROLES_EQUIPO.includes(user.role))
      return ResponseFormatter.notFound(res, 'No hay un vendedor ni un encargado registrado con ese correo');
    if (!user.isActive)
      return ResponseFormatter.badRequest(res, 'La cuenta de esa persona está deshabilitada');
    const entry = await Tienda.addUsuario(req.params.id, user.id, false, req.user.userId);
    return ResponseFormatter.success(res, {
      entry, usuario: resumenUsuario(user), message: `${user.name} ya es parte de tu equipo`,
    }, 201);
  } catch (err) {
    if (esDuplicado(err)) return ResponseFormatter.conflict(res, 'Esa persona ya está en esta tienda');
    return ResponseFormatter.internalError(res, 'No pudimos agregar a la persona');
  }
});

// POST /tiendas/:id/equipo/nuevo — crea la cuenta (vendedor o encargado) y la deja en la tienda.
// La cuenta nace pendiente con una contraseña aleatoria que nadie conoce: la persona la activa
// con el enlace del correo y ahí define la suya (cambio forzado).
router.post('/:id/equipo/nuevo', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? DataNormalizer.normalizeEmail(req.body.email) : '';
  const rol = rolEquipo(req.body?.rol);
  if (name.length < 2) return ResponseFormatter.badRequest(res, 'Escribe el nombre de la persona');
  if (!EMAIL_REGEX.test(email)) return ResponseFormatter.badRequest(res, 'Escribe un correo válido');
  if (!ROLES_EQUIPO.includes(rol)) return ResponseFormatter.badRequest(res, 'El rol debe ser vendedor o encargado');
  try {
    if (!await puedeGestionarEquipo(req, res, req.params.id)) return;
    if (await User.findByEmail(email))
      return ResponseFormatter.conflict(res, 'Ese correo ya está registrado. Si es vendedor o encargado, agrégalo con su correo.');

    const user = await User.create(email, crypto.randomBytes(32).toString('base64url'), name, rol, null,
      { pending: true, mustChangePassword: true });
    const ipAddress = auditMiddleware.getIpAddress(req);
    const userAgent = auditMiddleware.getUserAgent(req);
    await auditMiddleware.logUserCreation(req.user.userId, user.id, user.email, rol, ipAddress, userAgent);
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
        ? `Creamos la cuenta de ${user.name} como ${NOMBRE_ROL[rol]}. Le enviamos un correo para activarla y crear su contraseña.`
        : `Creamos la cuenta de ${user.name} como ${NOMBRE_ROL[rol]}, pero el correo de activación no pudo enviarse. Puede pedirlo de nuevo desde el inicio de sesión.`,
    }, 201);
  } catch (err) {
    if (esDuplicado(err)) return ResponseFormatter.conflict(res, 'Ese correo ya está registrado');
    return ResponseFormatter.internalError(res, 'No pudimos crear la cuenta');
  }
});

// DELETE /tiendas/:id/equipo/:userId — quita a un vendedor o encargado de la tienda.
// Al dueño no se le quita por aquí (eso es de tienda:administrar, en /usuarios).
router.delete('/:id/equipo/:userId', authMiddleware, requirePermission('tienda:ver'), async (req, res) => {
  try {
    if (!await puedeGestionarEquipo(req, res, req.params.id)) return;
    const miembro = (await Tienda.getUsuariosByTienda(req.params.id))
      .find(u => String(u.userId).toLowerCase() === String(req.params.userId).toLowerCase());
    if (!miembro) return ResponseFormatter.notFound(res, 'Esa persona no está en esta tienda');
    if (miembro.esPropietario || !ROLES_EQUIPO.includes(miembro.role))
      return ResponseFormatter.forbidden(res, 'Desde el equipo solo se quitan vendedores y encargados');
    await Tienda.removeUsuario(req.params.id, miembro.userId);
    return ResponseFormatter.success(res, { message: `${miembro.name} ya no está en la tienda` });
  } catch { return ResponseFormatter.internalError(res, 'No pudimos quitar a la persona'); }
});

// DELETE /tiendas/:id/usuarios/:userId
router.delete('/:id/usuarios/:userId', authMiddleware, requirePermission('tienda:administrar'), async (req, res) => {
  try {
    await Tienda.removeUsuario(req.params.id, req.params.userId);
    return ResponseFormatter.success(res, { message: 'Persona quitada de la tienda' });
  } catch { return ResponseFormatter.internalError(res, 'No pudimos quitar a la persona'); }
});

module.exports = router;
