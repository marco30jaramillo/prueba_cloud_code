// Arma la carpeta que se sube a Azure App Service a partir de la build autocontenida de Next
// (output: 'standalone' en next.config.js). Se usa después de `npm run build`:
//   node scripts/empaquetar-standalone.mjs <carpeta-destino>
// Resultado: server.js, solo las dependencias que usa el servidor, .next/static y public/
// (~35 MB y ~2.000 archivos, frente a ~475 MB y ~21.000 de la carpeta frontend completa).
// El package.json queda con un único script, start = `node server.js`, que es lo que App
// Service ejecuta. HOSTNAME=0.0.0.0 porque App Service define HOSTNAME con el nombre del
// contenedor y server.js escucharía solo en esa dirección.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('..', import.meta.url)));
const destino = process.argv[2] ? resolve(process.argv[2]) : '';
if (!destino) {
  console.error('Uso: node scripts/empaquetar-standalone.mjs <carpeta-destino>');
  process.exit(2);
}
const standalone = join(raiz, '.next', 'standalone');
if (!existsSync(join(standalone, 'server.js'))) {
  console.error('::error::No existe .next/standalone/server.js: falta `npm run build` o output: \'standalone\' en next.config.js.');
  process.exit(1);
}

rmSync(destino, { recursive: true, force: true });
cpSync(standalone, destino, { recursive: true });
cpSync(join(raiz, '.next', 'static'), join(destino, '.next', 'static'), { recursive: true });
if (existsSync(join(raiz, 'public'))) cpSync(join(raiz, 'public'), join(destino, 'public'), { recursive: true });

const ruta = join(destino, 'package.json');
const pkg = JSON.parse(readFileSync(ruta, 'utf8'));
pkg.scripts = { start: 'HOSTNAME=0.0.0.0 node server.js' };
delete pkg.devDependencies;
writeFileSync(ruta, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Paquete listo en ${destino}`);
