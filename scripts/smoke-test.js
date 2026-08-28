const base = process.env.API_BASE_URL || 'http://localhost:5000/api';
const token = process.env.SMOKE_TOKEN || process.env.TOKEN || '';
const checks = [
  ['/health','GET'],
  ['/system/deep','GET'],
  ['/gis/flood-zones','GET'],
  ['/gis/drains','GET'],
];
let failed=0;
for (const [path,method] of checks) {
  try {
    const r=await fetch(base+path,{method,headers:token?{Authorization:`Bearer ${token}`}:{}});
    console.log(`${method} ${path} -> ${r.status}`);
    if (!r.ok) failed++;
  } catch(e) { console.error(`${method} ${path} -> ERROR ${e.message}`); failed++; }
}
if (failed) { process.exitCode = 1; } else { console.log('Smoke test passed.'); }
