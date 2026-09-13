const crypto = require('crypto');
const { sql, usingSql, request } = require('../database/sqlPool');
const CsvTable = require('../utils/csvTable');

const CSV_FIELDS = ['id','valeId','monto','registradoPor','notas','anulado','anuladoPor','anuladoAt','fechaAbono','createdAt'];
const db = () => new CsvTable('abonos.csv', CSV_FIELDS);

function fromSql(row) {
  if (!row) return null;
  return { ...row, id: String(row.id), valeId: String(row.valeId),
    monto: parseFloat(row.monto), anulado: Boolean(row.anulado),
    fechaAbono: row.fechaAbono instanceof Date ? row.fechaAbono.toISOString() : row.fechaAbono,
    anuladoAt: row.anuladoAt instanceof Date ? row.anuladoAt.toISOString() : (row.anuladoAt || null),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

class Abono {
  // Registra el abono y recalcula el saldo del vale. Devuelve { abono, vale }.
  static async create(data, registradoPor) {
    const now = new Date().toISOString();
    const abono = {
      id: crypto.randomUUID(), valeId: data.valeId,
      monto: parseFloat(data.monto), registradoPor,
      notas: data.notas || '', anulado: false,
      anuladoPor: '', anuladoAt: '', fechaAbono: now, createdAt: now
    };
    if (!usingSql()) {
      db().create(abono);
    } else {
      const r = await request();
      await r.input('id', sql.UniqueIdentifier, abono.id)
        .input('valeId', sql.UniqueIdentifier, abono.valeId)
        .input('monto', sql.Decimal(12, 2), abono.monto)
        .input('registradoPor', sql.UniqueIdentifier, abono.registradoPor)
        .input('notas', sql.NVarChar(500), abono.notas || null)
        .query(`INSERT INTO dbo.abonos (id,valeId,monto,registradoPor,notas)
                VALUES (@id,@valeId,@monto,@registradoPor,@notas)`);
    }
    const Vale = require('./Vale');
    const vale = await Vale.recalcularSaldo(abono.valeId);
    return { abono, vale };
  }

  static async findById(id) {
    if (!usingSql()) return db().findById(id);
    const r = await (await request()).input('id', sql.UniqueIdentifier, id)
      .query('SELECT TOP 1 * FROM dbo.abonos WHERE id=@id');
    return fromSql(r.recordset[0]);
  }

  static async getByVale(valeId) {
    if (!usingSql()) return db().filter(r => r.valeId === valeId);
    const r = await (await request()).input('valeId', sql.UniqueIdentifier, valeId)
      .query(`SELECT a.*, u.name AS registradoPorNombre FROM dbo.abonos a
              JOIN dbo.users u ON u.id=a.registradoPor
              WHERE a.valeId=@valeId ORDER BY a.fechaAbono DESC`);
    return r.recordset.map(fromSql);
  }

  // Anula el abono y recalcula el saldo del vale. Devuelve { abono, vale }.
  static async anular(id, anuladoPor) {
    const now = new Date().toISOString();
    let abono;
    if (!usingSql()) {
      abono = db().update(id, { anulado: true, anuladoPor, anuladoAt: now });
    } else {
      const r = await (await request()).input('id', sql.UniqueIdentifier, id)
        .input('anuladoPor', sql.UniqueIdentifier, anuladoPor)
        .input('now', sql.DateTime2, new Date())
        .query(`UPDATE dbo.abonos SET anulado=1, anuladoPor=@anuladoPor, anuladoAt=@now
                OUTPUT inserted.* WHERE id=@id AND anulado=0`);
      abono = fromSql(r.recordset[0]);
    }
    if (!abono) return null;
    const Vale = require('./Vale');
    const vale = await Vale.recalcularSaldo(abono.valeId);
    return { abono, vale };
  }
}

module.exports = Abono;
