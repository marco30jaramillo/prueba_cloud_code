require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const auditRoutes = require('./routes/audit');
const modulesRoutes     = require('./routes/modules');
const rolesConfigRoutes = require('./routes/roles-config');
const TokenCleaner = require('./scripts/cleanExpiredTokens');
const TokenManager = require('./utils/tokenManager');
const ResponseFormatter = require('./utils/responseFormatter');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
// Servir archivos estáticos desde /datos en la raíz del proyecto
const datosPath = path.resolve(__dirname, '../../datos');
app.use(express.static(datosPath));

const allowedOriginPatterns = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/,
  /^https:\/\/[^.]+\.azurestaticapps\.net$/,
  /^https:\/\/[^.]+\.azurewebsites\.net$/,
];
if (process.env.FRONTEND_URL) {
  allowedOriginPatterns.push(new RegExp(`^${process.env.FRONTEND_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOriginPatterns.some(r => r.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: solicitud no permitida'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Logging removido - demasiado verbose para producción

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/upload', uploadRoutes);
app.use('/audit', auditRoutes);
app.use('/modules', modulesRoutes);
app.use('/roles-config', rolesConfigRoutes);

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
    name: 'Sistema de Autenticación con Roles',
    version: '1.0.0',
    description: 'API de autenticación segura con gestión de roles y permisos',
    endpoints: {
      authentication: [
        {
          method: 'POST',
          path: '/auth/register',
          description: 'Registrar nuevo usuario como cliente',
          auth: 'none',
          body: { email: 'string', password: 'string (min 8)', name: 'string' },
          response: { user: { id, email, name, role: "cliente" }, token: 'JWT' }
        },
        {
          method: 'POST',
          path: '/auth/login',
          description: 'Iniciar sesión',
          auth: 'none',
          body: { email: 'string', password: 'string' },
          response: { user: { id, email, name, role }, token: 'JWT' }
        },
        {
          method: 'GET',
          path: '/auth/validate',
          description: 'Validar sesión activa',
          auth: 'required',
          headers: { Authorization: 'Bearer {token}' },
          response: { user: { id, email, name, role }, token_expires_at: 'ISO string' }
        },
        {
          method: 'POST',
          path: '/auth/logout',
          description: 'Cerrar sesión (revoca token)',
          auth: 'required',
          headers: { Authorization: 'Bearer {token}' },
          response: { message: 'string' }
        }
      ],
      passwordRecovery: [
        {
          method: 'POST',
          path: '/auth/forgot-password',
          description: 'Solicitar recuperación de contraseña',
          auth: 'none',
          body: { email: 'string' },
          response: { message: 'string' }
        },
        {
          method: 'POST',
          path: '/auth/reset-password',
          description: 'Restablecer contraseña con token único',
          auth: 'none',
          body: { token: 'string', newPassword: 'string (min 8)' },
          response: { message: 'string' }
        }
      ],
      roleManagement: [
        {
          method: 'POST',
          path: '/auth/bootstrap-superuser',
          description: 'Crear primer super usuario (solo si no existe)',
          auth: 'none',
          body: { email: 'string', password: 'string (min 8)', name: 'string' },
          response: { user: { id, email, name, role: "superuser" }, token: 'JWT' },
          restrictions: 'Solo funciona si no existe superuser'
        },
        {
          method: 'POST',
          path: '/auth/create-user',
          description: 'Crear usuario con rol específico',
          auth: 'required',
          headers: { Authorization: 'Bearer {token}' },
          body: { email: 'string', password: 'string (min 8)', name: 'string', role: 'enum' },
          response: { user: { id, email, name, role }, token: 'JWT' },
          restrictions: {
            'superuser': 'puede crear cualquier rol',
            'administrador': 'puede crear vendedor y cliente',
            'others': 'no pueden crear usuarios'
          }
        },
        {
          method: 'GET',
          path: '/auth/user-schema/:roleType',
          description: 'Obtener esquema de usuario para frontend (campos requeridos según rol)',
          auth: 'none',
          params: { roleType: 'string (superuser|administrador|vendedor|cliente)' },
          response: { roleType, description, permissions: 'array', formFields: 'array', constraints: 'object' }
        }
      ],
      system: [
        {
          method: 'GET',
          path: '/health',
          description: 'Verificar estado del servidor',
          response: { status: 'healthy' }
        },
        {
          method: 'GET',
          path: '/tokens/stats',
          description: 'Ver estadísticas de tokens',
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
          description: 'Ver todos los endpoints (este)'
        }
      ],
      roles: {
        superuser: { permissions: 'system:full-access', description: 'Acceso integral a todas las funciones' },
        administrador: { permissions: ['admin:manage-users', 'profile:view-all', 'auth:create-user'], description: 'Gestión de usuarios y sistemas' },
        vendedor: { permissions: ['profile:view-own', 'profile:view-clients'], description: 'Permisos limitados para venta' },
        cliente: { permissions: ['profile:view-own', 'auth:login', 'auth:logout'], description: 'Permisos básicos' }
      }
    }
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

app.listen(PORT, '0.0.0.0', async () => {
  const localIPs = getLocalIPs();
  console.log(`🚀 Servidor corriendo`);
  console.log(`   Local: http://localhost:${PORT}`);
  localIPs.forEach(ip => {
    console.log(`   Red: http://${ip}:${PORT}`);
  });

  const { usingSql, getPool } = require('./database/sqlPool');
  if (usingSql()) {
    try {
      await getPool();
      console.log(`🗄️  Base de datos: Azure SQL (conectado)`);
    } catch (err) {
      console.error(`❌ Azure SQL: error de conexión`);
      console.error(`   Mensaje : ${err.message}`);
      if (err.code)   console.error(`   Código  : ${err.code}`);
      if (err.number) console.error(`   Número  : ${err.number}`);
      if (err.state)  console.error(`   Estado  : ${err.state}`);
      // Diagnóstico según tipo de error
      const msg = err.message || '';
      if (msg.includes('in 15000ms') || msg.includes('ETIMEOUT') || msg.includes('ECONNREFUSED')) {
        console.error(`   Causa probable: Firewall de Azure no permite tu IP.`);
        console.error(`   → Portal Azure > SQL Server > Redes > Agregar IP de cliente`);
        console.error(`   → O activa "Permitir servicios y recursos de Azure"`);
      } else if (msg.toLowerCase().includes('login failed') || msg.includes('18456')) {
        console.error(`   Causa probable: Credenciales incorrectas (usuario/contraseña).`);
      } else if (msg.toLowerCase().includes('cannot open database') || msg.includes('4060')) {
        console.error(`   Causa probable: El nombre de la base de datos no existe o no tienes acceso.`);
      } else if (msg.toLowerCase().includes('server name') || msg.includes('ENOTFOUND')) {
        console.error(`   Causa probable: Nombre del servidor incorrecto o no resuelve DNS.`);
      }
      console.error(`   Servidor : ${process.env.AZURE_SQL_SERVER || '(no definido)'}`);
      console.error(`   Base     : ${process.env.AZURE_SQL_DATABASE || '(no definido)'}`);
      console.error(`   Usuario  : ${process.env.AZURE_SQL_USER || '(no definido)'}`);
    }
  } else {
    console.log(`📝 Base de datos: CSV (modo local)`);
  }

  console.log(`📚 Documentación: http://localhost:${PORT}/docs`);
  console.log(`📋 Tokens: http://localhost:${PORT}/tokens/stats`);

  // Iniciar limpiador de tokens automático
  console.log(`⏰ Limpiador de tokens programado...`);
  TokenCleaner.scheduleDaily();
});
