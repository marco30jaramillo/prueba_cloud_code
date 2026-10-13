/**
 * Ejecución de scripts SQL con `sqlcmd`, compartida por `db-setup.js` (base de desarrollo) y
 * `db-test.js` (base de pruebas).
 *
 * Qué garantiza:
 *  - Servidor fijo `localhost` y autenticación de Windows (`-E`): sin secretos ni parámetros
 *    de servidor. El único parámetro es la base (validada: solo letras, números y guion bajo).
 *  - Antes de cada ejecución vuelve a comprobar que el entorno es local
 *    (`assertEntornoLocal`), también si quien llama ya lo hizo.
 *  - Rechaza scripts que no sean UTF-8 o que traigan comandos de sqlcmd que salen del lote.
 *  - sqlcmd recibe una copia temporal del contenido ya validado, no el archivo original; los
 *    temporales se borran siempre.
 *
 * Sin dependencias de npm: solo módulos de Node y `sqlcmd`.
 */

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { assertEntornoLocal } = require('./entornoLocal');

// Fijo: no se lee de argumentos ni de variables de entorno.
const SERVIDOR_LOCAL = 'localhost';
const RAIZ_SCRIPTS = path.resolve(__dirname, '../../../database/scripts_sql');
const CARPETAS = ['esquemas', 'inserts'];
const TIEMPO_MAXIMO_MS = 120000;

const NOMBRE_BASE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const PREFIJO_TEMPORAL = /^mivalecito-db-[a-z]{2,20}$/;

// Mismo filtro que el MCP `mssql-dev`: comandos de sqlcmd que salen de la base o del lote
// (ejecutar en el sistema, leer otros archivos, reconectar, descartar o cortar el lote).
// `GO` es el único comando de sqlcmd admitido.
const COMANDO_SQLCMD = /^[^\S\r\n]*(!!|:|(reset|quit|ed)[^\S\r\n]*$|exit\b)/im;

const VARIABLES_ENTORNO = ['SystemRoot', 'windir', 'SystemDrive', 'TEMP', 'TMP', 'PATH', 'ProgramFiles',
  'ProgramData', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMPUTERNAME', 'USERNAME', 'USERDOMAIN'];

/**
 * Valida el contenido de un script y lo devuelve como texto (sin BOM). Lanza si no es
 * UTF-8 o si trae comandos de sqlcmd al inicio de una línea.
 */
function validarScript(bytes, nombre) {
  if (bytes.includes(0) || (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    throw new Error(`${nombre}: el script debe estar en UTF-8 (no UTF-16 ni binario).`);
  }
  let contenido;
  try {
    contenido = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (_) {
    throw new Error(`${nombre}: el script no es UTF-8 válido.`);
  }
  if (COMANDO_SQLCMD.test(contenido)) {
    throw new Error(`${nombre}: contiene comandos de sqlcmd (":", "!!", RESET, EXIT, QUIT, ED), que no se permiten.`);
  }
  return contenido;
}

/**
 * Scripts a ejecutar, en orden: `esquemas/` (sin `00_*`) y luego `inserts/`, cada carpeta
 * por nombre de archivo.
 */
function listarScripts(raiz = RAIZ_SCRIPTS) {
  const scripts = [];
  for (const carpeta of CARPETAS) {
    const directorio = path.join(raiz, carpeta);
    const nombres = fs.readdirSync(directorio, { withFileTypes: true })
      .filter((entrada) => entrada.isFile() && /\.sql$/i.test(entrada.name) && !/^00_/.test(entrada.name))
      .map((entrada) => entrada.name)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const nombre of nombres) {
      scripts.push({ relativa: `${carpeta}/${nombre}`, ruta: path.join(directorio, nombre) });
    }
  }
  return scripts;
}

function localizarSqlcmd(env = process.env) {
  for (const carpeta of (env.PATH || env.Path || '').split(path.delimiter)) {
    if (!carpeta || !path.isAbsolute(carpeta)) continue;
    const candidato = path.join(carpeta, 'sqlcmd.exe');
    if (fs.existsSync(candidato)) return candidato;
  }
  return null;
}

function entornoMinimo() {
  const entorno = {};
  for (const nombre of VARIABLES_ENTORNO) {
    if (process.env[nombre]) entorno[nombre] = process.env[nombre];
  }
  if (!entorno.PATH && process.env.Path) entorno.PATH = process.env.Path;
  return entorno;
}

const cacheCodificacion = new Map();

/**
 * La versión ODBC de sqlcmd (la clásica) acepta `-f 65001` para leer el script en UTF-8; la
 * versión en Go (`winget install sqlcmd`, v1.x) no tiene ese parámetro, pero lee UTF-8 sola.
 * Se detecta por la ayuda del propio ejecutable y se usa `-f` solo donde existe.
 */
function admiteCodificacion(sqlcmd) {
  if (!cacheCodificacion.has(sqlcmd)) {
    const r = spawnSync(sqlcmd, ['-?'], { env: entornoMinimo(), encoding: 'utf8', windowsHide: true, timeout: 15000 });
    cacheCodificacion.set(sqlcmd, /\[-f\s*<codepage>/i.test(`${r.stdout || ''}${r.stderr || ''}`));
  }
  return cacheCodificacion.get(sqlcmd);
}

/**
 * Ejecuta el contenido ya validado contra `base` en `localhost`. La salida va a un archivo
 * en UTF-16 (-u): por la tubería, sqlcmd daña las tildes.
 *
 * @param {string} sqlcmd   ruta de sqlcmd.exe
 * @param {string} contenido SQL ya validado con `validarScript`
 * @param {{ base: string, prefijoTemporal?: string }} opciones
 */
function ejecutar(sqlcmd, contenido, { base, prefijoTemporal = 'mivalecito-db-setup' } = {}) {
  assertEntornoLocal(process.env, { exigirConexion: false, nombre: 'sqlcmd' });
  if (typeof base !== 'string' || !NOMBRE_BASE.test(base)) {
    throw new Error('sqlcmd: nombre de base no válido.');
  }
  if (!PREFIJO_TEMPORAL.test(prefijoTemporal)) {
    throw new Error('sqlcmd: prefijo de archivos temporales no válido.');
  }

  const id = crypto.randomUUID();
  const temporal = path.join(os.tmpdir(), `${prefijoTemporal}-${id}.sql`);
  const resultado = path.join(os.tmpdir(), `${prefijoTemporal}-${id}.out`);
  fs.writeFileSync(temporal, '﻿' + contenido, 'utf8');
  try {
    const args = ['-E', '-S', SERVIDOR_LOCAL, '-d', base, '-C', '-b', '-x',
      ...(admiteCodificacion(sqlcmd) ? ['-f', '65001'] : []),
      '-i', temporal, '-o', resultado, '-u'];
    const r = spawnSync(sqlcmd, args, {
      env: entornoMinimo(), encoding: 'utf8', windowsHide: true, timeout: TIEMPO_MAXIMO_MS,
    });
    let archivoSalida = '';
    try {
      archivoSalida = fs.readFileSync(resultado, 'utf16le').replace(/^﻿/, '');
    } catch (_) {
      // Sin archivo: sqlcmd falló antes de abrirlo; el motivo viene por stdout o stderr.
    }
    const salida = [archivoSalida, r.stdout, r.stderr].filter(Boolean).join('\n').replace(/\r\n/g, '\n').trim();
    if (r.error) return { codigo: 1, salida: [salida, r.error.message].filter(Boolean).join('\n') };
    return { codigo: r.status === null ? 1 : r.status, salida };
  } finally {
    fs.rmSync(temporal, { force: true });
    fs.rmSync(resultado, { force: true });
  }
}

module.exports = {
  SERVIDOR_LOCAL,
  RAIZ_SCRIPTS,
  COMANDO_SQLCMD,
  validarScript,
  listarScripts,
  localizarSqlcmd,
  entornoMinimo,
  ejecutar,
};
