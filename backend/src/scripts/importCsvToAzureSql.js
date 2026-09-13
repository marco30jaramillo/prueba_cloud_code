/*
 * Importador de los CSV actuales a Azure SQL Database.
 *
 * Uso seguro (solo valida archivos):
 *   node src/scripts/importCsvToAzureSql.js
 *
 * Importación real, atómica y reejecutable (insert/update por PK):
 *   node src/scripts/importCsvToAzureSql.js --apply
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');

function parseCsv(content) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (inQuotes && content[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((field) => field.length > 0)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (inQuotes) throw new Error('CSV inválido: hay comillas sin cerrar.');
  row.push(value);
  if (row.some((field) => field.length > 0)) rows.push(row);
  return rows;
}

function readCsv(filename, requiredColumns) {
  const filePath = path.join(BACKEND_ROOT, filename);
  if (!fs.existsSync(filePath)) throw new Error(`No existe el archivo: ${filePath}`);

  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  if (rows.length === 0) throw new Error(`El archivo está vacío: ${filename}`);

  const headers = rows[0].map((header) => header.trim());
  for (const column of requiredColumns) {
    if (!headers.includes(column)) {
      throw new Error(`${filename} no contiene la columna requerida: ${column}`);
    }
  }

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`${filename}, fila ${rowIndex + 2}: se esperaban ${headers.length} columnas y llegaron ${values.length}.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function nullable(value) {
  return value === undefined || value === '' ? null : value;
}

function bool(value) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new Error(`Valor booleano inválido: ${value}`);
}

function date(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`Fecha ISO inválida: ${value}`);
  return parsed;
}

const definitions = [
  {
    file: 'permissions.csv', table: 'permissions', key: 'id',
    columns: { id: sql.Int, name: sql.NVarChar(150), description: sql.NVarChar(500), category: sql.NVarChar(100) },
  },
  {
    file: 'modules.csv', table: 'modules', key: 'id',
    columns: {
      id: sql.Int, name: sql.NVarChar(150), description: sql.NVarChar(1000), buttonLabel: sql.NVarChar(150),
      href: sql.NVarChar(500), icon: sql.NVarChar(50), showInNav: sql.Bit,
      permRead: sql.NVarChar(sql.MAX), permWrite: sql.NVarChar(sql.MAX), permFull: sql.NVarChar(sql.MAX),
    },
    transform: (row) => ({ ...row, id: Number(row.id), showInNav: bool(row.showInNav) }),
  },
  {
    file: 'roles.csv', table: 'roles', key: 'id',
    columns: {
      id: sql.Int, name: sql.NVarChar(100), description: sql.NVarChar(500),
      permissions: sql.NVarChar(sql.MAX), canManage: sql.NVarChar(sql.MAX), modules: sql.NVarChar(sql.MAX),
    },
    transform: (row) => ({ ...row, id: Number(row.id) }),
  },
  {
    file: 'users.csv', table: 'users', key: 'id',
    columns: {
      id: sql.UniqueIdentifier, email: sql.NVarChar(320), password: sql.NVarChar(512), name: sql.NVarChar(300),
      role: sql.NVarChar(100), photo: sql.NVarChar(2048), isActive: sql.Bit, mustChangePassword: sql.Bit,
      createdAt: sql.DateTime2, resetToken: sql.NVarChar(128), resetTokenExpiry: sql.DateTime2,
    },
    transform: (row) => ({
      ...row, photo: nullable(row.photo), isActive: bool(row.isActive), mustChangePassword: bool(row.mustChangePassword),
      createdAt: date(row.createdAt), resetToken: nullable(row.resetToken),
      resetTokenExpiry: nullable(row.resetTokenExpiry) ? date(row.resetTokenExpiry) : null,
    }),
  },
  {
    file: 'tokens_granted.csv', table: 'tokens_granted', key: 'tokenId',
    columns: { tokenId: sql.UniqueIdentifier, userId: sql.UniqueIdentifier, email: sql.NVarChar(320), token: sql.NVarChar(sql.MAX), issuedAt: sql.DateTime2, expiresAt: sql.DateTime2 },
    transform: (row) => ({ ...row, issuedAt: date(row.issuedAt), expiresAt: date(row.expiresAt) }),
  },
  {
    file: 'tokens_revoked.csv', table: 'tokens_revoked', key: 'tokenId',
    columns: { tokenId: sql.UniqueIdentifier, userId: sql.UniqueIdentifier, email: sql.NVarChar(320), token: sql.NVarChar(sql.MAX), revokedAt: sql.DateTime2, expiresAt: sql.DateTime2 },
    transform: (row) => ({ ...row, revokedAt: date(row.revokedAt), expiresAt: date(row.expiresAt) }),
  },
  {
    file: 'audit_logs.csv', table: 'audit_logs', key: 'id',
    columns: {
      id: sql.UniqueIdentifier, action: sql.NVarChar(100), actionLabel: sql.NVarChar(300), actorId: sql.NVarChar(100),
      actorEmail: sql.NVarChar(320), actorName: sql.NVarChar(300), targetId: sql.NVarChar(100), targetEmail: sql.NVarChar(320),
      ipAddress: sql.NVarChar(64), userAgent: sql.NVarChar(sql.MAX), timestamp: sql.DateTime2, success: sql.Bit,
      failureReason: sql.NVarChar(1000), details: sql.NVarChar(sql.MAX), method: sql.NVarChar(50),
    },
    transform: (row) => ({
      ...row, actorId: nullable(row.actorId), actorEmail: nullable(row.actorEmail), actorName: nullable(row.actorName),
      targetId: nullable(row.targetId), targetEmail: nullable(row.targetEmail), ipAddress: nullable(row.ipAddress),
      userAgent: nullable(row.userAgent), timestamp: date(row.timestamp), success: bool(row.success),
      failureReason: nullable(row.failureReason), details: nullable(row.details), method: nullable(row.method),
    }),
  },
];

function connectionConfig() {
  if (process.env.AZURE_SQL_CONNECTION_STRING) return process.env.AZURE_SQL_CONNECTION_STRING;

  const required = ['AZURE_SQL_SERVER', 'AZURE_SQL_DATABASE', 'AZURE_SQL_USER', 'AZURE_SQL_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);

  return {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    options: { encrypt: true, trustServerCertificate: false },
  };
}

async function upsert(transaction, definition, row) {
  const columns = Object.keys(definition.columns);
  const request = new sql.Request(transaction);
  columns.forEach((column, index) => request.input(`p${index}`, definition.columns[column], row[column]));

  const source = columns.map((column, index) => `@p${index} AS [${column}]`).join(', ');
  const updates = columns.filter((column) => column !== definition.key)
    .map((column) => `target.[${column}] = source.[${column}]`).join(', ');
  const insertColumns = columns.map((column) => `[${column}]`).join(', ');
  const insertValues = columns.map((column) => `source.[${column}]`).join(', ');

  await request.query(`
    MERGE dbo.[${definition.table}] WITH (HOLDLOCK) AS target
    USING (SELECT ${source}) AS source
      ON target.[${definition.key}] = source.[${definition.key}]
    WHEN MATCHED THEN UPDATE SET ${updates}
    WHEN NOT MATCHED THEN INSERT (${insertColumns}) VALUES (${insertValues});
  `);
}

async function main() {
  const batches = definitions.map((definition) => ({
    definition,
    rows: readCsv(definition.file, Object.keys(definition.columns)),
  }));

  console.log('Archivos validados:');
  batches.forEach(({ definition, rows }) => console.log(`- ${definition.file}: ${rows.length} filas → dbo.${definition.table}`));

  if (!APPLY) {
    console.log('\nSimulación terminada. No se conectó ni se escribió en Azure SQL.');
    console.log('Para importar: node src/scripts/importCsvToAzureSql.js --apply');
    return;
  }

  const pool = await sql.connect(connectionConfig());
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

  try {
    for (const { definition, rows } of batches) {
      for (const [index, sourceRow] of rows.entries()) {
        const row = definition.transform ? definition.transform(sourceRow) : sourceRow;
        try {
          await upsert(transaction, definition, row);
        } catch (error) {
          throw new Error(`${definition.file}, fila ${index + 2}: ${error.message}`);
        }
      }
    }
    await transaction.commit();
    console.log('\nImportación terminada correctamente.');
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(`\nImportación cancelada: ${error.message}`);
  process.exitCode = 1;
});
