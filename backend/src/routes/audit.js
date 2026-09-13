const express = require('express');
const AuditLog = require('../models/AuditLog');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/logs', authMiddleware, roleMiddleware.requirePermission('admin:view-audit'), async (req, res) => {
  const logs = await AuditLog.getAll();
  return ResponseFormatter.success(res, {
    message: 'Logs de auditoría obtenidos exitosamente',
    total: logs.length,
    logs,
  });
});

router.get('/logs/actor/:actorId', authMiddleware, roleMiddleware.requireRole('superuser'), async (req, res) => {
  const logs = await AuditLog.getByActorId(req.params.actorId);
  return ResponseFormatter.success(res, { total: logs.length, logs });
});

router.get('/logs/target/:targetId', authMiddleware, roleMiddleware.requireRole('superuser'), async (req, res) => {
  const logs = await AuditLog.getByTargetId(req.params.targetId);
  return ResponseFormatter.success(res, { total: logs.length, logs });
});

router.get('/logs/failed-logins', authMiddleware, roleMiddleware.requireRole('superuser'), async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = await AuditLog.getFailedLogins(limit);
  return ResponseFormatter.success(res, { total: logs.length, logs });
});

router.get('/security-report', authMiddleware, roleMiddleware.requireRole('superuser'), async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const report = await AuditLog.generateSecurityReport(days);
  return ResponseFormatter.success(res, { message: 'Reporte generado', report });
});

module.exports = router;
