const fs = require('fs');
const path = require('path');

class CsvTable {
  constructor(filename, fields) {
    this.filepath = path.join(process.cwd(), filename.endsWith('.csv') ? filename : filename + '.csv');
    this.fields = fields;
    this.header = fields.join(',');
    if (!fs.existsSync(this.filepath))
      fs.writeFileSync(this.filepath, this.header + '\n');
  }

  parseLine(line) {
    const result = [];
    let inQuotes = false, current = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += ch;
    }
    result.push(current);
    return result;
  }

  escape(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return (str.includes(',') || str.includes('"') || str.includes('\n'))
      ? '"' + str.replace(/"/g, '""') + '"'
      : str;
  }

  readAll() {
    if (!fs.existsSync(this.filepath)) return [];
    const lines = fs.readFileSync(this.filepath, 'utf-8').trim().split('\n');
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = this.parseLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ''; });
      return obj;
    });
  }

  findById(id) { return this.readAll().find(r => r.id === id) || null; }

  filter(predicate) { return this.readAll().filter(predicate); }

  create(obj) {
    const line = this.fields.map(f => this.escape(obj[f])).join(',');
    fs.appendFileSync(this.filepath, line + '\n');
    return obj;
  }

  update(id, updates) {
    const rows = this.readAll();
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...updates };
    this._writeAll(rows);
    return rows[idx];
  }

  remove(predicate) {
    this._writeAll(this.readAll().filter(r => !predicate(r)));
  }

  _writeAll(rows) {
    const lines = rows.map(r => this.fields.map(f => this.escape(r[f])).join(','));
    fs.writeFileSync(this.filepath, this.header + '\n' + lines.join('\n') + (lines.length ? '\n' : ''));
  }
}

module.exports = CsvTable;
