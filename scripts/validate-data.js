const base=process.env.AQUAGUARD_API_URL||'http://localhost:5000/api';
const checks=['/validation/summary','/validation/data-quality'];
for(const path of checks){try{const r=await fetch(base+path);if(!r.ok) throw new Error(`${r.status}`);const j=await r.json();console.log(`PASS ${path}`,JSON.stringify(j).slice(0,240));}catch(e){console.error(`FAIL ${path}: ${e.message}`);process.exitCode=1;}}
