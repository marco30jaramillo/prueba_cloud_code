# Plan de switch reversible: CSV a Azure SQL Database

## Decisión confirmada: migrar solo configuración de acceso

La carga inicial a Azure SQL contendrá únicamente estos catálogos:

- `roles`
- `permissions`
- `modules`

`modules` es necesario aunque no contenga usuarios: `roles.modules` guarda
referencias como `1:read` y la aplicación calcula los permisos efectivos desde
los niveles definidos en los módulos.

No se migrarán `users`, `tokens_granted`, `tokens_revoked` ni `audit_logs`.
Al activar SQL, se creará un superusuario nuevo mediante
`POST /auth/bootstrap-superuser` y las demás cuentas se crearán desde cero.
Las contraseñas, sesiones y auditoría del sistema CSV no estarán disponibles en
el nuevo entorno SQL.

## Inventario de acceso actual a CSV

| Archivo actual | Lecturas y escrituras | Archivos a sustituir |
| --- | --- | --- |
| `users.csv` | Crear, buscar, autenticar, actualizar perfil/estado/contraseña y reset | `src/models/User.js`, y la actualización directa de `src/routes/auth.js` en cambio temporal de contraseña |
| `roles.csv` | Leer permisos, crear rol, actualizar rol y migrar cabecera | `src/models/Role.js` |
| `permissions.csv` | Inicializar y consultar catálogo | `src/models/Permission.js` |
| `modules.csv` | Consultar módulos y permisos por nivel | `src/models/Module.js` |
| `tokens_granted.csv`, `tokens_revoked.csv` | Crear, validar, revocar, cerrar todas las sesiones y limpiar expirados | `src/utils/tokenManager.js`, `src/middleware/auth.js`, `src/scripts/cleanExpiredTokens.js` |
| `audit_logs.csv` | Registrar y consultar auditoría/reportes | `src/models/AuditLog.js`, `src/middleware/auditMiddleware.js`, `src/routes/audit.js` |
| `datos/uploads/users/` | Crear y borrar fotos | `src/routes/upload.js`; queda fuera de este switch y se migrará luego a Blob Storage |

Las rutas que deben pasar a usar métodos asíncronos son `auth.js`, `users.js`,
`roles-config.js`, `modules.js`, `audit.js`, y los middlewares `auth.js`,
`auditMiddleware.js`, `roleMiddleware.js`.

## Diseño de compatibilidad

Se añadirá una interfaz de almacenamiento, no consultas SQL dentro de rutas:

```text
rutas / middleware
        ↓
servicios o modelos asíncronos
        ↓
DATA_PROVIDER=csv  → adaptador CSV actual
DATA_PROVIDER=sql  → adaptador Azure SQL
```

Los adaptadores expondrán los mismos métodos actuales (`findByEmail`,
`create`, `updateRole`, `revokeToken`, `getAll`, etc.). Los métodos pasarán a
devolver `Promise` en ambos proveedores, por lo que las rutas usarán `await`.
Esto elimina diferencias de comportamiento entre CSV y SQL.

## Fases de implementación

### 1. Preparación sin cambio funcional

- Dependencia `mssql` instalada y declarada.
- Crear `src/database/sqlPool.js`: un pool único, perezoso, con TLS y variables
  `AZURE_SQL_*`.
- Añadir `DATA_PROVIDER=csv` por defecto. Sin esa variable o con valor inválido,
  el servidor debe rechazar el inicio en producción, pero mantener CSV en local.
- No guardar credenciales en Git; solo en `.env` local y Application Settings
  de Azure al desplegar.

### 2. Extraer contratos y adaptar CSV

- Crear repositorios CSV que envuelvan el comportamiento existente sin cambiar
  el formato ni escribir en nuevos archivos.
- Cambiar los modelos y consumidores a `async/await` manteniendo
  `DATA_PROVIDER=csv`.
- Ejecutar pruebas actuales y una prueba manual completa: registro, login,
  logout, logout-all, reset, cambios de perfil/contraseña, roles y auditoría.

### 3. Implementar adaptador SQL y pruebas aisladas

- Crear los repositorios SQL equivalentes contra las siete tablas existentes.
- Mantener `roles.permissions`, `roles.canManage`, `roles.modules`,
  `modules.permRead`, `permWrite` y `permFull` como texto `|`, tal como están.
- Usar transacciones SQL para operaciones compuestas: crear usuario + token +
  auditoría; revocar token; cambiar estado + revocar sesiones.
- Probar con una base de desarrollo separada, nunca directamente con producción.

### 4. Carga de configuración y validación

- Cargar únicamente `permissions.csv`, `modules.csv` y `roles.csv`.
- Comparar conteos y contenido de estos tres catálogos entre CSV y SQL.
- Probar que cada rol devuelve los mismos módulos y permisos efectivos en ambas
  fuentes.
- Verificar que las tablas `users`, `tokens_granted`, `tokens_revoked` y
  `audit_logs` de SQL están vacías antes de activar el proveedor SQL.

### 5. Switch controlado

- Programar ventana corta, detener despliegues y crear copia de los CSV.
- Ejecutar una última sincronización incremental.
- Establecer `DATA_PROVIDER=sql`.
- Crear el primer superusuario nuevo con `POST /auth/bootstrap-superuser`.
- Desplegar, hacer smoke tests y monitorear: login, autorización, creación de
  usuarios, logout, roles y auditoría nuevos.

### 6. Rollback sin pérdida de escrituras

- Si falla la validación, volver a `DATA_PROVIDER=csv` y desplegar la versión
  anterior. Las cuentas y auditoría creadas exclusivamente en SQL no existirán
  en CSV; por eso el rollback debe ocurrir antes de poner el nuevo entorno en
  uso real o se debe habilitar doble escritura temporal de las nuevas cuentas.
- Mantener los CSV intactos como respaldo de solo lectura hasta validar el nuevo
  entorno SQL durante varios días.

## Variables previstas

```env
DATA_PROVIDER=csv
SQL_SHADOW_WRITE=false
AZURE_SQL_SERVER=servidor.database.windows.net
AZURE_SQL_DATABASE=base_de_datos
AZURE_SQL_USER=auth_app_runtime
AZURE_SQL_PASSWORD=valor_secreto
```

## Criterios para autorizar el switch

- Todas las pruebas funcionales pasan usando el adaptador CSV asíncrono.
- Conteos y contenido de roles, permisos y módulos coinciden entre CSV y SQL.
- Las tablas SQL de usuarios, tokens y auditoría se confirman vacías antes del
  primer bootstrap.
- Se crea y valida el nuevo superusuario SQL.
- Las pruebas de roles/permisos devuelven exactamente los mismos módulos y
  permisos efectivos.
- Se prueba rollback en la base de desarrollo.
