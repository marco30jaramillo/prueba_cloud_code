/**
 * Limpieza diaria de cuentas pendientes de activación vencidas (requerimiento 003, tarea 15).
 *
 * Una cuenta es candidata si: activatedAt IS NULL, activationExpiresAt NO es nulo y ya
 * venció, sigue habilitada y no es superusuario. Por cada una, en su propia transacción:
 *   - si algo la referencia (vales, abonos, tiendas creadas, asignaciones hechas, o cualquier
 *     otra llave foránea hacia users que exista) -> se DESHABILITA y se invalida su enlace;
 *   - si no -> se ELIMINA junto con sus sesiones y membresías de tienda.
 * La eliminación es un DELETE atómico que repite la condición de vencimiento: si la persona
 * activó entre la lectura y el borrado, no se borra nada. Ante cualquier duda, se deshabilita.
 * Las filas de auditoría de una cuenta eliminada se conservan (no hay llave foránea).
 *
 * Modo (variable PENDING_ACCOUNT_PURGE): `dry-run` (por defecto, solo cuenta), `apply`, `off`.
 * Tope por corrida (PENDING_PURGE_MAX_PER_RUN, 50 por defecto): si hay más candidatas, aborta
 * y no toca nada. Manual: `node src/scripts/purgePendingAccounts.js [--dry-run|--apply]`.
 */

const { sql, getPool, isGuid } = require('../database/sqlPool');

const MODES = ['off', 'dry-run', 'apply'];
const DEFAULT_MAX_PER_RUN = 50;

// Datos propios de la cuenta que se van con ella. Cualquier OTRA llave foránea hacia
// dbo.users cuenta como «movimiento» y obliga a deshabilitar en lugar de borrar.
const OWN_DATA = [
  { table: 'tokens_granted', column: 'userId' },
  { table: 'tokens_revoked', column: 'userId' },
  { table: 'tienda_usuarios', column: 'userId' },
];

const IDENTIFIER = /^[A-Za-z0-9_]+$/;

function resolveMode(env = process.env, argv = []) {
  if (argv.includes('--apply')) return 'apply';
  if (argv.includes('--dry-run')) return 'dry-run';
  const value = String(env.PENDING_ACCOUNT_PURGE || 'dry-run').trim().toLowerCase();
  return MODES.includes(value) ? value : 'dry-run';
}

function resolveMaxPerRun(env = process.env) {
  const parsed = Number.parseInt(env.PENDING_PURGE_MAX_PER_RUN, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PER_RUN;
}

const isOwnData = (ref) => OWN_DATA.some((o) => o.table === ref.table && o.column === ref.column);

async function listForeignKeysToUsers(pool) {
  const result = await pool.request().query(`
    SELECT OBJECT_SCHEMA_NAME(fkc.parent_object_id) AS schemaName,
           OBJECT_NAME(fkc.parent_object_id)        AS tableName,
           COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS columnName
    FROM sys.foreign_key_columns fkc
    WHERE fkc.referenced_object_id = OBJECT_ID(N'dbo.users')`);
  return result.recordset
    .map((r) => ({ schema: r.schemaName, table: r.tableName, column: r.columnName }))
    .filter((r) => IDENTIFIER.test(r.schema) && IDENTIFIER.test(r.table) && IDENTIFIER.test(r.column));
}

/** ¿Alguna llave foránea que NO es dato propio apunta a esta cuenta? */
async function hasMovements(executor, refs, userId) {
  for (const ref of refs.filter((r) => !isOwnData(r))) {
    const result = await executor.request()
      .input('id', sql.UniqueIdentifier, userId)
      .query(`SELECT TOP 1 1 AS found FROM [${ref.schema}].[${ref.table}] WHERE [${ref.column}] = @id`);
    if (result.recordset.length) return true;
  }
  return false;
}

const EXPIRED_CONDITION = `activatedAt IS NULL AND activationExpiresAt IS NOT NULL
                           AND activationExpiresAt < SYSUTCDATETIME()
                           AND isActive = 1 AND role <> N'superuser'`;

async function deleteAccount(pool, refs, candidate) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    for (const own of OWN_DATA) {
      const ref = refs.find((r) => isOwnData(r) && r.table === own.table && r.column === own.column);
      if (!ref) continue;
      await new sql.Request(tx).input('id', sql.UniqueIdentifier, candidate.id)
        .query(`DELETE FROM [${ref.schema}].[${ref.table}] WHERE [${ref.column}] = @id`);
    }
    const result = await new sql.Request(tx).input('id', sql.UniqueIdentifier, candidate.id)
      .query(`DELETE FROM dbo.users WHERE id = @id AND ${EXPIRED_CONDITION}`);
    if (result.rowsAffected[0] !== 1) {
      await tx.rollback();
      return false; // activó o cambió entre la lectura y el borrado
    }
    await tx.commit();
    return true;
  } catch (error) {
    try { await tx.rollback(); } catch { /* ya revertida */ }
    throw error;
  }
}

async function disableAccount(pool, candidate) {
  const result = await pool.request().input('id', sql.UniqueIdentifier, candidate.id)
    .query(`UPDATE dbo.users SET isActive = 0, activationTokenHash = NULL
            WHERE id = @id AND ${EXPIRED_CONDITION}`);
  return result.rowsAffected[0] === 1;
}

/**
 * @param {{mode?: string, maxPerRun?: number, pool?: object, audit?: object}} [options]
 * @returns resumen { mode, candidates, deleted, disabled, skipped, wouldDelete, wouldDisable, aborted, abortReason }
 */
async function run(options = {}) {
  const mode = options.mode || resolveMode();
  const maxPerRun = options.maxPerRun || resolveMaxPerRun();
  const audit = options.audit || require('../middleware/auditMiddleware');
  const summary = {
    mode, candidates: 0, deleted: 0, disabled: 0, skipped: 0, wouldDelete: 0, wouldDisable: 0,
    aborted: false, abortReason: null,
  };
  if (mode === 'off') return summary;

  const pool = options.pool || await getPool();
  const apply = mode === 'apply';

  const refs = await listForeignKeysToUsers(pool);
  // Sin el catálogo de llaves no se puede asegurar qué es un movimiento: no se actúa.
  if (!refs.length) {
    summary.aborted = true;
    summary.abortReason = 'foreign_keys_unavailable';
    await audit.logPendingPurgeRun(summary);
    return summary;
  }

  const found = await pool.request().input('cap', sql.Int, maxPerRun + 1)
    .query(`SELECT TOP (@cap) id, email, role FROM dbo.users WHERE ${EXPIRED_CONDITION} ORDER BY createdAt`);
  const candidates = found.recordset.map((r) => ({ id: String(r.id), email: r.email, role: r.role }));
  summary.candidates = candidates.length;

  if (candidates.length > maxPerRun) {
    summary.aborted = true;
    summary.abortReason = 'cap_exceeded';
    summary.candidates = `>${maxPerRun}`;
    await audit.logPendingPurgeRun(summary);
    return summary;
  }

  for (const candidate of candidates) {
    if (!isGuid(candidate.id)) { summary.skipped += 1; continue; }
    try {
      const movements = await hasMovements(pool, refs, candidate.id);
      if (!apply) {
        if (movements) summary.wouldDisable += 1; else summary.wouldDelete += 1;
        continue;
      }
      if (movements) {
        if (await disableAccount(pool, candidate)) {
          summary.disabled += 1;
          await audit.logPendingAccountAction('disabled', candidate, 'activation_expired_with_movements');
        } else {
          summary.skipped += 1;
        }
        continue;
      }
      let removed = false;
      try {
        removed = await deleteAccount(pool, refs, candidate);
      } catch (error) {
        // Una llave que no se conocía (547) u otro fallo: ante la duda, deshabilitar.
        if (await disableAccount(pool, candidate)) {
          summary.disabled += 1;
          await audit.logPendingAccountAction('disabled', candidate, 'delete_failed_fallback');
        } else {
          summary.skipped += 1;
        }
        continue;
      }
      if (removed) {
        summary.deleted += 1;
        await audit.logPendingAccountAction('deleted', candidate, 'activation_expired');
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.skipped += 1;
      console.error('[purga] cuenta omitida por error:', (error && (error.code || error.name)) || 'error');
    }
  }

  await audit.logPendingPurgeRun(summary);
  return summary;
}

class PendingAccountPurger {
  static async runAndReport(options) {
    const summary = await run(options);
    // Solo conteos: sin correos ni identificadores en el log.
    console.log(`[purga] modo=${summary.mode} candidatas=${summary.candidates} eliminadas=${summary.deleted} ` +
      `deshabilitadas=${summary.disabled} omitidas=${summary.skipped} ` +
      `simulacion(eliminaria=${summary.wouldDelete}, deshabilitaria=${summary.wouldDisable})` +
      (summary.aborted ? ` ABORTADA=${summary.abortReason}` : ''));
    return summary;
  }

  /** Programa la corrida diaria (3 a. m., mismo patrón que el limpiador de tokens). */
  static scheduleDaily() {
    const mode = resolveMode();
    if (mode === 'off') {
      console.log('⏰ Limpieza de cuentas pendientes desactivada (PENDING_ACCOUNT_PURGE=off)');
      return;
    }
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(3, 0, 0, 0);
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

    console.log(`⏰ Limpieza de cuentas pendientes (${mode}) programada para: ${nextRun.toLocaleString()}`);
    const execute = () => PendingAccountPurger.runAndReport().catch((error) => {
      console.error('[purga] corrida fallida:', (error && (error.code || error.name)) || 'error');
    });
    setTimeout(() => {
      execute();
      setInterval(execute, 24 * 60 * 60 * 1000);
    }, nextRun - now);
  }
}

module.exports = PendingAccountPurger;
module.exports.run = run;
module.exports.resolveMode = resolveMode;
module.exports.resolveMaxPerRun = resolveMaxPerRun;

if (require.main === module) {
  require('dotenv').config();
  require('../config/startupChecks').enforceStartupConfig(process.env);
  PendingAccountPurger.runAndReport({ mode: resolveMode(process.env, process.argv.slice(2)) })
    .then(() => process.exit(0))
    .catch((error) => { console.error('[purga] fallo:', (error && (error.code || error.name)) || 'error'); process.exit(1); });
}
