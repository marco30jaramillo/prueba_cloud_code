const fs = require('fs');
const path = require('path');
const { sql, usingSql, request } = require('../database/sqlPool');

class TokenManager {
  constructor() {
    this.grantedPath = path.join(process.cwd(), 'tokens_granted.csv');
    this.revokedPath = path.join(process.cwd(), 'tokens_revoked.csv');
    if (!usingSql()) this._ensureFiles();
  }

  _ensureFiles() {
    if (!fs.existsSync(this.grantedPath))
      fs.writeFileSync(this.grantedPath, 'tokenId,userId,email,token,issuedAt,expiresAt\n');
    if (!fs.existsSync(this.revokedPath))
      fs.writeFileSync(this.revokedPath, 'tokenId,userId,email,token,revokedAt,expiresAt\n');
  }

  async addGrantedToken(tokenId, userId, email, token, expiresAt) {
    const issuedAt = new Date().toISOString();
    if (!usingSql()) {
      fs.appendFileSync(this.grantedPath, `${tokenId},${userId},${email},${token},${issuedAt},${expiresAt}\n`);
      return;
    }
    try {
      await (await request())
        .input('tokenId',   sql.UniqueIdentifier, tokenId)
        .input('userId',    sql.UniqueIdentifier, userId)
        .input('email',     sql.NVarChar(320),    email)
        .input('token',     sql.NVarChar(sql.MAX),token)
        .input('issuedAt',  sql.DateTime2,        new Date(issuedAt))
        .input('expiresAt', sql.DateTime2,        new Date(expiresAt))
        .query(`INSERT INTO dbo.tokens_granted (tokenId,userId,email,token,issuedAt,expiresAt)
                VALUES (@tokenId,@userId,@email,@token,@issuedAt,@expiresAt)`);
    } catch (err) { console.error('[TokenManager] addGrantedToken error:', err.message); }
  }

  async revokeToken(userId, token, expiresAt) {
    if (!usingSql()) {
      const granted = this._readGrantedCsv();
      const record = granted.find(t => t.token === token && t.userId === userId);
      if (!record) return false;
      const revokedAt = new Date().toISOString();
      fs.appendFileSync(this.revokedPath, `${record.tokenId},${record.userId},${record.email},${record.token},${revokedAt},${record.expiresAt}\n`);
      this._removeGrantedCsv(record.tokenId);
      return true;
    }
    try {
      const db = await request();
      const found = await db.input('token', sql.NVarChar(sql.MAX), token)
        .input('userId', sql.UniqueIdentifier, userId)
        .query('SELECT TOP 1 tokenId,userId,email,expiresAt FROM dbo.tokens_granted WHERE token=@token AND userId=@userId');
      if (!found.recordset.length) return false;
      const record = found.recordset[0];
      const revokedAt = new Date();
      await (await request())
        .input('tokenId',  sql.UniqueIdentifier, record.tokenId)
        .input('userId',   sql.UniqueIdentifier, record.userId)
        .input('email',    sql.NVarChar(320),    record.email)
        .input('token',    sql.NVarChar(sql.MAX),token)
        .input('revokedAt',sql.DateTime2,        revokedAt)
        .input('expiresAt',sql.DateTime2,        record.expiresAt)
        .query(`INSERT INTO dbo.tokens_revoked (tokenId,userId,email,token,revokedAt,expiresAt)
                VALUES (@tokenId,@userId,@email,@token,@revokedAt,@expiresAt)`);
      await (await request()).input('tokenId', sql.UniqueIdentifier, record.tokenId)
        .query('DELETE FROM dbo.tokens_granted WHERE tokenId=@tokenId');
      return true;
    } catch (err) { console.error('[TokenManager] revokeToken error:', err.message); return false; }
  }

  async revokeAllUserTokens(userId, email) {
    if (!usingSql()) {
      const granted = this._readGrantedCsv();
      const userTokens = granted.filter(t => t.userId === userId);
      const revokedAt = new Date().toISOString();
      userTokens.forEach(record => {
        fs.appendFileSync(this.revokedPath, `${record.tokenId},${record.userId},${record.email},${record.token},${revokedAt},${record.expiresAt}\n`);
        this._removeGrantedCsv(record.tokenId);
      });
      return userTokens.length;
    }
    try {
      const db = await request();
      const found = await db.input('userId', sql.UniqueIdentifier, userId)
        .query('SELECT tokenId,email,token,expiresAt FROM dbo.tokens_granted WHERE userId=@userId');
      if (!found.recordset.length) return 0;
      const revokedAt = new Date();
      for (const record of found.recordset) {
        await (await request())
          .input('tokenId',  sql.UniqueIdentifier, record.tokenId)
          .input('userId',   sql.UniqueIdentifier, userId)
          .input('email',    sql.NVarChar(320),    record.email)
          .input('token',    sql.NVarChar(sql.MAX),record.token)
          .input('revokedAt',sql.DateTime2,        revokedAt)
          .input('expiresAt',sql.DateTime2,        record.expiresAt)
          .query(`INSERT INTO dbo.tokens_revoked (tokenId,userId,email,token,revokedAt,expiresAt)
                  VALUES (@tokenId,@userId,@email,@token,@revokedAt,@expiresAt)`);
      }
      await (await request()).input('userId', sql.UniqueIdentifier, userId)
        .query('DELETE FROM dbo.tokens_granted WHERE userId=@userId');
      return found.recordset.length;
    } catch (err) { console.error('[TokenManager] revokeAllUserTokens error:', err.message); return 0; }
  }

  async isTokenValid(token) {
    if (!usingSql()) {
      const revoked = this._readRevokedCsv();
      if (revoked.find(t => t.token === token)) return false;
      const granted = this._readGrantedCsv();
      const record = granted.find(t => t.token === token);
      if (!record) return false;
      return new Date(record.expiresAt) >= new Date();
    }
    try {
      const result = await (await request()).input('token', sql.NVarChar(sql.MAX), token)
        .query(`SELECT TOP 1 1 AS valid FROM dbo.tokens_granted
                WHERE token=@token AND expiresAt >= SYSUTCDATETIME()`);
      return result.recordset.length > 0;
    } catch (err) { console.error('[TokenManager] isTokenValid error:', err.message); return false; }
  }

  async cleanExpiredRevokedTokens() {
    if (!usingSql()) {
      const revoked = this._readRevokedCsv();
      const now = new Date();
      const filtered = revoked.filter(t => new Date(t.expiresAt) >= now);
      const header = 'tokenId,userId,email,token,revokedAt,expiresAt\n';
      fs.writeFileSync(this.revokedPath, header + filtered.map(t => `${t.tokenId},${t.userId},${t.email},${t.token},${t.revokedAt},${t.expiresAt}`).join('\n') + (filtered.length ? '\n' : ''));
      return revoked.length - filtered.length;
    }
    try {
      const result = await (await request())
        .query('DELETE FROM dbo.tokens_revoked WHERE expiresAt < SYSUTCDATETIME()');
      return result.rowsAffected[0] || 0;
    } catch (err) { console.error('[TokenManager] cleanExpiredRevokedTokens error:', err.message); return 0; }
  }

  async getStats() {
    if (!usingSql()) {
      const granted = this._readGrantedCsv();
      const revoked = this._readRevokedCsv();
      return {
        totalGranted: granted.length,
        totalRevoked: revoked.length,
        grantedUsers: new Set(granted.map(t => t.userId)).size,
        revokedUsers: new Set(revoked.map(t => t.userId)).size,
      };
    }
    try {
      const r1 = await (await request()).query('SELECT COUNT(*) AS n FROM dbo.tokens_granted');
      const r2 = await (await request()).query('SELECT COUNT(*) AS n FROM dbo.tokens_revoked');
      return { totalGranted: r1.recordset[0].n, totalRevoked: r2.recordset[0].n };
    } catch (err) { return { totalGranted: 0, totalRevoked: 0 }; }
  }

  // ── CSV helpers (used only when DATA_PROVIDER=csv) ──────────────

  _readGrantedCsv() {
    const content = fs.readFileSync(this.grantedPath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
  }

  _readRevokedCsv() {
    const content = fs.readFileSync(this.revokedPath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
  }

  _removeGrantedCsv(tokenId) {
    const tokens = this._readGrantedCsv().filter(t => t.tokenId !== tokenId);
    const header = 'tokenId,userId,email,token,issuedAt,expiresAt\n';
    fs.writeFileSync(this.grantedPath, header + tokens.map(t => `${t.tokenId},${t.userId},${t.email},${t.token},${t.issuedAt},${t.expiresAt}`).join('\n') + (tokens.length ? '\n' : ''));
  }

  // Legacy sync aliases — kept so existing CSV-mode callers still work
  readGrantedTokens()  { return this._readGrantedCsv(); }
  readRevokedTokens()  { return this._readRevokedCsv(); }
  removeGrantedToken(tokenId) { this._removeGrantedCsv(tokenId); }
  writeGrantedTokens(tokens) {
    const header = 'tokenId,userId,email,token,issuedAt,expiresAt\n';
    fs.writeFileSync(this.grantedPath, header + tokens.map(t => `${t.tokenId},${t.userId},${t.email},${t.token},${t.issuedAt},${t.expiresAt}`).join('\n') + (tokens.length ? '\n' : ''));
  }
}

module.exports = TokenManager;
