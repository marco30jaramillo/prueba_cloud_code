const fs = require('fs');
const path = require('path');

class TokenManager {
  constructor() {
    this.grantedPath = path.join(process.cwd(), 'tokens_granted.csv');
    this.revokedPath = path.join(process.cwd(), 'tokens_revoked.csv');
    this.ensureFiles();
  }

  ensureFiles() {
    const grantedHeader = 'tokenId,userId,email,token,issuedAt,expiresAt\n';
    const revokedHeader = 'tokenId,userId,email,token,revokedAt,expiresAt\n';

    if (!fs.existsSync(this.grantedPath)) {
      fs.writeFileSync(this.grantedPath, grantedHeader);
    }
    if (!fs.existsSync(this.revokedPath)) {
      fs.writeFileSync(this.revokedPath, revokedHeader);
    }
  }

  addGrantedToken(tokenId, userId, email, token, expiresAt) {
    const issuedAt = new Date().toISOString();
    const line = `${tokenId},${userId},${email},${token},${issuedAt},${expiresAt}\n`;
    fs.appendFileSync(this.grantedPath, line);
    console.log(`✅ Token otorgado: ${tokenId} para ${email}`);
  }

  revokeToken(userId, token, expiresAt) {
    const grantedTokens = this.readGrantedTokens();
    const tokenRecord = grantedTokens.find(t => t.token === token && t.userId === userId);

    if (!tokenRecord) {
      console.log(`⚠️  Token no encontrado en lista de otorgados`);
      return false;
    }

    const revokedAt = new Date().toISOString();
    const revokedLine = `${tokenRecord.tokenId},${tokenRecord.userId},${tokenRecord.email},${tokenRecord.token},${revokedAt},${tokenRecord.expiresAt}\n`;
    fs.appendFileSync(this.revokedPath, revokedLine);

    // Eliminar de tokens otorgados
    this.removeGrantedToken(tokenRecord.tokenId);

    console.log(`🔴 Token revocado: ${tokenRecord.tokenId} de ${tokenRecord.email}`);
    return true;
  }

  revokeAllUserTokens(userId, email) {
    const grantedTokens = this.readGrantedTokens();
    const userTokens = grantedTokens.filter(t => t.userId === userId);

    userTokens.forEach(tokenRecord => {
      const revokedAt = new Date().toISOString();
      const revokedLine = `${tokenRecord.tokenId},${tokenRecord.userId},${tokenRecord.email},${tokenRecord.token},${revokedAt},${tokenRecord.expiresAt}\n`;
      fs.appendFileSync(this.revokedPath, revokedLine);
      this.removeGrantedToken(tokenRecord.tokenId);
    });

    console.log(`🔴 Revocados ${userTokens.length} tokens de ${email}`);
    return userTokens.length;
  }

  isTokenValid(token) {
    // Verificar que no esté en lista de revocados
    const revokedTokens = this.readRevokedTokens();
    if (revokedTokens.find(t => t.token === token)) {
      return false;
    }

    // Verificar que esté en lista de otorgados
    const grantedTokens = this.readGrantedTokens();
    const tokenRecord = grantedTokens.find(t => t.token === token);

    if (!tokenRecord) {
      return false;
    }

    // Verificar que no haya expirado
    const expiresAt = new Date(tokenRecord.expiresAt);
    if (expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  readGrantedTokens() {
    const content = fs.readFileSync(this.grantedPath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    });
  }

  readRevokedTokens() {
    const content = fs.readFileSync(this.revokedPath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    });
  }

  removeGrantedToken(tokenId) {
    const grantedTokens = this.readGrantedTokens();
    const filtered = grantedTokens.filter(t => t.tokenId !== tokenId);
    this.writeGrantedTokens(filtered);
  }

  writeGrantedTokens(tokens) {
    const header = 'tokenId,userId,email,token,issuedAt,expiresAt\n';
    const lines = tokens.map(t =>
      `${t.tokenId},${t.userId},${t.email},${t.token},${t.issuedAt},${t.expiresAt}`
    );
    fs.writeFileSync(this.grantedPath, header + lines.join('\n') + (lines.length > 0 ? '\n' : ''));
  }

  cleanExpiredRevokedTokens() {
    const revokedTokens = this.readRevokedTokens();
    const now = new Date();
    const filtered = revokedTokens.filter(t => new Date(t.expiresAt) >= now);

    const header = 'tokenId,userId,email,token,revokedAt,expiresAt\n';
    const lines = filtered.map(t =>
      `${t.tokenId},${t.userId},${t.email},${t.token},${t.revokedAt},${t.expiresAt}`
    );
    fs.writeFileSync(this.revokedPath, header + lines.join('\n') + (lines.length > 0 ? '\n' : ''));

    const deleted = revokedTokens.length - filtered.length;
    console.log(`🗑️  ${deleted} tokens vencidos eliminados de lista de revocados`);
    return deleted;
  }

  getStats() {
    const granted = this.readGrantedTokens();
    const revoked = this.readRevokedTokens();
    return {
      totalGranted: granted.length,
      totalRevoked: revoked.length,
      grantedUsers: new Set(granted.map(t => t.userId)).size,
      revokedUsers: new Set(revoked.map(t => t.userId)).size
    };
  }
}

module.exports = TokenManager;
