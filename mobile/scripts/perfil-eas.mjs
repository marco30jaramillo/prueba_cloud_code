// Resuelve un perfil de build de eas.json (siguiendo "extends") y lo imprime como líneas
// NOMBRE=valor para $GITHUB_ENV. Así el pipeline usa para `eas update` y para calcular la huella
// exactamente las mismas variables, canal y ambiente de EAS que la build de ese perfil.
//   node scripts/perfil-eas.mjs production-apk >> "$GITHUB_ENV"
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VARIABLES = ['APP_VARIANT', 'API_URL', 'WEB_URL'];

/** Mezcla el perfil con sus padres; env se mezcla clave a clave (como hace EAS). */
export function resolverPerfil(eas, nombre, vistos = new Set()) {
  const perfil = eas.build?.[nombre];
  if (!perfil) throw new Error(`El perfil "${nombre}" no existe en eas.json.`);
  if (vistos.has(nombre)) throw new Error(`"extends" circular en el perfil "${nombre}".`);
  vistos.add(nombre);
  const padre = perfil.extends ? resolverPerfil(eas, perfil.extends, vistos) : {};
  return { ...padre, ...perfil, env: { ...padre.env, ...perfil.env } };
}

/** Variables para el pipeline; falla si falta algo que la build también exige. */
export function variablesDelPerfil(eas, nombre) {
  const p = resolverPerfil(eas, nombre);
  const salida = {};
  for (const v of VARIABLES) salida[v] = p.env[v];
  salida.CANAL = p.channel;
  salida.AMBIENTE_EAS = p.environment;
  for (const [clave, valor] of Object.entries(salida)) {
    if (typeof valor !== 'string' || !/^[^\s]+$/.test(valor)) {
      throw new Error(`El perfil "${nombre}" de eas.json no define ${clave} (o tiene espacios).`);
    }
  }
  return salida;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const nombre = process.argv[2];
  if (!nombre) {
    console.error('Uso: node scripts/perfil-eas.mjs <perfil>');
    process.exit(2);
  }
  try {
    const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
    for (const [clave, valor] of Object.entries(variablesDelPerfil(eas, nombre))) console.log(`${clave}=${valor}`);
  } catch (e) {
    console.error(`::error::${e.message}`);
    process.exit(1);
  }
}
