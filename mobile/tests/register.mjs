// Ganchos de resolución para ejecutar lib/*.ts con node --test sin tocar el código de la app:
//  - './api' sin extensión -> './api.ts'
//  - 'expo-secure-store' (módulo nativo) -> sustituto en memoria
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const stub = pathToFileURL(
  fileURLToPath(new URL('./stubs/expo-secure-store.mjs', import.meta.url))
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo-secure-store') {
      return { url: stub, shortCircuit: true };
    }
    if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts')) {
      const candidato = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidato))) {
        return { url: candidato.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
