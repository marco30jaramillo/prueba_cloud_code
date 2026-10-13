/**
 * Guardas del corredor de pruebas con base de datos (`scripts/db-test.js`), del módulo
 * compartido de `sqlcmd`, del precargado que limita el backend de pruebas a 127.0.0.1, del
 * redactor de secretos y del reporter. Sin base de datos, sin SQL Server y sin red:
 * corre en el job `pruebas-release`.
 *
 * Req. 006 (CA-4, CA-12; condiciones de seguridad 1, 2, 4, 6, 8, 11 y 12).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { EntornoNoLocalError } = require('../scripts/lib/entornoLocal');
const dbTest = require('../scripts/db-test');
const webTest = require('../scripts/web-test');
const sqlcmd = require('../scripts/lib/sqlcmd');
const { crearRedactor } = require('../scripts/lib/redactor');

const RAIZ = path.resolve(__dirname, '..');
const ARGV = ['node', 'db-test.js'];
const DB_LOCAL = {
  NODE_ENV: 'development',
  DB_SERVER: 'localhost',
  DB_DATABASE: 'MiValecito_Dev',
  DB_USER: 'mivalecito_app',
  DB_PASSWORD: 'clave-ficticia-de-prueba',
};
const AZURE = {
  AZURE_SQL_SERVER: 'ejemplo.database.windows.net',
  AZURE_SQL_DATABASE: 'ejemplo',
  AZURE_SQL_USER: 'ejemplo',
  AZURE_SQL_PASSWORD: 'clave-ficticia-de-prueba',
};

// ── CA-4: guardas del corredor ───────────────────────────────────────────────

test('CA-4 · el corredor acepta un entorno local sin argumentos', () => {
  assert.doesNotThrow(() => dbTest.validarInvocacion({ argv: ARGV, env: DB_LOCAL }));
  assert.doesNotThrow(() => dbTest.validarInvocacion({ argv: ARGV, env: {} }));
});

test('CA-4 · el corredor se niega con AZURE_SQL_*, sola, mezclada o como cadena de conexión', () => {
  const casos = [
    AZURE,
    { ...DB_LOCAL, ...AZURE },
    { AZURE_SQL_SERVER: 'ejemplo.database.windows.net' },
    { AZURE_SQL_CONNECTION_STRING: 'Server=localhost;Database=x;User Id=y;Password=clave-ficticia' },
  ];
  for (const env of casos) {
    assert.throws(() => dbTest.validarInvocacion({ argv: ARGV, env }), EntornoNoLocalError);
  }
});

test('CA-4 · el corredor se niega con DB_SERVER que no es de bucle local', () => {
  for (const servidor of ['ejemplo.database.windows.net', 'localhost.algo.com', 'MI-PC', '192.168.1.10']) {
    assert.throws(
      () => dbTest.validarInvocacion({ argv: ARGV, env: { ...DB_LOCAL, DB_SERVER: servidor } }),
      EntornoNoLocalError,
      servidor
    );
  }
});

test('CA-4 · el corredor rechaza cualquier argumento (no acepta nombre de base)', () => {
  for (const extra of [['MiValecito_Test'], ['--base=MiValecito_Dev'], ['x', 'y']]) {
    assert.throws(() => dbTest.validarInvocacion({ argv: [...ARGV, ...extra], env: DB_LOCAL }), /no acepta argumentos/);
  }
});

test('CA-4 · la base de pruebas es fija y distinta de la de desarrollo', () => {
  assert.equal(dbTest.BASE_PRUEBAS, 'MiValecito_Test');
  assert.notEqual(dbTest.BASE_PRUEBAS.toLowerCase(), dbTest.BASE_DESARROLLO.toLowerCase());
  assert.equal(dbTest.BASE_DESARROLLO, 'MiValecito_Dev');
  assert.equal(dbTest.validarNombreBase(dbTest.BASE_PRUEBAS, DB_LOCAL), 'MiValecito_Test');
  for (const nombre of ['MiValecito_Dev', 'mivalecito_dev', 'master', 'db_dev_mivalecito_001', 'MiValecito_Test; DROP DATABASE x', 'miValecito_test']) {
    assert.throws(() => dbTest.validarNombreBase(nombre, DB_LOCAL), /fijo|no puede ser/, nombre);
  }
});

test('CA-4 · el corredor se niega si DB_DATABASE del entorno coincide con la base de pruebas', () => {
  for (const base of ['MiValecito_Test', 'mivalecito_test']) {
    assert.throws(
      () => dbTest.validarInvocacion({ argv: ARGV, env: { ...DB_LOCAL, DB_DATABASE: base } }),
      /no puede ser la base de desarrollo ni la configurada/
    );
  }
});

test('CA-4 · el corredor se niega con una cuenta de base distinta de la de la aplicación', () => {
  assert.throws(
    () => dbTest.validarInvocacion({ argv: ARGV, env: { ...DB_LOCAL, DB_USER: 'sa' } }),
    /DB_USER debe ser mivalecito_app/
  );
});

test('CA-4 · los mensajes de rechazo no incluyen contraseñas ni la cadena de conexión', () => {
  const casos = [
    { ...DB_LOCAL, ...AZURE },
    { AZURE_SQL_CONNECTION_STRING: 'Server=remoto;Password=clave-ficticia-de-prueba' },
    { ...DB_LOCAL, DB_SERVER: 'remoto.ejemplo.com' },
    { ...DB_LOCAL, DB_USER: 'sa' },
  ];
  for (const env of casos) {
    try {
      dbTest.validarInvocacion({ argv: ARGV, env });
      assert.fail('debía negarse');
    } catch (error) {
      assert.ok(!error.message.includes('clave-ficticia'), error.message);
    }
  }
});

// ── Condición 1 y 3: el SQL de descarte ──────────────────────────────────────

test('CA-4 · el SQL de descarte es fijo: comprueba existencia, aísla la base y la elimina; nada más', () => {
  const sql = dbTest.sqlDescartarBase();
  assert.match(sql, /IF DB_ID\(N'MiValecito_Test'\) IS NOT NULL/);
  assert.match(sql, /ALTER DATABASE \[MiValecito_Test\] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;/);
  assert.match(sql, /DROP DATABASE \[MiValecito_Test\];/);
  assert.ok(sql.indexOf('IF DB_ID') < sql.indexOf('DROP DATABASE'));
  assert.equal((sql.match(/DROP /g) || []).length, 1);
  assert.doesNotMatch(sql, /MiValecito_Dev|\$\(|master|USE /i);
  assert.doesNotThrow(() => sqlcmd.validarScript(Buffer.from(sql, 'utf8'), 'descarte.sql'));
});

test('CA-4 · ningún generador de SQL acepta otro nombre de base', () => {
  for (const generador of [dbTest.sqlDescartarBase, dbTest.sqlCrearBase, dbTest.sqlExiste]) {
    assert.throws(() => generador('MiValecito_Dev', DB_LOCAL), /fijo|no puede ser/);
    assert.throws(() => generador('x]; DROP DATABASE [MiValecito_Dev', DB_LOCAL), /fijo|no puede ser/);
  }
});

test('CA-4 · la cuenta de la aplicación solo recibe lectura y escritura de datos', () => {
  const sql = dbTest.sqlCuentaAplicacion();
  assert.match(sql, /db_datareader/);
  assert.match(sql, /db_datawriter/);
  assert.doesNotMatch(sql, /db_owner|db_ddladmin|sysadmin|CONTROL|ALTER ANY/i);
});

// ── Condición 2: el módulo compartido de sqlcmd vuelve a comprobar el entorno ────

test('CA-4 · el módulo de sqlcmd se niega con AZURE_SQL_* antes de ejecutar nada', () => {
  const anterior = { ...process.env };
  try {
    Object.assign(process.env, AZURE);
    assert.throws(() => sqlcmd.ejecutar('no-existe.exe', 'SELECT 1;', { base: 'master' }), EntornoNoLocalError);
    for (const clave of Object.keys(AZURE)) delete process.env[clave];
    process.env.DB_SERVER = 'remoto.ejemplo.com';
    assert.throws(() => sqlcmd.ejecutar('no-existe.exe', 'SELECT 1;', { base: 'master' }), EntornoNoLocalError);
  } finally {
    for (const clave of Object.keys(process.env)) if (!(clave in anterior)) delete process.env[clave];
    Object.assign(process.env, anterior);
  }
});

test('CA-4 · el módulo de sqlcmd rechaza nombres de base y prefijos temporales no válidos', () => {
  const anterior = process.env.DB_SERVER;
  delete process.env.DB_SERVER;
  try {
    for (const base of ['', 'a b', 'x];DROP', '../master', 'a'.repeat(80), undefined]) {
      assert.throws(() => sqlcmd.ejecutar('no-existe.exe', 'SELECT 1;', { base }), /nombre de base no válido/);
    }
    assert.throws(
      () => sqlcmd.ejecutar('no-existe.exe', 'SELECT 1;', { base: 'master', prefijoTemporal: '../fuera' }),
      /prefijo/
    );
  } finally {
    if (anterior !== undefined) process.env.DB_SERVER = anterior;
  }
});

test('CA-4 · el módulo de sqlcmd conserva el filtro de comandos y la validación UTF-8', () => {
  assert.throws(() => sqlcmd.validarScript(Buffer.from('SELECT 1;\n:r otro.sql\n', 'utf8'), 'x.sql'), /comandos de sqlcmd/);
  assert.throws(() => sqlcmd.validarScript(Buffer.from('SELECT 1;\n!!dir\n', 'utf8'), 'x.sql'), /comandos de sqlcmd/);
  assert.throws(() => sqlcmd.validarScript(Buffer.from('SELECT 1;', 'utf16le'), 'x.sql'), /UTF-8/);
  assert.equal(sqlcmd.SERVIDOR_LOCAL, 'localhost');
});

// ── Condiciones 4 y 8: nada se lee del entorno, y el hijo solo recibe una lista blanca ──

test('CA-4 · el corredor no lee servidor, base ni puerto del entorno ni de argumentos', () => {
  const fuentes = ['lib/corredor.js', 'db-test.js', 'web-test.js']
    .map((nombre) => fs.readFileSync(path.join(RAIZ, 'scripts', nombre), 'utf8'));
  for (const fuente of fuentes) {
    assert.doesNotMatch(fuente, /process\.env\.(DB_SERVER|DB_DATABASE|DB_PORT|PORT)\b/);
    assert.doesNotMatch(fuente, /process\.argv\s*\[|process\.argv\.slice|yargs|minimist/);
  }
  assert.match(fuentes[0], /const BASE_PRUEBAS = 'MiValecito_Test';/);
  assert.match(fuentes[0], /const PUERTO_BACKEND = 3101;/);
  assert.notEqual(dbTest.PUERTO_BACKEND, 3001);
  assert.equal(dbTest.HOST_LOCAL, '127.0.0.1');
});

// ── Segundo punto de entrada: `npm run test:web` ─────────────────────────────

test('CA-4 · test:web comparte el mecanismo y las guardas: local, sin argumentos, base fija', () => {
  assert.doesNotThrow(() => webTest.validarInvocacion({ argv: ARGV, env: DB_LOCAL }));
  assert.doesNotThrow(() => webTest.validarInvocacion({ argv: ARGV, env: {} }));
  for (const extra of [['MiValecito_Test'], ['--base=MiValecito_Dev'], ['--puerto=3001'], ['x', 'y']]) {
    assert.throws(() => webTest.validarInvocacion({ argv: [...ARGV, ...extra], env: DB_LOCAL }), /no acepta argumentos/);
  }
  for (const env of [AZURE, { ...DB_LOCAL, ...AZURE }, { AZURE_SQL_CONNECTION_STRING: 'Server=x;Password=clave-ficticia' }]) {
    assert.throws(() => webTest.validarInvocacion({ argv: ARGV, env }), EntornoNoLocalError);
  }
  for (const servidor of ['ejemplo.database.windows.net', 'MI-PC', '192.168.1.10']) {
    assert.throws(
      () => webTest.validarInvocacion({ argv: ARGV, env: { ...DB_LOCAL, DB_SERVER: servidor } }),
      EntornoNoLocalError,
      servidor
    );
  }
  assert.throws(() => webTest.validarInvocacion({ argv: ARGV, env: { ...DB_LOCAL, DB_USER: 'sa' } }), /DB_USER debe ser/);
  assert.throws(() => webTest.validarInvocacion({ argv: ARGV, env: { ...DB_LOCAL, DB_DATABASE: 'MiValecito_Test' } }), /no puede ser/);
  assert.equal(webTest.BASE_PRUEBAS, 'MiValecito_Test');
  assert.equal(webTest.PUERTO_BACKEND, dbTest.PUERTO_BACKEND);
  assert.equal(webTest.validarNombreBase, dbTest.validarNombreBase, 'una sola implementación de la guarda');
});

test('CA-4 · cada punto de entrada tiene su carpeta fija; test:db no corre la web', async () => {
  assert.deepEqual(
    { carpeta: dbTest.CONFIG.carpeta, sufijo: dbTest.CONFIG.sufijo, puertos: dbTest.CONFIG.puertosLibres },
    { carpeta: 'tests-db', sufijo: '.dbtest.js', puertos: [] }
  );
  assert.deepEqual(
    { carpeta: webTest.CONFIG.carpeta, sufijo: webTest.CONFIG.sufijo, puertos: webTest.CONFIG.puertosLibres },
    { carpeta: 'tests-web', sufijo: '.webtest.js', puertos: [3100] }
  );
  const paquete = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  assert.equal(paquete.scripts['test:db'], 'node scripts/db-test.js');
  assert.equal(paquete.scripts['test:web'], 'node scripts/web-test.js');
  // test:db no menciona ni lanza el navegador.
  for (const nombre of fs.readdirSync(path.join(RAIZ, 'tests-db'))) {
    const ruta = path.join(RAIZ, 'tests-db', nombre);
    if (!fs.statSync(ruta).isFile()) continue;
    assert.doesNotMatch(fs.readFileSync(ruta, 'utf8'), /playwright|test:e2e/i, `${nombre} lanza el navegador`);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(RAIZ, 'scripts', 'db-test.js'), 'utf8'), /tests-web|playwright/i);
  // Los puntos de entrada no aceptan una carpeta ni un sufijo arbitrarios.
  await assert.rejects(() => webTest.correr({ etiqueta: 'web-test', carpeta: '../x', sufijo: '.webtest.js' }), /no válida/);
});

test('CA-12 · el recorrido web usa lista blanca de entorno, redactor y deja la salida en la carpeta del corredor', () => {
  const fuente = fs.readFileSync(path.join(RAIZ, 'tests-web', 'recorrido-web.webtest.js'), 'utf8');
  assert.match(fuente, /entornoMinimo\(\)/);
  assert.match(fuente, /crearRedactor\(/);
  assert.match(fuente, /redactar\(salida\)/);
  assert.match(fuente, /terminarArbol\(hijo\)/);
  assert.match(fuente, new RegExp(['MV', 'TEST', 'SALIDA', 'DIR'].join('_')));
  assert.doesNotMatch(fuente, /entorno\[['"]?DB_|DB_PASSWORD:/);
  assert.match(fuente, /test\('CA-10 · /);
  const corredor = fs.readFileSync(path.join(RAIZ, 'scripts', 'lib', 'corredor.js'), 'utf8');
  assert.match(corredor, /imprimirSalidaDePruebas\(directorioSalida, estado\.redactar/);
});

test('CA-12 · el entorno que reciben los procesos hijo es una lista blanca sin secretos de nube', () => {
  const anterior = { ...process.env };
  try {
    Object.assign(process.env, AZURE, {
      AZURE_SQL_CONNECTION_STRING: 'x', AZURE_STORAGE_CONNECTION_STRING: 'x', ACS_EMAIL_CONNECTION_STRING: 'x',
      JWT_SECRET: 'x'.repeat(40), DB_PASSWORD: 'clave-ficticia', MAIL_FROM: 'a@b.cd',
    });
    const entorno = sqlcmd.entornoMinimo();
    for (const prohibida of [...Object.keys(AZURE), 'AZURE_SQL_CONNECTION_STRING', 'AZURE_STORAGE_CONNECTION_STRING',
      'ACS_EMAIL_CONNECTION_STRING', 'JWT_SECRET', 'DB_PASSWORD', 'MAIL_FROM']) {
      assert.equal(entorno[prohibida], undefined, prohibida);
    }
  } finally {
    for (const clave of Object.keys(process.env)) if (!(clave in anterior)) delete process.env[clave];
    Object.assign(process.env, anterior);
  }
});

test('CA-12 · las contraseñas de fixture se generan aleatorias y cumplen RN-43', () => {
  const a = dbTest.contrasenaAleatoria();
  const b = dbTest.contrasenaAleatoria();
  assert.notEqual(a, b);
  assert.ok(a.length >= 20);
  assert.match(a, /[a-z]/);
  assert.match(a, /[A-Z]/);
  assert.match(a, /[0-9]/);
  assert.match(a, /[^A-Za-z0-9]/);
});

// ── Condición 6: el backend de pruebas solo escucha en 127.0.0.1 ─────────────

test('CA-12 · el precargado fuerza 127.0.0.1 aunque el servidor pida 0.0.0.0', () => {
  const precargado = path.join(RAIZ, 'tests-db', 'preload-local.js');
  const codigo = `
    const http = require('http');
    const s = http.createServer();
    s.listen(0, '0.0.0.0', () => { console.log('HOST=' + s.address().address); s.close(); });
  `;
  const r = spawnSync(process.execPath, ['-r', precargado, '-e', codigo], { encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /HOST=127\.0\.0\.1/);

  const sinHost = spawnSync(process.execPath, ['-r', precargado, '-e', `
    const s = require('http').createServer();
    s.listen(0, () => { console.log('HOST=' + s.address().address); s.close(); });
  `], { encoding: 'utf8', timeout: 20000 });
  assert.equal(sinHost.status, 0, sinHost.stderr);
  assert.match(sinHost.stdout, /HOST=127\.0\.0\.1/);
});

// ── Condiciones 11 y 12: redactor y reporter ─────────────────────────────────

test('CA-12 · el redactor oculta secretos de la corrida, tokens, Bearer y credenciales', () => {
  const secreto = 'Zx9!claveDeLaCorrida-ficticia';
  const redactar = crearRedactor([secreto, 'corto']);
  const token = 'aaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbb.cccccccccccccccccccc';
  const texto = [
    `contraseña ${secreto} fin`,
    `Authorization: Bearer ${token}`,
    `token suelto ${token}`,
    'password=otra-clave-ficticia&x=1',
    '{"password":"otra-clave-ficticia"}',
    'accesskey=ABCDEF123456',
    'la palabra corto no se oculta por ser muy corta',
  ].join('\n');
  const salida = redactar(texto);
  assert.ok(!salida.includes(secreto));
  assert.ok(!salida.includes(token));
  assert.ok(!salida.includes('otra-clave-ficticia'));
  assert.ok(!salida.includes('ABCDEF123456'));
  assert.match(salida, /\*\*\*/);
  assert.match(salida, /la palabra corto/);
});

test('CA-12 · el reporter imprime nombre, estado y duración, y de un fallo solo la primera línea', async () => {
  const reporter = require('../tests-db/reporter');
  const eventos = [
    { type: 'test:pass', data: { name: 'RN-04 · prueba que pasa', details: { duration_ms: 12.4 } } },
    { type: 'test:fail', data: {
      name: 'RN-09 · prueba que falla',
      details: { duration_ms: 3, error: { message: 'primera línea\nsegunda con Bearer abc\n    at pila', cause: { message: 'causa visible\notra línea' } } },
    } },
    { type: 'test:pass', data: { name: 'B-12 · defecto conocido', todo: 'B-12: pendiente', details: { duration_ms: 1 } } },
    { type: 'test:pass', data: { name: 'omitida', skip: true, details: { duration_ms: 0 } } },
    { type: 'test:pass', data: { name: 'una suite', details: { type: 'suite', duration_ms: 1 } } },
    { type: 'test:diagnostic', data: { message: 'ruido' } },
  ];
  async function* fuente() { for (const e of eventos) yield e; }
  let salida = '';
  for await (const trozo of reporter(fuente())) salida += trozo;

  assert.match(salida, /PASS\s+RN-04 · prueba que pasa \(12 ms\)/);
  assert.match(salida, /FAIL\s+RN-09 · prueba que falla/);
  assert.match(salida, /causa visible/);
  assert.doesNotMatch(salida, /otra línea|segunda con Bearer|at pila/);
  assert.match(salida, /PENDIENTE\s+B-12 · defecto conocido/);
  assert.match(salida, /RESUMEN total=4 pasadas=1 falladas=1 pendientes=1 omitidas=1/);
});
