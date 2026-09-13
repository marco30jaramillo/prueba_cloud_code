const TokenManager = require('../utils/tokenManager');

class TokenCleaner {
  static run() {
    const tokenManager = new TokenManager();
    console.log('🧹 Iniciando limpieza de tokens vencidos...');

    const stats = tokenManager.getStats();
    console.log(`📊 Estado antes de limpieza:`);
    console.log(`   - Tokens otorgados: ${stats.totalGranted}`);
    console.log(`   - Tokens revocados: ${stats.totalRevoked}`);

    const deleted = tokenManager.cleanExpiredRevokedTokens();

    const statsAfter = tokenManager.getStats();
    console.log(`✅ Limpieza completada`);
    console.log(`   - Tokens eliminados: ${deleted}`);
    console.log(`   - Tokens revocados restantes: ${statsAfter.totalRevoked}`);
  }

  static scheduleDaily() {
    // Ejecutar a las 2 AM
    const now = new Date();
    let nextRun = new Date();
    nextRun.setHours(2, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilRun = nextRun - now;

    console.log(`⏰ Limpieza de tokens programada para: ${nextRun.toLocaleString()}`);
    console.log(`   Próxima ejecución en: ${Math.round(timeUntilRun / 1000 / 60)} minutos`);

    setTimeout(() => {
      TokenCleaner.run();
      // Ejecutar cada 24 horas
      setInterval(() => TokenCleaner.run(), 24 * 60 * 60 * 1000);
    }, timeUntilRun);
  }
}

module.exports = TokenCleaner;
