const { request } = require('../database/sqlPool');

class Module {
  constructor({ id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull }) {
    this.id          = String(id);
    this.name        = name;
    this.description = description;
    this.buttonLabel = buttonLabel;
    this.href        = href;
    this.icon        = icon;
    this.showInNav   = showInNav === 'true' || showInNav === true;
    this.permRead    = permRead  || [];
    this.permWrite   = permWrite || [];
    this.permFull    = permFull  || [];
  }

  getPermissionsForLevel(level) {
    switch (level) {
      case 'full':  return [...new Set([...this.permRead, ...this.permWrite, ...this.permFull])];
      case 'write': return [...new Set([...this.permRead, ...this.permWrite])];
      case 'read':  return [...this.permRead];
      default:      return [];
    }
  }

  static async getAll() {
    const result = await (await request()).query('SELECT * FROM dbo.modules ORDER BY id');
    return result.recordset.map(row => new Module({
      id:          String(row.id),
      name:        row.name,
      description: row.description,
      buttonLabel: row.buttonLabel,
      href:        row.href,
      icon:        row.icon,
      showInNav:   Boolean(row.showInNav),
      permRead:    (row.permRead  || '').split('|').filter(Boolean),
      permWrite:   (row.permWrite || '').split('|').filter(Boolean),
      permFull:    (row.permFull  || '').split('|').filter(Boolean),
    }));
  }

  static async getForRole(roleName) {
    const Role = require('./Role');
    const access = await Role.getModuleAccess(roleName);
    const all    = await Module.getAll();
    return access.map(({ id }) => all.find(m => m.id === String(id))).filter(Boolean);
  }

  /**
   * Nivel ('read' | 'write' | 'full') con que el rol tiene el módulo de esa ruta, o null si no lo
   * tiene. El acceso total del sistema (superusuario) cuenta como 'full'.
   */
  static async getLevelForRole(roleName, href) {
    const Role = require('./Role');
    const role = await Role.getByName(roleName);
    if (!role) return null;
    if (role.permissions.includes('system:full-access')) return 'full';
    const mod = (await Module.getAll()).find(m => m.href === href);
    if (!mod) return null;
    const acceso = role.moduleAccess.find(a => String(a.id) === mod.id);
    return acceso ? acceso.level : null;
  }

  static async getPermissionsForAccess(moduleAccess) {
    const all = await Module.getAll();
    const perms = new Set();
    moduleAccess.forEach(({ id, level }) => {
      const mod = all.find(m => m.id === String(id));
      if (mod) mod.getPermissionsForLevel(level).forEach(p => perms.add(p));
    });
    return [...perms];
  }

  static async getRequiredPermissionsForIds(moduleIds) {
    const all = await Module.getAll();
    const perms = new Set();
    moduleIds.forEach(id => {
      const mod = all.find(m => m.id === String(id));
      if (mod) mod.getPermissionsForLevel('read').forEach(p => perms.add(p));
    });
    return [...perms];
  }

  static async getById(id) {
    return (await Module.getAll()).find(m => m.id === String(id));
  }

  toJSON() {
    return {
      id:          this.id,
      name:        this.name,
      description: this.description,
      buttonLabel: this.buttonLabel,
      href:        this.href,
      icon:        this.icon,
      showInNav:   this.showInNav,
      permRead:    this.permRead,
      permWrite:   this.permWrite,
      permFull:    this.permFull,
    };
  }
}

module.exports = Module;
