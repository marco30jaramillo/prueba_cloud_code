const fs = require('fs');
const path = require('path');

class CSVDatabase {
  constructor(filename = 'users.csv') {
    this.filepath = path.join(process.cwd(), filename);
    this.ensureFile();
  }

  ensureFile() {
    if (!fs.existsSync(this.filepath)) {
      const header = 'id,email,password,name,createdAt,resetToken,resetTokenExpiry\n';
      fs.writeFileSync(this.filepath, header);
    }
  }

  readAll() {
    const content = fs.readFileSync(this.filepath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    });
  }

  findByEmail(email) {
    return this.readAll().find(user => user.email === email);
  }

  findById(id) {
    return this.readAll().find(user => user.id === id);
  }

  create(user) {
    const users = this.readAll();
    const newUser = { ...user };
    const line = `${newUser.id},${newUser.email},${newUser.password},${newUser.name},${newUser.createdAt},${newUser.resetToken || ''},${newUser.resetTokenExpiry || ''}\n`;
    fs.appendFileSync(this.filepath, line);
    return newUser;
  }

  update(id, updates) {
    const users = this.readAll();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;

    users[index] = { ...users[index], ...updates };
    this.writeAll(users);
    return users[index];
  }

  writeAll(users) {
    const header = 'id,email,password,name,createdAt,resetToken,resetTokenExpiry\n';
    const lines = users.map(u =>
      `${u.id},${u.email},${u.password},${u.name},${u.createdAt},${u.resetToken || ''},${u.resetTokenExpiry || ''}`
    );
    fs.writeFileSync(this.filepath, header + lines.join('\n') + (lines.length > 0 ? '\n' : ''));
  }
}

module.exports = CSVDatabase;
