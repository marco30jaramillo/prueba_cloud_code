/**
 * seed.js — Datos de prueba para Mi Valecito
 *
 * Crea: 3 tiendas, tenderos/empleados asignados, 12 clientes, ~18 vales
 *
 * Uso:
 *   npm run db:seed               → agrega datos (puede crear duplicados)
 *   npm run db:seed -- --clean    → borra primero lo que el propio seed creó (sus correos y
 *                                   sus tiendas exactos; no el resto de los datos de prueba)
 *
 * Solo corre contra la base local: exige la familia DB_* completa en .env y un DB_SERVER de
 * bucle local. Con AZURE_SQL_* o AZURE_SQL_CONNECTION_STRING se niega antes de conectar (H-4).
 */

// La guarda va antes de cargar los modelos y el pool: nada se conecta si no es local.
const { cargarEnv, assertEntornoLocal } = require('./lib/entornoLocal');
cargarEnv();
try {
  const destino = assertEntornoLocal(process.env, { exigirConexion: true, nombre: 'El seed' });
  console.log(`Destino: configuración ${destino.family}, host ${destino.host}`);
} catch (error) {
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
}

const User   = require('../src/models/User');
const Tienda = require('../src/models/Tienda');
const Vale   = require('../src/models/Vale');
const { getPool, sql } = require('../src/database/sqlPool');

const CLEAN  = process.argv.includes('--clean');
const PWD    = 'Seed123!';   // contraseña válida para todos los usuarios creados
const SEED_BOT_EMAIL = 'seed-bot@valecito.dev';   // superusuario que el seed crea si no hay ninguno

// ── Helpers de fechas ─────────────────────────────────────────
const dias = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ── Dataset ───────────────────────────────────────────────────

const TIENDAS = [
  { nombre: 'Tienda La Esquina',     descripcion: 'Tienda de barrio clásica', ciudad: 'Cartagena', telefono: '3001111001' },
  { nombre: 'Mercado El Progreso',   descripcion: 'Surtido completo de víveres', ciudad: 'Cartagena', telefono: '3002222002' },
  { nombre: 'Minimarket San José',   descripcion: 'Tu tienda de confianza 24h', ciudad: 'Barranquilla', telefono: '3003333003' },
];

// tenderos[i] → pertenecen a TIENDAS[i]
const TENDEROS = [
  // Tienda 0
  [
    { email: 'pedro.duarte@valecito.dev',  nombre: 'Pedro Duarte',   rol: 'tendero', propietario: true  },
    { email: 'sofia.reyes@valecito.dev',   nombre: 'Sofía Reyes',    rol: 'tendero', propietario: false },
    { email: 'camilo.vega@valecito.dev',   nombre: 'Camilo Vega',    rol: 'vendedor', propietario: false },
  ],
  // Tienda 1
  [
    { email: 'lucia.mora@valecito.dev',    nombre: 'Lucía Mora',     rol: 'tendero', propietario: true  },
    { email: 'jorge.silva@valecito.dev',   nombre: 'Jorge Silva',    rol: 'vendedor', propietario: false },
    { email: 'valentina.rios@valecito.dev',nombre: 'Valentina Ríos', rol: 'vendedor', propietario: false },
    { email: 'mario.pinto@valecito.dev',   nombre: 'Mario Pinto',    rol: 'tendero', propietario: false },
  ],
  // Tienda 2
  [
    { email: 'adriana.leon@valecito.dev',  nombre: 'Adriana León',   rol: 'tendero', propietario: true  },
    { email: 'carlos.mejia@valecito.dev',  nombre: 'Carlos Mejía',   rol: 'vendedor', propietario: false },
    { email: 'diana.torres@valecito.dev',  nombre: 'Diana Torres',   rol: 'tendero', propietario: false },
  ],
];

const CLIENTES = [
  { email: 'ana.garcia@cliente.dev',     nombre: 'Ana García' },
  { email: 'luis.herrera@cliente.dev',   nombre: 'Luis Herrera' },
  { email: 'maria.lopez@cliente.dev',    nombre: 'María López' },
  { email: 'jose.castro@cliente.dev',    nombre: 'José Castro' },
  { email: 'isabel.vargas@cliente.dev',  nombre: 'Isabel Vargas' },
  { email: 'miguel.mendez@cliente.dev',  nombre: 'Miguel Méndez' },
  { email: 'natalia.ruiz@cliente.dev',   nombre: 'Natalia Ruiz' },
  { email: 'andres.gomez@cliente.dev',   nombre: 'Andrés Gómez' },
  { email: 'paula.jimenez@cliente.dev',  nombre: 'Paula Jiménez' },
  { email: 'esteban.diaz@cliente.dev',   nombre: 'Esteban Díaz' },
  { email: 'carmen.santos@cliente.dev',  nombre: 'Carmen Santos' },
  { email: 'felipe.rojas@cliente.dev',   nombre: 'Felipe Rojas' },
];

// vales: [clienteIndex, tiendaIndex, descripcion, monto, vencimientoDias]
// vencimientoDias: -10 = ya en mora, 1 = mañana, 7 = semana, 30 = mes, null = sin fecha
const VALES_SPEC = [
  [0,  0, 'Mercado semanal — arroz, aceite, sal',              45000,   30],
  [0,  0, 'Jabón, papel higiénico, cloro',                     18500,    7],
  [1,  0, 'Pollo y papa para el almuerzo',                     32000,    1],
  [1,  1, 'Gaseosa y snacks fiesta cumpleaños',                67000,   30],
  [2,  1, 'Leche, queso, mantequilla — quincenal',             28000,    7],
  [2,  0, 'Materiales de aseo — balde, escoba, trapero',       55000,  -10], // mora
  [3,  2, 'Carne molida y verduras semana',                    41000,    1],
  [3,  1, 'Detergente, suavizante, jabón barra',               22000,   30],
  [4,  0, 'Pañales talla 2 — bulto mensual',                  128000,   30],
  [4,  2, 'Frutas y verduras mercado',                         19500,    7],
  [5,  1, 'Grano, aceite y harina de maíz',                    37000,  -10], // mora
  [5,  2, 'Agua, gaseosa, jugos 12 unidades',                  24000,    1],
  [6,  0, 'Elementos de cocina — olla arrocera',              195000, null], // sin fecha
  [6,  2, 'Mercado familiar completo',                         88000,   30],
  [7,  1, 'Pan, mantequilla y café quincenal',                 16000,    7],
  [7,  0, 'Tapabocas y gel antibacterial caja',                31500,  -10], // mora
  [8,  2, 'Cereal, granola y avena',                           27000,   30],
  [9,  1, 'Fideos, salsa y condimentos',                       13000,    1],
  [10, 0, 'Bebidas hidratantes — 24 unidades',                 72000,    7],
  [11, 2, 'Merienda escolar 2 semanas',                        48000,   30],
  // Un cliente con 2 vales en la misma tienda (para probar pago integral)
  [3,  2, 'Lácteos quincena primera',                          15000,    7],
  [8,  2, 'Snacks y galletas mes',                             21000, null],
];

// ── Helpers limpieza ───────────────────────────────────────────
// Borra solo lo que este seed crea: los usuarios de su lista exacta de correos (no todo el
// dominio @valecito.dev / @cliente.dev, que también usan las pruebas manuales) y las tiendas
// de su lista de nombres, con lo que cuelga de ellos: vales de esos clientes o de esas tiendas,
// sus abonos, las asignaciones de equipo y las sesiones de esos usuarios.
// Va en una transacción: si una llave foránea lo impide (por ejemplo, un usuario del seed
// registró algo fuera de las tiendas del seed), no se borra nada.
async function cleanSql() {
  console.log('🗑  Limpiando datos de prueba...');
  const emails  = [SEED_BOT_EMAIL, ...TENDEROS.flat().map(u => u.email), ...CLIENTES.map(u => u.email)];
  const nombres = TIENDAS.map(t => t.nombre);
  const inEmails  = emails.map((_, i) => `@e${i}`).join(',');
  const inNombres = nombres.map((_, i) => `@n${i}`).join(',');
  const U = `(SELECT id FROM dbo.users WHERE email IN (${inEmails}))`;
  const T = `(SELECT id FROM dbo.tiendas WHERE nombre IN (${inNombres}))`;

  const tx = new sql.Transaction(await getPool());
  await tx.begin();
  const run = async (tabla, where) => {
    const r = new sql.Request(tx);
    emails.forEach((e, i) => r.input(`e${i}`, sql.NVarChar(320), e));
    nombres.forEach((n, i) => r.input(`n${i}`, sql.NVarChar(200), n));
    const result = await r.query(`DELETE FROM dbo.${tabla} WHERE ${where}`);
    console.log(`   ${tabla.padEnd(16)} ${result.rowsAffected[0]} filas`);
  };
  try {
    // Orden por llaves foráneas: abonos → vales → equipo → tiendas → sesiones → usuarios.
    await run('abonos',          `valeId IN (SELECT id FROM dbo.vales WHERE clienteId IN ${U} OR tiendaId IN ${T})`);
    await run('vales',           `clienteId IN ${U} OR tiendaId IN ${T}`);
    await run('tienda_usuarios', `userId IN ${U} OR tiendaId IN ${T}`);
    await run('tiendas',         `nombre IN (${inNombres})`);
    await run('tokens_granted',  `userId IN ${U}`);
    await run('tokens_revoked',  `userId IN ${U}`);
    await run('users',           `email IN (${inEmails})`);
    await tx.commit();
  } catch (error) {
    await tx.rollback().catch(() => {});
    throw new Error(`la limpieza se deshizo completa, no se borró nada — ${error.message}`);
  }
  console.log('   Limpieza completa.\n');
}

// ── Main ─────────────────────────────────────────────────────
async function seed() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Seed — Mi Valecito  (datos de prueba) ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`Base de datos: SQL Server${CLEAN ? '  [--clean]' : ''}\n`);

  if (CLEAN) {
    await cleanSql();
  }

  // ── 1. Superuser de referencia ───────────────────────────────
  //  Buscamos el primer superuser existente para usarlo como createdBy
  let seedBot;
  const todos = await User.getAll();
  seedBot = todos.find(u => u.role === 'superuser');
  if (!seedBot) {
    console.log('🔑 No hay superuser. Creando seed-bot...');
    seedBot = await User.create('seed-bot@valecito.dev', PWD, 'Seed Bot', 'superuser');
  }
  const createdBy = seedBot.id;
  console.log(`✔  Usando createdBy: ${seedBot.email}\n`);

  // ── 2. Tiendas ──────────────────────────────────────────────
  console.log('🏪 Creando tiendas...');
  const tiendas = [];
  for (const spec of TIENDAS) {
    const t = await Tienda.create(spec, createdBy);
    tiendas.push(t);
    console.log(`   + ${t.nombre}  (${t.id})`);
  }
  console.log();

  // ── 3. Tenderos / vendedores ─────────────────────────────────
  console.log('👥 Creando tenderos y asignando a tiendas...');
  for (let ti = 0; ti < tiendas.length; ti++) {
    const tienda = tiendas[ti];
    for (const spec of TENDEROS[ti]) {
      const u = await User.create(spec.email, PWD, spec.nombre, spec.rol);
      await Tienda.addUsuario(tienda.id, u.id, spec.propietario, createdBy);
      console.log(`   ${spec.propietario ? '★' : '·'} ${u.name} (${spec.rol}) → ${tienda.nombre}`);
    }
  }
  console.log();

  // ── 4. Clientes ──────────────────────────────────────────────
  console.log('🧑 Creando clientes...');
  const clientes = [];
  for (const spec of CLIENTES) {
    const u = await User.create(spec.email, PWD, spec.nombre, 'cliente');
    clientes.push(u);
    console.log(`   + ${u.name}  <${u.email}>`);
  }
  console.log();

  // ── 5. Vales ─────────────────────────────────────────────────
  console.log('🧾 Creando vales...');
  let totalVales = 0;
  for (const [ci, ti, desc, monto, vencDias] of VALES_SPEC) {
    const cliente = clientes[ci];
    const tienda  = tiendas[ti];
    const fechaVencimiento = vencDias !== null ? dias(vencDias) : null;
    await Vale.create({
      tiendaId: tienda.id,
      clienteId: cliente.id,
      descripcion: desc,
      montoTotal: monto,
      fechaVencimiento,
    }, createdBy);
    const venc = vencDias === null ? 'sin fecha'
      : vencDias < 0  ? `⚠ mora (${Math.abs(vencDias)}d pasados)`
      : vencDias === 1 ? 'mañana'
      : vencDias === 7 ? '1 semana'
                       : '1 mes';
    console.log(`   $${monto.toLocaleString('es-CO').padStart(8)} | ${tienda.nombre.split(' ')[1]} | ${cliente.name.split(' ')[0].padEnd(9)} | ${venc}`);
    totalVales++;
  }
  console.log();

  // ── Resumen ──────────────────────────────────────────────────
  console.log('╔════════════════════════════════════════╗');
  console.log('║  ✔  Seed completado                    ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Tiendas  : ${String(tiendas.length).padEnd(28)}║`);
  console.log(`║  Tenderos : ${String(TENDEROS.flat().length).padEnd(28)}║`);
  console.log(`║  Clientes : ${String(clientes.length).padEnd(28)}║`);
  console.log(`║  Vales    : ${String(totalVales).padEnd(28)}║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Contraseña de todos: Seed123!         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nClientes con múltiples vales activos (para probar pago integral):');
  console.log('  José Castro   → 2 vales en Minimarket San José');
  console.log('  Paula Jiménez → 2 vales en Minimarket San José');
  console.log('\nVales ya en mora (para probar alertas):');
  console.log('  María López  — Tienda La Esquina   → $55.000');
  console.log('  Miguel Méndez — Mercado El Progreso → $37.000');
  console.log('  Andrés Gómez  — Tienda La Esquina  → $31.500');

  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error en seed:', err.message || err);
  process.exit(1);
});
