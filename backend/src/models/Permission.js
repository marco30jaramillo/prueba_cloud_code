const { request } = require('../database/sqlPool');

class Permission {
  constructor(id, name, description, category) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
  }

  static async getAll() {
    const result = await (await request()).query('SELECT * FROM dbo.permissions ORDER BY id');
    return result.recordset.map(r => ({ id: String(r.id), name: r.name, description: r.description, category: r.category }));
  }

  static async getByName(name) {
    return (await Permission.getAll()).find(p => p.name === name);
  }

  static async getCategoryPermissions(category) {
    return (await Permission.getAll()).filter(p => p.category === category);
  }
}

module.exports = Permission;
