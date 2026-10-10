/**
 * Pruebas del ejecutor de migraciones (`scripts/db-migrate.js`), requerimiento 002.
 *
 * - Lógica: con una base falsa inyectable, sin red.
 * - Integración: contra MiValecito_Cmp en localhost con el login `mivalecito_dev_ddl`; la
 *   contraseña viene de la variable de usuario MIVALECITO_MCP_PASSWORD y nunca se imprime.
 *   Se omite si esa variable falta, o si la base aún no tiene la tabla de control o la
 *   conciliación (esquemas/03_control_migraciones.sql, consultas/conciliacion_integral.sql).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const m = require('../scripts/db-migrate');
const { SQL } = m;

const FIXTURES = path.join(__dirname, 'fixtures', 'db-migrate');
const RAIZ_REAL = m.RAIZ_SCRIPTS;

// ── Utilidades ───────────────────────────────────────────────────────────────

function crearRaiz(archivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-migrate-'));
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const ruta = path.join(raiz, nombre);
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, contenido);
  }
  return raiz;
}

const MARCA_CONCILIACION = '-- CONCILIACION_FALSA';
const ENV = {
  DEPLOY_DB_SERVER: 'servidor-ficticio.example',
  DEPLOY_DB_DATABASE: 'BaseFicticia',
  DEPLOY_DB_USER: 'cuenta_ficticia',
  DEPLOY_DB_PASSWORD: 'clave-ficticia-12345',
};

/** Base falsa: responde por el texto SQL de las constantes del ejecutor. */
class BaseFalsa {
  constructor(estado = {}) {
    this.e = {
      ahora: '2026-10-10T12:00:00.1234567',
      base: ENV.DEPLOY_DB_DATABASE,
      control: true,
      registradas: [],
      tablas: [],
      columnas: [],
      bloqueo: 0,
      modoBloqueo: 'Exclusive',
      trancount: 1,
      conciliacion: new Map([['filas:dbo.t', '1'], ['suma:dbo.t', '10']]),
      alEjecutar: null,
      falla: null,
      ...estado,
    };
    this.ejecutados = [];
    this.registros = [];
    this.eventos = [];
    this.estadoTx = null;
  }

  async conectar() { this.eventos.push('conectar'); }
  async cerrar() { this.eventos.push('cerrar'); }
  async iniciarTransaccion() { this.eventos.push('begin'); this.estadoTx = { conciliacion: new Map(this.e.conciliacion) }; }
  async confirmar() { this.eventos.push('commit'); this.estadoTx = null; }
  async revertir() {
    this.eventos.push('rollback');
    if (this.estadoTx) this.e.conciliacion = this.estadoTx.conciliacion;
    this.registros = this.registros.filter((r) => !r.pendiente);
    this.estadoTx = null;
  }

  async consulta(texto, p = {}) {
    if (this.e.falla && texto === this.e.falla.en) throw new Error(this.e.falla.mensaje);
    switch (texto) {
      case SQL.ahora: return [this.e.ahora === null ? [] : [{ ahora: this.e.ahora }]];
      case SQL.baseActual: return [[{ base: this.e.base }]];
      case SQL.bloquear: return [[{ resultado: this.e.bloqueo }]];
      case SQL.verificarBloqueo: return [[{ modo: this.e.modoBloqueo }]];
      case SQL.liberar: this.eventos.push('liberar'); return [];
      case SQL.tablaControl: return [[{ id: this.e.control ? 1234 : null }]];
      case SQL.registradas: return [this.e.registradas.map((r) => ({ ...r }))];
      case SQL.contarRegistradas: return [[{ n: this.e.registradas.length }]];
      case SQL.tablasUsuario: return [this.e.tablas];
      case SQL.columnas: return [this.e.columnas];
      case SQL.tranCount: return [[{ n: this.e.trancount }]];
      case SQL.registrar:
        this.registros.push({ ...p, pendiente: Boolean(this.estadoTx) });
        return [];
      default: throw new Error(`consulta no prevista en la base falsa: ${texto.slice(0, 60)}`);
    }
  }

  async lote(texto) {
    if (texto.includes(MARCA_CONCILIACION)) {
      return [[...this.e.conciliacion].map(([clave, valor]) => ({ clave, valor }))];
    }
    this.ejecutados.push(texto);
    if (this.e.alEjecutar) this.e.alEjecutar(texto, this.e);
    return [];
  }
}

function salidaCapturada() {
  const lineas = { out: [], err: [] };
  return {
    lineas,
    salida: { out: (t) => lineas.out.push(t), err: (t) => lineas.err.push(t) },
  };
}

const base = (extra = {}) => ({
  'consultas/conciliacion_integral.sql': `${MARCA_CONCILIACION}\nSELECT 1;`,
  ...extra,
});

async function correr(raiz, db, opciones) {
  const cap = salidaCapturada();
  const codigo = await m.ejecutarMigracion({
    modo: 'aplicar', version: 'v1.0.0', env: ENV, raiz, db, salida: cap.salida, esperaBloqueoMs: 100, ...opciones,
  });
  return { codigo, out: cap.lineas.out, err: cap.lineas.err };
}

// ── Versión y argumentos ─────────────────────────────────────────────────────

describe('versión y argumentos', () => {
  test('acepta vX.Y.Z y rechaza el resto', () => {
    assert.equal(m.validarVersion('v1.0.0'), true);
    assert.equal(m.validarVersion('v12.345.6789'), true);
    for (const malo of ['1.0.0', 'v1.0', 'v1.0.0-beta', 'v1.0.0\n', 'v1.0.0; rm -rf /', "v1.0.0' OR 1=1", '', 'V1.0.0']) {
      assert.equal(m.validarVersion(malo), false, JSON.stringify(malo));
    }
  });

  test('parsearArgumentos valida modo, versión y confirmación', () => {
    assert.deepEqual(m.parsearArgumentos(['--modo', 'aplicar', '--version', 'v1.0.0']),
      { modo: 'aplicar', version: 'v1.0.0' });
    assert.throws(() => m.parsearArgumentos(['--modo', 'aplicar', '--version', 'v1']), m.ErrorUso);
    assert.throws(() => m.parsearArgumentos(['--modo', 'borrar', '--version', 'v1.0.0']), m.ErrorUso);
    assert.throws(() => m.parsearArgumentos(['--modo', 'aplicar', '--version', 'v1.0.0', '--otra', 'x']), m.ErrorUso);
    assert.throws(() => m.parsearArgumentos(['--modo', 'inicializar', '--version', 'v1.0.0']), m.ErrorUso);
    assert.equal(m.parsearArgumentos(['--modo', 'baseline', '--version', 'v1.0.0', '--confirmar-base', 'X']).confirmarBase, 'X');
  });

  test('versión inválida: código 2 y no toca la base', async () => {
    const db = new BaseFalsa();
    const r = await correr(crearRaiz(base()), db, { version: 'v1.0.0;DROP TABLE x' });
    assert.equal(r.codigo, 2);
    assert.deepEqual(db.eventos, []);
  });

  test('faltan variables DEPLOY_DB_*: código 2', async () => {
    const r = await m.ejecutarMigracion({
      modo: 'aplicar', version: 'v1.0.0', env: { DEPLOY_DB_SERVER: 'x' }, raiz: crearRaiz(base()),
      salida: salidaCapturada().salida,
    });
    assert.equal(r, 2);
  });
});

// ── Revisión destructiva ─────────────────────────────────────────────────────

describe('revisión de sentencias destructivas', () => {
  const rechaza = (sql, carpeta = 'alters') => m.revisarDestructivo(sql, carpeta).length > 0;

  test('rechaza DROP, TRUNCATE, sp_rename y SQL dinámico', () => {
    assert.ok(rechaza('DROP TABLE dbo.vales'));
    assert.ok(rechaza('ALTER TABLE dbo.vales DROP COLUMN notas'));
    assert.ok(rechaza('ALTER TABLE dbo.vales DROP CONSTRAINT DF_x'));
    assert.ok(rechaza('DROP SCHEMA extra'));
    assert.ok(rechaza('TRUNCATE TABLE dbo.abonos'));
    assert.ok(rechaza("EXEC sp_rename 'dbo.a', 'b'"));
    assert.ok(rechaza("EXEC('DELETE FROM dbo.vales')"));
    assert.ok(rechaza("EXECUTE (@sql)"));
    assert.ok(rechaza("EXEC sp_executesql @sql"));
  });

  test('rechaza en minúsculas y con comentarios intercalados', () => {
    assert.ok(rechaza('drop table dbo.vales'));
    assert.ok(rechaza('Drop /* un comentario */ Table dbo.vales'));
    assert.ok(rechaza('DROP -- comentario\n TABLE dbo.vales'));
    assert.ok(rechaza('ALTER TABLE dbo.vales /* x /* anidado */ y */ DROP COLUMN notas'));
    assert.ok(rechaza('exec  /*c*/ ( \'delete from dbo.vales\' )'));
    assert.ok(rechaza('tRuNcAtE tAbLe dbo.abonos'));
  });

  test('un -- dentro de un texto no oculta lo que sigue', () => {
    assert.ok(rechaza("SELECT '--'; DROP TABLE dbo.vales;"));
    assert.ok(rechaza("PRINT N'/*'; DROP TABLE dbo.vales; PRINT N'*/'"));
  });

  test('no rechaza lo que solo parece destructivo', () => {
    assert.equal(rechaza("-- DROP TABLE x\nSELECT 1"), false);
    assert.equal(rechaza("/* TRUNCATE TABLE x */ SELECT 1"), false);
    assert.equal(rechaza("PRINT N'DROP TABLE x; EXEC(1)'"), false);
    assert.equal(rechaza('SELECT [drop], [truncate] FROM dbo.t'), false);
    assert.equal(rechaza('CREATE INDEX ix ON dbo.t (a) WITH (DROP_EXISTING = ON)'), false);
    assert.equal(rechaza('ALTER TABLE dbo.t ADD CONSTRAINT FK FOREIGN KEY (a) REFERENCES dbo.u (id) ON DELETE CASCADE ON UPDATE CASCADE'), false);
    assert.equal(rechaza('SELECT [grant], [use], [nocheck] FROM dbo.t'), false);
    assert.equal(rechaza("PRINT N'GRANT SELECT ON dbo.t TO x; USE otra'"), false);
    assert.equal(rechaza("EXEC dbo.mi_procedimiento @a = 1"), false);
    assert.equal(rechaza("DECLARE @r INT; EXEC @r = sys.sp_getapplock @Resource = N'x'"), false);
    assert.equal(rechaza("EXEC [dbo].[mi_procedimiento] @a = 1"), false);
  });

  test('UPDATE y DELETE: sin WHERE se rechazan, con WHERE no', () => {
    assert.ok(rechaza('UPDATE dbo.vales SET estado = N\'x\''));
    assert.ok(rechaza('DELETE FROM dbo.vales'));
    assert.ok(rechaza('delete dbo.vales'));
    assert.ok(rechaza('DELETE TOP (10) FROM dbo.vales'));
    assert.ok(rechaza('UPDATE dbo.a SET x = 1 UPDATE dbo.b SET y = 2 WHERE id = 1'));
    assert.ok(rechaza('UPDATE dbo.a SET x = (SELECT y FROM dbo.b WHERE id = 1)'), 'el WHERE de la subconsulta no cuenta');
    assert.ok(rechaza('UPDATE dbo.a SET x = 1;\nSELECT * FROM dbo.b WHERE id = 2'));
    assert.equal(rechaza('UPDATE dbo.a SET x = 1 WHERE id = 3'), false);
    assert.equal(rechaza('DELETE FROM dbo.a WHERE id = 3'), false);
    assert.equal(rechaza('UPDATE a SET x = CASE WHEN y = 1 THEN 1 ELSE 2 END FROM dbo.a AS a JOIN dbo.b AS b ON b.id = a.id WHERE b.k = 1'), false);
  });

  test('MERGE con DELETE se rechaza', () => {
    assert.ok(rechaza('MERGE dbo.t AS t USING dbo.s AS s ON t.id = s.id WHEN NOT MATCHED BY SOURCE THEN DELETE;'));
    assert.equal(rechaza('MERGE dbo.t AS t USING dbo.s AS s ON t.id = s.id WHEN MATCHED THEN UPDATE SET t.a = s.a;'), false);
  });

  test('ALTER COLUMN se rechaza (no se sabe el tipo anterior)', () => {
    assert.ok(rechaza('ALTER TABLE dbo.t ALTER COLUMN a NVARCHAR(10)'));
    assert.ok(rechaza('alter table dbo.t alter column a varchar(5) not null'));
  });

  test('inserts/: todo UPDATE y DELETE se rechaza, aun con WHERE', () => {
    assert.ok(rechaza('UPDATE dbo.t SET a = 1 WHERE id = 1', 'inserts'));
    assert.ok(rechaza('DELETE FROM dbo.t WHERE id = 1', 'inserts'));
    assert.equal(rechaza('INSERT INTO dbo.t (id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM dbo.t WHERE id = 1)', 'inserts'), false);
    assert.equal(rechaza("INSERT INTO dbo.p (n) VALUES (N'auth:update-user')", 'inserts'), false);
  });

  test('identificadores entre corchetes o comillas no evaden la revisión', () => {
    assert.ok(rechaza('EXEC [sys].[sp_executesql] @s'));
    assert.ok(rechaza('EXEC [sp_executesql] @s'));
    assert.ok(rechaza('EXEC "sys"."sp_executesql" @s'));
    assert.ok(rechaza("EXEC [sp_rename] 'dbo.a', 'b'"));
    assert.ok(rechaza("EXEC [sys].[sp_rename] 'dbo.a', 'b'"));
    assert.ok(rechaza("EXEC [master].[dbo].[xp_cmdshell] 'dir'"));
    assert.ok(rechaza("EXEC \"xp_cmdshell\" 'dir'"));
    assert.ok(rechaza('EXEC @proc'));
    assert.ok(rechaza('EXECUTE @proc @a = 1'));
    assert.ok(rechaza('DECLARE @r INT; EXEC @r = @proc'));
  });

  test('sentencias de permisos, identidad y alcance exigen aprobación', () => {
    const casos = [
      'GRANT SELECT ON dbo.t TO [rol]', 'DENY SELECT ON dbo.t TO [rol]', 'REVOKE SELECT ON dbo.t FROM [rol]',
      'ALTER ROLE [db_owner] ADD MEMBER [x]', 'ALTER AUTHORIZATION ON SCHEMA::dbo TO [x]',
      'CREATE USER [x] WITHOUT LOGIN', "CREATE LOGIN [x] WITH PASSWORD = N'a'",
      'CREATE TRIGGER trg ON DATABASE FOR DROP_TABLE AS SELECT 1', 'ALTER DATABASE CURRENT SET RECOVERY SIMPLE',
      'USE master', "SELECT * FROM OPENROWSET(BULK N'a', SINGLE_CLOB) AS x", "BULK INSERT dbo.t FROM 'a.csv'",
      'ALTER TABLE dbo.t DISABLE TRIGGER trg', 'ALTER TABLE dbo.t NOCHECK CONSTRAINT ALL',
      'ALTER TABLE dbo.t WITH NOCHECK ADD CONSTRAINT ck CHECK (a > 0)',
    ];
    for (const sql of casos) assert.ok(rechaza(sql), sql);
    // Un disparador de tabla (no de base) sigue sin pedir aprobación.
    assert.equal(rechaza('CREATE TRIGGER trg ON dbo.t AFTER INSERT AS SELECT 1'), false);
    assert.equal(rechaza('ALTER TABLE dbo.t ENABLE TRIGGER trg'), false);
  });

  test('los scripts reales de esquemas/, inserts/ y alters/ no tienen hallazgos que requieran aprobación', () => {
    const aprobaciones = m.cargarAprobaciones(RAIZ_REAL);
    assert.equal(aprobaciones.size, 0, 'aprobaciones-destructivas.json debe estar vacío');
    const revisados = m.cargarScripts(RAIZ_REAL, ['esquemas', 'inserts', 'alters']);
    for (const s of revisados) {
      assert.deepEqual(m.revisarDestructivo(s.contenido, s.carpeta), [], s.nombre);
    }
    // El conjunto revisado no puede quedar vacío ni incluir lo que corre una persona.
    const nombres = revisados.map((s) => s.nombre);
    for (const esperado of [
      'esquemas/01_esquema_inicial.sql', 'esquemas/02_esquema_vales.sql', 'esquemas/03_control_migraciones.sql',
      'inserts/01_permisos.sql', 'inserts/02_roles.sql', 'inserts/03_modulos.sql',
    ]) {
      assert.ok(nombres.includes(esperado), `falta en la revisión: ${esperado}`);
    }
    assert.deepEqual(nombres.filter((n) => /(^|\/)00_/.test(n) || /^mantenimiento\//.test(n)), []);
  });
});

// ── Suma de verificación, lotes y orden ──────────────────────────────────────

describe('checksum, lotes y orden', () => {
  test('el fin de línea y el BOM no cambian la suma; un cambio de contenido sí', () => {
    const a = 'SELECT 1;\nGO\nSELECT 2;\n';
    assert.equal(m.checksumScript(a), m.checksumScript(a.replace(/\n/g, '\r\n')));
    assert.equal(m.checksumScript(a), m.checksumScript('﻿' + a));
    assert.notEqual(m.checksumScript(a), m.checksumScript(a.replace('2', '3')));
    assert.match(m.checksumScript(a), /^[0-9a-f]{64}$/);
  });

  test('divide por líneas GO como sqlcmd', () => {
    assert.deepEqual(m.dividirLotes('A\nGO\nB\r\ngo\n  GO  \nC'), ['A', 'B', 'C']);
    assert.deepEqual(m.dividirLotes('SELECT 1 -- GO\n'), ['SELECT 1 -- GO\n']);
    assert.throws(() => m.dividirLotes('A\nGO 5\nB'), m.ErrorMigracion);
  });

  test('cargarScripts: orden por nombre, sin 00_* ni mantenimiento/', () => {
    const raiz = crearRaiz({
      'esquemas/00_cuenta.sql': 'SELECT 0;',
      'esquemas/02_b.sql': 'SELECT 2;',
      'esquemas/01_a.sql': 'SELECT 1;',
      'esquemas/notas.txt': 'no es sql',
      'inserts/00_semilla.sql': 'SELECT 0;',
      'inserts/01_x.sql': 'SELECT 1;',
      'alters/002_b.sql': 'SELECT 2;',
      'alters/001_a.sql': 'SELECT 1;',
      'mantenimiento/limpiar.sql': 'DELETE FROM dbo.vales;',
    });
    const nombres = m.cargarScripts(raiz, ['esquemas', 'inserts', 'alters']).map((s) => s.nombre);
    assert.deepEqual(nombres, ['esquemas/01_a.sql', 'esquemas/02_b.sql', 'inserts/01_x.sql', 'alters/001_a.sql', 'alters/002_b.sql']);
  });

  test('un script que no es UTF-8 o trae comandos de sqlcmd se rechaza', () => {
    const raiz = crearRaiz({ 'alters/001_a.sql': ':r otro.sql\nSELECT 1;' });
    assert.throws(() => m.cargarScripts(raiz, ['alters']), /sqlcmd/);
  });
});

// ── Enlaces simbólicos ───────────────────────────────────────────────────────

describe('enlaces simbólicos no sacan la lectura de scripts_sql/', () => {
  /** Crea un enlace; devuelve false si el sistema no lo permite (p. ej. Windows sin privilegio). */
  function enlazar(destino, ruta, tipo) {
    try {
      fs.symlinkSync(destino, ruta, tipo);
      return true;
    } catch (_) {
      return false;
    }
  }

  test('carpeta enlazada a un directorio externo: falla; carpeta real dentro de la raíz: pasa', (t) => {
    const externo = crearRaiz({ 'x.sql': 'SELECT 1;' });
    const raiz = crearRaiz({ 'esquemas/01_a.sql': 'SELECT 1;' });
    fs.mkdirSync(path.join(raiz, 'inserts'));
    if (!enlazar(externo, path.join(raiz, 'alters'), 'junction')) {
      t.skip('el sistema no permite crear enlaces simbólicos');
      return;
    }
    assert.throws(() => m.listarCarpeta(raiz, 'alters', { excluirCero: false }), m.ErrorMigracion);
    assert.deepEqual(m.listarCarpeta(raiz, 'esquemas', { excluirCero: false }).map((e) => e.nombre), ['esquemas/01_a.sql']);
  });

  test('consultas/ enlazada fuera de la raíz: la migración falla sin tocar la base', async (t) => {
    const externo = crearRaiz({ 'conciliacion_integral.sql': MARCA_CONCILIACION + '\nSELECT 1;' });
    const raiz = crearRaiz({ 'alters/001_a.sql': 'SELECT 1;' });
    if (!enlazar(externo, path.join(raiz, 'consultas'), 'junction')) {
      t.skip('el sistema no permite crear enlaces simbólicos');
      return;
    }
    const db = new BaseFalsa();
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 1);
    assert.deepEqual(db.ejecutados, []);
    assert.match(r.err.join('\n'), /fuera de database\/scripts_sql/);
  });

  test('aprobaciones-destructivas.json enlazado fuera de la raíz: falla', (t) => {
    const externo = crearRaiz({ 'a.json': '[]' });
    const raiz = crearRaiz({ 'alters/001_a.sql': 'SELECT 1;' });
    if (!enlazar(path.join(externo, 'a.json'), path.join(raiz, 'aprobaciones-destructivas.json'), 'file')) {
      t.skip('el sistema no permite crear enlaces simbólicos de archivo');
      return;
    }
    assert.throws(() => m.cargarAprobaciones(raiz), m.ErrorMigracion);
  });
});

// ── Aprobaciones ─────────────────────────────────────────────────────────────

describe('aprobación de destructivos por hash', () => {
  const DROP = 'ALTER TABLE dbo.t DROP COLUMN c;\n';

  test('sin entrada en el archivo: rechazado y no aplica nada', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': '-- aprobado: sí\n' + DROP, 'alters/002_b.sql': 'SELECT 2;' }));
    const db = new BaseFalsa();
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 1);
    assert.deepEqual(db.ejecutados, []);
    assert.match(r.err.join('\n'), /001_a\.sql/);
  });

  test('con hash vigente: pasa; con hash viejo: rechazado', async () => {
    const contenido = DROP;
    const hash = m.checksumScript(contenido);
    const aprob = (h) => JSON.stringify([{ script: 'alters/001_a.sql', hash: h, claveJira: 'KAN-70', tablasModificadas: ['dbo.t'] }]);
    const ok = crearRaiz(base({ 'alters/001_a.sql': contenido, 'aprobaciones-destructivas.json': aprob(hash) }));
    const db1 = new BaseFalsa();
    assert.equal((await correr(ok, db1)).codigo, 0);
    assert.equal(db1.ejecutados.length, 1);

    const viejo = crearRaiz(base({ 'alters/001_a.sql': contenido, 'aprobaciones-destructivas.json': aprob('0'.repeat(64)) }));
    const db2 = new BaseFalsa();
    assert.equal((await correr(viejo, db2)).codigo, 1);
    assert.deepEqual(db2.ejecutados, []);
  });

  test('el archivo de aprobaciones con formato inválido detiene todo', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;', 'aprobaciones-destructivas.json': '[{"script":"alters/001_a.sql"}]' }));
    const r = await correr(raiz, new BaseFalsa());
    assert.equal(r.codigo, 1);
  });
});

// ── aplicar: control, conciliación, bloqueo ──────────────────────────────────

describe('aplicar', () => {
  test('el punto de restauración es el primer mensaje; si no se obtiene, falla', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const r = await correr(raiz, new BaseFalsa());
    assert.equal(r.codigo, 0);
    assert.equal(r.out[0], 'PUNTO_RESTAURACION_UTC=2026-10-10T12:00:00.1234567Z');

    const sinHora = await correr(raiz, new BaseFalsa({ ahora: null }));
    assert.equal(sinHora.codigo, 1);
    assert.equal(sinHora.out.length, 0);
  });

  test('aplica pendientes en orden, cada uno en su transacción, y los registra', async () => {
    const raiz = crearRaiz(base({ 'alters/002_b.sql': 'SELECT 2;\nGO\nSELECT 22;', 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa();
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 0);
    assert.deepEqual(db.ejecutados, ['SELECT 1;', 'SELECT 2;', 'SELECT 22;']);
    assert.deepEqual(db.registros.map((x) => [x.nombre, x.modo, x.version]),
      [['alters/001_a.sql', 'aplicado', 'v1.0.0'], ['alters/002_b.sql', 'aplicado', 'v1.0.0']]);
    assert.equal(db.eventos.filter((e) => e === 'commit').length, 2);
    assert.ok(db.eventos.includes('liberar'));
  });

  test('ya registrado con el mismo contenido: no repite (segunda ejecución sin cambios)', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa({ registradas: [{ nombre: 'alters/001_a.sql', checksum: m.checksumScript('SELECT 1;') }] });
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 0);
    assert.deepEqual(db.ejecutados, []);
    assert.deepEqual(db.registros, []);
  });

  test('registrado con contenido distinto: se detiene sin aplicar nada; cambiar solo el fin de línea no cuenta', async () => {
    const registradas = [{ nombre: 'alters/001_a.sql', checksum: m.checksumScript('SELECT 1;\nSELECT 9;\n') }];
    const editado = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;\n', 'alters/002_b.sql': 'SELECT 2;' }));
    const db = new BaseFalsa({ registradas });
    const r = await correr(editado, db);
    assert.equal(r.codigo, 1);
    assert.deepEqual(db.ejecutados, []);

    const crlf = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;\r\nSELECT 9;\r\n' }));
    const db2 = new BaseFalsa({ registradas });
    assert.equal((await correr(crlf, db2)).codigo, 0);
    assert.deepEqual(db2.ejecutados, []);
  });

  test('registrados que el commit no conoce se ignoran', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa({ registradas: [
      { nombre: 'alters/001_a.sql', checksum: m.checksumScript('SELECT 1;') },
      { nombre: 'alters/050_futuro.sql', checksum: 'f'.repeat(64) },
    ] });
    assert.equal((await correr(raiz, db)).codigo, 0);
  });

  test('sin tabla de control: falla con mensaje claro', async () => {
    const r = await correr(crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' })), new BaseFalsa({ control: false }));
    assert.equal(r.codigo, 1);
    assert.match(r.err.join('\n'), /migraciones_aplicadas/);
  });

  test('la conciliación posterior difiere: ROLLBACK, no se registra y se detiene', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'UPDATE dbo.t SET a = 1 WHERE id = 1;', 'alters/002_b.sql': 'SELECT 2;' }));
    const db = new BaseFalsa({ alEjecutar: (_, e) => e.conciliacion.set('suma:dbo.t', '99') });
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 1);
    assert.ok(db.eventos.includes('rollback'));
    assert.deepEqual(db.registros, []);
    assert.equal(db.ejecutados.length, 1, 'el segundo script no corre');
    assert.equal(db.e.conciliacion.get('suma:dbo.t'), '10', 'la base falsa volvió al estado previo');
    assert.match(r.err.join('\n'), /suma:dbo\.t/);
  });

  test('tablasModificadas excluye filas y suma de esa tabla, no las demás', async () => {
    const aprob = JSON.stringify([{ script: 'alters/001_a.sql', hash: m.checksumScript('UPDATE dbo.t SET a = 1 WHERE id = 1;'), claveJira: 'KAN-70', tablasModificadas: ['dbo.t'] }]);
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'UPDATE dbo.t SET a = 1 WHERE id = 1;', 'aprobaciones-destructivas.json': aprob }));
    const db = new BaseFalsa({ conciliacion: new Map([['filas:dbo.t', '1'], ['suma:dbo.t', '10'], ['total:cartera', '5.00']]),
      alEjecutar: (_, e) => e.conciliacion.set('suma:dbo.t', '99') });
    assert.equal((await correr(raiz, db)).codigo, 0);

    const db2 = new BaseFalsa({ conciliacion: new Map([['filas:dbo.t', '1'], ['suma:dbo.t', '10'], ['total:cartera', '5.00']]),
      alEjecutar: (_, e) => e.conciliacion.set('total:cartera', '6.00') });
    assert.equal((await correr(raiz, db2)).codigo, 1);
  });

  test('compararConciliacion: una tabla nueva no cuenta; una clave que cambia o desaparece sí', () => {
    const a = new Map([['filas:dbo.x', '1'], ['suma:dbo.x', '10']]);
    const nueva = new Map([['filas:dbo.x', '1'], ['suma:dbo.x', '10'], ['filas:dbo.y', '0'], ['suma:dbo.y', '0']]);
    assert.equal(m.compararConciliacion(a, a).length, 0);
    // a: tabla nueva, sin diferencia
    assert.equal(m.compararConciliacion(a, nueva).length, 0);
    // b: clave existente que cambia (p. ej. ADD COLUMN cambia el checksum) o desaparece
    const cambia = new Map(nueva).set('suma:dbo.x', '77');
    assert.deepEqual(m.compararConciliacion(a, cambia).map((d) => d.clave), ['suma:dbo.x']);
    assert.equal(m.compararConciliacion(a, cambia, ['dbo.x']).length, 0);
    assert.equal(m.compararConciliacion(a, new Map(), []).length, 2);
  });

  test('alter que solo crea una tabla se aplica sin aprobación; si además cambia una existente, se revierte', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'CREATE TABLE dbo.nueva (id INT);' }));
    const db = new BaseFalsa({ alEjecutar: (_, e) => { e.conciliacion.set('filas:dbo.nueva', '0'); e.conciliacion.set('suma:dbo.nueva', '0'); } });
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 0);
    assert.equal(db.registros.length, 1);

    const mixto = crearRaiz(base({ 'alters/001_a.sql': 'CREATE TABLE dbo.nueva (id INT); UPDATE dbo.t SET a = 1 WHERE id = 1;' }));
    const db2 = new BaseFalsa({ alEjecutar: (_, e) => {
      e.conciliacion.set('filas:dbo.nueva', '0');
      e.conciliacion.set('suma:dbo.t', '99');
    } });
    const r2 = await correr(mixto, db2);
    assert.equal(r2.codigo, 1);
    assert.ok(db2.eventos.includes('rollback'));
    assert.deepEqual(db2.registros, []);
    assert.match(r2.err.join('\n'), /suma:dbo\.t/);
  });

  test('otro despliegue tiene el bloqueo: falla sin aplicar nada', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa({ bloqueo: -1 });
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 1);
    assert.deepEqual(db.ejecutados, []);
  });

  test('si se pierde el bloqueo antes de un script: se revierte y falla', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa({ modoBloqueo: null });
    assert.equal((await correr(raiz, db)).codigo, 1);
    assert.deepEqual(db.ejecutados, []);
  });

  test('un script con su propio COMMIT/ROLLBACK se detecta', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa({ trancount: 0 });
    assert.equal((await correr(raiz, db)).codigo, 1);
    assert.deepEqual(db.registros, []);
  });

  test('dry-run no escribe: ni transacción, ni bloqueo, ni registro', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa();
    const r = await correr(raiz, db, { modo: 'dry-run' });
    assert.equal(r.codigo, 0);
    assert.deepEqual(db.ejecutados, []);
    assert.deepEqual(db.registros, []);
    assert.ok(!db.eventos.includes('begin'));
    assert.match(r.out.join('\n'), /APLICAR[IÍ]A alters\/001_a\.sql/);
  });

  test('los registros no contienen la contraseña ni el servidor', async () => {
    const raiz = crearRaiz(base({ 'alters/001_a.sql': 'SELECT 1;' }));
    const db = new BaseFalsa({ falla: { en: SQL.registradas, mensaje: `Login failed; Password=${ENV.DEPLOY_DB_PASSWORD} en ${ENV.DEPLOY_DB_SERVER}` } });
    const r = await correr(raiz, db);
    assert.equal(r.codigo, 1);
    const todo = [...r.out, ...r.err].join('\n');
    assert.ok(!todo.includes(ENV.DEPLOY_DB_PASSWORD));
    assert.ok(!todo.includes(ENV.DEPLOY_DB_SERVER));
  });
});

// ── inicializar ──────────────────────────────────────────────────────────────

describe('inicializar', () => {
  const ARCHIVOS = base({
    'esquemas/00_cuenta.sql': 'CREATE LOGIN x;',
    'esquemas/01_a.sql': 'CREATE TABLE dbo.t (id INT);',
    'esquemas/03_control.sql': 'CREATE TABLE dbo.migraciones_aplicadas (id INT);',
    'inserts/00_secreto.sql': 'SELECT 0;',
    'inserts/01_x.sql': 'INSERT INTO dbo.t (id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM dbo.t);',
    'alters/001_a.sql': 'SELECT 1;',
    'alters/002_b.sql': 'SELECT 2;',
    'mantenimiento/limpiar.sql': 'SELECT 99;',
  });
  const opciones = { modo: 'inicializar', confirmarBase: ENV.DEPLOY_DB_DATABASE };
  // Al ejecutar el script de la tabla de control, la base falsa pasa a tenerla.
  const creaControl = (t, e) => { if (/migraciones_aplicadas/.test(t)) e.control = true; };

  test('base vacía: ejecuta esquemas e inserts en orden, sin 00_* ni mantenimiento, y registra los alters', async () => {
    const db = new BaseFalsa({ control: false, alEjecutar: creaControl });
    const r = await correr(crearRaiz(ARCHIVOS), db, opciones);
    assert.equal(r.codigo, 0, r.err.join('\n'));
    assert.deepEqual(db.ejecutados, [
      'CREATE TABLE dbo.t (id INT);',
      'CREATE TABLE dbo.migraciones_aplicadas (id INT);',
      'INSERT INTO dbo.t (id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM dbo.t);',
    ]);
    // La tabla de control "aparece" tras 03; la base falsa la reporta según su estado final.
    assert.deepEqual(db.registros.map((x) => [x.nombre, x.modo]),
      [['alters/001_a.sql', 'inicializacion'], ['alters/002_b.sql', 'inicializacion']]);
  });

  test('con una sola tabla de usuario: se detiene sin aplicar nada', async () => {
    const db = new BaseFalsa({ control: false, tablas: [{ esquema: 'dbo', tabla: 'unica' }] });
    const r = await correr(crearRaiz(ARCHIVOS), db, opciones);
    assert.equal(r.codigo, 1);
    assert.deepEqual(db.ejecutados, []);
    assert.ok(db.eventos.includes('rollback'));
  });

  test('una tabla en otro esquema también cuenta', async () => {
    const db = new BaseFalsa({ control: false, tablas: [{ esquema: 'otro', tabla: 'x' }] });
    assert.equal((await correr(crearRaiz(ARCHIVOS), db, opciones)).codigo, 1);
    assert.deepEqual(db.ejecutados, []);
  });

  test('tabla de control con filas: no se repite', async () => {
    const db = new BaseFalsa({ control: true, registradas: [{ nombre: 'alters/001_a.sql', checksum: 'a'.repeat(64) }] });
    const r = await correr(crearRaiz(ARCHIVOS), db, opciones);
    assert.equal(r.codigo, 1);
    assert.deepEqual(db.ejecutados, []);
  });

  test('tabla de control vacía y sin otras tablas: se permite', async () => {
    const db = new BaseFalsa({ control: true, registradas: [], tablas: [{ esquema: 'dbo', tabla: 'migraciones_aplicadas' }] });
    assert.equal((await correr(crearRaiz(ARCHIVOS), db, opciones)).codigo, 0);
  });

  test('nombre de base distinto al configurado: se detiene sin aplicar nada', async () => {
    const db = new BaseFalsa({ control: false, alEjecutar: creaControl });
    const r = await correr(crearRaiz(ARCHIVOS), db, { ...opciones, confirmarBase: 'OtraBase' });
    assert.equal(r.codigo, 1);
    assert.deepEqual(db.ejecutados, []);

    const db2 = new BaseFalsa({ control: false, base: 'OtraBase', alEjecutar: creaControl });
    assert.equal((await correr(crearRaiz(ARCHIVOS), db2, opciones)).codigo, 1);
    assert.deepEqual(db2.ejecutados, []);
  });

  test('sin --confirmar-base: código 2', async () => {
    const db = new BaseFalsa({ control: false, alEjecutar: creaControl });
    const r = await correr(crearRaiz(ARCHIVOS), db, { modo: 'inicializar' });
    assert.equal(r.codigo, 2);
  });

  test('una sentencia destructiva en esquemas/ o inserts/ se rechaza antes de aplicar nada', async () => {
    for (const malo of [{ 'esquemas/02_malo.sql': 'DROP TABLE dbo.t;' }, { 'inserts/02_malo.sql': 'UPDATE dbo.t SET a = 1 WHERE id = 1;' }]) {
      const db = new BaseFalsa({ control: false, alEjecutar: creaControl });
      const r = await correr(crearRaiz({ ...ARCHIVOS, ...malo }), db, opciones);
      assert.equal(r.codigo, 1);
      assert.deepEqual(db.ejecutados, []);
    }
  });

  test('un 00_* destructivo no se revisa ni se ejecuta (lo corre una persona)', async () => {
    const db = new BaseFalsa({ control: false, alEjecutar: creaControl });
    const r = await correr(crearRaiz({ ...ARCHIVOS, 'esquemas/00_peligro.sql': 'DROP DATABASE x;' }), db, opciones);
    assert.equal(r.codigo, 0);
    assert.ok(!db.ejecutados.some((s) => /DROP DATABASE/.test(s)));
  });
});

// ── baseline ─────────────────────────────────────────────────────────────────

describe('baseline', () => {
  const ARCHIVOS = base({
    'esquemas/01_a.sql': 'IF NOT EXISTS (SELECT 1) BEGIN CREATE TABLE dbo.Tiendas (Id INT NOT NULL, [Nombre] NVARCHAR(10), CONSTRAINT PK_t PRIMARY KEY (Id)); END',
    'alters/001_a.sql': 'SELECT 1;',
  });
  const opciones = { modo: 'baseline', confirmarBase: ENV.DEPLOY_DB_DATABASE };
  const cols = (...c) => c.map(([esquema, tabla, columna]) => ({ esquema, tabla, columna }));

  test('esquema igual (sin importar mayúsculas): registra sin ejecutar', async () => {
    const db = new BaseFalsa({ columnas: cols(['dbo', 'tiendas', 'ID'], ['dbo', 'tiendas', 'nombre']) });
    const r = await correr(crearRaiz(ARCHIVOS), db, opciones);
    assert.equal(r.codigo, 0, r.err.join('\n'));
    assert.deepEqual(db.ejecutados, []);
    assert.deepEqual(db.registros.map((x) => [x.nombre, x.modo]), [['alters/001_a.sql', 'baseline']]);
  });

  test('falta una columna o sobra una tabla: falla sin registrar', async () => {
    const falta = new BaseFalsa({ columnas: cols(['dbo', 'tiendas', 'id']) });
    assert.equal((await correr(crearRaiz(ARCHIVOS), falta, opciones)).codigo, 1);
    assert.deepEqual(falta.registros, []);

    const sobra = new BaseFalsa({ columnas: cols(['dbo', 'tiendas', 'id'], ['dbo', 'tiendas', 'nombre'], ['dbo', 'extra', 'a']) });
    assert.equal((await correr(crearRaiz(ARCHIVOS), sobra, opciones)).codigo, 1);
  });

  test('nombre de base distinto: falla', async () => {
    const db = new BaseFalsa({ columnas: cols(['dbo', 'tiendas', 'id'], ['dbo', 'tiendas', 'nombre']) });
    assert.equal((await correr(crearRaiz(ARCHIVOS), db, { ...opciones, confirmarBase: 'x' })).codigo, 1);
    assert.deepEqual(db.registros, []);
  });
});

// ── Integración contra MiValecito_Cmp ────────────────────────────────────────

const CLAVE = process.env.MIVALECITO_MCP_PASSWORD;
const ENV_CMP = {
  NODE_ENV: 'test',
  DEPLOY_DB_SERVER: 'localhost',
  DEPLOY_DB_DATABASE: 'MiValecito_Cmp',
  DEPLOY_DB_USER: 'mivalecito_dev_ddl',
  DEPLOY_DB_PASSWORD: CLAVE,
  DEPLOY_DB_TRUST_SERVER_CERTIFICATE: 'true',
};

describe('integración contra MiValecito_Cmp (localhost)', { skip: CLAVE ? false : 'falta MIVALECITO_MCP_PASSWORD' }, () => {
  const rutaConciliacion = path.join(RAIZ_REAL, 'consultas', 'conciliacion_integral.sql');
  let omitir = null;
  let directo;

  const conectar = async () => {
    const c = m.crearConexionMssql(m.construirConfig(ENV_CMP));
    await c.conectar();
    return c;
  };
  const conciliar = async () => {
    const lotes = m.dividirLotes(fs.readFileSync(rutaConciliacion, 'utf8'));
    let pares = new Map();
    for (const l of lotes) for (const [k, v] of m.leerConciliacion(await directo.lote(l))) pares.set(k, v);
    return pares;
  };
  const registradasFixture = async () => (await directo.consulta(
    "SELECT nombre FROM dbo.migraciones_aplicadas WHERE nombre LIKE N'alters/9%_fixture_%'"))[0].length;
  const limpiar = async () => {
    await directo.consulta("DELETE FROM dbo.migraciones_aplicadas WHERE nombre LIKE N'alters/9%_fixture_%'");
    await directo.consulta("IF OBJECT_ID(N'dbo.vw_fixture_migrate', N'V') IS NOT NULL DROP VIEW dbo.vw_fixture_migrate");
  };
  const descripciones = async () => (await directo.consulta(
    'SELECT id, description FROM dbo.roles WHERE id IN (1, 2) ORDER BY id'))[0].map((r) => r.description).join('|');
  const raizTemp = (alters, aprob = []) => {
    const archivos = { 'consultas/conciliacion_integral.sql': fs.readFileSync(rutaConciliacion, 'utf8'),
      'aprobaciones-destructivas.json': JSON.stringify(aprob) };
    for (const [nombre, contenido] of Object.entries(alters)) archivos[`alters/${nombre}`] = contenido;
    return crearRaiz(archivos);
  };
  const leerFixture = (n) => fs.readFileSync(path.join(FIXTURES, n), 'utf8');
  const aplicarCmp = (raiz, extra = {}) => correr(raiz, null, { env: ENV_CMP, db: undefined, esperaBloqueoMs: 500, ...extra });

  test('preparación', async (t) => {
    directo = await conectar();
    const control = (await directo.consulta("SELECT OBJECT_ID(N'dbo.migraciones_aplicadas', N'U') AS id"))[0][0].id;
    const roles = (await directo.consulta('SELECT COUNT(*) AS n FROM dbo.roles WHERE id IN (1, 2)'))[0][0].n;
    if (!control || !fs.existsSync(rutaConciliacion) || roles !== 2) {
      omitir = 'MiValecito_Cmp sin tabla de control, sin conciliación o sin roles 1 y 2';
      t.diagnostic(omitir);
    } else {
      await limpiar();
    }
  });

  test('CA-8 y CA-9: aplicar un alter no cambia filas, saldos ni sumas; repetir no cambia nada', async (t) => {
    if (omitir) return t.skip(omitir);
    const raiz = raizTemp({ '900_fixture_vista.sql': leerFixture('900_fixture_vista.sql') });
    const antes = await conciliar();
    const r1 = await aplicarCmp(raiz);
    assert.equal(r1.codigo, 0, r1.err.join('\n'));
    assert.match(r1.out[0], /^PUNTO_RESTAURACION_UTC=\d{4}-/);
    assert.deepEqual(m.compararConciliacion(antes, await conciliar()), []);
    assert.equal(await registradasFixture(), 1);

    const r2 = await aplicarCmp(raiz);
    assert.equal(r2.codigo, 0, r2.err.join('\n'));
    assert.equal(await registradasFixture(), 1);
    assert.deepEqual(m.compararConciliacion(antes, await conciliar()), []);
  });

  test('script editado: se detiene; solo el fin de línea: no es cambio', async (t) => {
    if (omitir) return t.skip(omitir);
    const original = leerFixture('900_fixture_vista.sql');
    const crlf = raizTemp({ '900_fixture_vista.sql': original.replace(/\r?\n/g, '\r\n') });
    assert.equal((await aplicarCmp(crlf)).codigo, 0);
    const editado = raizTemp({ '900_fixture_vista.sql': original + '\n-- editado\n' });
    const r = await aplicarCmp(editado);
    assert.equal(r.codigo, 1);
    assert.match(r.err.join('\n'), /contenido distinto/);
  });

  test('cambio de valores que conserva el total: la suma lo detecta y revierte', async (t) => {
    if (omitir) return t.skip(omitir);
    const antesDesc = await descripciones();
    const antes = await conciliar();
    const raiz = raizTemp({ '900_fixture_vista.sql': leerFixture('900_fixture_vista.sql'),
      '901_fixture_cambio_valores.sql': leerFixture('901_fixture_cambio_valores.sql') });
    const r = await aplicarCmp(raiz);
    assert.equal(r.codigo, 1);
    assert.match(r.err.join('\n'), /suma:dbo\.roles/);
    assert.equal(await descripciones(), antesDesc, 'los datos quedaron como estaban');
    assert.deepEqual(m.compararConciliacion(antes, await conciliar()), []);
    assert.equal(await registradasFixture(), 1, 'solo el primero quedó registrado');
  });

  test('con la tabla declarada en la aprobación, el mismo cambio pasa (y se restaura)', async (t) => {
    if (omitir) return t.skip(omitir);
    const cambio = leerFixture('901_fixture_cambio_valores.sql');
    const aprob = [{ script: 'alters/901_fixture_cambio_valores.sql', hash: m.checksumScript(cambio),
      claveJira: 'KAN-65', tablasModificadas: ['dbo.roles'] }];
    const raiz = raizTemp({ '900_fixture_vista.sql': leerFixture('900_fixture_vista.sql'), '901_fixture_cambio_valores.sql': cambio }, aprob);
    const antesDesc = await descripciones();
    try {
      const r = await aplicarCmp(raiz);
      assert.equal(r.codigo, 0, r.err.join('\n'));
      assert.notEqual(await descripciones(), antesDesc);
    } finally {
      // Restaura: intercambiar de nuevo las descripciones.
      if ((await descripciones()) !== antesDesc) {
        await directo.consulta(`UPDATE r SET description = o.description FROM dbo.roles AS r
          JOIN (VALUES (1, 2), (2, 1)) AS m (a, b) ON r.id = m.a JOIN dbo.roles AS o ON o.id = m.b WHERE r.id IN (1, 2);`);
      }
    }
    assert.equal(await descripciones(), antesDesc);
  });

  test('destructivo sin aprobación: rechazado y sin cambios', async (t) => {
    if (omitir) return t.skip(omitir);
    const raiz = raizTemp({ '902_fixture_destructivo.sql': 'ALTER TABLE dbo.roles DROP COLUMN description;' });
    const r = await aplicarCmp(raiz);
    assert.equal(r.codigo, 1);
    assert.match(r.err.join('\n'), /destructivas/);
    assert.equal((await descripciones()).includes('undefined'), false);
  });

  test('exclusión mutua: con el bloqueo tomado por otra sesión, falla sin aplicar', async (t) => {
    if (omitir) return t.skip(omitir);
    const otra = await conectar();
    try {
      const got = (await otra.consulta(SQL.bloquear, { espera: 0 }))[0][0].resultado;
      assert.ok(got >= 0);
      const raiz = raizTemp({ '903_fixture_bloqueo.sql': 'SET NOCOUNT ON;' });
      const r = await aplicarCmp(raiz);
      assert.equal(r.codigo, 1);
      assert.match(r.err.join('\n'), /bloqueo/);
    } finally {
      await otra.cerrar();
    }
  });

  test('limpieza', async () => {
    if (directo) {
      if (!omitir) await limpiar();
      await directo.cerrar();
    }
  });
});
