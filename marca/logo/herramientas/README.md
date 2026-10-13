# Herramientas del isotipo

Scripts de Node (sin dependencias) con los que se calculó `../isotipo-cuaderno-vale.svg`. Se
guardan para poder cambiar el ángulo o el tamaño del vale sin recalcular a mano el recorte del
cuaderno.

| Archivo | Qué hace |
|---|---|
| `isotipo.js` | `build(params)` devuelve los trazos del cuaderno (recortado donde el vale lo tapa), las anillas y el vale, ya rotado. Exporta `build` |
| `raster.js` | Dibuja el trazo real de 2 unidades de cada variante en un PNG, a tamaño grande y a 24 px, para revisarlo sin navegador. Uso: `node raster.js variantes.js salida.png` |
| `variantes.js` | Parámetros probados. La **F** es la aprobada |

Parámetros de la variante aprobada (F, 2026-10-12):

```
nb:    { x0: 3, y0: 2, x1: 15, y1: 20, r: 2 }     cuaderno
tk:    { cx: 14.6, cy: 16.2, deg: 32, w: 14, h: 8, n: 1.6 }   vale: centro, ángulo, tamaño, muesca
ticks: [6, 10, 14]                                 anillas
gap:   2.6                                         aire entre cuaderno y vale
```

Notas: el recorte quita del cuaderno todo punto a menos de `gap` del vale (el trazo mide 2, así
que el hueco visible es `gap - 2`). El vale se emite ya rotado, sin `transform`, para que el
SVG final siga siendo de tres trazos limpios. `variantes.js` conserva el nombre de las tres
pruebas de la segunda ronda (D, E, F).
