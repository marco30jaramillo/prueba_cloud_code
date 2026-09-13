/*
 * Genera un archivo SQL con sentencias MERGE para importar los CSV a Azure SQL.
 * Uso: node src/scripts/generateSqlImport.js
 * Luego abre el archivo generado en SSMS y ejecútalo contra db_dev_mivalecito_001.
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const OUTPUT = path.resolve(ROOT, '../database/import_data.sql');

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsv(content) {
  const rows = [];
  let row = [], value = '', inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') { value += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(value); value = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(value);
      if (row.some(f => f.length > 0)) rows.push(row);
      row = []; value = '';
    } else value += ch;
  }
  row.push(value);
  if (row.some(f => f.length > 0)) rows.push(row);
  return rows;
}

function readCsv(filename) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) { console.warn(`  ⚠️  No encontrado: ${filename}`); return []; }
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}

// ── SQL value helpers ─────────────────────────────────────────────────────────
function q(v)       { return v == null || v === '' ? 'NULL' : `N'${String(v).replace(/'/g, "''")}'`; }
function qNonNull(v){ return `N'${String(v ?? '').replace(/'/g, "''")}'`; } // never NULL
function qBit(v)    { return (v === 'true' || v === '1' || v === true) ? '1' : '0'; }
function qDate(v)   { return v ? `'${v}'` : 'NULL'; }
function qGuid(v)   { return v ? `'${v}'` : 'NULL'; }

// ── MERGE builders ────────────────────────────────────────────────────────────
function mergePermissions(rows) {
  return rows.map(r => `
MERGE dbo.permissions WITH (HOLDLOCK) AS T
USING (SELECT ${r.id} AS id, ${q(r.name)} AS name, ${q(r.description)} AS description, ${q(r.category)} AS category) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, category=S.category
WHEN NOT MATCHED THEN INSERT (id,name,description,category) VALUES (S.id,S.name,S.description,S.category);`).join('\n');
}

function mergeModules(rows) {
  return rows.map(r => `
MERGE dbo.modules WITH (HOLDLOCK) AS T
USING (SELECT ${r.id} AS id, ${q(r.name)} AS name, ${q(r.description)} AS description,
        ${q(r.buttonLabel)} AS buttonLabel, ${q(r.href)} AS href, ${q(r.icon)} AS icon,
        ${qBit(r.showInNav)} AS showInNav,
        ${q(r.permRead)} AS permRead, ${q(r.permWrite)} AS permWrite, ${q(r.permFull)} AS permFull) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description, buttonLabel=S.buttonLabel,
  href=S.href, icon=S.icon, showInNav=S.showInNav, permRead=S.permRead, permWrite=S.permWrite, permFull=S.permFull
WHEN NOT MATCHED THEN INSERT (id,name,description,buttonLabel,href,icon,showInNav,permRead,permWrite,permFull)
  VALUES (S.id,S.name,S.description,S.buttonLabel,S.href,S.icon,S.showInNav,S.permRead,S.permWrite,S.permFull);`).join('\n');
}

function mergeRoles(rows) {
  return rows.map(r => `
MERGE dbo.roles WITH (HOLDLOCK) AS T
USING (SELECT ${r.id} AS id, ${q(r.name)} AS name, ${q(r.description)} AS description,
        ${qNonNull(r.permissions)} AS permissions, ${qNonNull(r.canManage)} AS canManage,
        ${qNonNull(r.modules)} AS modules) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET name=S.name, description=S.description,
  permissions=S.permissions, canManage=S.canManage, modules=S.modules
WHEN NOT MATCHED THEN INSERT (id,name,description,permissions,canManage,modules)
  VALUES (S.id,S.name,S.description,S.permissions,S.canManage,S.modules);`).join('\n');
}

function mergeUsers(rows) {
  return rows.map(r => `
MERGE dbo.users WITH (HOLDLOCK) AS T
USING (SELECT ${qGuid(r.id)} AS id, ${q(r.email)} AS email, ${q(r.password)} AS password,
        ${q(r.name)} AS name, ${q(r.role)} AS role, ${q(r.photo)} AS photo,
        ${qBit(r.isActive)} AS isActive, ${qBit(r.mustChangePassword)} AS mustChangePassword,
        CAST(${qDate(r.createdAt)} AS datetime2) AS createdAt,
        ${r.resetToken ? q(r.resetToken) : 'NULL'} AS resetToken,
        ${r.resetTokenExpiry ? `CAST(${qDate(r.resetTokenExpiry)} AS datetime2)` : 'NULL'} AS resetTokenExpiry) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET email=S.email, password=S.password, name=S.name, role=S.role,
  photo=S.photo, isActive=S.isActive, mustChangePassword=S.mustChangePassword,
  createdAt=S.createdAt, resetToken=S.resetToken, resetTokenExpiry=S.resetTokenExpiry
WHEN NOT MATCHED THEN INSERT (id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry)
  VALUES (S.id,S.email,S.password,S.name,S.role,S.photo,S.isActive,S.mustChangePassword,S.createdAt,S.resetToken,S.resetTokenExpiry);`).join('\n');
}

function mergeTokensGranted(rows) {
  return rows.map(r => `
MERGE dbo.tokens_granted WITH (HOLDLOCK) AS T
USING (SELECT ${qGuid(r.tokenId)} AS tokenId, ${qGuid(r.userId)} AS userId, ${q(r.email)} AS email,
        ${q(r.token)} AS token, CAST(${qDate(r.issuedAt)} AS datetime2) AS issuedAt,
        CAST(${qDate(r.expiresAt)} AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,issuedAt=S.issuedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,issuedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.issuedAt,S.expiresAt);`).join('\n');
}

function mergeTokensRevoked(rows) {
  return rows.map(r => `
MERGE dbo.tokens_revoked WITH (HOLDLOCK) AS T
USING (SELECT ${qGuid(r.tokenId)} AS tokenId, ${qGuid(r.userId)} AS userId, ${q(r.email)} AS email,
        ${q(r.token)} AS token, CAST(${qDate(r.revokedAt)} AS datetime2) AS revokedAt,
        CAST(${qDate(r.expiresAt)} AS datetime2) AS expiresAt) AS S
  ON T.tokenId = S.tokenId
WHEN MATCHED THEN UPDATE SET userId=S.userId,email=S.email,token=S.token,revokedAt=S.revokedAt,expiresAt=S.expiresAt
WHEN NOT MATCHED THEN INSERT (tokenId,userId,email,token,revokedAt,expiresAt)
  VALUES (S.tokenId,S.userId,S.email,S.token,S.revokedAt,S.expiresAt);`).join('\n');
}

function mergeAuditLogs(rows) {
  return rows.map(r => `
MERGE dbo.audit_logs WITH (HOLDLOCK) AS T
USING (SELECT ${qGuid(r.id)} AS id, ${q(r.action)} AS action, ${q(r.actionLabel)} AS actionLabel,
        ${q(r.actorId||'')} AS actorId, ${q(r.actorEmail||'')} AS actorEmail, ${q(r.actorName||'')} AS actorName,
        ${q(r.targetId||'')} AS targetId, ${q(r.targetEmail||'')} AS targetEmail,
        ${q(r.ipAddress||'')} AS ipAddress, ${q(r.userAgent||'')} AS userAgent,
        CAST(${qDate(r.timestamp)} AS datetime2) AS [timestamp],
        ${qBit(r.success)} AS success,
        ${q(r.failureReason||'')} AS failureReason, ${q(r.details||'')} AS details,
        ${q(r.method||'')} AS method) AS S
  ON T.id = S.id
WHEN MATCHED THEN UPDATE SET action=S.action,actionLabel=S.actionLabel,actorId=S.actorId,
  actorEmail=S.actorEmail,actorName=S.actorName,targetId=S.targetId,targetEmail=S.targetEmail,
  ipAddress=S.ipAddress,userAgent=S.userAgent,[timestamp]=S.[timestamp],success=S.success,
  failureReason=S.failureReason,details=S.details,method=S.method
WHEN NOT MATCHED THEN INSERT (id,action,actionLabel,actorId,actorEmail,actorName,targetId,targetEmail,ipAddress,userAgent,[timestamp],success,failureReason,details,method)
  VALUES (S.id,S.action,S.actionLabel,S.actorId,S.actorEmail,S.actorName,S.targetId,S.targetEmail,S.ipAddress,S.userAgent,S.[timestamp],S.success,S.failureReason,S.details,S.method);`).join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const permissions   = readCsv('permissions.csv');
const modules       = readCsv('modules.csv');
const roles         = readCsv('roles.csv');
const users         = readCsv('users.csv');
const tokensGranted = readCsv('tokens_granted.csv');
const tokensRevoked = readCsv('tokens_revoked.csv');
const auditLogs     = readCsv('audit_logs.csv');

const sql = `-- ============================================================
--  Importación de datos CSV → Azure SQL
--  Generado: ${new Date().toISOString()}
--  Ejecutar contra: db_dev_mivalecito_001
--  Reejecutable: limpia y recarga (DELETE + MERGE)
-- ============================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

-- ── Limpieza previa (orden inverso a FK) ─────────────────────
PRINT 'Limpiando tablas...';
DELETE FROM dbo.audit_logs;
DELETE FROM dbo.tokens_revoked;
DELETE FROM dbo.tokens_granted;
DELETE FROM dbo.users;
DELETE FROM dbo.roles;
DELETE FROM dbo.modules;
DELETE FROM dbo.permissions;
PRINT 'Tablas limpias.';
GO

-- 1. Permissions (${permissions.length} filas)
PRINT 'Insertando permissions...';
${mergePermissions(permissions)}
PRINT 'Permissions OK.';
GO

-- 2. Modules (${modules.length} filas)
PRINT 'Insertando modules...';
${mergeModules(modules)}
PRINT 'Modules OK.';
GO

-- 3. Roles (${roles.length} filas)
PRINT 'Insertando roles...';
${mergeRoles(roles)}
PRINT 'Roles OK.';
GO

-- 4. Users (${users.length} filas)
PRINT 'Insertando users...';
${mergeUsers(users)}
PRINT 'Users OK.';
GO

-- 5. Tokens otorgados (${tokensGranted.length} filas)
PRINT 'Insertando tokens_granted...';
${tokensGranted.length ? mergeTokensGranted(tokensGranted) : '-- (vacío)'}
PRINT 'Tokens granted OK.';
GO

-- 6. Tokens revocados (${tokensRevoked.length} filas)
PRINT 'Insertando tokens_revoked...';
${tokensRevoked.length ? mergeTokensRevoked(tokensRevoked) : '-- (vacío)'}
PRINT 'Tokens revoked OK.';
GO

-- 7. Audit logs (${auditLogs.length} filas)
PRINT 'Insertando audit_logs...';
${auditLogs.length ? mergeAuditLogs(auditLogs) : '-- (vacío)'}
PRINT 'Audit logs OK.';
GO

PRINT '============================================';
PRINT 'Importación completada correctamente.';
PRINT '============================================';
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, sql, 'utf8');
console.log(`✅ Archivo generado: ${OUTPUT}`);
console.log(`   Ábrelo en SSMS conectado a: db_dev_mivalecito_001`);
