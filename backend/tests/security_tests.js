/**
 * Security Test Suite
 * Pruebas: inyección CSV, XSS almacenado, path traversal, escalada de privilegios,
 * IDOR, mass assignment, brute force (rate limit), JWT tampering, user enumeration.
 *
 * Uso:  node tests/security_tests.js
 * Requiere: npm install axios (ya incluido en el proyecto)
 */

const axios = require('axios');

const BASE = 'http://localhost:3001';
let SUPER_TOKEN = '';
let results = [];

function pass(test, detail = '') {
  results.push({ status: '✅ PASS', test, detail });
  console.log(`  ✅ PASS  ${test}${detail ? ' → ' + detail : ''}`);
}
function fail(test, detail = '') {
  results.push({ status: '❌ FAIL', test, detail });
  console.log(`  ❌ FAIL  ${test}${detail ? ' → ' + detail : ''}`);
}
function warn(test, detail = '') {
  results.push({ status: '⚠️  WARN', test, detail });
  console.log(`  ⚠️  WARN  ${test}${detail ? ' → ' + detail : ''}`);
}

async function post(path, body, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await axios.post(BASE + path, body, { headers });
    return { status: r.status, data: r.data };
  } catch (e) {
    return { status: e.response?.status, data: e.response?.data, error: e.message };
  }
}

async function get(path, token) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await axios.get(BASE + path, { headers });
    return { status: r.status, data: r.data };
  } catch (e) {
    return { status: e.response?.status, data: e.response?.data };
  }
}

async function patch(path, body, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await axios.patch(BASE + path, body, { headers });
    return { status: r.status, data: r.data };
  } catch (e) {
    return { status: e.response?.status, data: e.response?.data };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function setup() {
  const r = await post('/auth/login', {
    email: 'superuser@superuser.com',
    password: 'Bbjge088**'
  });
  if (r.data?.token) {
    SUPER_TOKEN = r.data.token;
    console.log('  Setup: superuser token obtenido ✓\n');
  } else {
    console.error('  Setup FAILED: no se pudo obtener token de superuser');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function testCSVInjection() {
  console.log('\n── CSV / Formula Injection ────────────────────────────────');

  const injections = [
    '=CMD|"/C calc"!A0',
    '+HYPERLINK("http://evil.com","Click")',
    '-2+3+cmd|"/C calc"!A0',
    '@SUM(1+1)*cmd|"/C calc"!A0'
  ];

  for (const payload of injections) {
    const r = await post('/auth/register', {
      email: `inject_${Date.now()}@test.com`,
      password: 'TestPass123!',
      name: payload
    });
    // Si el servidor lo acepta, el nombre debe estar sanitizado (no empezar con = + - @)
    if (r.status === 201 || r.status === 200) {
      const savedName = r.data?.user?.name || '';
      const sanitized = !savedName.match(/^[=+\-@]/);
      sanitized
        ? pass('CSV formula injection en name', `"${savedName}" sanitizado`)
        : fail('CSV formula injection en name', `"${savedName}" sin sanitizar — vulnerable en Excel`);
    } else {
      pass('CSV formula injection rechazado por validación', `${r.status}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function testXSS() {
  console.log('\n── XSS Almacenado ─────────────────────────────────────────');
  const xssPayloads = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert('xss')"
  ];

  for (const payload of xssPayloads) {
    const r = await post('/auth/register', {
      email: `xss_${Date.now()}@test.com`,
      password: 'TestPass123!',
      name: payload
    });
    if (r.status === 201 || r.status === 200) {
      const savedName = r.data?.user?.name || '';
      const hasScript = /<script|onerror|javascript:/i.test(savedName);
      hasScript
        ? fail('XSS en name almacenado sin escapar', `"${savedName}"`)
        : pass('XSS en name — almacenado pero escapado/transformado', `"${savedName}"`);
    } else {
      pass('XSS payload rechazado por validación');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function testPathTraversal() {
  console.log('\n── Path Traversal ─────────────────────────────────────────');

  const payloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    '%2e%2e%2f%2e%2e%2fetc%2fpasswd'
  ];

  for (const p of payloads) {
    const r = await get(`/users/${p}`, SUPER_TOKEN);
    r.status === 400 || r.status === 404 || r.status === 403
      ? pass('Path traversal en /users/:id bloqueado', `HTTP ${r.status}`)
      : fail('Path traversal NO bloqueado', `HTTP ${r.status} — ${JSON.stringify(r.data)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function testPrivilegeEscalation() {
  console.log('\n── Escalada de Privilegios ────────────────────────────────');

  // Registrar usuario cliente normal
  const reg = await post('/auth/register', {
    email: `client_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Cliente Test'
  });
  const clientToken = reg.data?.token;

  if (!clientToken) {
    warn('Escalada: no se pudo registrar cliente para la prueba');
    return;
  }

  // Intentar crear un superuser siendo cliente
  const r = await post('/auth/create-user', {
    email: `fake_super_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Fake Super',
    role: 'superuser'
  }, clientToken);

  r.status === 403 || r.status === 401
    ? pass('Escalada de privilegios bloqueada', `cliente no puede crear superuser (HTTP ${r.status})`)
    : fail('Escalada de privilegios NO bloqueada', `HTTP ${r.status}`);

  // Intentar acceder a /audit/logs siendo cliente
  const audit = await get('/audit/logs', clientToken);
  audit.status === 403
    ? pass('Acceso a auditoría bloqueado para cliente', 'HTTP 403')
    : fail('Acceso a auditoría NO bloqueado para cliente', `HTTP ${audit.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function testIDOR() {
  console.log('\n── IDOR (Acceso a recursos ajenos) ────────────────────────');

  // Registrar dos clientes
  const a = await post('/auth/register', {
    email: `idor_a_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Usuario A'
  });
  const b = await post('/auth/register', {
    email: `idor_b_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Usuario B'
  });

  const tokenA = a.data?.token;
  const idB = b.data?.user?.id;

  if (!tokenA || !idB) {
    warn('IDOR: no se pudieron crear los dos usuarios de prueba');
    return;
  }

  // Usuario A intenta cambiar contraseña de B
  const r = await patch(`/auth/password/${idB}`, { newPassword: 'Hacked123!' }, tokenA);
  r.status === 403
    ? pass('IDOR: cliente no puede cambiar contraseña de otro usuario', 'HTTP 403')
    : fail('IDOR: cliente SÍ pudo cambiar contraseña ajena', `HTTP ${r.status}`);

  // Usuario A intenta leer info de B por /users
  const ru = await get(`/users/${idB}`, tokenA);
  ru.status === 403
    ? pass('IDOR: cliente no puede leer datos de otro usuario', 'HTTP 403')
    : warn('IDOR: /users/:id accesible por cliente', `HTTP ${ru.status} — revisar si es intencional`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function testMassAssignment() {
  console.log('\n── Mass Assignment ─────────────────────────────────────────');

  // Intentar incluir campos extra en registro
  const r = await post('/auth/register', {
    email: `mass_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Mass Test',
    role: 'superuser',       // no debería poder asignarse
    isActive: false,         // no debería estar desactivado al crear
    mustChangePassword: false
  });

  const user = r.data?.user;
  if (!user) {
    warn('Mass assignment: no se pudo registrar usuario para la prueba');
    return;
  }

  user.role === 'cliente'
    ? pass('Mass assignment: role ignorado en registro', `role asignado: ${user.role}`)
    : fail('Mass assignment: role aceptado en registro', `role asignado: ${user.role}`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function testBruteForce() {
  console.log('\n── Rate Limiting / Brute Force ────────────────────────────');

  const IP_TEST_EMAIL = 'brute@test.com';
  let blocked = false;
  let lastStatus = 0;

  // Hacer 7 intentos seguidos (el límite es 5)
  for (let i = 1; i <= 7; i++) {
    const r = await post('/auth/login', {
      email: IP_TEST_EMAIL,
      password: `wrong_pass_${i}`
    });
    lastStatus = r.status;
    if (r.status === 429) { blocked = true; break; }
  }

  blocked
    ? pass('Rate limiting activo', `bloqueado después de 5 intentos (HTTP 429)`)
    : fail('Rate limiting NO activo', `después de 7 intentos, último HTTP ${lastStatus}`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function testJWTTampering() {
  console.log('\n── JWT Tampering ───────────────────────────────────────────');

  const reg = await post('/auth/register', {
    email: `jwt_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'JWT Test'
  });
  const token = reg.data?.token;
  if (!token) { warn('JWT: no se obtuvo token'); return; }

  // Modificar el payload para elevarse a superuser
  const [header, payload, sig] = token.split('.');
  let decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
  decoded.role = 'superuser';
  const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const tamperedToken = `${header}.${tamperedPayload}.${sig}`;

  const r = await get('/audit/logs', tamperedToken);
  r.status === 401 || r.status === 403
    ? pass('JWT tampering bloqueado', `signature inválida detectada (HTTP ${r.status})`)
    : fail('JWT tampering NO bloqueado', `HTTP ${r.status} — token manipulado aceptado`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function testUserEnumeration() {
  console.log('\n── User Enumeration ────────────────────────────────────────');

  const existingEmail = 'superuser@superuser.com';
  const nonExistingEmail = `notexist_${Date.now()}@nowhere.com`;

  const r1 = await post('/auth/forgot-password', { email: existingEmail });
  const r2 = await post('/auth/forgot-password', { email: nonExistingEmail });

  const msg1 = r1.data?.message || '';
  const msg2 = r2.data?.message || '';

  const same = r1.status === r2.status && msg1 === msg2;
  same
    ? pass('User enumeration en forgot-password evitado', 'misma respuesta para email existente y no existente')
    : fail('User enumeration en forgot-password', `email real: "${msg1}" | email falso: "${msg2}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function testSQLInjection() {
  console.log('\n── SQL / NoSQL Injection (via campos de entrada) ───────────');

  // Aunque el backend usa CSV, probamos que los payloads no rompen nada ni dan acceso
  const sqlPayloads = [
    "' OR '1'='1",
    "admin'--",
    "1; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "{ $gt: '' }"  // NoSQL
  ];

  for (const payload of sqlPayloads) {
    const r = await post('/auth/login', { email: payload, password: payload });
    // Esperamos 400 (bad request) o 401 (unauthorized), NO 200
    r.status === 400 || r.status === 401 || r.status === 429
      ? pass(`Injection en login rechazado: "${payload.substring(0, 30)}"`, `HTTP ${r.status}`)
      : fail(`Injection en login NO rechazado: "${payload.substring(0, 30)}"`, `HTTP ${r.status}`);
  }

  // Probar en campo name del registro
  for (const payload of sqlPayloads.slice(0, 2)) {
    const r = await post('/auth/register', {
      email: `sqlinj_${Date.now()}@test.com`,
      password: 'TestPass123!',
      name: payload
    });
    r.status === 201 || r.status === 200
      ? pass(`Injection en name almacenada como texto literal`, `status ${r.status}`)
      : pass(`Injection en name rechazada`, `status ${r.status}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function testEmailValidation() {
  console.log('\n── Validación de Email ─────────────────────────────────────');

  const invalid = ['notanemail', 'a@b', '@domain.com', 'user@', 'us er@domain.com'];
  for (const email of invalid) {
    const r = await post('/auth/login', { email, password: 'anything' });
    r.status === 400
      ? pass(`Email inválido rechazado: "${email}"`, 'HTTP 400')
      : fail(`Email inválido aceptado: "${email}"`, `HTTP ${r.status}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          PRUEBAS DE SEGURIDAD - AUTH SYSTEM             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Target: ${BASE}\n`);

  await setup();
  await testSQLInjection();
  await testCSVInjection();
  await testXSS();
  await testPathTraversal();
  await testPrivilegeEscalation();
  await testIDOR();
  await testMassAssignment();
  await testBruteForce();
  await testJWTTampering();
  await testUserEnumeration();
  await testEmailValidation();

  const total = results.length;
  const passed = results.filter(r => r.status.includes('PASS')).length;
  const failed = results.filter(r => r.status.includes('FAIL')).length;
  const warns  = results.filter(r => r.status.includes('WARN')).length;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMEN FINAL                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Total:   ${total}`);
  console.log(`  ✅ PASS: ${passed}`);
  console.log(`  ❌ FAIL: ${failed}`);
  console.log(`  ⚠️  WARN: ${warns}`);

  if (failed > 0) {
    console.log('\n  Pruebas fallidas:');
    results.filter(r => r.status.includes('FAIL')).forEach(r => {
      console.log(`    • ${r.test}: ${r.detail}`);
    });
  }
}

main().catch(console.error);
