/**
 * Pruebas de la resolución de configuración de base de datos (H-3, H-4, CA-7).
 * No abren conexiones ni cargan `mssql`. Ejecutar con: node --test
 * Todos los valores son ficticios.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');

const {
  resolveDbConfig,
  normalizeHost,
  isLoopbackHost,
  DbConfigError,
} = require('../src/database/dbConfig');

const CLAVE_FICTICIA = 'valor-ficticio-de-prueba';

function azureEnv(extra = {}) {
  return {
    AZURE_SQL_SERVER: 'servidor-ficticio.database.windows.net',
    AZURE_SQL_DATABASE: 'base_ficticia',
    AZURE_SQL_USER: 'usuario_ficticio',
    AZURE_SQL_PASSWORD: CLAVE_FICTICIA,
    ...extra,
  };
}

function dbEnv(extra = {}) {
  return {
    NODE_ENV: 'development',
    DB_SERVER: 'localhost',
    DB_PORT: '1433',
    DB_DATABASE: 'MiValecito_Dev',
    DB_USER: 'mivalecito_app',
    DB_PASSWORD: CLAVE_FICTICIA,
    DB_ENCRYPT: 'true',
    DB_TRUST_SERVER_CERTIFICATE: 'true',
    ...extra,
  };
}

function cadena(servidor, opciones = '') {
  return `Server=${servidor};Initial Catalog=base_ficticia;User ID=usuario_ficticio;Password=${CLAVE_FICTICIA};${opciones}`;
}

function rechaza(env, patron) {
  assert.throws(() => resolveDbConfig(env), (error) => {
    assert.ok(error instanceof DbConfigError, `se esperaba DbConfigError, llegó ${error.name}`);
    if (patron) assert.match(error.message, patron);
    assert.ok(!error.message.includes(CLAVE_FICTICIA), 'el mensaje no debe incluir la contraseña');
    return true;
  });
}

// ── Producción: familia AZURE_SQL_* ─────────────────────────────────────────

test('solo AZURE_SQL_*: configuración idéntica a la actual', () => {
  const resultado = resolveDbConfig(azureEnv());
  assert.equal(resultado.family, 'AZURE_SQL_*');
  assert.deepEqual(resultado.config, {
    server: 'servidor-ficticio.database.windows.net',
    database: 'base_ficticia',
    user: 'usuario_ficticio',
    password: CLAVE_FICTICIA,
    options: { encrypt: true, trustServerCertificate: false },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  });
});

test('solo AZURE_SQL_*: no depende de NODE_ENV ni de App Service', () => {
  const esperado = resolveDbConfig(azureEnv()).config;
  const variantes = [
    { NODE_ENV: 'production' },
    { NODE_ENV: 'development' },
    { WEBSITE_SITE_NAME: 'app-ficticia', WEBSITE_INSTANCE_ID: 'instancia-ficticia' },
    { NODE_ENV: 'production', WEBSITE_SITE_NAME: 'app-ficticia' },
  ];
  for (const extra of variantes) {
    assert.deepEqual(resolveDbConfig(azureEnv(extra)).config, esperado);
  }
});

test('solo AZURE_SQL_*: ignora DB_ENCRYPT ausente y nunca relaja TLS', () => {
  const { config } = resolveDbConfig(azureEnv({ NODE_ENV: 'development' }));
  assert.equal(config.options.encrypt, true);
  assert.equal(config.options.trustServerCertificate, false);
});

test('AZURE_SQL_* incompleta: falla e indica la variable que falta', () => {
  for (const clave of ['AZURE_SQL_SERVER', 'AZURE_SQL_DATABASE', 'AZURE_SQL_USER', 'AZURE_SQL_PASSWORD']) {
    const env = azureEnv();
    delete env[clave];
    rechaza(env, new RegExp(clave));
  }
});

// ── Producción: cadena de conexión ──────────────────────────────────────────

test('solo AZURE_SQL_CONNECTION_STRING: la cadena se entrega sin modificar', () => {
  const valor = cadena('tcp:servidor-ficticio.database.windows.net,1433', 'Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;');
  const resultado = resolveDbConfig({ AZURE_SQL_CONNECTION_STRING: valor, NODE_ENV: 'production', WEBSITE_SITE_NAME: 'app-ficticia' });
  assert.equal(resultado.family, 'AZURE_SQL_CONNECTION_STRING');
  assert.equal(resultado.config, valor);
  assert.equal(resultado.host, 'servidor-ficticio.database.windows.net');
});

test('cadena de conexión sin opciones de TLS: se acepta sin modificar', () => {
  const valor = cadena('servidor-ficticio.database.windows.net');
  assert.equal(resolveDbConfig({ AZURE_SQL_CONNECTION_STRING: valor }).config, valor);
});

test('cadena de conexión con certificado relajado a host remoto: falla', () => {
  rechaza({
    NODE_ENV: 'development',
    AZURE_SQL_CONNECTION_STRING: cadena('tcp:servidor-ficticio.database.windows.net,1433', 'Encrypt=true;TrustServerCertificate=true;'),
  }, /TLS/);
});

test('cadena de conexión con Encrypt=false a host remoto: falla', () => {
  rechaza({
    NODE_ENV: 'development',
    AZURE_SQL_CONNECTION_STRING: cadena('servidor-ficticio.database.windows.net', 'Encrypt=false;'),
  }, /TLS/);
});

test('cadena de conexión relajada con variantes de escritura: falla', () => {
  const variantes = [
    'Trust Server Certificate=True;',
    'trustservercertificate = yes;',
    'TRUSTSERVERCERTIFICATE=1;',
    'Encrypt=no;',
    'Encrypt=optional;',
    'TrustServerCertificate="true";',
    'TrustServerCertificate=false;TrustServerCertificate=true;',
  ];
  for (const opciones of variantes) {
    rechaza({
      NODE_ENV: 'development',
      AZURE_SQL_CONNECTION_STRING: cadena('servidor-ficticio.database.windows.net', opciones),
    }, /TLS/);
  }
});

test('cadena de conexión relajada a localhost en desarrollo: se acepta', () => {
  const valor = cadena('localhost,1433', 'Encrypt=true;TrustServerCertificate=true;');
  assert.equal(resolveDbConfig({ NODE_ENV: 'development', AZURE_SQL_CONNECTION_STRING: valor }).config, valor);
});

test('cadena de conexión relajada a localhost sin NODE_ENV o en App Service: falla', () => {
  const valor = cadena('localhost', 'TrustServerCertificate=true;');
  rechaza({ AZURE_SQL_CONNECTION_STRING: valor }, /NODE_ENV/);
  rechaza({ NODE_ENV: 'production', AZURE_SQL_CONNECTION_STRING: valor }, /NODE_ENV/);
  rechaza({ NODE_ENV: 'development', WEBSITE_SITE_NAME: 'app-ficticia', AZURE_SQL_CONNECTION_STRING: valor }, /App Service/);
});

test('cadena de conexión relajada sin servidor reconocible: falla', () => {
  rechaza({
    NODE_ENV: 'development',
    AZURE_SQL_CONNECTION_STRING: `Initial Catalog=base_ficticia;TrustServerCertificate=true;`,
  }, /servidor/);
});

test('una contraseña entre comillas que contiene opciones de TLS no dispara la guarda', () => {
  const valor = 'Server=servidor-ficticio.database.windows.net;Password="ficticia;TrustServerCertificate=true;Encrypt=false";Encrypt=true;';
  assert.equal(resolveDbConfig({ AZURE_SQL_CONNECTION_STRING: valor, NODE_ENV: 'production' }).config, valor);
});

// ── Familia DB_* y guarda de TLS ────────────────────────────────────────────

test('DB_* local en desarrollo: acepta el certificado relajado', () => {
  const resultado = resolveDbConfig(dbEnv());
  assert.equal(resultado.family, 'DB_*');
  assert.equal(resultado.host, 'localhost');
  assert.deepEqual(resultado.config, {
    server: 'localhost',
    port: 1433,
    database: 'MiValecito_Dev',
    user: 'mivalecito_app',
    password: CLAVE_FICTICIA,
    options: { encrypt: true, trustServerCertificate: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  });
});

test('DB_* con NODE_ENV=test: acepta el certificado relajado', () => {
  assert.equal(resolveDbConfig(dbEnv({ NODE_ENV: 'test' })).config.options.trustServerCertificate, true);
});

test('NODE_ENV ausente: falla', () => {
  const env = dbEnv();
  delete env.NODE_ENV;
  rechaza(env, /NODE_ENV/);
});

test('NODE_ENV=production, vacío o con otra escritura: falla', () => {
  for (const valor of ['production', '', 'Development', 'development ', 'dev', 'staging']) {
    rechaza(dbEnv({ NODE_ENV: valor }), /NODE_ENV/);
  }
});

test('localhost\\SQLEXPRESS: se acepta como bucle local', () => {
  const env = dbEnv({ DB_SERVER: 'localhost\\SQLEXPRESS' });
  delete env.DB_PORT;
  const resultado = resolveDbConfig(env);
  assert.equal(resultado.host, 'localhost');
  assert.equal(resultado.config.server, 'localhost');
  assert.equal(resultado.config.options.instanceName, 'SQLEXPRESS');
  assert.equal(resultado.config.port, undefined);
});

test('127.0.0.1, ::1, (local), . y variantes con tcp: y puerto: se aceptan', () => {
  for (const servidor of ['127.0.0.1', '::1', '(local)', '.', 'LOCALHOST', 'tcp:localhost,1433', 'tcp:127.0.0.1,1433', '.\\SQLEXPRESS', '(local)\\SQLEXPRESS']) {
    const resultado = resolveDbConfig(dbEnv({ DB_SERVER: servidor }));
    assert.equal(resultado.config.options.trustServerCertificate, true, servidor);
    assert.ok(isLoopbackHost(servidor), servidor);
  }
});

test('localhost.algo.com: falla (nunca por prefijo)', () => {
  rechaza(dbEnv({ DB_SERVER: 'localhost.algo.com' }), /bucle local/);
});

test('hosts que contienen o se parecen a localhost: fallan', () => {
  const servidores = [
    'algo.localhost',
    'localhost.',
    'mi-localhost',
    '127.0.0.1.algo.com',
    '127.0.0.2',
    '10.0.0.5',
    '0.0.0.0',
    'servidor-ficticio.database.windows.net',
    'servidor-ficticio.database.windows.net\\localhost',
    'servidor-ficticio.database.windows.net,localhost',
    'tcp:servidor-ficticio.database.windows.net,1433',
  ];
  for (const servidor of servidores) {
    assert.equal(isLoopbackHost(servidor), false, servidor);
    assert.throws(() => resolveDbConfig(dbEnv({ DB_SERVER: servidor, DB_PORT: '' })), DbConfigError, servidor);
  }
});

test('nombre de máquina: falla', () => {
  const nombres = new Set(['MI-PC', 'DESKTOP-FICTICIO', os.hostname()]);
  for (const nombre of nombres) {
    rechaza(dbEnv({ DB_SERVER: nombre }), /bucle local/);
    rechaza(dbEnv({ DB_SERVER: `${nombre}\\SQLEXPRESS`, DB_PORT: '' }), /bucle local/);
  }
});

test('WEBSITE_SITE_NAME presente: falla aunque sea localhost en desarrollo', () => {
  rechaza(dbEnv({ WEBSITE_SITE_NAME: 'app-ficticia' }), /App Service/);
});

test('WEBSITE_INSTANCE_ID presente, incluso vacío: falla', () => {
  rechaza(dbEnv({ WEBSITE_INSTANCE_ID: 'instancia-ficticia' }), /App Service/);
  rechaza(dbEnv({ WEBSITE_INSTANCE_ID: '' }), /App Service/);
});

test('DB_ENCRYPT=false se trata igual que el certificado relajado', () => {
  const relajado = { DB_ENCRYPT: 'false', DB_TRUST_SERVER_CERTIFICATE: 'false' };
  assert.equal(resolveDbConfig(dbEnv(relajado)).config.options.encrypt, false);
  rechaza(dbEnv({ ...relajado, DB_SERVER: 'servidor-ficticio.database.windows.net' }), /TLS/);
  rechaza(dbEnv({ ...relajado, NODE_ENV: 'production' }), /NODE_ENV/);
});

test('DB_* con TLS estricto a host remoto: se acepta en cualquier ambiente', () => {
  const env = dbEnv({
    NODE_ENV: 'production',
    WEBSITE_SITE_NAME: 'app-ficticia',
    DB_SERVER: 'servidor-ficticio.database.windows.net',
    DB_ENCRYPT: 'true',
    DB_TRUST_SERVER_CERTIFICATE: 'false',
  });
  assert.deepEqual(resolveDbConfig(env).config.options, { encrypt: true, trustServerCertificate: false });
});

test('DB_* sin DB_ENCRYPT ni DB_TRUST_SERVER_CERTIFICATE: valores estrictos por defecto', () => {
  const env = dbEnv({ DB_SERVER: 'servidor-ficticio.database.windows.net' });
  delete env.DB_ENCRYPT;
  delete env.DB_TRUST_SERVER_CERTIFICATE;
  delete env.NODE_ENV;
  assert.deepEqual(resolveDbConfig(env).config.options, { encrypt: true, trustServerCertificate: false });
});

test('DB_* con booleano no reconocido: falla', () => {
  rechaza(dbEnv({ DB_TRUST_SERVER_CERTIFICATE: 'si' }), /DB_TRUST_SERVER_CERTIFICATE/);
  rechaza(dbEnv({ DB_ENCRYPT: '0' }), /DB_ENCRYPT/);
});

test('DB_* incompleta: falla e indica la variable que falta', () => {
  for (const clave of ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD']) {
    const env = dbEnv();
    delete env[clave];
    rechaza(env, new RegExp(clave));
  }
});

test('DB_PORT inválido o distinto del puerto de DB_SERVER: falla', () => {
  rechaza(dbEnv({ DB_PORT: 'abc' }), /DB_PORT/);
  rechaza(dbEnv({ DB_PORT: '70000' }), /DB_PORT/);
  rechaza(dbEnv({ DB_SERVER: 'localhost,1434', DB_PORT: '1433' }), /no coinciden/);
});

// ── Mezcla de familias ──────────────────────────────────────────────────────

test('mezcla DB_* y AZURE_SQL_*: falla', () => {
  rechaza({ ...dbEnv(), ...azureEnv() }, /coexisten/);
});

test('mezcla cadena de conexión y AZURE_SQL_*: falla', () => {
  rechaza({ ...azureEnv(), AZURE_SQL_CONNECTION_STRING: cadena('servidor-ficticio.database.windows.net') }, /coexisten/);
});

test('mezcla cadena de conexión y DB_*: falla', () => {
  rechaza({ ...dbEnv(), AZURE_SQL_CONNECTION_STRING: cadena('localhost') }, /coexisten/);
});

test('una sola variable de otra familia basta para considerar mezcla', () => {
  rechaza(azureEnv({ DB_TRUST_SERVER_CERTIFICATE: 'true' }), /coexisten/);
  rechaza(azureEnv({ DB_SERVER: 'localhost' }), /coexisten/);
  rechaza(dbEnv({ AZURE_SQL_SERVER: 'servidor-ficticio.database.windows.net' }), /coexisten/);
});

test('las tres formas a la vez: falla', () => {
  rechaza({ ...dbEnv(), ...azureEnv(), AZURE_SQL_CONNECTION_STRING: cadena('localhost') }, /coexisten/);
});

test('ninguna forma presente: falla', () => {
  rechaza({}, /no está configurada/);
  rechaza({ NODE_ENV: 'development', AZURE_SQL_SERVER: '', DB_SERVER: '' }, /no está configurada/);
});

// ── Utilidades ──────────────────────────────────────────────────────────────

test('normalizeHost: quita tcp:, puerto e instancia y pasa a minúsculas', () => {
  assert.equal(normalizeHost('tcp:Servidor.Ejemplo.NET,1433'), 'servidor.ejemplo.net');
  assert.equal(normalizeHost('LOCALHOST\\SQLEXPRESS'), 'localhost');
  assert.equal(normalizeHost('  tcp:localhost\\SQLEXPRESS,1433 '), 'localhost');
  assert.equal(normalizeHost('.\\SQLEXPRESS'), '.');
  assert.equal(normalizeHost('::1,1433'), '::1');
  assert.equal(normalizeHost(undefined), '');
});

test('resolveDbConfig no modifica el entorno recibido', () => {
  const env = Object.freeze(dbEnv());
  assert.doesNotThrow(() => resolveDbConfig(env));
});

test('el modo CSV ya no existe: el módulo no exporta usingSql y una variable de proveedor heredada no cambia nada', () => {
  assert.equal(require('../src/database/dbConfig').usingSql, undefined);
  const esperado = resolveDbConfig(dbEnv());
  for (const valor of ['csv', 'sql', 'CSV', '']) {
    assert.deepEqual(resolveDbConfig(dbEnv({ ['DATA_' + 'PROVIDER']: valor })), esperado);
  }
});
