const fs = require('fs');
const path = require('path');

const USERS_HEADER = 'id,email,password,name,role,photo,isActive,mustChangePassword,createdAt,resetToken,resetTokenExpiry';
const USERS_FIELDS = ['id', 'email', 'password', 'name', 'role', 'photo', 'isActive', 'mustChangePassword', 'createdAt', 'resetToken', 'resetTokenExpiry'];

class CSVDatabase {
  constructor(filename = 'users.csv') {
    // Normalize: always use .csv extension
    this.filename = filename.endsWith('.csv') ? filename : filename + '.csv';
    this.filepath = path.join(process.cwd(), this.filename);
    this.isUsersFile = this.filename === 'users.csv';

    if (this.isUsersFile) {
      this.ensureUsersFile();
    }
  }

  ensureUsersFile() {
    if (!fs.existsSync(this.filepath)) {
      fs.writeFileSync(this.filepath, USERS_HEADER + '\n');
    } else {
      this.migrateUsersFile();
    }
  }

  migrateUsersFile() {
    const content = fs.readFileSync(this.filepath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length === 0) return;

    const currentHeaders = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = USERS_FIELDS;
    const missingFields = expectedHeaders.filter(f => !currentHeaders.includes(f));

    if (missingFields.length === 0) return;

    const newLines = [expectedHeaders.join(',')];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');
      const obj = {};
      currentHeaders.forEach((h, idx) => { obj[h] = values[idx] || ''; });

      // Defaults for new fields
      if (!obj.photo) obj.photo = '/datos/default/default-avatar.svg';
      if (!obj.isActive) obj.isActive = 'true';
      if (!obj.mustChangePassword) obj.mustChangePassword = 'false';
      if (!obj.role) obj.role = 'cliente';

      newLines.push(expectedHeaders.map(f => obj[f] || '').join(','));
    }

    fs.writeFileSync(this.filepath, newLines.join('\n') + '\n');
  }

  // Generic CSV parser that handles quoted fields
  parseLine(line) {
    const result = [];
    let inQuotes = false;
    let current = '';

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  readAll() {
    if (!fs.existsSync(this.filepath)) return [];
    const content = fs.readFileSync(this.filepath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1)
      .filter(l => l.trim())
      .map(line => {
        const values = this.parseLine(line);
        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = values[idx] !== undefined ? values[idx] : '';
        });
        return obj;
      });
  }

  findByEmail(email) {
    return this.readAll().find(u => u.email === email);
  }

  findById(id) {
    return this.readAll().find(u => u.id === id);
  }

  // Escape a value for CSV (quote if contains comma, newline, or quote)
  escapeValue(val) {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // Generic create: reads headers from file and maps object fields accordingly
  create(obj) {
    if (this.isUsersFile) {
      return this._createUser(obj);
    }
    return this._createGeneric(obj);
  }

  _createUser(user) {
    const line = USERS_FIELDS.map(f => this.escapeValue(user[f])).join(',');
    fs.appendFileSync(this.filepath, line + '\n');
    return user;
  }

  _createGeneric(obj) {
    if (!fs.existsSync(this.filepath)) return obj;
    const content = fs.readFileSync(this.filepath, 'utf-8');
    const headers = content.split('\n')[0].split(',').map(h => h.trim());
    const line = headers.map(h => this.escapeValue(obj[h])).join(',');
    fs.appendFileSync(this.filepath, line + '\n');
    return obj;
  }

  update(id, updates) {
    const records = this.readAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    records[index] = { ...records[index], ...updates };
    this.writeAll(records);
    return records[index];
  }

  writeAll(users) {
    const lines = users.map(u =>
      USERS_FIELDS.map(f => this.escapeValue(u[f])).join(',')
    );
    fs.writeFileSync(this.filepath, USERS_HEADER + '\n' + lines.join('\n') + (lines.length > 0 ? '\n' : ''));
  }
}

module.exports = CSVDatabase;
