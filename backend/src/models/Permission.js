const CSVDatabase = require('../utils/csvDatabase');
const fs = require('fs');
const path = require('path');

class Permission {
  constructor(id, name, description, category) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
  }

  static initializePermissions() {
    const permissionsPath = path.join(__dirname, '../../permissions.csv');

    if (!fs.existsSync(permissionsPath)) {
      const permissions = [
        // Auth permissions
        'auth:register',
        'auth:login',
        'auth:logout',
        'auth:validate',
        'auth:forgot-password',
        'auth:reset-password',
        'auth:bootstrap-superuser',
        'auth:create-user',
        'auth:update-user',
        'auth:delete-user',
        'auth:view-users',

        // Profile permissions
        'profile:view-own',
        'profile:edit-own',
        'profile:view-all',
        'profile:view-clients',
        'profile:view-vendors',

        // Admin permissions
        'admin:manage-users',
        'admin:manage-roles',
        'admin:view-stats',
        'admin:view-audit',

        // System permissions
        'system:full-access'
      ];

      const header = 'id,name,description,category\n';
      let content = header;

      permissions.forEach((perm, idx) => {
        const [category, action] = perm.split(':');
        content += `${idx + 1},${perm},"${action.replace('-', ' ')}",${category}\n`;
      });

      fs.writeFileSync(permissionsPath, content);
    }
  }

  static getAll() {
    const permissionsPath = path.join(__dirname, '../../permissions.csv');
    if (!fs.existsSync(permissionsPath)) {
      this.initializePermissions();
    }

    const content = fs.readFileSync(permissionsPath, 'utf8');
    const lines = content.trim().split('\n');
    const permissions = [];

    for (let i = 1; i < lines.length; i++) {
      const [id, name, description, category] = lines[i].split(',');
      permissions.push({ id, name, description, category });
    }

    return permissions;
  }

  static getByName(name) {
    return Permission.getAll().find(p => p.name === name);
  }

  static getCategoryPermissions(category) {
    return Permission.getAll().filter(p => p.category === category);
  }
}

module.exports = Permission;
