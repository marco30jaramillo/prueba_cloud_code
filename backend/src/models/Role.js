const fs = require('fs');
const path = require('path');

const ROLES_PATH = path.join(__dirname, '../../roles.csv');

// Parse "moduleId:level|moduleId:level|..." → [{id, level}]
function parseModuleAccess(str) {
  return str.split('|').filter(Boolean).map(entry => {
    const [id, level = 'read'] = entry.split(':');
    return { id, level };
  });
}

// Serialize [{id, level}] → "id:level|id:level|..."
function serializeModuleAccess(access) {
  return access.map(({ id, level }) => `${id}:${level}`).join('|');
}

class Role {
  constructor(id, name, description, permissions = [], canManage = [], moduleAccess = []) {
    this.id           = id;
    this.name         = name;
    this.description  = description;
    this.permissions  = permissions;
    this.canManage    = canManage;
    this.moduleAccess = moduleAccess; // [{id, level}]
    // Legacy: flat list of IDs (used by older callers)
    this.modules      = moduleAccess.map(a => a.id);
  }

  static initializeRoles() {
    if (fs.existsSync(ROLES_PATH)) {
      this._migrate();
      return;
    }

    const rows = [
      { id: 1, name: 'superuser',     description: 'Super Usuario - Acceso integral a todas las funciones',  permissions: 'system:full-access',  canManage: 'superuser|administrador|vendedor|cliente', modules: '1:full|2:full|3:full|4:full' },
      { id: 2, name: 'administrador', description: 'Administrador - Gestión de usuarios y sistemas',          permissions: 'admin:manage-users|admin:manage-roles|admin:view-stats|admin:view-audit|profile:view-all|profile:view-clients|profile:view-vendors|auth:view-users|auth:create-user|auth:update-user|auth:delete-user', canManage: 'vendedor|cliente', modules: '1:full|2:write' },
      { id: 3, name: 'vendedor',      description: 'Vendedor - Permisos limitados para venta',                permissions: 'auth:login|auth:logout|auth:validate|profile:view-own|profile:edit-own|profile:view-clients', canManage: '', modules: '1:write' },
      { id: 4, name: 'cliente',       description: 'Cliente - Permisos básicos',                              permissions: 'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|profile:view-own|profile:edit-own', canManage: '', modules: '1:read' },
    ];

    const header = 'id,name,description,permissions,canManage,modules\n';
    const content = rows.map(r =>
      `${r.id},"${r.name}","${r.description}","${r.permissions}","${r.canManage}","${r.modules}"`
    ).join('\n') + '\n';

    fs.writeFileSync(ROLES_PATH, header + content);
  }

  static _migrate() {
    const content = fs.readFileSync(ROLES_PATH, 'utf8');
    const lines   = content.trim().split('\n');
    const header  = lines[0];
    let changed   = false;

    const needsCanManage = !header.includes('canManage');
    const needsModules   = !header.includes('modules');
    if (!needsCanManage && !needsModules) return;

    const canManageDefaults = { superuser: 'superuser|administrador|vendedor|cliente', administrador: 'vendedor|cliente', vendedor: '', cliente: '' };
    const modulesDefaults   = { superuser: '1:full|2:full|3:full|4:full', administrador: '1:full|2:write', vendedor: '1:write', cliente: '1:read' };

    let newHeader = header;
    if (needsCanManage) newHeader += ',canManage';
    if (needsModules)   newHeader += ',modules';

    const newLines = [newHeader];
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      const nameMatch = line.match(/^\d+,"([^"]+)"/);
      const name = nameMatch ? nameMatch[1] : '';
      if (needsCanManage) line += `,"${canManageDefaults[name] || ''}"`;
      if (needsModules)   line += `,"${modulesDefaults[name]   || ''}"`;
      newLines.push(line);
      changed = true;
    }

    if (changed) fs.writeFileSync(ROLES_PATH, newLines.join('\n') + '\n');
  }

  static getAll() {
    if (!fs.existsSync(ROLES_PATH)) this.initializeRoles();
    this._migrate();

    const content = fs.readFileSync(ROLES_PATH, 'utf8');
    const lines   = content.trim().split('\n');
    const roles   = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const m = line.match(/^(\d+),"([^"]+)","([^"]+)","([^"]*)","([^"]*)","([^"]*)"/);
      if (m) {
        const [, id, name, description, permStr, manageStr, modulesStr] = m;
        roles.push(new Role(
          id, name, description,
          permStr.split('|').filter(Boolean),
          manageStr.split('|').filter(Boolean),
          parseModuleAccess(modulesStr),
        ));
      }
    }
    return roles;
  }

  static getByName(name) { return Role.getAll().find(r => r.name === name); }
  static getById(id)     { return Role.getAll().find(r => r.id === String(id)); }

  // Returns [{id, level}] for modules this role can access
  static getModuleAccess(roleName) {
    const role = Role.getByName(roleName);
    return role ? role.moduleAccess : [];
  }

  // Legacy: flat list of module IDs
  static getModuleIds(roleName) {
    return Role.getModuleAccess(roleName).map(a => a.id);
  }

  static getManageableRoles(roleName) {
    const role = Role.getByName(roleName);
    return role ? role.canManage : [];
  }

  static canCreateRole(creatorRole, targetRole) {
    return Role.getManageableRoles(creatorRole).includes(targetRole);
  }

  static getEffectivePermissions(roleName) {
    const role = Role.getByName(roleName);
    if (!role) return [];
    if (role.permissions.includes('system:full-access')) return ['system:full-access'];

    const Module  = require('./Module');
    const inherited = Module.getPermissionsForAccess(role.moduleAccess);
    const all = new Set([...role.permissions, ...inherited]);
    return [...all];
  }

  static hasPermission(roleName, permissionName) {
    const role = Role.getByName(roleName);
    if (!role) return false;
    if (role.permissions.includes('system:full-access')) return true;
    return Role.getEffectivePermissions(roleName).includes(permissionName);
  }

  // Create a new role and append it to roles.csv
  static createRole({ name, description, moduleAccess = [], permissions = [], canManage = [] }) {
    const all = Role.getAll();
    const maxId = all.reduce((m, r) => Math.max(m, parseInt(r.id) || 0), 0);
    const newId = maxId + 1;

    const permStr    = permissions.join('|');
    const manageStr  = canManage.join('|');
    const modulesStr = serializeModuleAccess(moduleAccess);

    const line = `${newId},"${name}","${description}","${permStr}","${manageStr}","${modulesStr}"`;
    fs.appendFileSync(ROLES_PATH, line + '\n');
  }

  // Persist a role's module access and direct permissions to CSV
  static updateRole(roleId, { moduleAccess, permissions }) {
    const content = fs.readFileSync(ROLES_PATH, 'utf8');
    const lines   = content.trim().split('\n');
    const newLines = [lines[0]];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const m = line.match(/^(\d+),"([^"]+)","([^"]+)","([^"]*)","([^"]*)","([^"]*)"/);
      if (m && m[1] === String(roleId)) {
        const [, id, name, description, , manageStr] = m;
        const newPerms   = permissions  !== undefined ? permissions.join('|')               : m[4];
        const newModules = moduleAccess !== undefined ? serializeModuleAccess(moduleAccess) : m[6];
        newLines.push(`${id},"${name}","${description}","${newPerms}","${manageStr}","${newModules}"`);
      } else {
        newLines.push(line);
      }
    }

    fs.writeFileSync(ROLES_PATH, newLines.join('\n') + '\n');
  }
}

module.exports = Role;
