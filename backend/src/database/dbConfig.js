/**
 * Resolución de la configuración de conexión a SQL Server.
 *
 * Módulo puro: no abre conexiones ni carga `mssql`, para poder probarlo sin base de datos.
 *
 * Tres formas de configurar la conexión, mutuamente excluyentes (H-4):
 *   - `AZURE_SQL_CONNECTION_STRING`
 *   - familia `DB_*`
 *   - familia `AZURE_SQL_*`
 *
 * Guarda de TLS con falla cerrada (H-3): relajar el cifrado solo se acepta hacia un host de
 * bucle local, con `NODE_ENV` explícito en `development` o `test`, y fuera de App Service.
 *
 * Ningún mensaje de error incluye contraseñas ni la cadena de conexión.
 */

const FAMILY_CONNECTION_STRING = 'AZURE_SQL_CONNECTION_STRING';
const FAMILY_DB = 'DB_*';
const FAMILY_AZURE = 'AZURE_SQL_*';

const CONNECTION_STRING_KEY = 'AZURE_SQL_CONNECTION_STRING';
const AZURE_KEYS = ['AZURE_SQL_SERVER', 'AZURE_SQL_DATABASE', 'AZURE_SQL_USER', 'AZURE_SQL_PASSWORD'];
const DB_REQUIRED_KEYS = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
const DB_OPTIONAL_KEYS = ['DB_PORT', 'DB_ENCRYPT', 'DB_TRUST_SERVER_CERTIFICATE'];
const DB_KEYS = [...DB_REQUIRED_KEYS, ...DB_OPTIONAL_KEYS];

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1', '(local)', '.'];
const RELAXED_TLS_NODE_ENVS = ['development', 'test'];
const APP_SERVICE_MARKERS = ['WEBSITE_SITE_NAME', 'WEBSITE_INSTANCE_ID'];

const POOL_OPTIONS = { max: 10, min: 0, idleTimeoutMillis: 30000 };

class DbConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DbConfigError';
    this.code = 'DB_CONFIG_INVALID';
  }
}

function isSet(env, key) {
  return typeof env[key] === 'string' && env[key] !== '';
}

/**
 * Normaliza un nombre de servidor: sin `tcp:`, sin `,puerto`, sin `\INSTANCIA`, en minúsculas.
 */
function normalizeHost(server) {
  if (typeof server !== 'string') return '';
  let host = server.trim().toLowerCase();
  if (host.startsWith('tcp:')) host = host.slice(4);
  const comma = host.indexOf(',');
  if (comma !== -1) host = host.slice(0, comma);
  const backslash = host.indexOf('\\');
  if (backslash !== -1) host = host.slice(0, backslash);
  return host.trim();
}

/**
 * Bucle local por coincidencia exacta del host normalizado. Nunca por prefijo ni por
 * contenido, y nunca el nombre de la máquina.
 */
function isLoopbackHost(server) {
  return LOOPBACK_HOSTS.includes(normalizeHost(server));
}

/**
 * Lanza si se relaja el cifrado sin cumplir las tres condiciones de H-3.
 * `hosts` son los servidores sin normalizar a los que apunta la configuración.
 */
function assertRelaxedTlsAllowed(env, hosts, origen) {
  const reasons = [];

  if (!hosts.length) {
    reasons.push('no se pudo determinar el servidor');
  } else {
    const remotos = hosts.filter((host) => !isLoopbackHost(host)).map((host) => normalizeHost(host));
    if (remotos.length) {
      reasons.push(`el servidor "${remotos.join('", "')}" no es de bucle local (${LOOPBACK_HOSTS.join(', ')})`);
    }
  }

  if (!RELAXED_TLS_NODE_ENVS.includes(env.NODE_ENV)) {
    reasons.push(`NODE_ENV debe valer exactamente ${RELAXED_TLS_NODE_ENVS.join(' o ')}`);
  }

  const markers = APP_SERVICE_MARKERS.filter((key) => env[key] !== undefined);
  if (markers.length) {
    reasons.push(`el proceso corre en App Service (${markers.join(', ')})`);
  }

  if (reasons.length) {
    throw new DbConfigError(
      `Configuración de base de datos rechazada (${origen}): se relaja el cifrado TLS y no está permitido porque ${reasons.join('; ')}.`
    );
  }
}

function parseBoolean(env, key, defaultValue) {
  if (!isSet(env, key)) return defaultValue;
  const value = env[key].trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new DbConfigError(`${key} debe valer true o false.`);
}

/**
 * Separa una cadena de conexión en pares clave/valor, respetando comillas y llaves.
 * Las claves se devuelven en minúsculas y sin espacios. No valida la cadena: solo la lee
 * para aplicar la guarda de TLS.
 */
function parseConnectionString(connectionString) {
  const pairs = [];
  const text = String(connectionString);
  let i = 0;

  while (i < text.length) {
    while (i < text.length && (text[i] === ';' || /\s/.test(text[i]))) i += 1;
    if (i >= text.length) break;

    let key = '';
    while (i < text.length && text[i] !== '=' && text[i] !== ';') {
      key += text[i];
      i += 1;
    }
    if (text[i] !== '=') continue;
    i += 1;

    while (i < text.length && text[i] === ' ') i += 1;

    let value = '';
    const opener = text[i];
    if (opener === '"' || opener === "'") {
      i += 1;
      while (i < text.length) {
        if (text[i] === opener) {
          if (text[i + 1] === opener) {
            value += opener;
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        value += text[i];
        i += 1;
      }
      while (i < text.length && text[i] !== ';') i += 1;
    } else if (opener === '{') {
      i += 1;
      while (i < text.length && text[i] !== '}') {
        value += text[i];
        i += 1;
      }
      while (i < text.length && text[i] !== ';') i += 1;
    } else {
      while (i < text.length && text[i] !== ';') {
        value += text[i];
        i += 1;
      }
      value = value.trim();
    }

    pairs.push({ key: key.replace(/\s+/g, '').toLowerCase(), value });
  }

  return pairs;
}

const CS_SERVER_KEYS = ['server', 'datasource', 'address', 'addr', 'networkaddress'];
const CS_ENCRYPT_KEYS = ['encrypt'];
const CS_TRUST_KEYS = ['trustservercertificate'];
const CS_ENCRYPT_STRICT_VALUES = ['true', 'yes', '1', 'mandatory', 'strict'];
const CS_TRUST_STRICT_VALUES = ['false', 'no', '0'];

/**
 * Lee de la cadena de conexión solo lo necesario para la guarda: servidores y si relaja TLS.
 * Falla cerrada: cualquier valor de `Encrypt` o `TrustServerCertificate` que no sea
 * reconocidamente estricto se trata como relajado.
 */
function inspectConnectionString(connectionString) {
  const pairs = parseConnectionString(connectionString);
  const valuesOf = (keys) => pairs.filter((pair) => keys.includes(pair.key)).map((pair) => pair.value);

  const hosts = valuesOf(CS_SERVER_KEYS);
  const encryptRelaxed = valuesOf(CS_ENCRYPT_KEYS)
    .some((value) => !CS_ENCRYPT_STRICT_VALUES.includes(value.trim().toLowerCase()));
  const trustRelaxed = valuesOf(CS_TRUST_KEYS)
    .some((value) => !CS_TRUST_STRICT_VALUES.includes(value.trim().toLowerCase()));

  return { hosts, relaxedTls: encryptRelaxed || trustRelaxed };
}

function resolveConnectionString(env) {
  const connectionString = env[CONNECTION_STRING_KEY];
  const { hosts, relaxedTls } = inspectConnectionString(connectionString);

  if (relaxedTls) assertRelaxedTlsAllowed(env, hosts, CONNECTION_STRING_KEY);

  return {
    family: FAMILY_CONNECTION_STRING,
    host: hosts.length ? normalizeHost(hosts[0]) : '(no determinado)',
    // La cadena se entrega a `mssql` tal como llega, sin reescribirla.
    config: connectionString,
  };
}

function resolveAzureFamily(env) {
  const missing = AZURE_KEYS.filter((key) => !isSet(env, key));
  if (missing.length) {
    throw new DbConfigError(`La base de datos no está configurada (${FAMILY_AZURE}). Faltan: ${missing.join(', ')}`);
  }

  return {
    family: FAMILY_AZURE,
    host: normalizeHost(env.AZURE_SQL_SERVER),
    config: {
      server: env.AZURE_SQL_SERVER,
      database: env.AZURE_SQL_DATABASE,
      user: env.AZURE_SQL_USER,
      password: env.AZURE_SQL_PASSWORD,
      options: { encrypt: true, trustServerCertificate: false },
      pool: { ...POOL_OPTIONS },
    },
  };
}

function parsePort(value, origen) {
  const text = String(value).trim();
  const port = Number(text);
  if (!/^\d+$/.test(text) || port < 1 || port > 65535) {
    throw new DbConfigError(`${origen} debe ser un puerto entre 1 y 65535.`);
  }
  return port;
}

function resolveDbFamily(env) {
  const missing = DB_REQUIRED_KEYS.filter((key) => !isSet(env, key));
  if (missing.length) {
    throw new DbConfigError(`La base de datos no está configurada (${FAMILY_DB}). Faltan: ${missing.join(', ')}`);
  }

  const encrypt = parseBoolean(env, 'DB_ENCRYPT', true);
  const trustServerCertificate = parseBoolean(env, 'DB_TRUST_SERVER_CERTIFICATE', false);

  if (!encrypt || trustServerCertificate) {
    assertRelaxedTlsAllowed(env, [env.DB_SERVER], FAMILY_DB);
  }

  // DB_SERVER admite las formas habituales: tcp:host, host,puerto y host\INSTANCIA.
  let server = env.DB_SERVER.trim();
  if (server.toLowerCase().startsWith('tcp:')) server = server.slice(4);

  let portInServer;
  const comma = server.indexOf(',');
  if (comma !== -1) {
    portInServer = parsePort(server.slice(comma + 1), 'El puerto de DB_SERVER');
    server = server.slice(0, comma);
  }

  let instanceName;
  const backslash = server.indexOf('\\');
  if (backslash !== -1) {
    instanceName = server.slice(backslash + 1).trim();
    server = server.slice(0, backslash);
  }
  server = server.trim();
  if (!server) throw new DbConfigError('DB_SERVER no contiene un nombre de servidor.');

  const port = isSet(env, 'DB_PORT') ? parsePort(env.DB_PORT, 'DB_PORT') : portInServer;
  if (portInServer !== undefined && port !== portInServer) {
    throw new DbConfigError('DB_PORT y el puerto indicado en DB_SERVER no coinciden.');
  }

  const options = { encrypt, trustServerCertificate };
  const config = {
    server,
    database: env.DB_DATABASE,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    options,
    pool: { ...POOL_OPTIONS },
  };

  // Con puerto explícito se conecta directo; la instancia con nombre solo se usa sin puerto.
  if (port !== undefined) config.port = port;
  else if (instanceName) options.instanceName = instanceName;

  return { family: FAMILY_DB, host: normalizeHost(env.DB_SERVER), config };
}

/**
 * Formas de configuración presentes en el entorno. Una familia cuenta como presente si
 * cualquiera de sus variables tiene valor.
 */
function detectFamilies(env) {
  const families = [];
  if (isSet(env, CONNECTION_STRING_KEY)) families.push(FAMILY_CONNECTION_STRING);
  if (DB_KEYS.some((key) => isSet(env, key))) families.push(FAMILY_DB);
  if (AZURE_KEYS.some((key) => isSet(env, key))) families.push(FAMILY_AZURE);
  return families;
}

/**
 * Función pura: recibe un objeto de entorno y devuelve
 * `{ family, host, config }`, donde `config` es lo que recibe `mssql.ConnectionPool`
 * (un objeto, o la cadena de conexión sin modificar). Lanza `DbConfigError` si la
 * configuración falta, mezcla familias o viola la guarda de TLS.
 */
function resolveDbConfig(env = process.env) {
  const families = detectFamilies(env);

  if (!families.length) {
    throw new DbConfigError(
      `La base de datos no está configurada. Define una sola de estas formas: ${FAMILY_DB}, ${FAMILY_AZURE} o ${CONNECTION_STRING_KEY}.`
    );
  }

  if (families.length > 1) {
    throw new DbConfigError(
      `Configuración de base de datos ambigua: coexisten ${families.join(' y ')}. Solo puede haber una forma presente.`
    );
  }

  if (families[0] === FAMILY_CONNECTION_STRING) return resolveConnectionString(env);
  if (families[0] === FAMILY_DB) return resolveDbFamily(env);
  return resolveAzureFamily(env);
}

module.exports = {
  DbConfigError,
  FAMILY_CONNECTION_STRING,
  FAMILY_DB,
  FAMILY_AZURE,
  LOOPBACK_HOSTS,
  normalizeHost,
  isLoopbackHost,
  detectFamilies,
  resolveDbConfig,
};
