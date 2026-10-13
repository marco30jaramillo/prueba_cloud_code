const { sql, request } = require('../database/sqlPool');

class TokenManager {
  async addGrantedToken(tokenId, userId, email, token, expiresAt) {
    const issuedAt = new Date().toISOString();
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

  // `exceptToken`: sesión que se conserva (la actual) al revocar las demás de la cuenta.
  async revokeAllUserTokens(userId, email, exceptToken = null) {
    try {
      const db = await request();
      const found = await db.input('userId', sql.UniqueIdentifier, userId)
        .input('except', sql.NVarChar(sql.MAX), exceptToken || '')
        .query("SELECT tokenId,email,token,expiresAt FROM dbo.tokens_granted WHERE userId=@userId AND (@except = '' OR token <> @except)");
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
        .input('except', sql.NVarChar(sql.MAX), exceptToken || '')
        .query("DELETE FROM dbo.tokens_granted WHERE userId=@userId AND (@except = '' OR token <> @except)");
      return found.recordset.length;
    } catch (err) { console.error('[TokenManager] revokeAllUserTokens error:', err.message); return 0; }
  }

  async isTokenValid(token) {
    try {
      const result = await (await request()).input('token', sql.NVarChar(sql.MAX), token)
        .query(`SELECT TOP 1 1 AS valid FROM dbo.tokens_granted
                WHERE token=@token AND expiresAt >= SYSUTCDATETIME()`);
      return result.recordset.length > 0;
    } catch (err) { console.error('[TokenManager] isTokenValid error:', err.message); return false; }
  }

  async cleanExpiredRevokedTokens() {
    try {
      const result = await (await request())
        .query('DELETE FROM dbo.tokens_revoked WHERE expiresAt < SYSUTCDATETIME()');
      return result.rowsAffected[0] || 0;
    } catch (err) { console.error('[TokenManager] cleanExpiredRevokedTokens error:', err.message); return 0; }
  }

  async getStats() {
    try {
      const r1 = await (await request()).query('SELECT COUNT(*) AS n FROM dbo.tokens_granted');
      const r2 = await (await request()).query('SELECT COUNT(*) AS n FROM dbo.tokens_revoked');
      return { totalGranted: r1.recordset[0].n, totalRevoked: r2.recordset[0].n };
    } catch (err) { return { totalGranted: 0, totalRevoked: 0 }; }
  }
}

module.exports = TokenManager;
