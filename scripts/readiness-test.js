import process from 'node:process';
const base=process.env.API_BASE_URL||'http://localhost:5000/api';
const endpoints=['/health','/system/deep','/system/readiness','/gis/flood-zones'];
let failed=0;
for(const path of endpoints){try{const r=await fetch(base+path);const text=await r.text();console.log(`${r.ok?'PASS':'WARN'} ${path} ${r.status} ${text.slice(0,120)}`);if(!r.ok&&path!=='/system/readiness')failed++;}catch(e){console.error(`FAIL ${path}: ${e.message}`);failed++;}}
process.exitCode=failed?1:0;
