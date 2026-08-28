const base=process.env.AQUAGUARD_API_URL||'http://localhost:5000/api';
const token=process.env.AQUAGUARD_TOKEN;
if(!token){console.error('Set AQUAGUARD_TOKEN to an authority JWT before running this test.');process.exit(1)}
async function req(path,opts={}){const r=await fetch(`${base}${path}`,{...opts,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${path} ${r.status} ${JSON.stringify(body)}`);return body}
const overview=await req('/emergency/overview'); console.log(`Emergency overview: ${overview.zones.length} zones, ${overview.shelters.length} shelters, ${overview.broadcasts.length} broadcasts`);
const b=await req('/emergency/broadcasts',{method:'POST',body:JSON.stringify({severity:'INFO',title:'AquaGuard test broadcast',message:'Development test only.',channel:['IN_APP']})});
await req(`/emergency/broadcasts/${b.id}/send`,{method:'POST'}); console.log('Broadcast create/send: PASS');
