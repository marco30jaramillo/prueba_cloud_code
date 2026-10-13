# Plus Jakarta Sans — copia local

La tipografía de Mi Valecito (ver `docs/marca.md`). Se guarda aquí para no depender de Google
Fonts ni de ningún CDN: la web y la app móvil la sirven desde su propio paquete, así que ningún
cambio externo puede alterarla ni dejarla sin disponibilidad.

| Dato | Valor |
|---|---|
| Origen | <https://github.com/tokotype/PlusJakartaSans> (repositorio del diseñador) |
| Commit fijado | `18d1cd2f7ea10481919d2f05c1f7064b7307fc26` (2024-01-18) |
| Versión de la fuente | `Version 2.071` (dato del propio archivo) |
| Licencia | SIL Open Font License 1.1, texto en `OFL.txt` |
| Descargada | 2026-10-12, con autorización de Marco |
| Pesos | 400 Regular, 600 SemiBold, 800 ExtraBold. Solo estilo normal, sin cursiva |
| Formato | Estática (no variable): un archivo por peso |

**Por qué ese commit.** La versión publicada 2.7.1 (2023-05-26) trae los TTF pero no los WOFF2;
estos solo existen en la rama principal, con una exportación posterior. Para que TTF y WOFF2
salgan de la misma exportación se tomó un commit fijo de la rama principal, no la rama móvil.

## Archivos

| Archivo | Para qué | SHA-256 |
|---|---|---|
| `woff2/PlusJakartaSans-Regular.woff2` | Web, peso 400 | `f282de8041ff1231d64336ab69ecea03f2a31c127fe509ec7b99814ff2fb9b41` |
| `woff2/PlusJakartaSans-SemiBold.woff2` | Web, peso 600 | `16387125b045457b8d49123d31bcc143e696cf9e867831f8ae41eb244b11106e` |
| `woff2/PlusJakartaSans-ExtraBold.woff2` | Web, peso 800 | `c4c1c8447c65415eaca5caccd25a9699bfa03f8c0176b63e42ac5631006c88b7` |
| `ttf/PlusJakartaSans-Regular.ttf` | App móvil (`expo-font`), peso 400 | `bd6276d4060e3b1ebc45047469e0bb86b08f301ba681cdf1ceb6245ea10478d2` |
| `ttf/PlusJakartaSans-SemiBold.ttf` | App móvil, peso 600 | `65dbcedb6596a41c30869729eb31cb57d1f5edfe365684314bba8a1994eaa4cb` |
| `ttf/PlusJakartaSans-ExtraBold.ttf` | App móvil, peso 800, y contornos del nombre | `7d60d21b5dec501c77437e80aabd539f1d7a7b0ac7d4ada361d4d42abc7c55ea` |
| `OFL.txt` | Licencia: debe acompañar cualquier copia | `995c7199cab65954f545996326755daee7b63cc6b42b06c13da1f9502ab08a99` |
| `AUTHORS.txt`, `FONTLOG.txt` | Autoría y registro de cambios, de la fuente original | |

## Qué se comprobó en los TTF (2026-10-12)

- Cubren `ñ Ñ á é í ó ú ü Á É Í Ó Ú Ü ¿ ¡ $ % €` y los dígitos.
- Traen las funciones OpenType `tnum` (cifras tabulares) y `pnum` (proporcionales).
- No son variables (sin tabla `fvar`).

Los WOFF2 no se inspeccionaron glifo por glifo: salen del mismo commit que los TTF.

## Cómo se usa

- **Web**: `@font-face` o `next/font/local` con los WOFF2, `font-display: swap` y precarga del
  peso 400. Los montos con `font-variant-numeric: tabular-nums`.
- **Móvil**: `expo-font` con los TTF, uno por peso (las fuentes variables no se llevan bien con
  React Native).
- **Logo**: los contornos del nombre salen de `PlusJakartaSans-ExtraBold.ttf`.
- **Licencia**: cualquier copia de los archivos (por ejemplo en el repositorio de código, que es
  público) lleva `OFL.txt` al lado. Convertir letras a contorno para un logo no es redistribuir
  la fuente.
- No se instalan paquetes de terceros (`@expo-google-fonts`, `@fontsource`) para obtenerla: el
  paquete sería otra dependencia externa.
