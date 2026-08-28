import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = await fs.readFile(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
await pool.query(schema);
console.log('AquaGuard database schema initialized.');
await pool.end();
