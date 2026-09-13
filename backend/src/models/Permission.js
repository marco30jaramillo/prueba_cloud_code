const fs = require('fs');
const path = require('path');
const { sql, usingSql, request } = require('../database/sqlPool');

const PERMISSIONS_PATH = path.join(__dirname, '../../permissions.csv');

const DEFAULT_PERMISSIONS = [
  { name: 'auth:register',           description: 'Registrarse',                    category: 'auth'    },
  { name: 'auth:login',              description: 'Iniciar sesión',                 category: 'auth'    },
  { name: 'auth:logout',             description: 'Cerrar sesión',                  category: 'auth'    },
  { name: 'auth:validate',           description: 'Validar sesión',                 category: 'auth'    },
  { name: 'auth:forgot-password',    description: 'Recuperar contraseña',           category: 'auth'    },
  { name: 'auth:reset-password',     description: 'Restablecer contraseña',         category: 'auth'    },
  { name: 'auth:bootstrap-superuser',description: 'Crear superusuario',             category: 'auth'    },
  { name: 'auth:create-user',        description: 'Crear usuario',                  category: 'auth'    },
  { name: 'auth:update-user',        description: 'Actualizar usuario',             category: 'auth'    },
  { name: 'auth:delete-user',        description: 'Eliminar usuario',               category: 'auth'    },
  { name: 'auth:view-users',         description: 'Ver usuarios',                   category: 'auth'    },
  { name: 'profile:view-own',        description: 'Ver propio perfil',              category: 'profile' },
  { name: 'profile:edit-own',        description: 'Editar propio perfil',           category: 'profile' },
  { name: 'profile:view-all',        description: 'Ver todos los perfiles',         category: 'profile' },
  { name: 'profile:view-clients',    description: 'Ver perfiles de clientes',       category: 'profile' },
  { name: 'profile:view-vendors',    description: 'Ver perfiles de vendedores',     category: 'profile' },
  { name: 'admin:manage-users',      description: 'Administrar usuarios',           category: 'admin'   },
  { name: 'admin:manage-roles',      description: 'Administrar roles',              category: 'admin'   },
  { name: 'admin:view-stats',        description: 'Ver estadísticas',               category: 'admin'   },
  { name: 'admin:view-audit',        description: 'Ver auditoría',                  category: 'admin'   },
  { name: 'admin:view-roles',        description: 'Ver roles y permisos',           category: 'admin'   },
  { name: 'system:full-access',      description: 'Acceso total al sistema',        category: 'system'  },
];

function readAllFromCsv() {
  if (!fs.existsSync(PERMISSIONS_PATH)) {
    Permission.initializePermissions();
  }
  const lines = fs.readFileSync(PERMISSIONS_PATH, 'utf8').trim().split('\n');
  return lines.slice(1).map(line => {
    const [id, name, description, category] = line.split(',');
    return { id, name, description, category };
  }).filter(l => l.name);
}

class Permission {
  constructor(id, name, description, category) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
  }

  static initializePermissions() {
    if (usingSql()) return;
    if (fs.existsSync(PERMISSIONS_PATH)) return;
    const header = 'id,name,description,category\n';
    const rows = DEFAULT_PERMISSIONS.map((p, i) => `${i + 1},${p.name},"${p.description}",${p.category}`);
    fs.writeFileSync(PERMISSIONS_PATH, header + rows.join('\n') + '\n');
  }

  static async getAll() {
    if (!usingSql()) return readAllFromCsv();
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
