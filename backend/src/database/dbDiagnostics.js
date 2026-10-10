/**
 * Mensajes de arranque sobre la conexión a SQL Server. Módulo puro: no abre conexiones.
 *
 * Indican la familia de configuración y el host. Nunca la contraseña ni la cadena de conexión.
 */

const { FAMILY_DB, isLoopbackHost } = require('./dbConfig');

/**
 * Descripción de la conexión para el log: familia y host.
 */
function describeConnection({ family, host }) {
  return `configuración ${family}, host ${host}`;
}

/**
 * Líneas de diagnóstico para un error de conexión, según el destino (local o remoto).
 */
function diagnoseConnectionError(error, { family, host }) {
  const msg = String((error && error.message) || '');
  const lower = msg.toLowerCase();
  const code = (error && error.code) || '';
  const number = error && error.number;
  const local = isLoopbackHost(host);
  const lines = [];

  const sinConexion = ['ESOCKET', 'ETIMEOUT', 'ECONNREFUSED'].includes(code)
    || /econnrefused|etimeout|failed to connect|in \d+ms/.test(lower);
  const credenciales = number === 18456 || code === 'ELOGIN' || lower.includes('login failed');
  const sinBase = number === 4060 || lower.includes('cannot open database');
  const sinDns = lower.includes('enotfound') || lower.includes('server name');
  const certificado = lower.includes('certificate') || lower.includes('self-signed') || lower.includes('self signed');

  if (sinBase) {
    lines.push('Causa probable: la base de datos no existe o el usuario no tiene acceso a ella.');
    if (local) {
      lines.push('→ Crea la base y la cuenta con database/scripts_sql/esquemas/00_crear_base_y_usuario.sql (sqlcmd -E)');
      lines.push('→ Luego ejecuta: npm run db:setup');
    }
  } else if (credenciales) {
    lines.push('Causa probable: credenciales incorrectas (usuario o contraseña).');
    if (local) {
      lines.push(`→ Revisa ${family === FAMILY_DB ? 'DB_USER y DB_PASSWORD' : 'el usuario y la contraseña'} en backend/.env`);
      lines.push('→ La cuenta debe existir (esquemas/00_crear_base_y_usuario.sql) y el servidor debe');
      lines.push('  admitir autenticación de SQL Server (modo mixto), no solo de Windows');
    }
  } else if (certificado) {
    lines.push('Causa probable: el certificado del servidor no es de confianza.');
    if (local) {
      lines.push('→ En local, con NODE_ENV=development: DB_TRUST_SERVER_CERTIFICATE=true');
    }
  } else if (sinDns) {
    lines.push('Causa probable: el nombre del servidor es incorrecto o no resuelve por DNS.');
  } else if (sinConexion) {
    if (local) {
      lines.push('Causa probable: SQL Server local no responde.');
      lines.push('→ Servicio detenido: inicia "SQL Server (MSSQLSERVER)" (o el de tu instancia) en services.msc');
      lines.push('→ Puerto: habilita TCP/IP en SQL Server Configuration Manager y comprueba el puerto');
      lines.push('  (1433 por defecto; si es otro, defínelo en DB_PORT)');
      lines.push('→ Instancia con nombre (localhost\\SQLEXPRESS) sin DB_PORT: requiere el servicio SQL Server Browser');
    } else {
      lines.push('Causa probable: el firewall del servidor no permite tu IP.');
      lines.push('→ Portal de Azure > SQL Server > Redes > Agregar IP de cliente');
      lines.push('→ O activa "Permitir servicios y recursos de Azure"');
    }
  }

  return lines;
}

module.exports = { describeConnection, diagnoseConnectionError };
