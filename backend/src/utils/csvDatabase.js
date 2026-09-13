const fs = require('fs');
const path = require('path');

class CSVDatabase {
  constructor(filename = 'users.csv') {
    this.filepath = path.join(process.cwd(), filename);
    this.ensureFile();
  }

  ensureFile() {
    if (!fs.existsSync(this.filepath)) {
      const header = 'id,email,password,name,role,photo,isActive,createdAt,resetToken,resetTokenExpiry\n';
      fs.writeFileSync(this.filepath, header);
    } else {
      this.migrateToRoleColumn();
      this.migratePhotoAndActiveFields();
    }
  }

  migrateToRoleColumn() {
    const content = fs.readFileSync(this.filepath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length === 0) return;

    const headers = lines[0].split(',');
    if (headers.includes('role')) return;

    const newHeader = 'id,email,password,name,role,photo,isActive,createdAt,resetToken,resetTokenExpiry\n';
    const newLines = [newHeader];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      const newLine = `${obj.id},${obj.email},${obj.password},${obj.name},cliente,/datos/default/default-avatar.svg,true,${obj.createdAt},${obj.resetToken || ''},${obj.resetTokenExpiry || ''}\n`;
      newLines.push(newLine);
    }

    fs.writeFileSync(this.filepath, newLines.join(''));
  }

  migratePhotoAndActiveFields() {
    const content = fs.readFileSync(this.filepath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length === 0) return;

    const headers = lines[0].split(',');
    const hasPhoto = headers.includes('photo');
    const hasIsActive = headers.includes('isActive');

    if (hasPhoto && hasIsActive) return;

    const newHeaders = [...headers];
    if (!hasPhoto) newHeaders.splice(5, 0, 'photo');
    if (!hasIsActive) {
      const photoIdx = newHeaders.indexOf('photo');
      newHeaders.splice(photoIdx + 1, 0, 'isActive');
    }

    const newLines = [newHeaders.join(',')];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });

      const photo = obj.photo || '/datos/default/default-avatar.svg';
      const isActive = obj.isActive || 'true';

      const newValues = newHeaders.map(header => {
        if (header === 'photo') return photo;
        if (header === 'isActive') return isActive;
        return obj[header] || '';
      });

      newLines.push(newValues.join(','));
    }

    fs.writeFileSync(this.filepath, newLines.join('\n') + (newLines.length > 1 ? '\n' : ''));
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
    const newUser = {
      ...user,
      role: user.role || 'cliente',
      photo: user.photo || '/datos/default/default-avatar.svg',
      isActive: user.isActive !== undefined ? user.isActive : true
    };
    const line = `${newUser.id},${newUser.email},${newUser.password},${newUser.name},${newUser.role},${newUser.photo},${newUser.isActive},${newUser.createdAt},${newUser.resetToken || ''},${newUser.resetTokenExpiry || ''}\n`;
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
    const header = 'id,email,password,name,role,photo,isActive,createdAt,resetToken,resetTokenExpiry\n';
    const lines = users.map(u =>
      `${u.id},${u.email},${u.password},${u.name},${u.role || 'cliente'},${u.photo || '/datos/default/default-avatar.svg'},${u.isActive !== undefined ? u.isActive : 'true'},${u.createdAt},${u.resetToken || ''},${u.resetTokenExpiry || ''}`
    );
    fs.writeFileSync(this.filepath, header + lines.join('\n') + (lines.length > 0 ? '\n' : ''));
  }
}

module.exports = CSVDatabase;
