# Plan de migración: CSV a Azure SQL Database

## Objetivo de esta etapa

Crear una base de datos Azure SQL que conserve el funcionamiento y estructura
lógica actual. No se cambia todavía el backend, no se borran CSV y no se
normalizan permisos, módulos ni jerarquías de roles.

El esquema inicial está en `migrations/001_initial_schema.sql`.

## Decisión de modelado inicial

Los siguientes campos se mantienen tal como existen hoy, usando texto separado
por `|`:

- `roles.permissions`
- `roles.canManage`
- `roles.modules` (`moduleId:read|moduleId:write|...`)
- `modules.permRead`
- `modules.permWrite`
- `modules.permFull`

Esto permite portar los datos y después adaptar `Role.js` y `Module.js` con el
menor cambio posible. Una normalización futura será una migración separada,
nunca parte de esta primera carga.

## Orden de ejecución

1. Crear una Azure SQL Database Serverless Free con la opción de pausarse al
   agotarse el límite mensual gratuito.
2. En Query Editor, Azure Data Studio o `sqlcmd`, conectarse a la nueva base.
3. Ejecutar `migrations/001_initial_schema.sql` una sola vez.
4. Instalar el controlador en `backend`: `npm install mssql`.
5. Configurar las variables `AZURE_SQL_*` de `backend/env.example` en
   `backend/.env`.
6. Ejecutar `npm run db:import` para validar todos los CSV sin conectarse ni
   escribir datos.
7. Ejecutar el importador de catálogos que se implementará para importar solo
   `permissions.csv`, `modules.csv` y `roles.csv`.
8. Comparar conteos de filas entre esos tres CSV y sus tablas SQL.
9. Activar SQL y crear desde cero el primer superusuario; no se importan
   usuarios, tokens ni auditoría.

> El script actual `backend/src/scripts/importCsvToAzureSql.js` importa las
> siete tablas si se ejecuta con `--apply`. No usar `--apply` hasta crear la
> variante limitada a los tres catálogos.

## Conversión de tipos durante la importación

| CSV | Azure SQL |
| --- | --- |
| UUID (`id`, `tokenId`) | `UNIQUEIDENTIFIER` |
| `true` / `false` | `BIT` |
| Fechas ISO 8601 | `DATETIME2(3)` en UTC |
| JWT, detalle de auditoría | `NVARCHAR(MAX)` |
| Campos vacíos opcionales | `NULL` |

## Restricciones que protege el esquema

- Email de usuario único.
- Nombre de rol, permiso, módulo y ruta de módulo únicos.
- Sesiones y revocaciones asociadas a un usuario existente.
- Índices para autenticación, limpieza de tokens y consultas de auditoría.

## Límites de esta primera versión

- El JWT completo se conserva en las tablas de tokens porque así funciona el
  CSV actual. En una segunda etapa se puede guardar solo `tokenId` y expiración.
- El usuario conserva su `role` como texto; no se agregó una FK hacia
  `roles.name` para evitar cambiar el comportamiento de creación/migración.
- Las fotos siguen siendo una ruta o URL. La migración de archivos a Azure Blob
  Storage es independiente del esquema SQL.
