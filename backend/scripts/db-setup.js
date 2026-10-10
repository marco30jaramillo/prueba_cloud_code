/**
 * db-setup.js — Deja lista la base local de desarrollo.
 *
 * Ejecuta, en orden de nombre, los scripts de `database/scripts_sql/esquemas/` (salvo los
 * `00_*`, que corre una persona) y luego los de `database/scripts_sql/inserts/`. No ejecuta
 * `alters/`. Se detiene en el primer error. Los scripts son idempotentes: se puede repetir.
 *
 * Uso:  npm run db:setup
 *
 * Cuenta y destino (H-6): `sqlcmd -E` (autenticación de Windows, sin secreto), servidor
 * `localhost` y base `MiValecito_Dev` fijos en el código. No acepta argumentos.
 *
 * Requisito previo para quien parte de cero: ejecutar una vez
 * `esquemas/00_crear_base_y_usuario.sql` con `sqlcmd -E`.
 *
 * Sin dependencias de npm: solo módulos de Node y `sqlcmd`.
 */

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EntornoNoLocalError, cargarEnv, assertEntornoLocal } = require('./lib/entornoLocal');

// Fijos: no se leen de argumentos ni de variables de entorno.
const SERVIDOR = 'localhost';
const BASE = 'MiValecito_Dev';
const RAIZ_SCRIPTS = path.resolve(__dirname, '../../database/scripts_sql');
const CARPETAS = ['esquemas', 'inserts'];
const TIEMPO_MAXIMO_MS = 120000;

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

/**
 * Ejecuta el contenido ya validado. A sqlcmd le llega una copia temporal, no el archivo
 * original, para que no pueda cambiar entre la validación y la ejecución. La salida va a un
 * archivo en UTF-16 (-u): por la tubería, sqlcmd daña las tildes.
 */
function ejecutar(sqlcmd, contenido) {
  const id = crypto.randomUUID();
  const temporal = path.join(os.tmpdir(), `mivalecito-db-setup-${id}.sql`);
  const resultado = path.join(os.tmpdir(), `mivalecito-db-setup-${id}.out`);
  fs.writeFileSync(temporal, '﻿' + contenido, 'utf8');
  try {
    const args = ['-E', '-S', SERVIDOR, '-d', BASE, '-C', '-b', '-x', '-f', '65001',
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

function main() {
  if (process.argv.length > 2) {
    throw new Error('no acepta argumentos: el servidor y la base están fijos.');
  }

  cargarEnv();
  assertEntornoLocal(process.env, { exigirConexion: false, nombre: 'db-setup' });

  const sqlcmd = localizarSqlcmd();
  if (!sqlcmd) throw new Error('No se encontró sqlcmd.exe en el PATH. Instala las herramientas de línea de comandos de SQL Server.');

  // Se validan todos antes de ejecutar el primero.
  const scripts = listarScripts().map((script) => ({
    ...script,
    contenido: validarScript(fs.readFileSync(script.ruta), script.relativa),
  }));
  if (!scripts.length) throw new Error(`No hay scripts en ${RAIZ_SCRIPTS}.`);

  console.log(`db-setup: servidor ${SERVIDOR}, base ${BASE}, autenticación de Windows`);
  for (const script of scripts) {
    console.log(`\n--> ${script.relativa}`);
    const r = ejecutar(sqlcmd, script.contenido);
    if (r.salida) console.log(r.salida);
    if (r.codigo !== 0) {
      console.error(`\ndb-setup: ${script.relativa} falló (código ${r.codigo}). Se detiene; los scripts siguientes no se ejecutaron.`);
      console.error('  Si no hay conexión: comprueba que el servicio de SQL Server está iniciado y que');
      console.error(`  la base ${BASE} existe (esquemas/00_crear_base_y_usuario.sql, una vez, con sqlcmd -E).`);
      process.exit(1);
    }
  }
  console.log(`\ndb-setup: ${scripts.length} scripts ejecutados sin error.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const mensaje = error.message || String(error);
    console.error(error instanceof EntornoNoLocalError ? mensaje : `db-setup: ${mensaje}`);
    process.exit(1);
  }
}

module.exports = { SERVIDOR, BASE, COMANDO_SQLCMD, validarScript, listarScripts };
