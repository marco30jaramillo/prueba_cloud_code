const { test } = require('node:test');
const assert = require('node:assert/strict');

const { assertEntornoLocal, EntornoNoLocalError } = require('../scripts/lib/entornoLocal');
const { validarScript, listarScripts, SERVIDOR, BASE } = require('../scripts/db-setup');
const { describeConnection, diagnoseConnectionError } = require('../src/database/dbDiagnostics');

const DB_LOCAL = {
  NODE_ENV: 'development',
  DB_SERVER: 'localhost',
  DB_DATABASE: 'MiValecito_Dev',
  DB_USER: 'mivalecito_app',
  DB_PASSWORD: 'clave-ficticia-de-prueba',
  DB_TRUST_SERVER_CERTIFICATE: 'true',
};
const AZURE = {
  AZURE_SQL_SERVER: 'ejemplo.database.windows.net',
  AZURE_SQL_DATABASE: 'ejemplo',
  AZURE_SQL_USER: 'ejemplo',
  AZURE_SQL_PASSWORD: 'clave-ficticia-de-prueba',
};

// ── Guarda de entorno local (seed y db-setup) ────────────────────────────────

test('seed: acepta DB_* completa hacia bucle local', () => {
  assert.deepEqual(assertEntornoLocal(DB_LOCAL), { family: 'DB_*', host: 'localhost' });
  assert.equal(assertEntornoLocal({ ...DB_LOCAL, DB_SERVER: 'localhost\\SQLEXPRESS' }).host, 'localhost');
});

test('seed: se niega con AZURE_SQL_*, sola o mezclada', () => {
  assert.throws(() => assertEntornoLocal(AZURE), EntornoNoLocalError);
  assert.throws(() => assertEntornoLocal({ ...DB_LOCAL, ...AZURE }), EntornoNoLocalError);
  assert.throws(() => assertEntornoLocal({ AZURE_SQL_SERVER: 'ejemplo.database.windows.net' }), EntornoNoLocalError);
});

test('seed: se niega con cadena de conexión, aunque apunte a localhost', () => {
  const env = { AZURE_SQL_CONNECTION_STRING: 'Server=localhost;Database=x;User Id=y;Password=clave-ficticia;Encrypt=true' };
  assert.throws(() => assertEntornoLocal(env), EntornoNoLocalError);
});

test('seed: se niega con DB_* hacia un host que no es de bucle local', () => {
  for (const servidor of ['ejemplo.database.windows.net', 'localhost.algo.com', 'MI-PC', '192.168.1.10']) {
    assert.throws(
      () => assertEntornoLocal({ ...DB_LOCAL, DB_SERVER: servidor, DB_TRUST_SERVER_CERTIFICATE: 'false' }),
      EntornoNoLocalError,
      servidor
    );
  }
});

test('seed: se niega sin configuración o con DB_* incompleta', () => {
  assert.throws(() => assertEntornoLocal({}), { code: 'DB_CONFIG_INVALID' });
  const { DB_PASSWORD, ...incompleta } = DB_LOCAL;
  assert.throws(() => assertEntornoLocal(incompleta), { code: 'DB_CONFIG_INVALID' });
});

test('guarda: los mensajes de rechazo no incluyen la contraseña ni la cadena', () => {
  const casos = [
    AZURE,
    { ...DB_LOCAL, ...AZURE },
    { AZURE_SQL_CONNECTION_STRING: 'Server=remoto;Password=clave-ficticia-de-prueba' },
    { ...DB_LOCAL, DB_SERVER: 'remoto.ejemplo.com' },
  ];
  for (const env of casos) {
    try {
      assertEntornoLocal(env);
      assert.fail('debía negarse');
    } catch (error) {
      assert.ok(!error.message.includes('clave-ficticia'), error.message);
    }
  }
});

test('db-setup: no exige DB_*, pero se niega con otra familia o DB_SERVER remoto', () => {
  const opciones = { exigirConexion: false, nombre: 'db-setup' };
  assert.deepEqual(assertEntornoLocal({}, opciones), { family: 'DB_*', host: null });
  assert.equal(assertEntornoLocal(DB_LOCAL, opciones).host, 'localhost');
  assert.throws(() => assertEntornoLocal(AZURE, opciones), EntornoNoLocalError);
  assert.throws(() => assertEntornoLocal({ DB_SERVER: 'remoto.ejemplo.com' }, opciones), EntornoNoLocalError);
});

// ── Filtro de scripts de db-setup ────────────────────────────────────────────

test('db-setup: servidor y base fijos', () => {
  assert.equal(SERVIDOR, 'localhost');
  assert.equal(BASE, 'MiValecito_Dev');
});

test('db-setup: acepta SQL normal con GO y tildes', () => {
  const sql = "SET NOCOUNT ON;\nGO\nINSERT INTO dbo.x (d) VALUES (N'Gestión: módulos');\nGO\n";
  assert.equal(validarScript(Buffer.from(sql, 'utf8'), 'x.sql'), sql);
});

test('db-setup: rechaza comandos de sqlcmd al inicio de línea', () => {
  const comandos = [':r otro.sql', '  :connect remoto', '!!dir', '\t!! whoami', 'RESET', 'reset  ', 'EXIT', 'exit(SELECT 1)', 'QUIT', 'ED', ':setvar x 1'];
  for (const comando of comandos) {
    assert.throws(
      () => validarScript(Buffer.from(`SELECT 1;\n${comando}\nSELECT 2;\n`, 'utf8'), 'x.sql'),
      /comandos de sqlcmd/,
      comando
    );
  }
});

test('db-setup: rechaza comandos de sqlcmd tras cualquier blanco horizontal', () => {
  // Tabulador vertical, salto de página y espacio de no separación, antes y después.
  const comandos = ['\v:r otro.sql', '\v!!dir', '\f:connect remoto', ' !! whoami', ' \v\texit', 'RESET\v', 'quit\f ', '\vED\v'];
  for (const comando of comandos) {
    assert.throws(
      () => validarScript(Buffer.from(`SELECT 1;\n${comando}\nSELECT 2;\n`, 'utf8'), 'x.sql'),
      /comandos de sqlcmd/,
      JSON.stringify(comando)
    );
  }
});

test('db-setup: no confunde palabras que solo empiezan igual', () => {
  for (const linea of ['EDITAR_ALGO = 1', 'RESETEAR = 1', 'QUITAR = 1', "SELECT 'a:b';", 'SELECT 1 -- !! nota']) {
    assert.doesNotThrow(() => validarScript(Buffer.from(`${linea}\n`, 'utf8'), 'x.sql'), linea);
  }
});

test('db-setup: rechaza lo que no es UTF-8', () => {
  assert.throws(() => validarScript(Buffer.from('SELECT 1;', 'utf16le'), 'x.sql'), /UTF-8/);
  assert.throws(() => validarScript(Buffer.from([0xff, 0xfe, 0x53, 0x00]), 'x.sql'), /UTF-8/);
  assert.throws(() => validarScript(Buffer.from("SELECT 'Gestión';", 'latin1'), 'x.sql'), /UTF-8/);
});

test('db-setup: lista esquemas (sin 00_) y luego inserts, en orden; nunca alters', () => {
  const relativas = listarScripts().map((script) => script.relativa);
  assert.ok(relativas.length > 0);
  assert.ok(relativas.every((r) => /^(esquemas|inserts)\/(?!00_)[^/]+\.sql$/.test(r)), relativas.join(', '));
  const esquemas = relativas.filter((r) => r.startsWith('esquemas/'));
  const inserts = relativas.filter((r) => r.startsWith('inserts/'));
  assert.deepEqual(relativas, [...[...esquemas].sort(), ...[...inserts].sort()]);
});

// ── Mensajes de arranque ─────────────────────────────────────────────────────

test('arranque: la descripción lleva familia y host, nada más', () => {
  assert.equal(describeConnection({ family: 'DB_*', host: 'localhost', config: { password: 'clave-ficticia' } }),
    'configuración DB_*, host localhost');
});

test('arranque: diagnóstico local para servicio detenido, credenciales y base', () => {
  const local = { family: 'DB_*', host: 'localhost' };
  const conexion = diagnoseConnectionError({ code: 'ESOCKET', message: 'Failed to connect to localhost:1433 - Could not connect (sequence)' }, local).join('\n');
  assert.match(conexion, /Servicio detenido/);
  assert.match(conexion, /Puerto/);
  assert.doesNotMatch(conexion, /Azure/);

  const login = diagnoseConnectionError({ code: 'ELOGIN', number: 18456, message: "Login failed for user 'mivalecito_app'." }, local).join('\n');
  assert.match(login, /DB_USER y DB_PASSWORD/);

  const base = diagnoseConnectionError({ number: 4060, message: 'Cannot open database "MiValecito_Dev" requested by the login.' }, local).join('\n');
  assert.match(base, /db:setup/);
});

test('arranque: diagnóstico remoto conserva la pista del firewall', () => {
  const remoto = { family: 'AZURE_SQL_*', host: 'ejemplo.database.windows.net' };
  const lineas = diagnoseConnectionError({ code: 'ETIMEOUT', message: 'Failed to connect to ejemplo.database.windows.net:1433 in 15000ms' }, remoto).join('\n');
  assert.match(lineas, /firewall/);
  assert.doesNotMatch(lineas, /services\.msc/);
});
