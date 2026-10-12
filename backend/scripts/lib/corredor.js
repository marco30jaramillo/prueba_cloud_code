/**
 * corredor.js — Mecanismo común de `npm run test:db` y `npm run test:web`.
 *
 * Los dos puntos de entrada (`scripts/db-test.js` y `scripts/web-test.js`) solo declaran,
 * en el código, qué carpeta de pruebas corren y con qué etiqueta; nada de eso entra por
 * argumentos ni por variables de entorno. Toda la lógica de seguridad vive aquí, una sola vez:
 *
 *   1. Guardas: sin argumentos, entorno local (`assertEntornoLocal`), nombre de base fijo.
 *   2. Descarta una base `MiValecito_Test` que haya quedado de una corrida interrumpida.
 *   3. Crea `MiValecito_Test` desde `esquemas/` e `inserts/` y le da acceso a `mivalecito_app`
 *      (lectura y escritura de datos, sin DDL).
 *   4. Arranca `src/server.js` como proceso hijo, solo en 127.0.0.1, en un puerto propio y con
 *      un secreto de firma aleatorio; comprueba que no es alcanzable por la red.
 *   5. Crea el primer superusuario y corre los archivos `*<sufijo>` de la carpeta de pruebas.
 *   6. En `finally` y ante señales: termina el servidor, elimina la base y borra temporales.
 *
 * Destino fijo en el código (mismo patrón que `db-setup.js`): `sqlcmd -E`, servidor
 * `localhost`, base `MiValecito_Test`. Ni el servidor, ni la base, ni el puerto se leen de
 * argumentos o variables de entorno. Nunca toca `MiValecito_Dev`.
 *
 * Solo módulos de Node y `sqlcmd`.
 */

const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { EntornoNoLocalError, cargarEnv, assertEntornoLocal } = require('./entornoLocal');
const {
  SERVIDOR_LOCAL, validarScript, listarScripts, localizarSqlcmd, entornoMinimo, ejecutar,
} = require('./sqlcmd');
const { crearRedactor } = require('./redactor');

// ── Destino y límites, fijos ─────────────────────────────────────────────────
const BASE_PRUEBAS = 'MiValecito_Test';
const BASE_DESARROLLO = 'MiValecito_Dev';
const CUENTA_APLICACION = 'mivalecito_app';
const PUERTO_BACKEND = 3101;
const PUERTO_SQL = '1433';
const HOST_LOCAL = '127.0.0.1';
const PREFIJO_TEMPORAL = 'mivalecito-db-test';

const RAIZ_BACKEND = path.resolve(__dirname, '..', '..');
const SERVIDOR_JS = path.join(RAIZ_BACKEND, 'src', 'server.js');
// El precargado y el reporter son comunes a las dos carpetas de pruebas.
const PRECARGADO = path.join(RAIZ_BACKEND, 'tests-db', 'preload-local.js');
const REPORTER = path.join(RAIZ_BACKEND, 'tests-db', 'reporter.js');

const ESPERA_ARRANQUE_MS = 45000;
const TIEMPO_MAXIMO_PRUEBAS_MS = 10 * 60 * 1000;

// ── Guardas (puras, con pruebas sin base en tests/db-test-guardas.test.js) ───

/**
 * Lanza si el nombre de la base de pruebas no es exactamente `MiValecito_Test` o si coincide
 * con la base de desarrollo o con la que el entorno declara en `DB_DATABASE`.
 */
function validarNombreBase(nombre = BASE_PRUEBAS, env = process.env) {
  if (nombre !== BASE_PRUEBAS || !/^[A-Za-z][A-Za-z0-9_]*$/.test(nombre)) {
    throw new Error(`el nombre de la base de pruebas es fijo (${BASE_PRUEBAS}).`);
  }
  const prohibidos = [BASE_DESARROLLO, env.DB_DATABASE]
    .filter((valor) => typeof valor === 'string' && valor !== '')
    .map((valor) => valor.toLowerCase());
  if (prohibidos.includes(nombre.toLowerCase())) {
    throw new Error('la base de pruebas no puede ser la base de desarrollo ni la configurada en DB_DATABASE.');
  }
  return nombre;
}

/**
 * Todas las guardas previas a cualquier acción: sin argumentos, entorno local, nombre de
 * base válido y cuenta de aplicación esperada. Lanza `EntornoNoLocalError` o `Error`.
 */
function validarInvocacion({ argv = process.argv, env = process.env, etiqueta = 'db-test' } = {}) {
  if (argv.length > 2) {
    throw new Error('no acepta argumentos: el servidor, la base y el puerto están fijos.');
  }
  assertEntornoLocal(env, { exigirConexion: false, nombre: etiqueta });
  validarNombreBase(BASE_PRUEBAS, env);
  if (typeof env.DB_USER === 'string' && env.DB_USER !== '' && env.DB_USER !== CUENTA_APLICACION) {
    throw new Error(`DB_USER debe ser ${CUENTA_APLICACION}: las pruebas no corren con otra cuenta.`);
  }
}

// ── SQL fijo (sin variables -v; el nombre sale de la constante ya validada) ──

function sqlExiste(nombre = BASE_PRUEBAS, env = process.env) {
  validarNombreBase(nombre, env);
  return `SET NOCOUNT ON;\nSELECT CASE WHEN DB_ID(N'${nombre}') IS NULL THEN 'AUSENTE' ELSE 'PRESENTE' END AS estado;\n`;
}

function sqlDescartarBase(nombre = BASE_PRUEBAS, env = process.env) {
  validarNombreBase(nombre, env);
  return [
    'SET NOCOUNT ON;',
    `IF DB_ID(N'${nombre}') IS NOT NULL`,
    'BEGIN',
    `    ALTER DATABASE [${nombre}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;`,
    `    DROP DATABASE [${nombre}];`,
    'END',
    '',
  ].join('\n');
}

function sqlCrearBase(nombre = BASE_PRUEBAS, env = process.env) {
  validarNombreBase(nombre, env);
  return `SET NOCOUNT ON;\nCREATE DATABASE [${nombre}];\n`;
}

function sqlCuentaAplicacion() {
  return [
    'SET NOCOUNT ON;',
    `IF SUSER_ID(N'${CUENTA_APLICACION}') IS NULL`,
    `    RAISERROR(N'El login ${CUENTA_APLICACION} no existe: ejecuta antes el preparado local (backend/README.md).', 16, 1);`,
    'GO',
    `CREATE USER [${CUENTA_APLICACION}] FOR LOGIN [${CUENTA_APLICACION}] WITH DEFAULT_SCHEMA = [dbo];`,
    `ALTER ROLE [db_datareader] ADD MEMBER [${CUENTA_APLICACION}];`,
    `ALTER ROLE [db_datawriter] ADD MEMBER [${CUENTA_APLICACION}];`,
    'GO',
    '',
  ].join('\n');
}

// ── Utilidades ───────────────────────────────────────────────────────────────

function aleatorio(bytes) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Contraseña que cumple RN-43 (mayúscula, minúscula, número y símbolo), solo en memoria. */
function contrasenaAleatoria() {
  return `Aa1!${aleatorio(18)}`;
}

function segundos(ms) {
  return (ms / 1000).toFixed(1);
}

function ahora() {
  return Date.now();
}

function puertoOcupado(puerto) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: puerto, host: HOST_LOCAL });
    socket.setTimeout(1500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  }).then((conectado) => {
    if (conectado) return true;
    return new Promise((resolve) => {
      const servidor = net.createServer();
      servidor.once('error', () => resolve(true));
      servidor.listen(puerto, HOST_LOCAL, () => servidor.close(() => resolve(false)));
    });
  });
}

/** IPs de red del equipo en las que el puerto responde (debe ser ninguna). */
async function direccionesExpuestas(puerto) {
  const ips = [];
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const interfaz of lista || []) {
      if (interfaz.family === 'IPv4' && !interfaz.internal) ips.push(interfaz.address);
    }
  }
  const expuestas = [];
  await Promise.all(ips.map((ip) => new Promise((resolve) => {
    const socket = net.connect({ port: puerto, host: ip });
    socket.setTimeout(1500);
    socket.once('connect', () => { expuestas.push(ip); socket.destroy(); resolve(); });
    socket.once('timeout', () => { socket.destroy(); resolve(); });
    socket.once('error', () => resolve());
  })));
  return expuestas;
}

function terminarArbol(proceso) {
  if (!proceso || !proceso.pid || proceso.exitCode !== null || proceso.signalCode !== null) return;
  const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
  spawnSync(taskkill, ['/PID', String(proceso.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 15000 });
}

function borrarHuerfanos() {
  let borrados = 0;
  try {
    for (const nombre of fs.readdirSync(os.tmpdir())) {
      if (!nombre.startsWith(`${PREFIJO_TEMPORAL}-`)) continue;
      fs.rmSync(path.join(os.tmpdir(), nombre), { recursive: true, force: true });
      borrados += 1;
    }
  } catch (_) {
    // El directorio temporal no se pudo listar: no es motivo para abortar.
  }
  return borrados;
}

const LINEAS_DE_SALIDA = 150;

/** Imprime, ya redactada, la salida de diagnóstico que las pruebas dejaron en `directorio`. */
function imprimirSalidaDePruebas(directorio, redactar, etiqueta) {
  try {
    for (const nombre of fs.readdirSync(directorio).sort()) {
      if (!/^[A-Za-z0-9._-]+\.log$/.test(nombre)) continue;
      const lineas = fs.readFileSync(path.join(directorio, nombre), 'utf8').split(/\r?\n/).filter((l) => l !== '');
      console.error(`${etiqueta}: salida de ${nombre} (últimas ${Math.min(lineas.length, LINEAS_DE_SALIDA)} de ${lineas.length} líneas)`);
      lineas.slice(-LINEAS_DE_SALIDA).forEach((l) => console.error(`  | ${redactar(l)}`));
    }
  } catch (_) {
    // Sin salida de diagnóstico: no es motivo para ocultar el resultado.
  }
}

function lector(alRecibirLinea) {
  let resto = '';
  return {
    escribir(chunk) {
      resto += chunk.toString('utf8');
      const lineas = resto.split(/\r?\n/);
      resto = lineas.pop();
      lineas.forEach(alRecibirLinea);
    },
    cerrar() {
      if (resto) alRecibirLinea(resto);
      resto = '';
    },
  };
}

// ── Corrida ──────────────────────────────────────────────────────────────────

/**
 * Corre una carpeta de pruebas contra la base y el backend de pruebas.
 *
 * @param {object} config  Fija en el código del punto de entrada (nunca del entorno):
 *   etiqueta       prefijo de los mensajes ('db-test' | 'web-test')
 *   carpeta        carpeta de pruebas dentro de backend/ ('tests-db' | 'tests-web')
 *   sufijo         sufijo de los archivos de prueba ('.dbtest.js' | '.webtest.js')
 *   puertosLibres  puertos locales que deben estar libres al empezar y al terminar
 *   tiempoMaximoMs tope de toda la ejecución de pruebas (por defecto 10 min)
 */
async function correr(config) {
  const { etiqueta, carpeta, sufijo, puertosLibres = [], tiempoMaximoMs = TIEMPO_MAXIMO_PRUEBAS_MS } = config;
  if (!/^[a-z-]+$/.test(etiqueta) || !/^tests-[a-z]+$/.test(carpeta) || !/^\.[a-z]+\.js$/.test(sufijo)) {
    throw new Error('configuración del corredor no válida.');
  }
  const DIR_PRUEBAS = path.join(RAIZ_BACKEND, carpeta);
  const inicio = ahora();
  const estado = {
    sqlcmd: null, servidor: null, pruebas: null, directorio: null,
    baseTocada: false, limpio: false, limpiezaOk: true, redactar: (t) => String(t),
  };

  // Limpieza síncrona e idempotente: se usa en `finally`, en señales y en `exit`.
  function limpiar() {
    if (estado.limpio) return estado.limpiezaOk;
    estado.limpio = true;
    terminarArbol(estado.pruebas);
    terminarArbol(estado.servidor);
    if (estado.baseTocada && estado.sqlcmd) {
      try {
        const r = ejecutar(estado.sqlcmd, sqlDescartarBase(), { base: 'master', prefijoTemporal: PREFIJO_TEMPORAL });
        if (r.codigo !== 0) {
          estado.limpiezaOk = false;
          console.error(`${etiqueta}: no se pudo eliminar ${BASE_PRUEBAS} (código ${r.codigo}). Elimínala a mano antes de seguir.`);
        } else {
          const e = ejecutar(estado.sqlcmd, sqlExiste(), { base: 'master', prefijoTemporal: PREFIJO_TEMPORAL });
          if (e.codigo !== 0 || !/AUSENTE/.test(e.salida)) {
            estado.limpiezaOk = false;
            console.error(`${etiqueta}: ${BASE_PRUEBAS} sigue existiendo tras el descarte. Elimínala a mano.`);
          }
        }
      } catch (error) {
        estado.limpiezaOk = false;
        console.error(`${etiqueta}: error al eliminar ${BASE_PRUEBAS}: ${estado.redactar(error.message)}`);
      }
    }
    if (estado.directorio) fs.rmSync(estado.directorio, { recursive: true, force: true });
    return estado.limpiezaOk;
  }

  const alSenal = (nombre) => () => {
    console.error(`\n${etiqueta}: ${nombre} recibida; limpiando.`);
    const ok = limpiar();
    process.exit(ok ? 130 : 1);
  };
  for (const senal of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) process.on(senal, alSenal(senal));
  process.on('exit', () => { limpiar(); });

  let codigo = 1;
  try {
    cargarEnv();
    validarInvocacion({ etiqueta });

    const dbPassword = process.env.DB_PASSWORD;
    if (!dbPassword) {
      throw new Error('falta DB_PASSWORD en backend/.env (la contraseña de mivalecito_app; ver env.example).');
    }
    const jwtSecret = aleatorio(48);
    const suEmail = `superusuario.${aleatorio(6).toLowerCase()}@mvtest.example`;
    const suPassword = contrasenaAleatoria();
    estado.redactar = crearRedactor([jwtSecret, dbPassword, suPassword]);

    estado.sqlcmd = localizarSqlcmd();
    if (!estado.sqlcmd) throw new Error('No se encontró sqlcmd.exe en el PATH. Instala las herramientas de línea de comandos de SQL Server.');

    // Se validan todos los scripts antes de ejecutar el primero.
    const scripts = listarScripts().map((script) => ({
      ...script,
      contenido: validarScript(fs.readFileSync(script.ruta), script.relativa),
    }));
    if (!scripts.length) throw new Error('No hay scripts de esquema ni de datos.');

    const archivos = fs.readdirSync(DIR_PRUEBAS)
      .filter((nombre) => nombre.endsWith(sufijo))
      .sort();
    if (!archivos.length) throw new Error(`No hay pruebas en ${carpeta}/.`);

    console.log(`${etiqueta}: servidor ${SERVIDOR_LOCAL}, base ${BASE_PRUEBAS}, autenticación de Windows`);

    const huerfanos = borrarHuerfanos();
    if (huerfanos) console.log(`${etiqueta}: ${huerfanos} temporal(es) de una corrida anterior borrado(s)`);

    for (const puerto of [PUERTO_BACKEND, ...puertosLibres]) {
      if (await puertoOcupado(puerto)) {
        throw new Error(`el puerto ${puerto} está ocupado; libéralo y repite.`);
      }
    }

    // 2. Descartar una base previa (corrida interrumpida).
    estado.baseTocada = true; // desde aquí, el `finally` elimina la base
    const previa = ejecutar(estado.sqlcmd, sqlExiste(), { base: 'master', prefijoTemporal: PREFIJO_TEMPORAL });
    if (previa.codigo !== 0) {
      throw new Error(`no se pudo consultar el servidor local (código ${previa.codigo}). Comprueba que SQL Server está iniciado.`);
    }
    if (/PRESENTE/.test(previa.salida)) {
      console.log(`${etiqueta}: ${BASE_PRUEBAS} existía de una corrida anterior; se descarta`);
      const d = ejecutar(estado.sqlcmd, sqlDescartarBase(), { base: 'master', prefijoTemporal: PREFIJO_TEMPORAL });
      if (d.codigo !== 0) throw new Error(`no se pudo descartar la base previa (código ${d.codigo}).`);
    }

    // 3. Crear la base, esquemas, datos y cuenta de la aplicación.
    const t3 = ahora();
    const c = ejecutar(estado.sqlcmd, sqlCrearBase(), { base: 'master', prefijoTemporal: PREFIJO_TEMPORAL });
    if (c.codigo !== 0) throw new Error(`no se pudo crear la base de pruebas (código ${c.codigo}).`);
    for (const script of scripts) {
      const r = ejecutar(estado.sqlcmd, script.contenido, { base: BASE_PRUEBAS, prefijoTemporal: PREFIJO_TEMPORAL });
      if (r.codigo !== 0) throw new Error(`${script.relativa} falló (código ${r.codigo}). ${estado.redactar(r.salida).slice(0, 600)}`);
    }
    const cuenta = ejecutar(estado.sqlcmd, sqlCuentaAplicacion(), { base: BASE_PRUEBAS, prefijoTemporal: PREFIJO_TEMPORAL });
    if (cuenta.codigo !== 0) throw new Error(`no se pudo dar acceso a ${CUENTA_APLICACION} (código ${cuenta.codigo}). ${estado.redactar(cuenta.salida).slice(0, 400)}`);
    console.log(`${etiqueta}: base ${BASE_PRUEBAS} creada con ${scripts.length} scripts (${segundos(ahora() - t3)} s)`);

    // 4. Backend de pruebas.
    estado.directorio = fs.mkdtempSync(path.join(os.tmpdir(), `${PREFIJO_TEMPORAL}-`));
    const directorioCorreo = path.join(estado.directorio, 'correo');
    fs.mkdirSync(directorioCorreo);
    // Carpeta donde una prueba puede dejar su salida de diagnóstico (el reporter no la muestra);
    // el corredor la imprime, redactada, si la corrida falla, y la borra con el directorio.
    const directorioSalida = path.join(estado.directorio, 'salida');
    fs.mkdirSync(directorioSalida);
    const entornoBase = entornoMinimo();
    const entornoServidor = {
      ...entornoBase,
      NODE_ENV: 'test',
      PORT: String(PUERTO_BACKEND),
      JWT_SECRET: jwtSecret,
      DB_SERVER: SERVIDOR_LOCAL,
      DB_PORT: PUERTO_SQL,
      DB_DATABASE: BASE_PRUEBAS,
      DB_USER: CUENTA_APLICACION,
      DB_PASSWORD: dbPassword,
      DB_ENCRYPT: 'true',
      DB_TRUST_SERVER_CERTIFICATE: 'true',
      MAIL_TRANSPORT: 'outbox',
      MAIL_OUTBOX_DIR: directorioCorreo,
      PENDING_ACCOUNT_PURGE: 'off',
    };

    const t4 = ahora();
    const registro = [];
    let conectado = false;
    let falloConexion = false;
    const salidaServidor = lector((linea) => {
      registro.push(estado.redactar(linea));
      if (registro.length > 80) registro.shift();
      if (/\(conectado\)/.test(linea)) conectado = true;
      if (/error de conexi/i.test(linea)) falloConexion = true;
    });
    // cwd en el directorio temporal: `dotenv` no encuentra `backend/.env` y el hijo solo ve
    // el entorno de la lista blanca.
    estado.servidor = spawn(process.execPath, ['-r', PRECARGADO, SERVIDOR_JS], {
      cwd: estado.directorio, env: entornoServidor, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    estado.servidor.stdout.on('data', (d) => salidaServidor.escribir(d));
    estado.servidor.stderr.on('data', (d) => salidaServidor.escribir(d));
    let servidorTermino = false;
    estado.servidor.once('exit', () => { servidorTermino = true; });

    const limite = ahora() + ESPERA_ARRANQUE_MS;
    while (!conectado && !falloConexion && !servidorTermino && ahora() < limite) {
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!conectado) {
      registro.slice(-15).forEach((l) => console.error(`  servidor> ${l}`));
      throw new Error('el backend de pruebas no arrancó o no conectó con la base.');
    }

    const expuestas = await direccionesExpuestas(PUERTO_BACKEND);
    if (expuestas.length) {
      throw new Error(`el backend de pruebas es alcanzable por la red (${expuestas.length} dirección/es): se aborta.`);
    }
    const base = `http://${HOST_LOCAL}:${PUERTO_BACKEND}`;
    const salud = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    if (!salud.ok) throw new Error('el backend de pruebas no responde en /health.');
    console.log(`${etiqueta}: backend de pruebas en ${HOST_LOCAL}:${PUERTO_BACKEND} (${segundos(ahora() - t4)} s)`);

    // 5. Primer superusuario (única vía sin sesión) y pruebas.
    const alta = await fetch(`${base}/auth/bootstrap-superuser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: suEmail, password: suPassword, name: 'Superusuario de pruebas' }),
      signal: AbortSignal.timeout(15000),
    });
    if (alta.status !== 201) throw new Error(`no se pudo crear el superusuario de pruebas (HTTP ${alta.status}).`);

    const entornoPruebas = {
      ...entornoBase,
      NODE_ENV: 'test',
      MV_TEST_API_URL: base,
      MV_TEST_SU_EMAIL: suEmail,
      MV_TEST_SU_PASSWORD: suPassword,
      MV_TEST_DB_USER: CUENTA_APLICACION,
      MV_TEST_DB_PASSWORD: dbPassword,
      MV_TEST_OUTBOX_DIR: directorioCorreo,
      MV_TEST_SALIDA_DIR: directorioSalida,
    };
    const argumentos = [
      '--test', '--test-concurrency=1', '--test-timeout=60000', '--test-force-exit',
      `--test-reporter=${pathToFileURL(REPORTER).href}`, '--test-reporter-destination=stdout',
      ...archivos.map((nombre) => path.join(DIR_PRUEBAS, nombre)),
    ];

    console.log(`${etiqueta}: ejecutando ${archivos.length} archivo(s) de pruebas\n`);
    let resumen = null;
    const t5 = ahora();
    await new Promise((resolve) => {
      estado.pruebas = spawn(process.execPath, argumentos, {
        cwd: DIR_PRUEBAS, env: entornoPruebas, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      });
      const salida = lector((linea) => {
        const limpia = estado.redactar(linea);
        const m = /^RESUMEN total=(\d+) pasadas=(\d+) falladas=(\d+) pendientes=(\d+) omitidas=(\d+)/.exec(limpia);
        if (m) resumen = { total: +m[1], pasadas: +m[2], falladas: +m[3], pendientes: +m[4], omitidas: +m[5] };
        console.log(limpia);
      });
      const errores = lector((linea) => { console.error(estado.redactar(linea)); });
      estado.pruebas.stdout.on('data', (d) => salida.escribir(d));
      estado.pruebas.stderr.on('data', (d) => errores.escribir(d));
      const reloj = setTimeout(() => {
        console.error(`${etiqueta}: las pruebas superaron el tiempo máximo; se terminan.`);
        terminarArbol(estado.pruebas);
      }, tiempoMaximoMs);
      estado.pruebas.once('exit', (salidaCodigo) => {
        clearTimeout(reloj);
        salida.cerrar();
        errores.cerrar();
        estado.codigoPruebas = salidaCodigo;
        resolve();
      });
    });

    if (!resumen || estado.codigoPruebas !== 0 || resumen.falladas > 0 || resumen.total === 0) {
      registro.slice(-20).forEach((l) => console.error(`  servidor> ${l}`));
      imprimirSalidaDePruebas(directorioSalida, estado.redactar, etiqueta);
      estado.resumen = resumen;
      codigo = 1;
    } else {
      estado.resumen = resumen;
      codigo = 0;
    }
    estado.duracionPruebas = ahora() - t5;
  } catch (error) {
    const mensaje = error && error.message ? error.message : String(error);
    console.error(error instanceof EntornoNoLocalError ? estado.redactar(mensaje) : `${etiqueta}: ${estado.redactar(mensaje)}`);
    codigo = 1;
  } finally {
    const limpiezaOk = limpiar();
    if (!limpiezaOk) codigo = 1;
  }

  for (const puerto of puertosLibres) {
    if (await puertoOcupado(puerto)) {
      console.error(`${etiqueta}: el puerto ${puerto} quedó ocupado al terminar.`);
      codigo = 1;
    }
  }

  const total = ahora() - inicio;
  if (estado.resumen) {
    const r = estado.resumen;
    console.log(`\n${etiqueta}: ${r.total} pruebas, ${r.pasadas} pasaron, ${r.falladas} fallaron, `
      + `${r.pendientes} pendientes (defectos conocidos), ${r.omitidas} omitidas`);
  }
  console.log(`${etiqueta}: ${BASE_PRUEBAS} ${estado.baseTocada ? (estado.limpiezaOk ? 'eliminada' : 'NO eliminada') : 'no se creó'}; `
    + `duración ${segundos(total)} s; resultado ${codigo === 0 ? 'OK' : 'FALLO'}`);
  return codigo;
}

/** Punto de entrada común: corre y termina el proceso con el código de salida. */
function ejecutarYSalir(config) {
  correr(config).then(
    (codigo) => { process.exit(codigo); },
    (error) => { console.error(`${config.etiqueta}: ${error && error.message ? error.message : error}`); process.exit(1); }
  );
}

module.exports = {
  correr,
  ejecutarYSalir,
  BASE_PRUEBAS,
  BASE_DESARROLLO,
  CUENTA_APLICACION,
  PUERTO_BACKEND,
  HOST_LOCAL,
  validarNombreBase,
  validarInvocacion,
  sqlExiste,
  sqlDescartarBase,
  sqlCrearBase,
  sqlCuentaAplicacion,
  contrasenaAleatoria,
};
