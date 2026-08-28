const base=process.env.AQUAGUARD_API||'http://localhost:5000/api'; const token=process.env.AQUAGUARD_TOKEN;
if(!token){console.error('Set AQUAGUARD_TOKEN to an authority JWT');process.exit(1)}
const r=await fetch(`${base}/data-integration/overview`,{headers:{Authorization:`Bearer ${token}`}}); console.log(`GET /data-integration/overview -> ${r.status}`); if(!r.ok)process.exit(1); console.log('Data integration API is reachable.');
