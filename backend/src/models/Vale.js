const crypto = require('crypto');
const { sql, usingSql, request } = require('../database/sqlPool');
const CsvTable = require('../utils/csvTable');

const CSV_FIELDS = ['id','tiendaId','clienteId','registradoPor','descripcion','montoTotal',
  'saldoPendiente','estado','fechaVale','fechaVencimiento','notas','anuladoPor','anuladoAt','createdAt','updatedAt'];

const db = () => new CsvTable('vales.csv', CSV_FIELDS);

function fromSql(row) {
  if (!row) return null;
  return { ...row,
    id: String(row.id), tiendaId: String(row.tiendaId),
    clienteId: String(row.clienteId), registradoPor: String(row.registradoPor),
    montoTotal: parseFloat(row.montoTotal), saldoPendiente: parseFloat(row.saldoPendiente),
    fechaVale: row.fechaVale instanceof Date ? row.fechaVale.toISOString() : row.fechaVale,
    fechaVencimiento: row.fechaVencimiento instanceof Date ? row.fechaVencimiento.toISOString() : (row.fechaVencimiento || null),
    anuladoAt: row.anuladoAt instanceof Date ? row.anuladoAt.toISOString() : (row.anuladoAt || null),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

class Vale {
  static async create(data, registradoPor) {
    const now = new Date().toISOString();
    const vale = {
      id: crypto.randomUUID(), tiendaId: data.tiendaId, clienteId: data.clienteId,
      registradoPor, descripcion: data.descripcion.trim(),
      montoTotal: parseFloat(data.montoTotal), saldoPendiente: parseFloat(data.montoTotal),
      estado: 'pendiente', fechaVale: now,
      fechaVencimiento: data.fechaVencimiento || '', notas: data.notas || '',
      anuladoPor: '', anuladoAt: '', createdAt: now, updatedAt: now
    };
    if (!usingSql()) return db().create(vale);
    const r = await request();
    await r.input('id', sql.UniqueIdentifier, vale.id)
      .input('tiendaId', sql.UniqueIdentifier, vale.tiendaId)
      .input('clienteId', sql.UniqueIdentifier, vale.clienteId)
      .input('registradoPor', sql.UniqueIdentifier, vale.registradoPor)
      .input('descripcion', sql.NVarChar(500), vale.descripcion)
      .input('montoTotal', sql.Decimal(12, 2), vale.montoTotal)
      .input('saldoPendiente', sql.Decimal(12, 2), vale.saldoPendiente)
      .input('fechaVencimiento', sql.DateTime2, vale.fechaVencimiento ? new Date(vale.fechaVencimiento) : null)
      .input('notas', sql.NVarChar(1000), vale.notas || null)
      .query(`INSERT INTO dbo.vales
              (id,tiendaId,clienteId,registradoPor,descripcion,montoTotal,saldoPendiente,fechaVencimiento,notas)
              VALUES (@id,@tiendaId,@clienteId,@registradoPor,@descripcion,@montoTotal,@saldoPendiente,@fechaVencimiento,@notas)`);
    return vale;
  }

  static async findById(id) {
    if (!usingSql()) return db().findById(id);
    const r = await (await request()).input('id', sql.UniqueIdentifier, id)
      .query('SELECT TOP 1 * FROM dbo.vales WHERE id=@id');
    return fromSql(r.recordset[0]);
  }

  static async getByTienda(tiendaId, { estado } = {}) {
    if (!usingSql()) {
      let rows = db().filter(r => r.tiendaId === tiendaId);
      if (estado) rows = rows.filter(r => r.estado === estado);
      return rows.sort((a, b) => new Date(b.fechaVale) - new Date(a.fechaVale));
    }
    const r = await request();
    r.input('tiendaId', sql.UniqueIdentifier, tiendaId);
    const whereEstado = estado ? ' AND v.estado=@estado' : '';
    if (estado) r.input('estado', sql.NVarChar(20), estado);
    const result = await r.query(`
      SELECT v.*, u.name AS clienteNombre, u.email AS clienteEmail
      FROM dbo.vales v JOIN dbo.users u ON u.id=v.clienteId
      WHERE v.tiendaId=@tiendaId${whereEstado} ORDER BY v.fechaVale DESC`);
    return result.recordset.map(fromSql);
  }

  static async getByCliente(clienteId) {
    if (!usingSql()) {
      return db().filter(r => r.clienteId === clienteId)
        .sort((a, b) => new Date(b.fechaVale) - new Date(a.fechaVale));
    }
    const r = await (await request()).input('clienteId', sql.UniqueIdentifier, clienteId)
      .query(`SELECT v.*, t.nombre AS tiendaNombre FROM dbo.vales v
              JOIN dbo.tiendas t ON t.id=v.tiendaId
              WHERE v.clienteId=@clienteId ORDER BY v.fechaVale DESC`);
    return r.recordset.map(fromSql);
  }

  // Recalcula saldoPendiente y estado a partir de los abonos activos.
  // Llamar después de cada create/anular de Abono.
  static async recalcularSaldo(valeId) {
    const Abono = require('./Abono');
    const vale = await Vale.findById(valeId);
    if (!vale) return null;
    const abonos = await Abono.getByVale(valeId);
    const suma = abonos
      .filter(a => a.anulado !== true && a.anulado !== 'true')
      .reduce((s, a) => s + parseFloat(a.monto), 0);
    const montoTotal = parseFloat(vale.montoTotal);
    const saldoPendiente = Math.max(0, montoTotal - suma);
    const estado = vale.estado === 'anulado' ? 'anulado'
      : saldoPendiente === 0 ? 'pagado'
      : saldoPendiente < montoTotal ? 'parcial'
      : 'pendiente';
    const now = new Date().toISOString();
    if (!usingSql()) return db().update(valeId, { saldoPendiente, estado, updatedAt: now });
    const r = await (await request()).input('id', sql.UniqueIdentifier, valeId)
      .input('saldo', sql.Decimal(12, 2), saldoPendiente)
      .input('estado', sql.NVarChar(20), estado)
      .input('now', sql.DateTime2, new Date())
      .query(`UPDATE dbo.vales SET saldoPendiente=@saldo, estado=@estado, updatedAt=@now
              OUTPUT inserted.* WHERE id=@id`);
    return fromSql(r.recordset[0]);
  }

  static async anular(id, anuladoPor) {
    const now = new Date().toISOString();
    if (!usingSql()) return db().update(id, { estado: 'anulado', anuladoPor, anuladoAt: now, updatedAt: now });
    const r = await (await request()).input('id', sql.UniqueIdentifier, id)
      .input('anuladoPor', sql.UniqueIdentifier, anuladoPor)
      .input('now', sql.DateTime2, new Date())
      .query(`UPDATE dbo.vales SET estado='anulado', anuladoPor=@anuladoPor, anuladoAt=@now, updatedAt=@now
              OUTPUT inserted.* WHERE id=@id`);
    return fromSql(r.recordset[0]);
  }
}

module.exports = Vale;
