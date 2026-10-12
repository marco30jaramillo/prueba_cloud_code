const express = require('express');
const router = express.Router();

const BASE = process.env.APP_URL || 'http://localhost:3001';

// ── Helpers ──────────────────────────────────────────────────────────────────

const endpoint = (method, path, desc, permission = null, body = null, response = null) => ({
  method,
  path: `${BASE}${path}`,
  description: desc,
  ...(permission && { permission }),
  ...(body && { body }),
  ...(response && { response }),
});

// ── Módulos del sistema ───────────────────────────────────────────────────────

const MODULES = [
  { id: 'auth',     prefix: '/auth',         description: 'Registro, login, gestión de sesión y contraseñas' },
  { id: 'users',    prefix: '/users',        description: 'Gestión de usuarios por administradores' },
  { id: 'modules',  prefix: '/modules',      description: 'Módulos del dashboard accesibles por rol' },
  { id: 'roles',    prefix: '/roles-config', description: 'Configuración de roles y permisos' },
  { id: 'tiendas',  prefix: '/tiendas',      description: 'Gestión de tiendas y su equipo' },
  { id: 'vales',    prefix: '/vales',        description: 'Créditos al fiado (vales) y abonos' },
  { id: 'audit',    prefix: '/audit',        description: 'Registros de auditoría del sistema' },
];

// ── GET /docs — panorama general ─────────────────────────────────────────────

router.get('/', (req, res) => {
  res.json({
    status: 'success',
    api: 'Mi Valecito API',
    version: '1.0.0',
    description: 'Sistema de crédito local — gestión de vales al fiado, tiendas y usuarios',
    base_url: BASE,
    authentication: {
      type: 'Bearer JWT',
      header: 'Authorization: Bearer <token>',
      obtain: `POST ${BASE}/auth/login`,
      expiry: '24 horas (con rememberMe: 30 días)',
    },
    modules: MODULES.map(m => ({
      ...m,
      docs_url: `${BASE}/docs/${m.id}`,
    })),
    roles: {
      superuser:     { label: 'Super Usuario',  acceso: 'Total — comodín system:full-access' },
      administrador: { label: 'Administrador',  acceso: 'Gestión de usuarios, roles, auditoría, cartera' },
      tendero:       { label: 'Tendero',        acceso: 'Gestión de su tienda, vales y cartera' },
      vendedor:      { label: 'Vendedor',       acceso: 'Crear vales en su tienda asignada' },
      cliente:       { label: 'Cliente',        acceso: 'Ver sus propios vales' },
    },
    response_format: {
      success: { status: 'success', data: '{ ... }', message: 'Descripción opcional' },
      error:   { status: 'error',   message: 'Descripción del error', code: 'HTTP status code' },
    },
    utility_endpoints: {
      health: `GET ${BASE}/health`,
      token_stats: `GET ${BASE}/tokens/stats (requiere sesión de superusuario o administrador)`,
      token_clean: `POST ${BASE}/tokens/clean (requiere sesión de superusuario o administrador)`,
    },
  });
});

// ── GET /docs/auth ────────────────────────────────────────────────────────────

router.get('/auth', (req, res) => {
  res.json({
    status: 'success',
    module: 'auth',
    prefix: '/auth',
    description: 'Autenticación y gestión de sesión',
    endpoints: [
      endpoint('POST', '/auth/register', 'Registrar nuevo cliente (rol=cliente). La cuenta nace PENDIENTE de activación y no devuelve sesión: se envía el correo de activación. Si el correo ya existe (activo, pendiente o deshabilitado) responde 409 igual; si está pendiente, se reenvía su activación sin avisar. Límite: 20 solicitudes/hora por IP', null,
        { email: 'string', password: 'string (RN-43: 8+ con mayúscula, minúscula, número y símbolo)', name: 'string', photo: 'string (url, opcional)' },
        { message: 'string', user: '{ id, email, name, role }', pendingActivation: 'true (201, sin token)' }),
      endpoint('POST', '/auth/login', 'Iniciar sesión. Cuenta pendiente con contraseña correcta: 403 con code ACCOUNT_PENDING_ACTIVATION; deshabilitada: 403 ACCOUNT_DISABLED', null,
        { email: 'string', password: 'string', rememberMe: 'boolean (opcional)' },
        { token: 'JWT', user: '{ id, email, name, role, mustChangePassword }', message: 'string' }),
      endpoint('POST', '/auth/activate', 'Activar la cuenta con el token del enlace del correo: inicia sesión sin contraseña (queda en auditoría) y la cuenta debe cambiar la contraseña (mustChangePassword). En la PRIMERA activación la contraseña guardada se reemplaza por una aleatoria que nadie conoce: quien no la cambie vuelve a entrar con el enlace o con «olvidé mi contraseña». El enlace sigue sirviendo hasta el primer cambio de contraseña, con tope de 7 días desde la creación. Token inválido, vencido, reemplazado o cuenta deshabilitada: 400 con el mismo mensaje. 10 fallos/15 min por IP: 429. Respuesta con Cache-Control no-store', null,
        { token: 'string (64 hex; el enlace del correo lo trae en el fragmento: /activar#token=...)' },
        { token: 'JWT', user: '{ id, email, name, photo, role, mustChangePassword }', message: 'string' }),
      endpoint('POST', '/auth/resend-activation', 'Reenviar el correo de activación. Respuesta genérica 200 exista o no la cuenta; el token anterior deja de servir y el vencimiento no se extiende. Límite: 20 solicitudes/hora por IP y 3 correos/hora por destinatario', null,
        { email: 'string' },
        { message: 'string (genérico)', hint: 'string' }),
      endpoint('GET',  '/auth/validate', 'Validar sesión activa', 'auth'),
      endpoint('POST', '/auth/logout', 'Cerrar sesión (revocar token actual)', 'auth'),
      endpoint('POST', '/auth/logout-all', 'Cerrar sesión en todos los dispositivos', 'auth'),
      endpoint('PATCH', '/auth/change-password', 'Cambiar propia contraseña (envía el aviso de contraseña cambiada)', 'auth',
        { currentPassword: 'string', newPassword: 'string', confirmPassword: 'string' }),
      endpoint('PATCH', '/auth/change-password-temporary', 'Primer cambio de contraseña de una cuenta con cambio forzado (sin contraseña actual). Exige mustChangePassword=true (si no, 400), aplica RN-43, invalida el enlace de activación, revoca las demás sesiones de la cuenta y conserva la actual', 'auth',
        { newPassword: 'string (RN-43)' },
        { message: 'string', user: '{ id, email, name, role, mustChangePassword: false }' }),
      endpoint('PATCH', '/auth/profile', 'Actualizar nombre propio', 'auth',
        { name: 'string' }),
      endpoint('POST', '/auth/create-user', 'Crear usuario (admin). La cuenta nace pendiente con cambio de contraseña forzado y se le envía el correo de activación; NO devuelve token', 'auth:create-user',
        { email: 'string', name: 'string', role: 'string', password: 'string (mín 8)' },
        { message: 'string', user: '{ id, email, name, role }', pendingActivation: 'true', activationEmailSent: 'boolean' }),
      endpoint('PATCH', '/auth/password/:userId', 'Cambiar contraseña de otro usuario (cierra todas las sesiones del dueño y le envía el aviso de contraseña cambiada)', 'auth:manage-users',
        { newPassword: 'string' }),
      endpoint('POST', '/auth/forgot-password', 'Solicitar enlace de recuperación (vale 1 hora y se usa una vez). Respuesta genérica exista o no la cuenta; una cuenta pendiente recibe su activación en lugar del enlace; una deshabilitada no recibe nada. Límite: 20 solicitudes/hora por IP y 3 correos/hora por destinatario', null,
        { email: 'string' }),
      endpoint('POST', '/auth/reset-password', 'Restablecer contraseña con token (RN-43). Cierra todas las sesiones de la cuenta y envía el aviso de contraseña cambiada. No sirve para cuentas pendientes ni deshabilitadas', null,
        { token: 'string', newPassword: 'string (RN-43)' }),
      endpoint('POST', '/auth/bootstrap-superuser', 'Crear primer superusuario (solo si no existe ninguno). Nace activado y sin correo', null,
        { email: 'string', password: 'string', name: 'string' }),
    ],
  });
});

// ── GET /docs/users ───────────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  res.json({
    status: 'success',
    module: 'users',
    prefix: '/users',
    description: 'Gestión de usuarios por administradores',
    permission_required: 'admin:manage-users',
    endpoints: [
      endpoint('GET',  '/users', 'Listar usuarios gestionables según rol', 'admin:manage-users'),
      endpoint('GET',  '/users/manageable-roles', 'Roles que el usuario actual puede asignar', 'admin:manage-users'),
      endpoint('GET',  '/users/clientes/buscar', 'Buscar clientes por nombre/email (param: q). Excluye cuentas pendientes de activación', 'auth'),
      endpoint('PATCH', '/users/:id', 'Editar datos de un usuario', 'admin:manage-users',
        { name: 'string (opcional)', email: 'string (opcional)', role: 'string (opcional)', photo: 'string (opcional)' }),
      endpoint('PATCH', '/users/:id/status', 'Habilitar o deshabilitar usuario. Habilitar una cuenta que sigue pendiente de activación la re-arma: 7 días nuevos y correo de activación nuevo', 'admin:manage-users',
        { active: 'boolean' }),
      endpoint('POST', '/users/:id/generate-password', 'Generar contraseña aleatoria segura (la cuenta queda con cambio forzado, se cierran todas sus sesiones y se le envía el aviso de contraseña cambiada, sin la contraseña)', 'admin:manage-users'),
    ],
  });
});

// ── GET /docs/modules ─────────────────────────────────────────────────────────

router.get('/modules', (req, res) => {
  res.json({
    status: 'success',
    module: 'modules',
    prefix: '/modules',
    description: 'Módulos del dashboard accesibles según el rol del usuario',
    endpoints: [
      endpoint('GET', '/modules', 'Módulos accesibles al usuario autenticado', 'auth',
        null, { modules: '[{ id, name, description, buttonLabel, href, icon }]' }),
      endpoint('GET', '/modules/all', 'Todos los módulos con info de permisos', 'system:full-access',
        null, { modules: '[{ id, name, permRead, permWrite, permFull, roles }]' }),
    ],
  });
});

// ── GET /docs/roles ───────────────────────────────────────────────────────────

router.get('/roles', (req, res) => {
  res.json({
    status: 'success',
    module: 'roles-config',
    prefix: '/roles-config',
    description: 'Configuración de roles: ver permisos, crear roles, asignar módulos',
    endpoints: [
      endpoint('GET', '/roles-config', 'Matriz completa de roles, módulos y permisos', 'admin:view-roles'),
      endpoint('POST', '/roles-config', 'Crear nuevo rol', 'admin:manage-roles',
        { name: 'string', description: 'string', permissions: 'string[] (opcional)', canManage: 'string[] (opcional)' }),
      endpoint('PATCH', '/roles-config/:roleId', 'Actualizar módulos o permisos de un rol', 'admin:manage-roles',
        { modules: '{ moduleId: level }  level: read|write|full', permissions: 'string[] (opcional)' }),
    ],
  });
});

// ── GET /docs/tiendas ─────────────────────────────────────────────────────────

router.get('/tiendas', (req, res) => {
  res.json({
    status: 'success',
    module: 'tiendas',
    prefix: '/tiendas',
    description: 'Gestión de tiendas y su equipo de trabajo',
    endpoints: [
      endpoint('GET', '/tiendas', 'Todas las tiendas con resumen de equipo (admin/superuser)', 'tienda:administrar'),
      endpoint('GET', '/tiendas/mis-tiendas', 'Tiendas a las que pertenece el usuario autenticado', 'tienda:ver'),
      endpoint('POST', '/tiendas', 'Crear nueva tienda', 'tienda:administrar',
        { nombre: 'string', descripcion: 'string (opcional)' }),
      endpoint('GET', '/tiendas/:id', 'Detalle de una tienda', 'tienda:ver'),
      endpoint('PATCH', '/tiendas/:id', 'Actualizar datos de la tienda', 'tienda:administrar',
        { nombre: 'string (opcional)', descripcion: 'string (opcional)' }),
      endpoint('PATCH', '/tiendas/:id/status', 'Activar/desactivar tienda', 'tienda:administrar'),
      endpoint('GET', '/tiendas/:id/usuarios', 'Equipo de la tienda', 'tienda:ver'),
      endpoint('POST', '/tiendas/:id/usuarios', 'Asignar tendero/vendedor a tienda', 'tienda:administrar',
        { userId: 'string', esPropietario: 'boolean (opcional)' }),
      endpoint('DELETE', '/tiendas/:id/usuarios/:userId', 'Quitar usuario de la tienda', 'tienda:administrar'),
    ],
  });
});

// ── GET /docs/vales ───────────────────────────────────────────────────────────

router.get('/vales', (req, res) => {
  res.json({
    status: 'success',
    module: 'vales',
    prefix: '/vales',
    description: 'Créditos al fiado (vales) y abonos — núcleo del sistema',
    estados_vale: {
      activo: 'Crédito abierto con saldo pendiente',
      pagado: 'Crédito saldado completamente',
      anulado: 'Crédito cancelado',
    },
    estados_abono: {
      activo: 'Abono válido',
      anulado: 'Abono revertido',
    },
    endpoints: [
      endpoint('POST', '/vales', 'Registrar nuevo vale al fiado. El cliente debe existir y haber activado su cuenta (si no, 400)', 'vale:crear',
        { tiendaId: 'string', clienteId: 'string', descripcion: 'string', montoTotal: 'number', fechaVencimiento: 'date (opcional)', notas: 'string (opcional)' }),
      endpoint('POST', '/vales/pago-integral', 'Distribuir un pago entre varios vales (más antiguo primero)', 'abono:crear',
        { clienteId: 'string', monto: 'number', valeIds: 'string[]' },
        { abonos: '[]', vales: '[]', montoAplicado: 'number', montoNoAplicado: 'number' }),
      endpoint('GET', '/vales/mis-vales', 'Vales propios del cliente autenticado', 'vale:ver-propio',
        null, { vales: '[]', totalPendiente: 'number' }),
      endpoint('GET', '/vales/tienda/:tiendaId', 'Cartera completa de una tienda', 'vale:ver-tienda',
        null, { vales: '[]', totalPendiente: 'number', enMora: 'number' }),
      endpoint('GET', '/vales/tienda/:tiendaId?estado=activo', 'Filtrar cartera por estado (activo|pagado|anulado)', 'vale:ver-tienda'),
      endpoint('GET', '/vales/usuario/:userId', 'Vales de un cliente específico (admin/tendero)', 'vale:ver-tienda'),
      endpoint('GET', '/vales/:id', 'Detalle de un vale con sus abonos', 'auth',
        null, { vale: '{}', abonos: '[]' }),
      endpoint('PATCH', '/vales/:id/anular', 'Anular un vale activo', 'vale:anular'),
      endpoint('POST', '/vales/:id/abonos', 'Registrar abono a un vale', 'abono:crear',
        { monto: 'number', notas: 'string (opcional)' }),
      endpoint('GET', '/vales/:id/abonos', 'Historial de abonos de un vale', 'abono:ver'),
      endpoint('PATCH', '/vales/:valeId/abonos/:abonoId/anular', 'Anular un abono', 'abono:anular'),
    ],
  });
});

// ── GET /docs/audit ───────────────────────────────────────────────────────────

router.get('/audit', (req, res) => {
  res.json({
    status: 'success',
    module: 'audit',
    prefix: '/audit',
    description: 'Registros de auditoría — todas las acciones del sistema',
    permission_required: 'admin:view-audit',
    endpoints: [
      endpoint('GET', '/audit/logs', 'Últimas 100 entradas de auditoría', 'admin:view-audit',
        null, { logs: '[{ id, action, userId, targetId, ipAddress, userAgent, timestamp, details }]' }),
    ],
  });
});

module.exports = router;
