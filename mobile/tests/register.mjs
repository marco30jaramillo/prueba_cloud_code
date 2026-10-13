// Ganchos de resolución para ejecutar lib/*.ts con node --test sin tocar el código de la app:
//  - './api' sin extensión -> './api.ts'
//  - 'expo-secure-store' (módulo nativo) -> sustituto en memoria
//  - 'expo-constants' (módulo nativo) -> configuración de app.config.js
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const stub = (archivo) =>
  pathToFileURL(fileURLToPath(new URL(`./stubs/${archivo}`, import.meta.url))).href;
const stubs = {
  'expo-secure-store': stub('expo-secure-store.mjs'),
  'expo-constants': stub('expo-constants.mjs'),
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (stubs[specifier]) {
      return { url: stubs[specifier], shortCircuit: true };
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
