const fs = require('fs');
const path = require('path');
const { sql, usingSql, request } = require('../database/sqlPool');

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

function readAllFromCsv() {
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
    if (!usingSql()) return readAllFromCsv();
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
