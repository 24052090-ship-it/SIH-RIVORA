const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'data', 'imports');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv'));
let ok = true;
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8').trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) { console.error(`${file}: no data rows`); ok = false; continue; }
  const headers = lines[0].split(',');
  if (headers.some(h => !h.trim())) { console.error(`${file}: invalid header`); ok = false; }
  console.log(`${file}: schema OK (${headers.length} columns)`);
}
process.exit(ok ? 0 : 1);
