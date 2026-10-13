# Permisos y roles

## Regla

Lo que un rol puede hacer sale de **sus módulos y del nivel de cada uno**. Los niveles
significan siempre lo mismo:

| Nivel | Significa |
|---|---|
| Lectura | consultar |
| Escritura | operar (registrar, cobrar, gestionar) |
| Total | además anular o administrar |

Como permiso **directo** de un rol solo se aceptan los de sesión (`auth:login`, `auth:logout`,
`auth:validate`, `auth:forgot-password`, `auth:reset-password`, `auth:register`). El backend
rechaza agregar otros (`backend/src/config/permisos.js`). Así, quitar un módulo o bajarle el
nivel siempre quita lo que daba.

Nadie concede `system:full-access`. El rol superusuario y el rol propio solo los modifica quien
tiene acceso total: un administrador no puede darse más permisos.

Fuente de datos: `database/scripts_sql/inserts/01..03` (bases nuevas) y
`alters/005_permisos_por_modulo_y_rol_encargado.sql` (bases existentes). La prueba
`backend/tests/matriz-permisos.test.js` comprueba que ambos coinciden y la matriz de abajo.

## Qué da cada nivel de cada módulo

| Módulo | Lectura | Escritura (+) | Total (+) |
|---|---|---|---|
| Mi perfil | ver su perfil | editarlo | — |
| Gestionar usuarios | ver usuarios | editarlos | desactivar, contraseñas, cerrar sesiones |
| Auditoría | ver registros | — | reportes de seguridad |
| Roles y permisos | ver | editar | — |
| Mis vales | ver sus vales y abonos | — | — |
| Nueva venta | ver la tienda y sus vales | registrar vales | anular vales |
| Cartera | ver la tienda, vales y abonos | cobrar (abonos, pago integral) | anular abonos |
| Mi tienda | ver su tienda y su equipo | gestionar el equipo de **su** tienda | crear y editar **todas** las tiendas |

## Quién ve qué (por defecto)

| Módulo | Superusuario | Administrador | Tendero (dueño) | Encargado | Vendedor | Cliente |
|---|---|---|---|---|---|---|
| Mi perfil | total | total | total | escritura | escritura | escritura |
| Gestionar usuarios | total | total | — | — | — | — |
| Auditoría | total | lectura | — | — | — | — |
| Roles y permisos | total | lectura | — | — | — | — |
| Mis vales | total | — | — | — | — | lectura |
| Nueva venta | total | escritura | total | escritura | escritura | — |
| Cartera | total | escritura | total | escritura | lectura | — |
| Mi tienda | total | total | escritura | lectura | — | — |

En palabras:

- **Tendero (dueño):** opera su tienda: vende, cobra, anula y arma su equipo. No ve ni toca
  tiendas ajenas.
- **Encargado:** atiende la tienda por el dueño: vende y cobra. No anula vales ni abonos y no
  gestiona el equipo. Más que el vendedor, menos que el dueño.
- **Vendedor:** registra vales y consulta la cartera. No cobra.
- **Administrador:** gestiona tiendas y usuarios, vende y cobra en cualquier tienda; consulta
  roles y auditoría, pero no edita roles.
- **Cliente:** consulta sus vales.

## Equipo de la tienda

El dueño (permiso `equipo:gestionar`, y ser `esPropietario` de esa tienda) suma vendedores o
encargados ya registrados por su correo, crea la cuenta de uno nuevo (recibe correo de
activación) o lo quita: `POST /tiendas/:id/equipo`, `POST /tiendas/:id/equipo/nuevo`,
`DELETE /tiendas/:id/equipo/:userId`. Con `tienda:administrar`, en cualquier tienda.

## Pantallas

Web y app arman el menú con `GET /modules` (módulos, nivel y permisos efectivos) y muestran
cada botón (cobrar, anular, gestionar el equipo) solo si el rol tiene el permiso. El servidor lo
exige igual.
