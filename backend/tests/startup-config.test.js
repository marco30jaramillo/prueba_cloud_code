/**
 * Pruebas de JWT_SECRET (H-9) y de la validación de arranque.
 * No necesitan base de datos ni dependencias instaladas. Ejecutar con: node --test
 * Los secretos se generan en la prueba; ninguno es real.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const TokenUtils = require('../src/utils/tokenUtils');
const { collectStartupErrors } = require('../src/config/startupChecks');

const SECRETO_VALIDO = 'a1'.repeat(16); // 32 caracteres
const SECRETO_CORTO = 'b2'.repeat(15) + 'c'; // 31 caracteres
const STARTUP_CHECKS = path.resolve(__dirname, '../src/config/startupChecks.js');

// Nombre de la variable del modo CSV eliminado. Se arma así para que el código no la mencione:
// solo se usa para comprobar que un entorno que aún la traiga no cambia nada.
const VARIABLE_HEREDADA = ['DATA', 'PROVIDER'].join('_');

/** Configuración de base de datos local válida, con valores ficticios. */
function baseLocal(extra = {}) {
  return {
    NODE_ENV: 'development',
    DB_SERVER: 'localhost',
    DB_DATABASE: 'base_ficticia',
    DB_USER: 'usuario_ficticio',
    DB_PASSWORD: 'valor-ficticio-de-prueba',
    DB_TRUST_SERVER_CERTIFICATE: 'true',
    ...extra,
  };
}

function conSecretoDeEntorno(valor, fn) {
  const anterior = process.env.JWT_SECRET;
  if (valor === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = valor;
  try {
    return fn();
  } finally {
    if (anterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = anterior;
  }
}

/** Ejecuta la validación de arranque en un proceso aparte, con un entorno controlado. */
function arrancar(env) {
  const base = {};
  for (const clave of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP']) {
    if (process.env[clave] !== undefined) base[clave] = process.env[clave];
  }
  return spawnSync(
    process.execPath,
    ['-e', `require(${JSON.stringify(STARTUP_CHECKS)}).enforceStartupConfig(process.env); console.log('ARRANQUE_OK');`],
    { env: { ...base, ...env }, encoding: 'utf8' }
  );
}

// ── TokenUtils ──────────────────────────────────────────────────────────────

test('TokenUtils sin JWT_SECRET: no se puede instanciar', () => {
  conSecretoDeEntorno(undefined, () => {
    assert.throws(() => new TokenUtils(), TokenUtils.JwtSecretError);
  });
});

test('TokenUtils con JWT_SECRET vacío: no se puede instanciar', () => {
  conSecretoDeEntorno('', () => {
    assert.throws(() => new TokenUtils(), /JWT_SECRET no está definido/);
  });
});

test('TokenUtils con JWT_SECRET de 31 caracteres: no se puede instanciar y no revela el valor', () => {
  conSecretoDeEntorno(SECRETO_CORTO, () => {
    assert.throws(() => new TokenUtils(), (error) => {
      assert.ok(error instanceof TokenUtils.JwtSecretError);
      assert.match(error.message, /al menos 32 caracteres/);
      assert.ok(!error.message.includes(SECRETO_CORTO));
      return true;
    });
  });
});

test('TokenUtils con secreto explícito inválido: tampoco se puede instanciar', () => {
  conSecretoDeEntorno(SECRETO_VALIDO, () => {
    assert.throws(() => new TokenUtils(''), TokenUtils.JwtSecretError);
    assert.throws(() => new TokenUtils(null), TokenUtils.JwtSecretError);
    assert.throws(() => new TokenUtils('corto'), TokenUtils.JwtSecretError);
  });
});

test('TokenUtils con JWT_SECRET de 32 caracteres: firma y verifica', () => {
  conSecretoDeEntorno(SECRETO_VALIDO, () => {
    const utils = new TokenUtils();
    const token = utils.generateToken({ userId: 'usuario-ficticio' });
    assert.equal(utils.verifyToken(token).userId, 'usuario-ficticio');
  });
});

test('un token firmado con otro secreto no verifica (no hay secreto por defecto compartido)', () => {
  const emisor = new TokenUtils('d4'.repeat(16));
  const verificador = new TokenUtils(SECRETO_VALIDO);
  assert.equal(verificador.verifyToken(emisor.generateToken({ userId: 'usuario-ficticio' })), null);
});

test('el código no contiene un valor por defecto para JWT_SECRET', () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, '../src/utils/tokenUtils.js'), 'utf8');
  assert.doesNotMatch(fuente, /JWT_SECRET\s*(\|\||\?\?)/);
});

// ── Validación de arranque (función) ────────────────────────────────────────

test('arranque con base local válida: sin errores', () => {
  assert.deepEqual(collectStartupErrors(baseLocal({ JWT_SECRET: SECRETO_VALIDO })), []);
});

test('arranque sin JWT_SECRET: reporta el error', () => {
  const errores = collectStartupErrors(baseLocal());
  assert.equal(errores.length, 1);
  assert.match(errores[0], /JWT_SECRET/);
});

test('arranque sin base configurada: reporta el error, siempre', () => {
  const errores = collectStartupErrors({ JWT_SECRET: SECRETO_VALIDO });
  assert.equal(errores.length, 1);
  assert.match(errores[0], /no está configurada/);
});

test('arranque sin JWT_SECRET y sin base: reporta los dos errores', () => {
  assert.equal(collectStartupErrors({}).length, 2);
});

test('la variable heredada del modo CSV no evita la validación de la base ni la altera', () => {
  for (const valor of ['csv', 'sql', 'CSV']) {
    const sinBase = collectStartupErrors({ JWT_SECRET: SECRETO_VALIDO, [VARIABLE_HEREDADA]: valor });
    assert.equal(sinBase.length, 1);
    assert.match(sinBase[0], /no está configurada/);
    assert.deepEqual(
      collectStartupErrors(baseLocal({ JWT_SECRET: SECRETO_VALIDO, [VARIABLE_HEREDADA]: valor })),
      []
    );
  }
});

test('arranque con solo AZURE_SQL_*: sin errores', () => {
  const errores = collectStartupErrors({
    JWT_SECRET: SECRETO_VALIDO,
    NODE_ENV: 'production',
    WEBSITE_SITE_NAME: 'app-ficticia',
    AZURE_SQL_SERVER: 'servidor-ficticio.database.windows.net',
    AZURE_SQL_DATABASE: 'base_ficticia',
    AZURE_SQL_USER: 'usuario_ficticio',
    AZURE_SQL_PASSWORD: 'valor-ficticio-de-prueba',
    ...correoAzureValido(),
  });
  assert.deepEqual(errores, []);
});

// ── Correo (requerimiento 003): la validación de arranque ───────────────────

const CADENA_ACS_FICTICIA = 'endpoint=https://recurso-ficticio.communication.azure.com/;accesskey=clave-ficticia-de-prueba';

function correoAzureValido(extra = {}) {
  return {
    MAIL_TRANSPORT: 'azure',
    ACS_EMAIL_CONNECTION_STRING: CADENA_ACS_FICTICIA,
    MAIL_FROM: 'DoNotReply@ficticio.azurecomm.net',
    FRONTEND_URL: 'https://web-ficticia.example.net',
    ...extra,
  };
}

function produccionAzureSql(extra = {}) {
  return {
    JWT_SECRET: SECRETO_VALIDO,
    NODE_ENV: 'production',
    WEBSITE_SITE_NAME: 'app-ficticia',
    AZURE_SQL_SERVER: 'servidor-ficticio.database.windows.net',
    AZURE_SQL_DATABASE: 'base_ficticia',
    AZURE_SQL_USER: 'usuario_ficticio',
    AZURE_SQL_PASSWORD: 'valor-ficticio-de-prueba',
    ...extra,
  };
}

test('correo: en local, sin variables de correo, arranca con outbox por defecto', () => {
  assert.deepEqual(collectStartupErrors(baseLocal({ JWT_SECRET: SECRETO_VALIDO })), []);
});

test('correo: producción con outbox falla', () => {
  const errores = collectStartupErrors(produccionAzureSql(correoAzureValido({ MAIL_TRANSPORT: 'outbox' })));
  assert.equal(errores.length, 1);
  assert.match(errores[0], /MAIL_TRANSPORT/);
});

test('correo: producción sin MAIL_TRANSPORT falla', () => {
  const env = produccionAzureSql(correoAzureValido());
  delete env.MAIL_TRANSPORT;
  const errores = collectStartupErrors(env);
  assert.ok(errores.some((e) => /MAIL_TRANSPORT es obligatorio/.test(e)));
});

test('correo: producción con azure y sin cadena de conexión falla', () => {
  const env = produccionAzureSql(correoAzureValido());
  delete env.ACS_EMAIL_CONNECTION_STRING;
  const errores = collectStartupErrors(env);
  assert.equal(errores.length, 1);
  assert.match(errores[0], /ACS_EMAIL_CONNECTION_STRING/);
});

test('correo: azure sin MAIL_FROM o con uno inválido falla', () => {
  const sin = produccionAzureSql(correoAzureValido());
  delete sin.MAIL_FROM;
  assert.ok(collectStartupErrors(sin).some((e) => /MAIL_FROM/.test(e)));
  const malo = produccionAzureSql(correoAzureValido({ MAIL_FROM: 'no-es-un-correo' }));
  assert.ok(collectStartupErrors(malo).some((e) => /MAIL_FROM/.test(e)));
  const inyeccion = produccionAzureSql(correoAzureValido({ MAIL_FROM: 'a@b.co\nBcc: x@y.zz' }));
  assert.ok(collectStartupErrors(inyeccion).some((e) => /MAIL_FROM/.test(e)));
});

test('correo: producción exige FRONTEND_URL https', () => {
  const sin = produccionAzureSql(correoAzureValido());
  delete sin.FRONTEND_URL;
  assert.ok(collectStartupErrors(sin).some((e) => /FRONTEND_URL/.test(e)));
  const http = produccionAzureSql(correoAzureValido({ FRONTEND_URL: 'http://web-ficticia.example.net' }));
  assert.ok(collectStartupErrors(http).some((e) => /https/.test(e)));
});

test('correo: ningún mensaje de error incluye la cadena de conexión', () => {
  const env = produccionAzureSql(correoAzureValido({ MAIL_TRANSPORT: 'outbox', MAIL_FROM: 'malo' }));
  const texto = collectStartupErrors(env).join(' | ');
  assert.ok(!texto.includes('clave-ficticia-de-prueba'));
  assert.ok(!texto.includes('recurso-ficticio'));
});

test('correo: producción con azure completo arranca sin errores', () => {
  assert.deepEqual(collectStartupErrors(produccionAzureSql(correoAzureValido())), []);
});

// ── Validación de arranque (proceso) ────────────────────────────────────────

test('proceso sin JWT_SECRET: termina con código 1 y mensaje claro', () => {
  const resultado = arrancar(baseLocal());
  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /JWT_SECRET no está definido/);
  assert.doesNotMatch(resultado.stdout, /ARRANQUE_OK/);
});

test('proceso con JWT_SECRET corto: termina con código 1 sin imprimir el valor', () => {
  const resultado = arrancar(baseLocal({ JWT_SECRET: SECRETO_CORTO }));
  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /al menos 32 caracteres/);
  assert.ok(!(resultado.stdout + resultado.stderr).includes(SECRETO_CORTO));
});

test('proceso con JWT_SECRET válido y base local: continúa el arranque', () => {
  const resultado = arrancar(baseLocal({ JWT_SECRET: SECRETO_VALIDO }));
  assert.equal(resultado.status, 0);
  assert.match(resultado.stdout, /ARRANQUE_OK/);
});

test('proceso con JWT_SECRET válido y sin base configurada: termina con código 1', () => {
  const resultado = arrancar({ JWT_SECRET: SECRETO_VALIDO });
  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /no está configurada/);
  assert.doesNotMatch(resultado.stdout, /ARRANQUE_OK/);
});

test('proceso con la variable heredada en csv y base local: arranca igual, usando SQL', () => {
  const resultado = arrancar(baseLocal({ JWT_SECRET: SECRETO_VALIDO, [VARIABLE_HEREDADA]: 'csv' }));
  assert.equal(resultado.status, 0);
  assert.match(resultado.stdout, /ARRANQUE_OK/);
});

test('proceso con guarda de TLS violada: termina con código 1 sin imprimir la contraseña', () => {
  const clave = 'valor-ficticio-de-prueba';
  const resultado = arrancar({
    JWT_SECRET: SECRETO_VALIDO,
    NODE_ENV: 'development',
    DB_SERVER: 'servidor-ficticio.database.windows.net',
    DB_DATABASE: 'base_ficticia',
    DB_USER: 'usuario_ficticio',
    DB_PASSWORD: clave,
    DB_TRUST_SERVER_CERTIFICATE: 'true',
  });
  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /TLS/);
  assert.ok(!(resultado.stdout + resultado.stderr).includes(clave));
  assert.ok(!(resultado.stdout + resultado.stderr).includes(SECRETO_VALIDO));
});

test('proceso con mezcla de familias: termina con código 1', () => {
  const resultado = arrancar({
    JWT_SECRET: SECRETO_VALIDO,
    AZURE_SQL_SERVER: 'servidor-ficticio.database.windows.net',
    AZURE_SQL_DATABASE: 'base_ficticia',
    AZURE_SQL_USER: 'usuario_ficticio',
    AZURE_SQL_PASSWORD: 'valor-ficticio-de-prueba',
    DB_SERVER: 'localhost',
  });
  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /coexisten/);
});
