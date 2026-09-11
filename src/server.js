const express = require('express');
const authRoutes = require('./routes/auth');
const TokenCleaner = require('./scripts/cleanExpiredTokens');
const TokenManager = require('./utils/tokenManager');
const ResponseFormatter = require('./utils/responseFormatter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  ResponseFormatter.success(res, {
    message: 'Servidor operacional',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/debug/headers', (req, res) => {
  ResponseFormatter.success(res, {
    message: 'Headers recibidos',
    authorization: {
      header: req.headers.authorization || '❌ NO INCLUIDO',
      status: req.headers.authorization ? '✅ Presente' : '❌ Faltante'
    },
    allHeaders: req.headers
  });
});

app.get('/tokens/stats', (req, res) => {
  const tokenManager = new TokenManager();
  const stats = tokenManager.getStats();
  ResponseFormatter.success(res, {
    message: 'Estadísticas de tokens',
    stats
  });
});

app.post('/tokens/clean', (req, res) => {
  const deleted = TokenCleaner.run();
  ResponseFormatter.success(res, {
    message: 'Limpieza de tokens ejecutada',
    tokensEliminados: deleted
  });
});

app.get('/docs', (req, res) => {
  res.json({
    name: 'Sistema de Autenticación',
    version: '1.0.0',
    endpoints: [
      {
        method: 'POST',
        path: '/auth/register',
        description: 'Registrar nuevo usuario',
        body: { email: 'string', password: 'string (min 8)', name: 'string' },
        response: { user: 'object', token: 'JWT' }
      },
      {
        method: 'POST',
        path: '/auth/login',
        description: 'Iniciar sesión',
        body: { email: 'string', password: 'string' },
        response: { user: 'object', token: 'JWT' }
      },
      {
        method: 'GET',
        path: '/auth/validate',
        description: 'Validar sesión activa (requiere token)',
        headers: { Authorization: 'Bearer {token}' },
        response: { user: 'object' }
      },
      {
        method: 'POST',
        path: '/auth/forgot-password',
        description: 'Solicitar recuperación de contraseña',
        body: { email: 'string' },
        response: { message: 'string' }
      },
      {
        method: 'POST',
        path: '/auth/reset-password',
        description: 'Restablecer contraseña con token',
        body: { token: 'string', newPassword: 'string (min 8)' },
        response: { message: 'string' }
      },
      {
        method: 'POST',
        path: '/auth/logout',
        description: 'Cerrar sesión (requiere token)',
        headers: { Authorization: 'Bearer {token}' },
        response: { message: 'string' }
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Verificar estado del servidor',
        response: { status: 'ok' }
      },
      {
        method: 'GET',
        path: '/tokens/stats',
        description: 'Ver estadísticas de tokens (otorgados/revocados)',
        response: { stats: { totalGranted: 'number', totalRevoked: 'number' } }
      },
      {
        method: 'POST',
        path: '/tokens/clean',
        description: 'Ejecutar limpieza manual de tokens vencidos',
        response: { tokensEliminados: 'number' }
      },
      {
        method: 'GET',
        path: '/docs',
        description: 'Ver todos los endpoints (este)',
        response: 'object'
      }
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('🔴 Error no capturado:', err);
  ResponseFormatter.internalError(res, err.message || 'Error interno del servidor');
});

const os = require('os');

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  console.log(`🚀 Servidor corriendo`);
  console.log(`   Local: http://localhost:${PORT}`);
  localIPs.forEach(ip => {
    console.log(`   Red: http://${ip}:${PORT}`);
  });
  console.log(`📝 Base de datos: users.csv`);
  console.log(`📚 Documentación: http://localhost:${PORT}/docs`);
  console.log(`📋 Tokens: http://localhost:${PORT}/tokens/stats`);

  // Iniciar limpiador de tokens automático
  console.log(`⏰ Limpiador de tokens programado...`);
  TokenCleaner.scheduleDaily();
});
