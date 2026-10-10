# db-migrate: ejecutor de migraciones de base de datos

Aplica a QA y producción los scripts de `database/scripts_sql/alters/` pendientes, sin tocar
datos. Es una red de seguridad: la garantía real es la revisión del PR, la conciliación y el
punto de restauración. Sin dependencias nuevas (usa `mssql`).

## Uso (desde `backend/`)

    node scripts/db-migrate.js --modo <aplicar|dry-run|baseline|inicializar> --version vX.Y.Z [--confirmar-base NOMBRE]

Entorno: `DEPLOY_DB_SERVER`, `DEPLOY_DB_DATABASE`, `DEPLOY_DB_USER`, `DEPLOY_DB_PASSWORD`;
opcionales `DEPLOY_DB_PORT` y `DEPLOY_DB_TRUST_SERVER_CERTIFICATE` (solo servidor local con
`NODE_ENV=development|test`; en Azure el cifrado y el certificado siempre se verifican).
Salida: 0 éxito, 1 fallo (nada aplicado, o el script en curso revertido), 2 uso incorrecto.
El primer mensaje tras conectar es `PUNTO_RESTAURACION_UTC=<ISO>`; si no se obtiene, falla.

## Modos

| Modo | Qué hace |
|---|---|
| `aplicar` | Aplica los `alters/` no registrados, en orden de nombre, cada uno en su transacción. |
| `dry-run` | Lista lo que `aplicar` haría y valida todo; no escribe nada. |
| `baseline` | Registra los `alters/` como `baseline` sin ejecutarlos. Exige `--confirmar-base` y que tablas y columnas reales coincidan con `esquemas/` (no compara tipos). Si falta la tabla de control, ejecuta `esquemas/03_control_migraciones.sql`. |
| `inicializar` | Para una base vacía: ejecuta `esquemas/` e `inserts/` (sin `00_*`) y registra los `alters/` como `inicializacion`. |

Solo lee `alters/` (más `esquemas/` e `inserts/` en `inicializar`; `esquemas/` en `baseline`) y
`consultas/conciliacion_integral.sql`. Nunca `mantenimiento/`. Los `00_*` se excluyen por
prefijo y los corre una persona.

## Qué hace antes y después de cada script

1. Bloqueo de aplicación (`sp_getapplock`): dos despliegues no corren a la vez.
2. Un script registrado con otra suma de verificación detiene todo (el fin de línea y el BOM no
   cuentan). Registrados que el commit no conoce se ignoran.
3. Revisión de sentencias destructivas de **todos** los pendientes antes de aplicar el primero.
4. Conciliación (filas y suma por tabla, totales de saldo) antes y, dentro de la transacción,
   después. Si algo difiere: ROLLBACK de ese script y fallo.
5. Registro en `dbo.migraciones_aplicadas` (con parámetros SQL) en la misma transacción.

Sentencias no transaccionales (`ALTER DATABASE`, índices en línea, `CREATE DATABASE`) no se
deshacen con el ROLLBACK.

## Qué rechaza

`DROP` (tabla, columna, restricción, esquema, vista...), `TRUNCATE`, `DELETE`/`UPDATE` sin
`WHERE`, `MERGE` con `DELETE`, `sp_rename`, **todo** `ALTER COLUMN` (no se conoce el tipo
anterior), `EXEC(`/`sp_executesql`/`EXEC @variable` (procedimiento en una variable),
`xp_cmdshell`. Los corchetes y comillas de los identificadores no evaden estas comprobaciones
(`EXEC [sys].[sp_executesql]` se rechaza igual). En `inserts/`, además, todo `UPDATE` y
`DELETE`. Comentarios, mayúsculas y textos entre comillas se normalizan antes de revisar.

También exigen aprobación por archivo: `GRANT`, `DENY`, `REVOKE`, `ALTER ROLE`,
`ALTER AUTHORIZATION`, `CREATE USER`, `CREATE LOGIN`, `CREATE TRIGGER ... ON DATABASE`,
`ALTER DATABASE`, `USE`, `OPENROWSET`, `BULK INSERT`, `DISABLE TRIGGER` y `NOCHECK`.

Las rutas se resuelven con `realpath`: un enlace simbólico (carpeta, `conciliacion_integral.sql`
o `aprobaciones-destructivas.json`) que apunte fuera de `database/scripts_sql/` detiene todo.
`GO n` con n distinto de 1 y los comandos de `sqlcmd` (`:r`, `!!`...) también se rechazan.

## Cómo se aprueba un destructivo

En `database/scripts_sql/aprobaciones-destructivas.json`, por un PR que Marco revisa:

    [{ "script": "alters/004_quitar_columna.sql", "hash": "<sha256>", "claveJira": "KAN-80",
       "tablasModificadas": ["dbo.vales"] }]

El `hash` es el SHA-256 del script con fin de línea `\n` y sin BOM
(`node -e "console.log(require('./scripts/db-migrate').checksumScript(require('fs').readFileSync('RUTA','utf8')))"`).
Si el script cambia, el hash deja de valer. `tablasModificadas` excluye de la comparación las
claves `filas:` y `suma:` de esas tablas (los `total:*` siempre se comparan). Una marca dentro
del script no sirve.

### Qué exige cada tipo de cambio

| Cambio | Exige |
|---|---|
| Tabla nueva (`CREATE TABLE`) | Nada. Las claves de conciliación que no existían antes no cuentan como diferencia. |
| Columna nueva en tabla existente (`ADD COLUMN`) | Entrada con `tablasModificadas`: cambia `BINARY_CHECKSUM(*)` y por tanto `suma:` de esa tabla. |
| Destructivo (`DROP`, `UPDATE`/`DELETE`... ver arriba) | Aprobación por hash, más `tablasModificadas` si cambia valores. |

`tablasModificadas` sirve también para cambios aditivos sobre tablas existentes, no solo para
destructivos. Ejemplo para un `ADD COLUMN` sobre `dbo.vales`:

    [{ "script": "alters/005_vales_nota.sql", "hash": "<sha256>", "claveJira": "KAN-81",
       "tablasModificadas": ["dbo.vales"] }]

Un `alter` que crea una tabla y además modifica valores de una existente sigue revirtiéndose
si esa tabla no está en `tablasModificadas`.

## Riesgo: la tabla de control

La cuenta de la aplicación no debe poder escribir en `dbo.migraciones_aplicadas`.

- **QA y producción: mitigado.** `database/scripts_sql/esquemas/00_permisos_aplicacion.sql`
  incluye `DENY INSERT, UPDATE, DELETE ON dbo.migraciones_aplicadas TO [auth_app_runtime]`.
  Marco lo ejecuta a mano después de inicializar y después de cada release que cree la tabla.
  El ejecutor excluye los archivos `00_*`, por eso este script no lo corre.
- **Ese `DENY` NO va en `esquemas/` ni en `inserts/`**: el ejecutor rechazaría la sentencia
  (ver «Qué rechaza»). Su único lugar es `00_permisos_aplicacion.sql`.
- **Local: riesgo abierto y aceptado.** `mivalecito_app` usa roles de lectura y escritura
  (`db_datawriter`) y puede escribir en la tabla. Se acepta porque la tabla de control es una
  protección contra errores del operador, no contra una aplicación comprometida.

## Cómo se reconstruye una base

- Base nueva: ejecutar a mano los `00_*`, luego `inicializar` con `--confirmar-base` igual a
  `DEPLOY_DB_DATABASE`. Solo corre una vez: exige cero tablas de usuario en todos los esquemas y
  tabla de control inexistente o vacía.
- `inicializar` confirma **cada script por separado** (una transacción por archivo), no todo el
  conjunto. Si falla a medias, la base queda parcial: lo ya confirmado no se revierte.
- Repetirlo se rechaza, porque la base ya no está vacía. La recuperación es manual: restaurar el
  punto anterior (`PUNTO_RESTAURACION_UTC`) o crear una base nueva y volver a empezar.
- Si termina pero falla el registro de los `alters/`, usar `baseline`.
- Base existente sin tabla de control: `baseline`.
- Un error de esquema se corrige hacia adelante con un `alter` nuevo; no hay scripts inversos.
