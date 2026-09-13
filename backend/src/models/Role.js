const fs = require('fs');
const path = require('path');
const { sql, usingSql, request } = require('../database/sqlPool');
const ROLES_PATH = path.join(__dirname, '../../roles.csv');

const parseAccess = (value = '') => String(value).split('|').filter(Boolean).map((entry) => { const [id, level = 'read'] = entry.split(':'); return { id, level }; });
const serializeAccess = (access = []) => access.map(({ id, level }) => `${id}:${level}`).join('|');
const csvRows = () => {
  if (!fs.existsSync(ROLES_PATH)) return [];
  return fs.readFileSync(ROLES_PATH, 'utf8').trim().split('\n').slice(1).filter(Boolean).map((line) => {
    const match = line.match(/^(\d+),"([^"]+)","([^"]+)","([^"]*)","([^"]*)","([^"]*)"/);
    return match && { id: match[1], name: match[2], description: match[3], permissions: match[4], canManage: match[5], modules: match[6] };
  }).filter(Boolean);
};

class Role {
  constructor(row) {
    this.id = String(row.id); this.name = row.name; this.description = row.description;
    this.permissions = String(row.permissions || '').split('|').filter(Boolean);
    this.canManage = String(row.canManage || '').split('|').filter(Boolean);
    this.moduleAccess = parseAccess(row.modules);
    this.modules = this.moduleAccess.map((item) => item.id);
  }
  static initializeRoles() { /* Los catálogos deben cargarse por migración; CSV permanece solo para rollback. */ }
  static async getAll() {
    if (!usingSql()) return csvRows().map((row) => new Role(row));
    const result = await (await request()).query('SELECT id,name,description,permissions,canManage,modules FROM dbo.roles ORDER BY id');
    return result.recordset.map((row) => new Role(row));
  }
  static async getByName(name) { return (await Role.getAll()).find((role) => role.name === name); }
  static async getById(id) { return (await Role.getAll()).find((role) => role.id === String(id)); }
  static async getModuleAccess(roleName) { const role = await Role.getByName(roleName); return role ? role.moduleAccess : []; }
  static async getModuleIds(roleName) { return (await Role.getModuleAccess(roleName)).map((item) => item.id); }
  static async getManageableRoles(roleName) { const role = await Role.getByName(roleName); return role ? role.canManage : []; }
  static async canCreateRole(creatorRole, targetRole) { return (await Role.getManageableRoles(creatorRole)).includes(targetRole); }
  static async getEffectivePermissions(roleName) {
    const role = await Role.getByName(roleName);
    if (!role) return [];
    if (role.permissions.includes('system:full-access')) return ['system:full-access'];
    const Module = require('./Module');
    return [...new Set([...role.permissions, ...(await Module.getPermissionsForAccess(role.moduleAccess))])];
  }
  static async hasPermission(roleName, permissionName) {
    const role = await Role.getByName(roleName);
    return Boolean(role && (role.permissions.includes('system:full-access') || (await Role.getEffectivePermissions(roleName)).includes(permissionName)));
  }
  static async createRole({ name, description, moduleAccess = [], permissions = [], canManage = [] }) {
    const all = await Role.getAll(); const id = all.reduce((max, role) => Math.max(max, Number(role.id)), 0) + 1;
    const row = { id, name, description, permissions: permissions.join('|'), canManage: canManage.join('|'), modules: serializeAccess(moduleAccess) };
    if (usingSql()) {
      await (await request()).input('id', sql.Int, id).input('name', sql.NVarChar(100), row.name).input('description', sql.NVarChar(500), row.description)
        .input('permissions', sql.NVarChar(sql.MAX), row.permissions).input('canManage', sql.NVarChar(sql.MAX), row.canManage).input('modules', sql.NVarChar(sql.MAX), row.modules)
        .query('INSERT INTO dbo.roles (id,name,description,permissions,canManage,modules) VALUES (@id,@name,@description,@permissions,@canManage,@modules)');
    } else fs.appendFileSync(ROLES_PATH, `${id},"${name}","${description}","${row.permissions}","${row.canManage}","${row.modules}"\n`);
    return new Role(row);
  }
  static async updateRole(roleId, { moduleAccess, permissions }) {
    const role = await Role.getById(roleId); if (!role) return null;
    const values = { permissions: permissions === undefined ? role.permissions.join('|') : permissions.join('|'), modules: moduleAccess === undefined ? serializeAccess(role.moduleAccess) : serializeAccess(moduleAccess) };
    if (usingSql()) {
      await (await request()).input('id', sql.Int, Number(roleId)).input('permissions', sql.NVarChar(sql.MAX), values.permissions).input('modules', sql.NVarChar(sql.MAX), values.modules)
        .query('UPDATE dbo.roles SET permissions=@permissions, modules=@modules WHERE id=@id');
    } else {
      const lines = fs.readFileSync(ROLES_PATH, 'utf8').trim().split('\n');
      const updated = lines.map((line, index) => index && line.startsWith(`${roleId},`) ? `${roleId},"${role.name}","${role.description}","${values.permissions}","${role.canManage.join('|')}","${values.modules}"` : line);
      fs.writeFileSync(ROLES_PATH, `${updated.join('\n')}\n`);
    }
    return Role.getById(roleId);
  }
}
module.exports = Role;
