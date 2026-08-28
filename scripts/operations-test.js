const base=process.env.AQUAGUARD_API_URL||'http://localhost:5000/api';
const token=process.env.AQUAGUARD_TOKEN;
if(!token){console.error('Set AQUAGUARD_TOKEN to an authority JWT.');process.exit(1)}
const r=await fetch(`${base}/system/operations/overview`,{headers:{Authorization:`Bearer ${token}`}});
const body=await r.json();
if(!r.ok) throw new Error(body.error||`HTTP ${r.status}`);
console.log(JSON.stringify({ok:true,status:body.status,database:body.database,metrics:body.metrics},null,2));
