const crypto = require('crypto');
const { sql, usingSql, request } = require('../database/sqlPool');
const CsvTable = require('../utils/csvTable');

const T_FIELDS = ['id','nombre','descripcion','direccion','ciudad','telefono','logo','isActive','createdAt','createdBy'];
const TU_FIELDS = ['id','tiendaId','userId','esPropietario','assignedAt','assignedBy'];

const tdb  = () => new CsvTable('tiendas.csv', T_FIELDS);
const tudb = () => new CsvTable('tienda_usuarios.csv', TU_FIELDS);

function fromSql(row) {
  if (!row) return null;
  return { ...row, id: String(row.id), isActive: Boolean(row.isActive),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt };
}

class Tienda {
  // ── TIENDAS CRUD ────────────────────────────────────────────────────────────

  static async create(data, createdBy) {
    const tienda = {
      id: crypto.randomUUID(), nombre: data.nombre.trim(),
      descripcion: data.descripcion || '', direccion: data.direccion || '',
      ciudad: data.ciudad || 'Cartagena', telefono: data.telefono || '',
      logo: data.logo || '', isActive: true,
      createdAt: new Date().toISOString(), createdBy
    };
    if (!usingSql()) return tdb().create(tienda);
    const r = await request();
    await r.input('id', sql.UniqueIdentifier, tienda.id)
      .input('nombre', sql.NVarChar(200), tienda.nombre)
      .input('descripcion', sql.NVarChar(500), tienda.descripcion || null)
      .input('direccion', sql.NVarChar(300), tienda.direccion || null)
      .input('ciudad', sql.NVarChar(100), tienda.ciudad)
      .input('telefono', sql.NVarChar(20), tienda.telefono || null)
      .input('logo', sql.NVarChar(2048), tienda.logo || null)
      .input('createdBy', sql.UniqueIdentifier, createdBy)
      .query(`INSERT INTO dbo.tiendas (id,nombre,descripcion,direccion,ciudad,telefono,logo,createdBy)
              VALUES (@id,@nombre,@descripcion,@direccion,@ciudad,@telefono,@logo,@createdBy)`);
    return tienda;
  }

  static async findById(id) {
    if (!usingSql()) return tdb().findById(id);
    const r = await (await request()).input('id', sql.UniqueIdentifier, id)
      .query('SELECT TOP 1 * FROM dbo.tiendas WHERE id = @id');
    return fromSql(r.recordset[0]);
  }

  static async getAll() {
    if (!usingSql()) return tdb().readAll();
    const r = await (await request()).query('SELECT * FROM dbo.tiendas ORDER BY nombre');
    return r.recordset.map(fromSql);
  }

  // Devuelve tiendas con resumen de equipo para la vista de lista admin.
  static async getAllWithSummary() {
    if (!usingSql()) {
      const tiendas = tdb().readAll();
      const usuarios = tudb().readAll();
      return tiendas.map(t => {
        const equipo = usuarios.filter(u => u.tiendaId === t.id);
        const propietario = equipo.find(u => u.esPropietario === true || u.esPropietario === 'true');
        return {
          ...t,
          totalAsignados:   equipo.length,
          totalPropietarios: equipo.filter(u => u.esPropietario === true || u.esPropietario === 'true').length,
          propietarioNombre: propietario?.userName || propietario?.name || null,
          propietarioEmail:  propietario?.userEmail || propietario?.email || null,
        };
      }).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    const r = await (await request()).query(`
      SELECT
        t.id, t.nombre, t.descripcion, t.ciudad, t.telefono, t.isActive, t.createdAt,
        COUNT(tu.id)                                                AS totalAsignados,
        SUM(CASE WHEN tu.esPropietario = 1 THEN 1 ELSE 0 END)     AS totalPropietarios,
        MAX(CASE WHEN tu.esPropietario = 1 THEN u.name  END)       AS propietarioNombre,
        MAX(CASE WHEN tu.esPropietario = 1 THEN u.email END)       AS propietarioEmail
      FROM dbo.tiendas t
      LEFT JOIN dbo.tienda_usuarios tu ON tu.tiendaId = t.id
      LEFT JOIN dbo.users u ON u.id = tu.userId
      GROUP BY t.id, t.nombre, t.descripcion, t.ciudad, t.telefono, t.isActive, t.createdAt
      ORDER BY t.nombre`);
    return r.recordset.map(row => ({
      ...fromSql(row),
      totalAsignados:    Number(row.totalAsignados),
      totalPropietarios: Number(row.totalPropietarios),
      propietarioNombre: row.propietarioNombre || null,
      propietarioEmail:  row.propietarioEmail  || null,
    }));
  }

  static async update(id, data) {
    const allowed = ['nombre','descripcion','direccion','ciudad','telefono','logo'];
    const patch = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    if (!usingSql()) return tdb().update(id, patch);
    const fields = Object.entries(patch);
    if (!fields.length) return Tienda.findById(id);
    const r = await request();
    r.input('id', sql.UniqueIdentifier, id);
    const sets = fields.map(([k, v], i) => { r.input(`v${i}`, sql.NVarChar(500), v); return `[${k}]=@v${i}`; });
    await r.query(`UPDATE dbo.tiendas SET ${sets.join(',')} WHERE id=@id`);
    return Tienda.findById(id);
  }

  static async toggleActive(id) {
    if (!usingSql()) {
      const t = tdb().findById(id);
      if (!t) return null;
      const isActive = t.isActive === 'true' || t.isActive === true ? false : true;
      return tdb().update(id, { isActive });
    }
    const r = await (await request()).input('id', sql.UniqueIdentifier, id)
      .query('UPDATE dbo.tiendas SET isActive=~isActive OUTPUT inserted.* WHERE id=@id');
    return fromSql(r.recordset[0]);
  }

  // ── TIENDA_USUARIOS ─────────────────────────────────────────────────────────

  static async addUsuario(tiendaId, userId, esPropietario, assignedBy) {
    const entry = { id: crypto.randomUUID(), tiendaId, userId,
      esPropietario: esPropietario ? true : false,
      assignedAt: new Date().toISOString(), assignedBy };
    if (!usingSql()) return tudb().create(entry);
    const r = await request();
    await r.input('id', sql.UniqueIdentifier, entry.id)
      .input('tiendaId', sql.UniqueIdentifier, tiendaId)
      .input('userId', sql.UniqueIdentifier, userId)
      .input('esPropietario', sql.Bit, esPropietario ? 1 : 0)
      .input('assignedBy', sql.UniqueIdentifier, assignedBy)
      .query(`INSERT INTO dbo.tienda_usuarios (id,tiendaId,userId,esPropietario,assignedBy)
              VALUES (@id,@tiendaId,@userId,@esPropietario,@assignedBy)`);
    return entry;
  }

  static async removeUsuario(tiendaId, userId) {
    if (!usingSql()) {
      tudb().remove(r => r.tiendaId === tiendaId && r.userId === userId);
      return true;
    }
    await (await request()).input('tiendaId', sql.UniqueIdentifier, tiendaId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query('DELETE FROM dbo.tienda_usuarios WHERE tiendaId=@tiendaId AND userId=@userId');
    return true;
  }

  static async getUsuariosByTienda(tiendaId) {
    if (!usingSql()) return tudb().filter(r => r.tiendaId === tiendaId);
    const r = await (await request()).input('tiendaId', sql.UniqueIdentifier, tiendaId)
      .query(`SELECT tu.*, u.name, u.email, u.role, u.photo
              FROM dbo.tienda_usuarios tu JOIN dbo.users u ON u.id=tu.userId
              WHERE tu.tiendaId=@tiendaId ORDER BY tu.esPropietario DESC, u.name`);
    return r.recordset;
  }

  static async getTiendasByUsuario(userId) {
    if (!usingSql()) {
      const links = tudb().filter(r => r.userId === userId);
      return links.map(l => {
        const t = tdb().findById(l.tiendaId);
        return t ? { ...t, esPropietario: l.esPropietario } : null;
      }).filter(Boolean);
    }
    const r = await (await request()).input('userId', sql.UniqueIdentifier, userId)
      .query(`SELECT t.*, tu.esPropietario FROM dbo.tiendas t
              JOIN dbo.tienda_usuarios tu ON tu.tiendaId=t.id
              WHERE tu.userId=@userId AND t.isActive=1 ORDER BY t.nombre`);
    return r.recordset.map(fromSql);
  }

  static async hasAcceso(tiendaId, userId) {
    if (!usingSql()) return !!tudb().filter(r => r.tiendaId === tiendaId && r.userId === userId).length;
    const r = await (await request()).input('tiendaId', sql.UniqueIdentifier, tiendaId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query('SELECT TOP 1 id FROM dbo.tienda_usuarios WHERE tiendaId=@tiendaId AND userId=@userId');
    return r.recordset.length > 0;
  }
}

module.exports = Tienda;
