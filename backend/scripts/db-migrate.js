/**
 * db-migrate.js — Ejecutor de migraciones de base de datos (requerimiento 002).
 *
 * Uso, desde `backend/`:
 *   node scripts/db-migrate.js --modo <aplicar|dry-run|baseline|inicializar> --version vX.Y.Z
 *                              [--confirmar-base NOMBRE]
 *
 * Entorno: DEPLOY_DB_SERVER, DEPLOY_DB_DATABASE, DEPLOY_DB_USER, DEPLOY_DB_PASSWORD,
 * opcionales DEPLOY_DB_PORT y DEPLOY_DB_TRUST_SERVER_CERTIFICATE (solo servidor local).
 * Códigos de salida: 0 éxito, 1 fallo (nada aplicado, o el script en curso revertido),
 * 2 uso incorrecto.
 *
 * Es una red de seguridad, no una garantía: la garantía real es la revisión del PR, la
 * conciliación y el punto de restauración. Ver `db-migrate.md`.
 *
 * Nota: algunas sentencias no son transaccionales (ALTER DATABASE, índices en línea,
 * CREATE DATABASE...). Si un script las contiene, el ROLLBACK no las deshace.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validarScript } = require('./db-setup');
const { resolveDbConfig, DbConfigError } = require('../src/database/dbConfig');

const RAIZ_SCRIPTS = path.resolve(__dirname, '../../database/scripts_sql');
const MODOS = ['aplicar', 'dry-run', 'baseline', 'inicializar'];
const REGEX_VERSION = /^v[0-9]+\.[0-9]+\.[0-9]+$/;
const RECURSO_BLOQUEO = 'mivalecito_db_migrate';
const ESPERA_BLOQUEO_MS = 30000;
const TABLA_CONTROL = 'dbo.migraciones_aplicadas';
const CONCILIACION = 'consultas/conciliacion_integral.sql';
const APROBACIONES = 'aprobaciones-destructivas.json';

// Consultas propias del ejecutor. Los valores viajan siempre como parámetros.
const SQL = {
  ahora: 'SELECT CONVERT(VARCHAR(33), SYSUTCDATETIME(), 127) AS ahora;',
  baseActual: 'SELECT DB_NAME() AS base;',
  bloquear: 'DECLARE @r INT; EXEC @r = sys.sp_getapplock @Resource = N\'' + RECURSO_BLOQUEO +
    '\', @LockMode = N\'Exclusive\', @LockOwner = N\'Session\', @LockTimeout = @espera; SELECT @r AS resultado;',
  verificarBloqueo: 'SELECT APPLOCK_MODE(N\'public\', N\'' + RECURSO_BLOQUEO + '\', N\'Session\') AS modo;',
  liberar: 'EXEC sys.sp_releaseapplock @Resource = N\'' + RECURSO_BLOQUEO + '\', @LockOwner = N\'Session\';',
  tablaControl: 'SELECT OBJECT_ID(N\'' + TABLA_CONTROL + '\', N\'U\') AS id;',
  registradas: 'SELECT nombre, [checksum] AS checksum FROM dbo.migraciones_aplicadas;',
  contarRegistradas: 'SELECT COUNT_BIG(*) AS n FROM dbo.migraciones_aplicadas;',
  tablasUsuario: 'SELECT s.name AS esquema, t.name AS tabla FROM sys.tables AS t ' +
    'JOIN sys.schemas AS s ON s.schema_id = t.schema_id WHERE t.is_ms_shipped = 0;',
  columnas: 'SELECT s.name AS esquema, t.name AS tabla, c.name AS columna FROM sys.tables AS t ' +
    'JOIN sys.schemas AS s ON s.schema_id = t.schema_id ' +
    'JOIN sys.columns AS c ON c.object_id = t.object_id WHERE t.is_ms_shipped = 0;',
  tranCount: 'SELECT @@TRANCOUNT AS n;',
  registrar: 'INSERT INTO dbo.migraciones_aplicadas (nombre, [checksum], modo, version_release) ' +
    'VALUES (@nombre, @checksum, @modo, @version);',
};

class ErrorMigracion extends Error {}
class ErrorUso extends Error {}

// ── Argumentos y versión ─────────────────────────────────────────────────────

function validarVersion(version) {
  return typeof version === 'string' && REGEX_VERSION.test(version);
}

function parsearArgumentos(argv) {
  const permitidos = { '--modo': 'modo', '--version': 'version', '--confirmar-base': 'confirmarBase' };
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const clave = permitidos[argv[i]];
    if (!clave) throw new ErrorUso(`argumento no reconocido: ${String(argv[i]).slice(0, 40)}`);
    const valor = argv[i + 1];
    if (valor === undefined || valor.startsWith('--')) throw new ErrorUso(`${argv[i]} requiere un valor.`);
    if (args[clave] !== undefined) throw new ErrorUso(`${argv[i]} está repetido.`);
    args[clave] = valor;
  }
  if (!MODOS.includes(args.modo)) throw new ErrorUso(`--modo debe ser uno de: ${MODOS.join(', ')}.`);
  if (!validarVersion(args.version)) throw new ErrorUso('--version debe tener la forma vX.Y.Z (por ejemplo v1.0.0).');
  if ((args.modo === 'baseline' || args.modo === 'inicializar') && !args.confirmarBase) {
    throw new ErrorUso(`el modo ${args.modo} exige --confirmar-base con el nombre de la base.`);
  }
  return args;
}

// ── Lectura de scripts ───────────────────────────────────────────────────────

/** SHA-256 del contenido, sin BOM y con fin de línea normalizado a `\n`. */
function checksumScript(contenido) {
  const normal = String(contenido).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  return crypto.createHash('sha256').update(normal, 'utf8').digest('hex');
}

/** Divide por líneas `GO`, como sqlcmd. `GO n` con n distinto de 1 no se admite. */
function dividirLotes(contenido) {
  const lotes = [];
  let actual = [];
  for (const linea of String(contenido).replace(/\r\n?/g, '\n').split('\n')) {
    const m = /^[ \t]*GO(?:[ \t]+(\d+))?[ \t]*$/i.exec(linea);
    if (m) {
      if (m[1] !== undefined && Number(m[1]) !== 1) {
        throw new ErrorMigracion('GO con repetición (GO n) no está permitido.');
      }
      lotes.push(actual.join('\n'));
      actual = [];
    } else {
      actual.push(linea);
    }
  }
  lotes.push(actual.join('\n'));
  return lotes.filter((lote) => normalizarSql(lote).trim() !== '');
}

/**
 * Resuelve enlaces simbólicos y exige que la ruta real quede dentro de la raíz de scripts
 * (también real). Si no, falla: un enlace no puede sacar la lectura de `scripts_sql/`.
 */
function exigirDentroDeRaiz(raiz, ruta) {
  let real;
  let raizReal;
  try {
    real = fs.realpathSync(ruta);
    raizReal = fs.realpathSync(raiz);
  } catch (_) {
    throw new ErrorMigracion(`no se pudo resolver la ruta ${path.basename(String(ruta))}.`);
  }
  const rel = path.relative(raizReal, real);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) return real;
  throw new ErrorMigracion(`${path.basename(String(ruta))} apunta fuera de database/scripts_sql/ (enlace simbólico); se detiene.`);
}

const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Lista los .sql de una carpeta (solo archivos regulares, sin enlaces), en orden de
 * nombre. `excluirCero` quita los `00_*` por prefijo del nombre de archivo.
 * Nunca recorre otras carpetas: `mantenimiento/` no se ve.
 */
function listarCarpeta(raiz, carpeta, { excluirCero }) {
  const directorio = path.join(raiz, carpeta);
  if (!fs.existsSync(directorio)) return [];
  exigirDentroDeRaiz(raiz, directorio);
  return fs.readdirSync(directorio, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.sql$/i.test(e.name) && !(excluirCero && /^00_/.test(e.name)))
    .map((e) => e.name)
    .sort(comparar)
    .map((nombre) => ({ nombre: `${carpeta}/${nombre}`, carpeta, ruta: path.join(directorio, nombre) }));
}

function cargarScript(entrada, raiz) {
  if (raiz) exigirDentroDeRaiz(raiz, entrada.ruta);
  const contenido = validarScript(fs.readFileSync(entrada.ruta), entrada.nombre);
  return {
    nombre: entrada.nombre,
    carpeta: entrada.carpeta,
    contenido,
    checksum: checksumScript(contenido),
    lotes: dividirLotes(contenido),
  };
}

function cargarScripts(raiz, carpetas) {
  const lista = [];
  for (const carpeta of carpetas) {
    const excluirCero = carpeta === 'esquemas' || carpeta === 'inserts';
    for (const entrada of listarCarpeta(raiz, carpeta, { excluirCero })) lista.push(cargarScript(entrada, raiz));
  }
  return lista;
}

// ── Revisión de sentencias destructivas ──────────────────────────────────────

/**
 * Quita comentarios (anidados), literales de texto y, salvo `conservarIdentificadores`,
 * los identificadores entre corchetes o comillas. Recorre carácter a carácter para que un
 * `--` dentro de un texto no oculte lo que sigue. Devuelve el texto en mayúsculas y con
 * espacios colapsados.
 */
function normalizarSql(texto, { conservarIdentificadores = false } = {}) {
  const t = String(texto);
  const n = t.length;
  let salida = '';
  let i = 0;
  while (i < n) {
    const c = t[i];
    const d = t[i + 1];
    if (c === '-' && d === '-') {
      while (i < n && t[i] !== '\n' && t[i] !== '\r') i += 1;
      salida += ' ';
    } else if (c === '/' && d === '*') {
      let nivel = 1;
      i += 2;
      while (i < n && nivel > 0) {
        if (t[i] === '/' && t[i + 1] === '*') { nivel += 1; i += 2; }
        else if (t[i] === '*' && t[i + 1] === '/') { nivel -= 1; i += 2; }
        else i += 1;
      }
      salida += ' ';
    } else if (c === '\'') {
      i += 1;
      while (i < n) {
        if (t[i] === '\'') {
          if (t[i + 1] === '\'') { i += 2; continue; }
          i += 1;
          break;
        }
        i += 1;
      }
      salida += '\'\'';
    } else if (c === '[' || c === '"') {
      const cierre = c === '[' ? ']' : '"';
      const inicio = i;
      i += 1;
      while (i < n) {
        if (t[i] === cierre) {
          if (t[i + 1] === cierre) { i += 2; continue; }
          i += 1;
          break;
        }
        i += 1;
      }
      salida += conservarIdentificadores ? t.slice(inicio, i) : ' ID ';
    } else {
      salida += c;
      i += 1;
    }
  }
  return salida.replace(/\s+/g, ' ').toUpperCase().trim();
}

const FRONTERA = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'TRUNCATE', 'ALTER',
  'CREATE', 'DECLARE', 'IF', 'ELSE', 'BEGIN', 'PRINT', 'EXEC', 'EXECUTE', 'RETURN', 'WHILE', 'RAISERROR',
  'THROW', 'USE', 'COMMIT', 'ROLLBACK', 'WAITFOR']);

/** UPDATE/DELETE cuyo alcance (hasta el fin de la sentencia) no trae WHERE. */
function sentenciasSinWhere(norm) {
  const encontradas = new Set();
  const re = /\b(UPDATE|DELETE)\b/g;
  let m;
  while ((m = re.exec(norm)) !== null) {
    const previo = norm.slice(0, m.index).trimEnd();
    const palabraPrevia = (/([A-Z_]+)$/.exec(previo) || [])[1];
    // Acciones de llaves foráneas, disparadores, cursores y MERGE ... THEN UPDATE.
    if (previo.endsWith(',') || ['ON', 'AFTER', 'FOR', 'OF', 'THEN'].includes(palabraPrevia)) continue;
    const resto = norm.slice(m.index + m[0].length);
    if (m[1] === 'UPDATE' && /^\s*(STATISTICS\b|\()/.test(resto)) continue;

    let profundidad = 0;
    let caso = 0;
    let conWhere = false;
    const piezas = /[();]|\b[A-Z_]+\b/g;
    let p;
    while ((p = piezas.exec(resto)) !== null) {
      const v = p[0];
      if (v === '(') profundidad += 1;
      else if (v === ')') { profundidad -= 1; if (profundidad < 0) break; }
      else if (v === ';') { if (profundidad === 0) break; }
      else if (profundidad === 0) {
        if (v === 'WHERE') { conWhere = true; break; }
        if (v === 'CASE') caso += 1;
        else if (v === 'END' && caso > 0) caso -= 1;
        else if (FRONTERA.has(v) && !(v === 'ELSE' && caso > 0)) break;
      }
    }
    if (!conWhere) encontradas.add(m[1]);
  }
  return [...encontradas];
}

// Sentencias de permisos, identidad y alcance de base que exigen aprobación por archivo.
const SENSIBLES = [
  ['GRANT', /\bGRANT\b/],
  ['DENY', /\bDENY\b/],
  ['REVOKE', /\bREVOKE\b/],
  ['ALTER ROLE', /\bALTER\s+ROLE\b/],
  ['ALTER AUTHORIZATION', /\bALTER\s+AUTHORIZATION\b/],
  ['CREATE USER', /\bCREATE\s+USER\b/],
  ['CREATE LOGIN', /\bCREATE\s+LOGIN\b/],
  ['CREATE TRIGGER ... ON DATABASE', /\bCREATE\s+(?:OR\s+ALTER\s+)?TRIGGER\b[^;]*?\bON\s+(?:ALL\s+SERVER|DATABASE)\b/],
  ['ALTER DATABASE', /\bALTER\s+DATABASE\b/],
  ['USE', /(?:^|[\s;])USE\s+\S/],
  ['OPENROWSET', /\bOPENROWSET\b/],
  ['BULK INSERT', /\bBULK\s+INSERT\b/],
  ['DISABLE TRIGGER', /\bDISABLE\s+TRIGGER\b/],
  ['NOCHECK', /\bNOCHECK\b/],
];

/**
 * Devuelve la lista de hallazgos destructivos de un script (vacía si no hay). Red de
 * seguridad: no es un analizador de T-SQL completo.
 * `carpeta`: 'alters' | 'esquemas' | 'inserts'.
 */
function revisarDestructivo(contenido, carpeta = 'alters') {
  const hallazgos = new Set();
  for (const lote of dividirLotesCrudo(contenido)) {
    const norm = normalizarSql(lote);
    // Para nombres de procedimientos se conservan los identificadores sin corchetes ni
    // comillas: `EXEC [sys].[sp_executesql]` es lo mismo que `EXEC sys.sp_executesql`.
    const plano = normalizarSql(lote, { conservarIdentificadores: true }).replace(/[[\]"]/g, '');
    if (/\bDROP\b/.test(norm)) hallazgos.add('DROP');
    if (/\bTRUNCATE\b/.test(norm)) hallazgos.add('TRUNCATE');
    if (/\bSP_RENAME\b/.test(plano)) hallazgos.add('sp_rename');
    if (/\bALTER\s+COLUMN\b/.test(norm)) hallazgos.add('ALTER COLUMN');
    if (/\bEXEC(UTE)?\s*\(/.test(plano) || /\bSP_EXECUTESQL\b/.test(plano)
      || /\bEXEC(UTE)?\s+@\w+\b(?!\s*=)/.test(plano) || /\bEXEC(UTE)?\s+@\w+\s*=\s*@/.test(plano)) {
      hallazgos.add('SQL dinámico (EXEC( / sp_executesql / EXEC @variable)');
    }
    if (/\bXP_CMDSHELL\b/.test(plano)) hallazgos.add('xp_cmdshell');
    if (/\bTHEN\s+DELETE\b/.test(norm)) hallazgos.add('MERGE con DELETE');
    for (const [nombre, re] of SENSIBLES) if (re.test(norm)) hallazgos.add(nombre);
    for (const s of sentenciasSinWhere(norm)) hallazgos.add(`${s} sin WHERE`);
    if (carpeta === 'inserts' && /\b(UPDATE|DELETE)\b/.test(norm)) hallazgos.add('UPDATE/DELETE en inserts/');
  }
  return [...hallazgos];
}

// Igual que dividirLotes pero sin descartar lotes ni validar `GO n`: la revisión debe ver todo.
function dividirLotesCrudo(contenido) {
  return String(contenido).replace(/\r\n?/g, '\n').split(/^[ \t]*GO(?:[ \t]+\d+)?[ \t]*$/im);
}

// ── Aprobaciones ─────────────────────────────────────────────────────────────

function cargarAprobaciones(raiz) {
  const ruta = path.join(raiz, APROBACIONES);
  const mapa = new Map();
  if (!fs.existsSync(ruta)) return mapa;
  exigirDentroDeRaiz(raiz, ruta);
  let datos;
  try {
    datos = JSON.parse(fs.readFileSync(ruta, 'utf8').replace(/^﻿/, ''));
  } catch (_) {
    throw new ErrorMigracion(`${APROBACIONES} no es JSON válido.`);
  }
  if (!Array.isArray(datos)) throw new ErrorMigracion(`${APROBACIONES} debe ser una lista.`);
  for (const e of datos) {
    const valido = e && typeof e.script === 'string' && /^[0-9a-f]{64}$/i.test(e.hash || '')
      && /^KAN-[0-9]+$/.test(e.claveJira || '')
      && (e.tablasModificadas === undefined
        || (Array.isArray(e.tablasModificadas) && e.tablasModificadas.every((x) => typeof x === 'string')));
    if (!valido) throw new ErrorMigracion(`${APROBACIONES}: entrada inválida (script, hash sha256, claveJira KAN-n y tablasModificadas).`);
    if (mapa.has(e.script)) throw new ErrorMigracion(`${APROBACIONES}: el script ${e.script} está repetido.`);
    mapa.set(e.script, {
      hash: e.hash.toLowerCase(),
      claveJira: e.claveJira,
      tablasModificadas: (e.tablasModificadas || []).map(nombreTabla),
    });
  }
  return mapa;
}

function nombreTabla(texto) {
  const limpio = String(texto).replace(/[[\]"]/g, '').trim().toLowerCase();
  return limpio.includes('.') ? limpio : `dbo.${limpio}`;
}

/** Aprobación vigente: el script aparece con su hash actual. */
function aprobacionVigente(aprobaciones, script) {
  const a = aprobaciones.get(script.nombre);
  return a && a.hash === script.checksum ? a : null;
}

// ── Conciliación ─────────────────────────────────────────────────────────────

/** Convierte los conjuntos de resultados (clave, valor) en un Map clave -> texto. */
function leerConciliacion(conjuntos) {
  const mapa = new Map();
  for (const conjunto of conjuntos || []) {
    for (const fila of conjunto || []) {
      const claves = Object.keys(fila);
      const kc = claves.find((k) => k.toLowerCase() === 'clave');
      const kv = claves.find((k) => k.toLowerCase() === 'valor');
      if (!kc || !kv) continue;
      mapa.set(String(fila[kc]), fila[kv] === null || fila[kv] === undefined ? '' : String(fila[kv]));
    }
  }
  return mapa;
}

/**
 * Diferencias par por par; excluye `filas:`/`suma:` de las tablas que la aprobación declara.
 * Una clave que no existía antes (tabla nueva) no cuenta; una que existía y cambia o
 * desaparece sí. Un ADD COLUMN sobre tabla existente cambia su `suma:` y requiere
 * `tablasModificadas`.
 */
function compararConciliacion(antes, despues, tablasModificadas = []) {
  const excluidas = new Set(tablasModificadas.map(nombreTabla));
  const diferencias = [];
  const claves = new Set([...antes.keys(), ...despues.keys()]);
  for (const clave of [...claves].sort(comparar)) {
    const m = /^(filas|suma):(.*)$/.exec(clave);
    if (m && excluidas.has(nombreTabla(m[2]))) continue;
    const a = antes.get(clave);
    const d = despues.get(clave);
    if (a === undefined && d !== undefined) continue;
    if (a !== d) diferencias.push({ clave, antes: a === undefined ? '(no existía)' : a, despues: d === undefined ? '(no existe)' : d });
  }
  return diferencias;
}

// ── Plan: qué falta por aplicar ──────────────────────────────────────────────

/**
 * `scripts`: los de alters/ del commit. `registradas`: Map nombre -> checksum de la base.
 * Los registrados que el commit no conoce se ignoran.
 */
function planearAlters(scripts, registradas) {
  const cambiados = [];
  const pendientes = [];
  for (const s of scripts) {
    if (!registradas.has(s.nombre)) pendientes.push(s);
    else if (registradas.get(s.nombre) !== s.checksum) cambiados.push(s.nombre);
  }
  return { cambiados, pendientes };
}

// ── Esquema esperado (baseline) ──────────────────────────────────────────────

function partirTopNivel(texto) {
  const partes = [];
  let profundidad = 0;
  let actual = '';
  for (const c of texto) {
    if (c === '(') profundidad += 1;
    if (c === ')') profundidad -= 1;
    if (c === ',' && profundidad === 0) { partes.push(actual); actual = ''; } else actual += c;
  }
  if (actual.trim()) partes.push(actual);
  return partes;
}

/**
 * Tablas y columnas que declaran los scripts de esquemas/ (CREATE TABLE y la primera
 * columna de ALTER TABLE ... ADD). No compara tipos. Devuelve Map tabla -> Set(columnas),
 * todo en minúsculas.
 */
function extraerEsquemaEsperado(textos) {
  const esquema = new Map();
  const agregar = (tabla, columna) => {
    const t = nombreTabla(tabla);
    if (!esquema.has(t)) esquema.set(t, new Set());
    if (columna) esquema.get(t).add(String(columna).replace(/[[\]"]/g, '').trim().toLowerCase());
  };
  for (const texto of textos) {
    const limpio = normalizarSql(texto, { conservarIdentificadores: true });
    // normalizarSql pone en mayúsculas; los nombres se comparan en minúsculas de todos modos.
    const reCrear = /\bCREATE TABLE\s+([\w[\]."#]+)\s*\(/g;
    let m;
    while ((m = reCrear.exec(limpio)) !== null) {
      const inicio = reCrear.lastIndex;
      let profundidad = 1;
      let i = inicio;
      while (i < limpio.length && profundidad > 0) {
        if (limpio[i] === '(') profundidad += 1;
        else if (limpio[i] === ')') profundidad -= 1;
        i += 1;
      }
      const cuerpo = limpio.slice(inicio, i - 1);
      agregar(m[1]);
      for (const item of partirTopNivel(cuerpo)) {
        const trozo = item.trim();
        if (!trozo || /^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX|PERIOD)\b/.test(trozo)) continue;
        const col = /^(\[[^\]]+\]|"[^"]+"|[\w]+)/.exec(trozo);
        if (col) agregar(m[1], col[1]);
      }
    }
    const reAlter = /\bALTER TABLE\s+([\w[\]."#]+)\s+ADD\s+(?!CONSTRAINT\b|PRIMARY\b|FOREIGN\b|UNIQUE\b|CHECK\b|DEFAULT\b)(\[[^\]]+\]|"[^"]+"|\w+)/g;
    while ((m = reAlter.exec(limpio)) !== null) agregar(m[1], m[2]);
  }
  return esquema;
}

function diferenciasEsquema(esperado, real) {
  const dif = [];
  for (const [tabla, cols] of esperado) {
    if (!real.has(tabla)) { dif.push(`falta la tabla ${tabla}`); continue; }
    for (const c of cols) if (!real.get(tabla).has(c)) dif.push(`falta la columna ${tabla}.${c}`);
    for (const c of real.get(tabla)) if (!cols.has(c)) dif.push(`sobra la columna ${tabla}.${c}`);
  }
  for (const tabla of real.keys()) if (!esperado.has(tabla)) dif.push(`sobra la tabla ${tabla}`);
  return dif;
}

// ── Conexión real (mssql) ────────────────────────────────────────────────────

/**
 * Conexión de una sola sesión (pool de 1): el bloqueo de aplicación, la verificación y los
 * scripts comparten sesión. Interfaz mínima para poder inyectar una base falsa en pruebas.
 */
function crearConexionMssql(config) {
  const sql = require('mssql');
  const pool = new sql.ConnectionPool({
    ...config,
    connectionTimeout: 30000,
    requestTimeout: 300000,
    pool: { max: 1, min: 1, idleTimeoutMillis: 3600000 },
  });
  let tx = null;
  const conexion = {
    alMensaje: null,
    async conectar() { await pool.connect(); },
    _request() {
      const r = tx ? new sql.Request(tx) : pool.request();
      r.on('info', (i) => { if (conexion.alMensaje) conexion.alMensaje(i.message); });
      return r;
    },
    async consulta(texto, params = {}) {
      const r = conexion._request();
      for (const [k, v] of Object.entries(params)) {
        r.input(k, typeof v === 'number' ? sql.Int : sql.NVarChar, v);
      }
      return (await r.query(texto)).recordsets;
    },
    async lote(texto) {
      return (await conexion._request().batch(texto)).recordsets || [];
    },
    async iniciarTransaccion() { tx = new sql.Transaction(pool); await tx.begin(); },
    async confirmar() { const t = tx; tx = null; await t.commit(); },
    async revertir() { const t = tx; tx = null; if (t) { try { await t.rollback(); } catch (_) { /* ya revertida */ } } },
    async cerrar() { try { await pool.close(); } catch (_) { /* nada */ } },
  };
  return conexion;
}

function construirConfig(env) {
  const requeridas = ['DEPLOY_DB_SERVER', 'DEPLOY_DB_DATABASE', 'DEPLOY_DB_USER', 'DEPLOY_DB_PASSWORD'];
  const faltan = requeridas.filter((k) => typeof env[k] !== 'string' || env[k] === '');
  if (faltan.length) throw new ErrorUso(`faltan variables de entorno: ${faltan.join(', ')}.`);
  const dbEnv = {
    DB_SERVER: env.DEPLOY_DB_SERVER,
    DB_DATABASE: env.DEPLOY_DB_DATABASE,
    DB_USER: env.DEPLOY_DB_USER,
    DB_PASSWORD: env.DEPLOY_DB_PASSWORD,
  };
  if (env.DEPLOY_DB_PORT) dbEnv.DB_PORT = env.DEPLOY_DB_PORT;
  if (env.DEPLOY_DB_TRUST_SERVER_CERTIFICATE) dbEnv.DB_TRUST_SERVER_CERTIFICATE = env.DEPLOY_DB_TRUST_SERVER_CERTIFICATE;
  for (const k of ['NODE_ENV', 'WEBSITE_SITE_NAME', 'WEBSITE_INSTANCE_ID']) {
    if (env[k] !== undefined) dbEnv[k] = env[k];
  }
  try {
    return resolveDbConfig(dbEnv).config;
  } catch (e) {
    if (e instanceof DbConfigError) throw new ErrorMigracion(e.message);
    throw e;
  }
}

// ── Orquestación ─────────────────────────────────────────────────────────────

function enmascarador(env) {
  // La contraseña se enmascara siempre; usuario y servidor solo si son lo bastante largos
  // para no destrozar palabras comunes.
  const secretos = [['DEPLOY_DB_PASSWORD', 1], ['DEPLOY_DB_USER', 4], ['DEPLOY_DB_SERVER', 4]]
    .map(([k, min]) => (typeof env[k] === 'string' && env[k].length >= min ? env[k] : null)).filter(Boolean);
  return (texto) => {
    let s = String(texto);
    for (const secreto of secretos) s = s.split(secreto).join('***');
    return s.replace(/(password|pwd|user id|uid)\s*=\s*[^;\s]+/gi, '$1=***');
  };
}

/**
 * Ejecuta un modo y devuelve el código de salida (0, 1 o 2).
 * Opciones: modo, version, confirmarBase, env, raiz, db (conexión inyectable),
 * salida ({ out, err }), esperaBloqueoMs.
 */
async function ejecutarMigracion(opciones) {
  const env = opciones.env || process.env;
  const mask = enmascarador(env);
  const out = (t) => (opciones.salida ? opciones.salida.out : console.log)(mask(t));
  const err = (t) => (opciones.salida ? opciones.salida.err : console.error)(mask(t));
  const raiz = opciones.raiz || RAIZ_SCRIPTS;
  const { modo, version, confirmarBase } = opciones;
  let db = null;
  let bloqueado = false;

  try {
    if (!MODOS.includes(modo)) throw new ErrorUso('modo no válido.');
    if (!validarVersion(version)) throw new ErrorUso('--version debe tener la forma vX.Y.Z.');
    if ((modo === 'baseline' || modo === 'inicializar') && !confirmarBase) {
      throw new ErrorUso(`el modo ${modo} exige --confirmar-base.`);
    }
    const config = opciones.db ? null : construirConfig(env);
    if (opciones.db && (typeof env.DEPLOY_DB_DATABASE !== 'string' || env.DEPLOY_DB_DATABASE === '')) {
      throw new ErrorUso('falta DEPLOY_DB_DATABASE.');
    }

    // Lectura y revisión local: nada de esto toca la base ni imprime todavía.
    const carpetas = modo === 'inicializar' ? ['esquemas', 'inserts', 'alters']
      : modo === 'baseline' ? ['esquemas', 'alters'] : ['alters'];
    const scripts = cargarScripts(raiz, carpetas);
    const alters = scripts.filter((s) => s.carpeta === 'alters');
    if (modo === 'inicializar' && !scripts.some((s) => s.carpeta === 'esquemas')) {
      throw new ErrorMigracion('no hay scripts en esquemas/.');
    }
    const aprobaciones = cargarAprobaciones(raiz);

    let conciliacion = null;
    if (modo === 'aplicar' || modo === 'dry-run') {
      const ruta = path.join(raiz, CONCILIACION);
      if (!fs.existsSync(ruta)) throw new ErrorMigracion(`falta ${CONCILIACION}.`);
      exigirDentroDeRaiz(raiz, ruta);
      const texto = validarScript(fs.readFileSync(ruta), CONCILIACION);
      conciliacion = dividirLotes(texto);
      if (!conciliacion.length) throw new ErrorMigracion(`${CONCILIACION} está vacío.`);
    }

    db = opciones.db || crearConexionMssql(config);
    await db.conectar();
    db.alMensaje = (m) => out(`    ${String(m).slice(0, 300)}`);

    // 7. Punto de restauración: primer mensaje; sin él no se continúa.
    const ahora = await db.consulta(SQL.ahora);
    const valorAhora = ahora && ahora[0] && ahora[0][0] && ahora[0][0].ahora;
    if (typeof valorAhora !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(valorAhora)) {
      throw new ErrorMigracion('no se pudo obtener el punto de restauración del servidor.');
    }
    out(`PUNTO_RESTAURACION_UTC=${valorAhora}Z`);
    out(`db-migrate: modo ${modo}, versión ${version}.`);

    const fila = async (texto, params) => {
      const r = await db.consulta(texto, params);
      return (r && r[0] && r[0][0]) || {};
    };
    const existeControl = async () => {
      const id = (await fila(SQL.tablaControl)).id;
      return id !== null && id !== undefined;
    };
    const soloLectura = modo === 'dry-run';

    if (modo === 'baseline' || modo === 'inicializar') {
      const base = (await fila(SQL.baseActual)).base;
      if (confirmarBase !== env.DEPLOY_DB_DATABASE || base !== env.DEPLOY_DB_DATABASE) {
        throw new ErrorMigracion('--confirmar-base no coincide con la base configurada; no se aplicó nada.');
      }
    }

    // 3. Exclusión mutua (no en dry-run, que no escribe).
    const bloquear = async () => {
      const r = await fila(SQL.bloquear, { espera: opciones.esperaBloqueoMs ?? ESPERA_BLOQUEO_MS });
      if (typeof r.resultado !== 'number' || r.resultado < 0) {
        throw new ErrorMigracion('otro despliegue tiene el bloqueo de migraciones; no se aplicó nada.');
      }
      bloqueado = true;
    };
    const verificarBloqueo = async () => {
      if (String((await fila(SQL.verificarBloqueo)).modo) !== 'Exclusive') {
        throw new ErrorMigracion('se perdió el bloqueo de migraciones; se detiene.');
      }
    };
    if (!soloLectura) await bloquear();

    const ejecutarLotes = async (script) => {
      for (const lote of script.lotes) await db.lote(lote);
      const n = (await fila(SQL.tranCount)).n;
      if (Number(n) !== 1) throw new ErrorMigracion(`${script.nombre}: el script alteró la transacción (COMMIT/ROLLBACK propio).`);
    };
    const registrar = (script, modoReg) => db.consulta(SQL.registrar,
      { nombre: script.nombre, checksum: script.checksum, modo: modoReg, version });
    const enTransaccion = async (trabajo) => {
      await db.iniciarTransaccion();
      try {
        await trabajo();
        await db.confirmar();
      } catch (e) {
        await db.revertir();
        throw e;
      }
    };

    const revisar = (lista) => {
      const rechazos = [];
      for (const s of lista) {
        const hallazgos = revisarDestructivo(s.contenido, s.carpeta);
        if (!hallazgos.length) continue;
        const ap = aprobacionVigente(aprobaciones, s);
        if (ap) out(`    ${s.nombre}: destructivo aprobado (${ap.claveJira}): ${hallazgos.join(', ')}`);
        else rechazos.push(`${s.nombre}: ${hallazgos.join(', ')} (sin aprobación vigente en ${APROBACIONES})`);
      }
      if (rechazos.length) {
        throw new ErrorMigracion(`Sentencias destructivas rechazadas; no se aplicó nada:\n  ${rechazos.join('\n  ')}`);
      }
    };

    const leerRegistradas = async () => {
      const r = await db.consulta(SQL.registradas);
      return new Map(((r && r[0]) || []).map((x) => [x.nombre, String(x.checksum).trim()]));
    };

    const conciliar = async () => {
      let pares = new Map();
      for (const lote of conciliacion) {
        const m = leerConciliacion(await db.lote(lote));
        for (const [k, v] of m) pares.set(k, v);
      }
      if (!pares.size) throw new ErrorMigracion('la conciliación no devolvió resultados.');
      return pares;
    };

    // ── aplicar y dry-run ──
    if (modo === 'aplicar' || modo === 'dry-run') {
      if (!(await existeControl())) {
        throw new ErrorMigracion('no existe dbo.migraciones_aplicadas. Inicializa la base (modo inicializar) o ejecuta esquemas/03_control_migraciones.sql y luego baseline.');
      }
      const registradas = await leerRegistradas();
      const { cambiados, pendientes } = planearAlters(alters, registradas);
      if (cambiados.length) {
        throw new ErrorMigracion(`Scripts ya aplicados con contenido distinto; se detiene: ${cambiados.join(', ')}.`);
      }
      revisar(pendientes);
      const ignorados = [...registradas.keys()].filter((n) => !alters.some((s) => s.nombre === n)).length;
      if (ignorados) out(`db-migrate: ${ignorados} registrados que este commit no conoce (se ignoran).`);
      if (!pendientes.length) {
        out('db-migrate: no hay migraciones pendientes; no se cambió nada.');
        return 0;
      }
      for (const s of pendientes) out(`${soloLectura ? 'APLICARÍA' : 'PENDIENTE'} ${s.nombre} (${s.checksum.slice(0, 12)})`);
      if (soloLectura) {
        out(`db-migrate: dry-run, ${pendientes.length} pendientes; no se escribió nada.`);
        return 0;
      }
      for (const s of pendientes) {
        out(`--> ${s.nombre}`);
        const ap = aprobacionVigente(aprobaciones, s);
        const antes = await conciliar();
        await enTransaccion(async () => {
          await verificarBloqueo();
          await ejecutarLotes(s);
          const despues = await conciliar();
          const dif = compararConciliacion(antes, despues, ap ? ap.tablasModificadas : []);
          if (dif.length) {
            const detalle = dif.slice(0, 10).map((d) => `${d.clave}: ${d.antes} -> ${d.despues}`).join('; ');
            throw new ErrorMigracion(`${s.nombre}: la conciliación difiere, script revertido (${detalle}).`);
          }
          await registrar(s, 'aplicado');
        });
        out(`    aplicado y registrado: ${s.nombre}`);
      }
      out(`db-migrate: ${pendientes.length} migraciones aplicadas.`);
      return 0;
    }

    // ── baseline ──
    if (modo === 'baseline') {
      const esquemas = scripts.filter((s) => s.carpeta === 'esquemas');
      revisar(esquemas);
      if (!(await existeControl())) {
        const control = esquemas.find((s) => /(^|\/)03_control_migraciones\.sql$/.test(s.nombre));
        if (!control) throw new ErrorMigracion('no existe la tabla de control y esquemas/03_control_migraciones.sql no está.');
        out(`--> ${control.nombre} (crea la tabla de control)`);
        await enTransaccion(async () => { await verificarBloqueo(); await ejecutarLotes(control); });
      }
      const registradas = await leerRegistradas();
      const { cambiados, pendientes } = planearAlters(alters, registradas);
      if (cambiados.length) {
        throw new ErrorMigracion(`Scripts ya registrados con contenido distinto; se detiene: ${cambiados.join(', ')}.`);
      }
      const esperado = extraerEsquemaEsperado(esquemas.map((s) => s.contenido));
      esperado.delete(TABLA_CONTROL);
      const real = new Map();
      for (const c of (await db.consulta(SQL.columnas))[0] || []) {
        const t = `${c.esquema}.${c.tabla}`.toLowerCase();
        if (t === TABLA_CONTROL) continue;
        if (!real.has(t)) real.set(t, new Set());
        real.get(t).add(String(c.columna).toLowerCase());
      }
      const dif = diferenciasEsquema(esperado, real);
      if (dif.length) {
        throw new ErrorMigracion(`El esquema real difiere de esquemas/; no se registró nada:\n  ${dif.slice(0, 20).join('\n  ')}`);
      }
      await enTransaccion(async () => {
        await verificarBloqueo();
        for (const s of pendientes) await registrar(s, 'baseline');
      });
      out(`db-migrate: baseline registró ${pendientes.length} scripts sin ejecutarlos.`);
      return 0;
    }

    // ── inicializar ──
    const aEjecutar = scripts.filter((s) => s.carpeta !== 'alters');
    revisar(aEjecutar);
    const verificarVacia = async () => {
      const tablas = ((await db.consulta(SQL.tablasUsuario))[0] || [])
        .filter((t) => `${t.esquema}.${t.tabla}`.toLowerCase() !== TABLA_CONTROL);
      if (tablas.length) {
        throw new ErrorMigracion(`La base no está vacía (${tablas.length} tablas de usuario); la inicialización no se aplicó.`);
      }
      if (await existeControl()) {
        if (Number((await fila(SQL.contarRegistradas)).n) > 0) {
          throw new ErrorMigracion('La tabla de control ya tiene filas: la inicialización ya se hizo y no se repite.');
        }
      }
    };
    for (let i = 0; i < aEjecutar.length; i += 1) {
      const s = aEjecutar[i];
      out(`--> ${s.nombre}`);
      await enTransaccion(async () => {
        await verificarBloqueo();
        if (i === 0) await verificarVacia(); // mismo bloqueo, misma sesión, misma transacción
        await ejecutarLotes(s);
      });
    }
    if (!aEjecutar.length) throw new ErrorMigracion('no hay scripts para inicializar.');
    if (!(await existeControl())) {
      throw new ErrorMigracion('terminó la inicialización pero no existe dbo.migraciones_aplicadas; revisa esquemas/03_control_migraciones.sql.');
    }
    await enTransaccion(async () => {
      await verificarBloqueo();
      for (const s of alters) await registrar(s, 'inicializacion');
    });
    out(`db-migrate: inicialización terminada: ${aEjecutar.length} scripts ejecutados, ${alters.length} alters registrados.`);
    return 0;
  } catch (e) {
    if (e instanceof ErrorUso) {
      err(`db-migrate: uso incorrecto: ${e.message}`);
      return 2;
    }
    const msg = e instanceof ErrorMigracion ? e.message : `error: ${String(e && e.message ? e.message : e).slice(0, 500)}`;
    err(`db-migrate: ${msg}`);
    return 1;
  } finally {
    if (db) {
      if (bloqueado) { try { await db.consulta(SQL.liberar); } catch (_) { /* se libera al cerrar */ } }
      try { await db.cerrar(); } catch (_) { /* nada */ }
    }
  }
}

/** Punto de entrada de la línea de comandos. */
async function main(argv, env = process.env) {
  let args;
  try {
    args = parsearArgumentos(argv);
  } catch (e) {
    console.error(`db-migrate: uso incorrecto: ${e.message}`);
    console.error('Uso: node scripts/db-migrate.js --modo <aplicar|dry-run|baseline|inicializar> --version vX.Y.Z [--confirmar-base NOMBRE]');
    return 2;
  }
  return ejecutarMigracion({ ...args, env });
}

if (require.main === module) {
  main(process.argv.slice(2)).then((codigo) => process.exit(codigo));
}

module.exports = {
  SQL, ErrorMigracion, ErrorUso, MODOS, RAIZ_SCRIPTS,
  validarVersion, parsearArgumentos, checksumScript, dividirLotes, listarCarpeta, cargarScripts,
  normalizarSql, revisarDestructivo, cargarAprobaciones, aprobacionVigente,
  leerConciliacion, compararConciliacion, planearAlters, extraerEsquemaEsperado, diferenciasEsquema,
  construirConfig, crearConexionMssql, ejecutarMigracion, main,
};
