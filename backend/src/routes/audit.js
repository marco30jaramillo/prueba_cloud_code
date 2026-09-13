const express = require('express');
const AuditLog = require('../models/AuditLog');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Últimos 100 eventos
router.get('/logs', authMiddleware, roleMiddleware.requireRole('superuser'), (req, res) => {
  const all = AuditLog.getAll();
  const logs = all.slice(-100).reverse(); // más recientes primero

  return ResponseFormatter.success(res, {
    message: 'Logs de auditoría obtenidos exitosamente',
    total: all.length,
    logs
  });
});

// Por actor (quien ejecutó la acción)
router.get('/logs/actor/:actorId', authMiddleware, roleMiddleware.requireRole('superuser'), (req, res) => {
  const logs = AuditLog.getByActorId(req.params.actorId).reverse();
  return ResponseFormatter.success(res, { total: logs.length, logs });
});

// Por usuario afectado
router.get('/logs/target/:targetId', authMiddleware, roleMiddleware.requireRole('superuser'), (req, res) => {
  const logs = AuditLog.getByTargetId(req.params.targetId).reverse();
  return ResponseFormatter.success(res, { total: logs.length, logs });
});

// Logins fallidos
router.get('/logs/failed-logins', authMiddleware, roleMiddleware.requireRole('superuser'), (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = AuditLog.getFailedLogins(limit).reverse();
  return ResponseFormatter.success(res, { total: logs.length, logs });
});

// Reporte de seguridad
router.get('/security-report', authMiddleware, roleMiddleware.requireRole('superuser'), (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const report = AuditLog.generateSecurityReport(days);
  return ResponseFormatter.success(res, { message: 'Reporte generado', report });
});

module.exports = router;
