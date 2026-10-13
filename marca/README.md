# marca/

Recursos de marca de Mi Valecito: logo, iconos y tipografía. Es la **fuente de verdad de los
activos**; la descripción de la marca (qué sí y qué no, colores, tono, glosario) vive en el
repositorio de gestión, en `docs/marca.md`. Si algo de aquí contradice ese documento, se corrige
el activo.

## Regla de uso

- Los recursos generados (SVG, PNG, ICO, fuentes) viven **solo aquí**. El repositorio de gestión
  guarda su descripción, nunca los archivos.
- **Este repositorio es público.** Solo entran recursos propios y la fuente con licencia OFL
  (con su `OFL.txt` al lado). Nada de logos, marcas, fuentes ni imágenes de terceros, ni
  datos personales reales.
- Los archivos de esta carpeta no se editan a mano: los SVG de iconos y los derivados del logo
  salen de los scripts de `herramientas/`. Para cambiar uno se cambia el script y se regenera.
- Un logo o un icono nuevo no se usa en la aplicación hasta que Marco lo aprueba
  (`docs/marca.md`, Logo e Iconografía).
- Web y móvil usan **copias** de estos archivos; la fuente es esta carpeta. Los cambios van
  aquí primero.

## Qué hay

| Carpeta | Contenido |
|---|---|
| `logo/` | `isotipo-cuaderno-vale.svg` (isotipo aprobado, `currentColor`), `logo-horizontal.svg`, `logo-apilado.svg`, `logo-isotipo.svg` (azul de marca), `logo-un-color.svg` (`currentColor`, horizontal) y `nombre.svg` (solo el nombre, contornos) |
| `logo/expo/` | `icon.png` (1024, opaco), `adaptive-icon.png` (1024, transparente, zona segura), `splash-icon.png` (1024, transparente), `favicon.svg`, `favicon-16/32/48.png` y `favicon.ico` |
| `logo/herramientas/` | Scripts con los que se calculó el isotipo (ángulo, recorte, anillas). Ver su README |
| `iconos/` | Set propio de iconos de interfaz, un SVG por icono, más `nodos.json` (los nodos internos, para `react-native-svg`) |
| `tipografia/plus-jakarta-sans/` | Plus Jakarta Sans (TTF y WOFF2), OFL 1.1, con `OFL.txt`, `AUTHORS.txt` y `FONTLOG.txt`. Ver su README |
| `herramientas/` | Scripts que generan y validan los activos (abajo) |

## Cómo se regeneran los derivados

Solo hace falta Node. `sharp` se toma de `backend/node_modules` (ya instalado); no se descarga
nada. Desde `Mi Valecito/`:

| Comando | Qué hace |
|---|---|
| `node marca/herramientas/iconos.js` | Escribe `iconos/*.svg` y `iconos/nodos.json` desde la tabla del propio script |
| `node marca/herramientas/validar-iconos.js` | Comprueba cada icono contra las reglas (atributos, nodos, caja de dibujo). Con `--hoja ruta.png` genera una hoja de contacto a 72, 48, 24 y 16 px. Sale con código 1 si algo falla |
| `node marca/herramientas/construir-logo.js` | Convierte «Mi Valecito» a contornos desde `PlusJakartaSans-ExtraBold.ttf` (con `herramientas/contornos.js`) y escribe los cuatro logos, el nombre solo, el favicon y los PNG de Expo |

Los ajustes a mano del nombre (espaciado entre «V» y «a», y entre las dos palabras) están al
principio de `construir-logo.js`, en `AJUSTES`.

## Reglas que cumplen los activos

- Iconos: `viewBox="0 0 24 24"`, `stroke-width="2"`, extremos y uniones redondos,
  `fill="none"`, `stroke="currentColor"`, geometría dentro de 2 a 22, hasta 4 nodos.
- Logo: relleno (el nombre) y trazo (el isotipo); azul `#2563EB` sobre claro, blanco sobre
  azul, `currentColor` para monocromo. Nunca verde, rojo ni ámbar.
- El nombre es contorno, no texto: los SVG del logo no contienen `<text>` ni dependen de una
  fuente.
