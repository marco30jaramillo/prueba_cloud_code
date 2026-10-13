/**
 * Matriz de permisos por defecto (KAN-75). Lee los scripts de la base (inserts/ para bases
 * nuevas y alters/005 para las existentes), calcula los permisos efectivos de cada rol con la
 * lógica real de Role y Module, y comprueba:
 *  - que inserts/ y alters/005 dejan exactamente lo mismo;
 *  - la regla: permisos directos solo de sesión, el resto por módulo y nivel;
 *  - quién puede qué (tendero sin tienda:administrar, encargado cobra sin anular, etc.);
 *  - que todo permiso que revisa una ruta existe en el catálogo.
 * Sin base de datos.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Role = require('../src/models/Role');
const Module = require('../src/models/Module');
const { PERMISOS_SESION } = require('../src/config/permisos');

const SQL = path.join(__dirname, '..', '..', 'database', 'scripts_sql');
const leer = (rel) => fs.readFileSync(path.join(SQL, rel), 'utf8');
const lista = (t) => t.split('|').filter(Boolean);

// ── inserts/ ────────────────────────────────────────────────────────────────
const catalogo = [...leer('inserts/01_permisos.sql').matchAll(/\(\d+, N'([^']+)', N'[^']*', N'[^']*'\)/g)].map((m) => m[1]);

const modulosInsert = [...leer('inserts/03_modulos.sql').matchAll(
  /\((\d+), N'([^']*)', N'[^']*', N'[^']*', N'([^']*)', N'[^']*', \d, N'([^']*)', N'([^']*)', N'([^']*)'\)/g,
)].map((m) => ({ id: m[1], name: m[2], href: m[3], permRead: lista(m[4]), permWrite: lista(m[5]), permFull: lista(m[6]) }));

const rolesInsert = [...leer('inserts/02_roles.sql').matchAll(
  /\((\d+), N'([^']*)', N'[^']*', N'([^']*)', N'([^']*)', N'([^']*)'\)/g,
)].map((m) => ({ id: m[1], name: m[2], permissions: m[3], canManage: m[4], modules: m[5] }));

// ── alters/005 ──────────────────────────────────────────────────────────────
const alter = leer('alters/005_permisos_por_modulo_y_rol_encargado.sql');
const modulosAlter = new Map([...alter.matchAll(
  /UPDATE dbo\.modules SET\s+permRead\s*=\s*N'([^']*)',\s+permWrite\s*=\s*N'([^']*)',\s+permFull\s*=\s*N'([^']*)'\s+WHERE id = (\d+);/g,
)].map((m) => [m[4], { permRead: lista(m[1]), permWrite: lista(m[2]), permFull: lista(m[3]) }]));
const rolesAlter = new Map([...alter.matchAll(
  /UPDATE dbo\.roles SET\s+(?:description = N'[^']*',\s+)?permissions = N'([^']*)',\s+canManage\s*=\s*N'([^']*)',\s+modules\s*=\s*N'([^']*)'\s+WHERE name = N'([^']+)';/g,
)].map((m) => [m[4], { permissions: m[1], canManage: m[2], modules: m[3] }]));

// La lógica real de Role/Module sobre los datos de inserts/.
Module.getAll = async () => modulosInsert.map((m) => new Module(m));
Role.getAll = async () => rolesInsert.map((r) => new Role(r));
const efectivos = async (rol) => new Set(await Role.getEffectivePermissions(rol));

test('los scripts se leyeron completos (8 módulos, 6 roles)', () => {
  assert.equal(modulosInsert.length, 8);
  assert.deepEqual(rolesInsert.map((r) => r.name).sort(),
    ['administrador', 'cliente', 'encargado', 'superuser', 'tendero', 'vendedor']);
  assert.ok(catalogo.includes('equipo:gestionar'));
});

test('alters/005 deja los módulos igual que inserts/03', () => {
  assert.equal(modulosAlter.size, 8);
  for (const m of modulosInsert) {
    const a = modulosAlter.get(m.id);
    assert.ok(a, `alters/005 no actualiza el módulo ${m.id}`);
    assert.deepEqual(a, { permRead: m.permRead, permWrite: m.permWrite, permFull: m.permFull }, m.name);
  }
});

test('alters/005 deja los roles igual que inserts/02', () => {
  for (const r of rolesInsert) {
    const a = rolesAlter.get(r.name);
    assert.ok(a, `alters/005 no actualiza el rol ${r.name}`);
    assert.deepEqual(a, { permissions: r.permissions, canManage: r.canManage, modules: r.modules }, r.name);
  }
});

test('regla: fuera del superusuario, los permisos directos son solo de sesión', () => {
  for (const r of rolesInsert.filter((x) => x.name !== 'superuser')) {
    const fuera = lista(r.permissions).filter((p) => !PERMISOS_SESION.includes(p));
    assert.deepEqual(fuera, [], r.name);
  }
});

test('cada nivel incluye al anterior y todo permiso de módulo está en el catálogo', () => {
  for (const m of modulosInsert) {
    for (const p of m.permRead) assert.ok(m.permWrite.includes(p), `${m.name}: escritura incluye ${p}`);
    for (const p of m.permWrite) assert.ok(m.permFull.includes(p), `${m.name}: total incluye ${p}`);
    for (const p of m.permFull) assert.ok(catalogo.includes(p), `${m.name}: ${p} no está en el catálogo`);
  }
});

test('todo permiso que revisa una ruta existe en el catálogo', () => {
  const rutas = path.join(__dirname, '..', 'src', 'routes');
  const usados = new Set();
  for (const f of fs.readdirSync(rutas).filter((x) => x.endsWith('.js') && x !== 'docs.js')) {
    const t = fs.readFileSync(path.join(rutas, f), 'utf8');
    for (const m of t.matchAll(/(?:requirePermission|hasPermission)\([^'")]*['"]([a-z-]+:[a-z-]+)['"]/g)) usados.add(m[1]);
  }
  assert.ok(usados.size >= 15, `se esperaban varias rutas con permiso (${usados.size})`);
  for (const p of usados) assert.ok(catalogo.includes(p), `${p} no está en el catálogo`);
});

// ── Quién puede qué ────────────────────────────────────────────────────────

const SI = true;
const NO = false;
// [permiso, superuser, administrador, tendero, encargado, vendedor, cliente]
const MATRIZ = [
  ['vale:crear',         SI, SI, SI, SI, SI, NO],
  ['vale:ver-tienda',    SI, SI, SI, SI, SI, NO],
  ['vale:anular',        SI, NO, SI, NO, NO, NO],
  ['abono:ver',          SI, SI, SI, SI, SI, SI],
  ['abono:crear',        SI, SI, SI, SI, NO, NO],
  ['abono:anular',       SI, NO, SI, NO, NO, NO],
  ['vale:ver-propio',    SI, NO, NO, NO, NO, SI],
  ['tienda:ver',         SI, SI, SI, SI, SI, NO],
  ['equipo:gestionar',   SI, SI, SI, NO, NO, NO],
  ['tienda:administrar', SI, SI, NO, NO, NO, NO],
  ['auth:view-users',    SI, SI, NO, NO, NO, NO],
  ['admin:manage-users', SI, SI, NO, NO, NO, NO],
  ['admin:view-audit',   SI, SI, NO, NO, NO, NO],
  ['admin:view-stats',   SI, NO, NO, NO, NO, NO],
  ['admin:view-roles',   SI, SI, NO, NO, NO, NO],
  ['admin:manage-roles', SI, NO, NO, NO, NO, NO],
  ['profile:edit-own',   SI, SI, SI, SI, SI, SI],
];
const ROLES = ['superuser', 'administrador', 'tendero', 'encargado', 'vendedor', 'cliente'];

for (const [permiso, ...esperado] of MATRIZ) {
  test(`matriz · ${permiso}`, async () => {
    for (const [i, rol] of ROLES.entries()) {
      assert.equal(await Role.hasPermission(rol, permiso), esperado[i], `${rol} ${esperado[i] ? 'debe' : 'no debe'} tener ${permiso}`);
    }
  });
}

test('el encargado está entre el vendedor y el dueño', async () => {
  const [vendedor, encargado, tendero] = await Promise.all(['vendedor', 'encargado', 'tendero'].map(efectivos));
  for (const p of vendedor) assert.ok(encargado.has(p), `el encargado debe tener todo lo del vendedor (${p})`);
  for (const p of encargado) assert.ok(tendero.has(p), `el dueño debe tener todo lo del encargado (${p})`);
  assert.ok(encargado.size > vendedor.size && tendero.size > encargado.size);
});

test('quién crea cuentas de qué rol (canManage)', async () => {
  assert.deepEqual(await Role.getManageableRoles('tendero'), ['cliente']);
  assert.deepEqual(await Role.getManageableRoles('encargado'), ['cliente']);
  assert.deepEqual(await Role.getManageableRoles('vendedor'), []);
  assert.ok((await Role.getManageableRoles('administrador')).includes('encargado'));
  assert.ok(!(await Role.getManageableRoles('administrador')).includes('administrador'));
});
