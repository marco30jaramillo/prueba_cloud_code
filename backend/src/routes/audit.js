const express = require('express');
const AuditLog = require('../models/AuditLog');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Obtener últimos eventos de auditoría
router.get(
  '/logs',
  authMiddleware,
  roleMiddleware.requireRole('superuser'),
  (req, res) => {
    const logs = AuditLog.getAll();
    const recentLogs = logs.slice(-100); // Últimos 100 eventos

    return ResponseFormatter.success(res, {
      message: 'Logs de auditoría obtenidos exitosamente',
      total: logs.length,
      recent: 100,
      logs: recentLogs
    });
  }
);

// Obtener eventos de un usuario específico
router.get(
  '/logs/user/:userId',
  authMiddleware,
  roleMiddleware.requireRole('superuser'),
  (req, res) => {
    const { userId } = req.params;
    const logs = AuditLog.getByUserId(userId);

    return ResponseFormatter.success(res, {
      message: `Logs del usuario ${userId} obtenidos exitosamente`,
      total: logs.length,
      logs
    });
  }
);

// Obtener eventos sobre un usuario específico (cambios hechos a ese usuario)
router.get(
  '/logs/target/:targetUserId',
  authMiddleware,
  roleMiddleware.requireRole('superuser'),
  (req, res) => {
    const { targetUserId } = req.params;
    const logs = AuditLog.getByTargetUserId(targetUserId);

    return ResponseFormatter.success(res, {
      message: `Logs del usuario afectado ${targetUserId} obtenidos exitosamente`,
      total: logs.length,
      logs
    });
  }
);

// Obtener logins fallidos
router.get(
  '/logs/failed-logins',
  authMiddleware,
  roleMiddleware.requireRole('superuser'),
  (req, res) => {
    const { limit = 50 } = req.query;
    const logs = AuditLog.getFailedLogins(parseInt(limit));

    return ResponseFormatter.success(res, {
      message: 'Logins fallidos obtenidos exitosamente',
      total: logs.length,
      logs
    });
  }
);

// Obtener reporte de seguridad
router.get(
  '/security-report',
  authMiddleware,
  roleMiddleware.requireRole('superuser'),
  (req, res) => {
    const { days = 7 } = req.query;
    const report = AuditLog.generateSecurityReport(parseInt(days));

    return ResponseFormatter.success(res, {
      message: 'Reporte de seguridad generado exitosamente',
      report
    });
  }
);

module.exports = router;
