const fs = require('fs');
const path = require('path');

const MODULES_PATH = path.join(__dirname, '../../modules.csv');

function parseField(raw) {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/""/g, '"');
  return t;
}

function parseLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(parseField(current));
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(parseField(current));
  return fields;
}

class Module {
  constructor({ id, name, description, buttonLabel, href, icon, showInNav, permRead, permWrite, permFull }) {
    this.id          = id;
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

  // All permissions at a given level (cumulative: full ⊇ write ⊇ read)
  getPermissionsForLevel(level) {
    switch (level) {
      case 'full':  return [...new Set([...this.permRead, ...this.permWrite, ...this.permFull])];
      case 'write': return [...new Set([...this.permRead, ...this.permWrite])];
      case 'read':  return [...this.permRead];
      default:      return [];
    }
  }

  static getAll() {
    if (!fs.existsSync(MODULES_PATH)) return [];
    const lines = fs.readFileSync(MODULES_PATH, 'utf8').trim().split('\n');
    const headers = parseLine(lines[0]);
    const modules = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseLine(line);
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

      modules.push(new Module({
        id:          row.id,
        name:        row.name,
        description: row.description,
        buttonLabel: row.buttonLabel,
        href:        row.href,
        icon:        row.icon,
        showInNav:   row.showInNav,
        permRead:    (row.permRead  || '').split('|').filter(Boolean),
        permWrite:   (row.permWrite || '').split('|').filter(Boolean),
        permFull:    (row.permFull  || '').split('|').filter(Boolean),
      }));
    }
    return modules;
  }

  // Returns modules for a role (ordered as defined in roles.csv)
  static getForRole(roleName) {
    const Role = require('./Role'); // lazy to avoid circular dep
    const access = Role.getModuleAccess(roleName); // [{id, level}]
    const all    = Module.getAll();
    return access.map(({ id }) => all.find(m => m.id === id)).filter(Boolean);
  }

  // Returns the union of permissions for a set of {id, level} entries
  static getPermissionsForAccess(moduleAccess) {
    const all = Module.getAll();
    const perms = new Set();
    moduleAccess.forEach(({ id, level }) => {
      const mod = all.find(m => m.id === String(id));
      if (mod) mod.getPermissionsForLevel(level).forEach(p => perms.add(p));
    });
    return [...perms];
  }

  // Legacy compatibility — returns read-tier permissions for each id (used by old callers)
  static getRequiredPermissionsForIds(moduleIds) {
    const all = Module.getAll();
    const perms = new Set();
    moduleIds.forEach(id => {
      const mod = all.find(m => m.id === String(id));
      if (mod) mod.getPermissionsForLevel('read').forEach(p => perms.add(p));
    });
    return [...perms];
  }

  static getById(id) {
    return Module.getAll().find(m => m.id === String(id));
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
