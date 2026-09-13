const fs = require('fs');
const path = require('path');

class Role {
  constructor(id, name, description, permissions = []) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.permissions = permissions;
  }

  static initializeRoles() {
    const rolesPath = path.join(__dirname, '../../roles.csv');

    if (!fs.existsSync(rolesPath)) {
      const roles = [
        {
          id: 1,
          name: 'superuser',
          description: 'Super Usuario - Acceso integral a todas las funciones',
          permissions: 'system:full-access'
        },
        {
          id: 2,
          name: 'administrador',
          description: 'Administrador - Gestión de usuarios y sistemas',
          permissions: 'admin:manage-users|admin:manage-roles|admin:view-stats|admin:view-audit|profile:view-all|profile:view-clients|profile:view-vendors|auth:view-users|auth:create-user|auth:update-user|auth:delete-user'
        },
        {
          id: 3,
          name: 'vendedor',
          description: 'Vendedor - Permisos limitados para venta',
          permissions: 'auth:login|auth:logout|auth:validate|profile:view-own|profile:edit-own|profile:view-clients'
        },
        {
          id: 4,
          name: 'cliente',
          description: 'Cliente - Permisos básicos',
          permissions: 'auth:login|auth:logout|auth:validate|auth:forgot-password|auth:reset-password|profile:view-own|profile:edit-own'
        }
      ];

      const header = 'id,name,description,permissions\n';
      let content = header;

      roles.forEach(role => {
        content += `${role.id},"${role.name}","${role.description}","${role.permissions}"\n`;
      });

      fs.writeFileSync(rolesPath, content);
    }
  }

  static getAll() {
    const rolesPath = path.join(__dirname, '../../roles.csv');
    if (!fs.existsSync(rolesPath)) {
      this.initializeRoles();
    }

    const content = fs.readFileSync(rolesPath, 'utf8');
    const lines = content.trim().split('\n');
    const roles = [];

    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(/(\d+),"([^"]+)","([^"]+)","([^"]*)"/);
      if (match) {
        const [, id, name, description, permissionsStr] = match;
        const permissions = permissionsStr.split('|').filter(p => p.trim());
        roles.push(new Role(id, name, description, permissions));
      }
    }

    return roles;
  }

  static getByName(name) {
    return Role.getAll().find(r => r.name === name);
  }

  static getById(id) {
    return Role.getAll().find(r => r.id === String(id));
  }

  static hasPermission(roleName, permissionName) {
    const role = Role.getByName(roleName);
    if (!role) return false;
    if (role.permissions.includes('system:full-access')) return true;
    return role.permissions.includes(permissionName);
  }

  static canCreateRole(creatorRole, targetRole) {
    if (creatorRole === 'superuser') return true;
    if (creatorRole === 'administrador' && targetRole === 'vendedor') return true;
    if (creatorRole === 'administrador' && targetRole === 'cliente') return true;
    return false;
  }
}

module.exports = Role;
