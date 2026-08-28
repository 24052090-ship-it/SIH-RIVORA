#!/usr/bin/env node
// AquaGuard Master — final health check.
//
// This performs STATIC checks (files, config, syntax) that don't require any
// running service, plus OPTIONAL live checks against backend/AI-service
// endpoints if they happen to be reachable. It never reports a live service
// as healthy without actually having contacted it.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
let failed = 0;
let warned = 0;

function ok(label) { console.log(`  OK   ${label}`); }
function fail(label, detail) { console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); failed++; }
function warn(label, detail) { console.log(`  WARN ${label}${detail ? ' — ' + detail : ''}`); warned++; }

console.log('=== Required files & directories ===');
const requiredPaths = [
  'package.json', '.env.example', '.gitignore',
  'src', 'backend/package.json', 'backend/src/server.js',
  'backend/database/schema.sql', 'backend/database/migrations',
  'backend/.env.example',
  'ai-service/requirements.txt', 'ai-service/app/main.py',
  'ai-service/.env.example',
  'docs/ARCHITECTURE.md', 'docs/API_CONTRACTS.md',
  'MERGE_REPORT.md', 'README.md', 'docs/SETUP_GUIDE.md', 'START-AQUAGUARD.md',
];
for (const p of requiredPaths) {
  fs.existsSync(path.join(root, p)) ? ok(p) : fail(p, 'missing');
}

console.log('\n=== package.json sanity ===');
for (const p of ['package.json', 'backend/package.json']) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
    pkg.name && pkg.version ? ok(`${p} (${pkg.name}@${pkg.version})`) : fail(p, 'missing name/version');
  } catch (e) { fail(p, e.message); }
}

console.log('\n=== Backend JS syntax check ===');
try {
  const files = execSync(`find "${path.join(root, 'backend/src')}" -name "*.js"`).toString().trim().split('\n').filter(Boolean);
  let bad = 0;
  for (const f of files) {
    try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); } catch { bad++; console.log(`  FAIL syntax: ${f}`); }
  }
  bad === 0 ? ok(`${files.length} backend files parse cleanly`) : failed++;
} catch (e) { warn('backend syntax check skipped', e.message); }

console.log('\n=== Environment configuration ===');
for (const p of ['.env.example', 'backend/.env.example', 'ai-service/.env.example']) {
  const full = path.join(root, p);
  if (!fs.existsSync(full)) { fail(p, 'missing'); continue; }
  const content = fs.readFileSync(full, 'utf8');
  content.includes('=') ? ok(p) : warn(p, 'looks empty');
}
if (fs.existsSync(path.join(root, '.env')) || fs.existsSync(path.join(root, 'backend/.env'))) {
  warn('local .env files present', 'make sure these are never committed (.gitignore already excludes them)');
}

console.log('\n=== Optional live checks (only if services are already running) ===');
const liveTargets = [
  ['Backend API', process.env.API_BASE_URL || 'http://localhost:5000/api/health'],
  ['AI service', process.env.AI_SERVICE_URL_HEALTH || 'http://localhost:8000/health'],
];
for (const [label, url] of liveTargets) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    res.ok ? ok(`${label} reachable at ${url}`) : warn(`${label} responded with ${res.status}`, url);
  } catch {
    warn(`${label} not reachable`, `${url} (expected if not started — this is not a failure of the codebase)`);
  }
}

console.log(`\n=== Summary: ${failed} failed, ${warned} warnings ===`);
if (failed > 0) process.exit(1);
