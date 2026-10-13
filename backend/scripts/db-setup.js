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
 * La ejecución con `sqlcmd` vive en `lib/sqlcmd.js` (compartida con `db-test.js`).
 *
 * Sin dependencias de npm: solo módulos de Node y `sqlcmd`.
 */

const fs = require('fs');
const { EntornoNoLocalError, cargarEnv, assertEntornoLocal } = require('./lib/entornoLocal');
const {
  SERVIDOR_LOCAL, RAIZ_SCRIPTS, COMANDO_SQLCMD, validarScript, listarScripts, localizarSqlcmd, ejecutar,
} = require('./lib/sqlcmd');

// Fijos: no se leen de argumentos ni de variables de entorno.
const SERVIDOR = SERVIDOR_LOCAL;
const BASE = 'MiValecito_Dev';

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
    const r = ejecutar(sqlcmd, script.contenido, { base: BASE });
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
