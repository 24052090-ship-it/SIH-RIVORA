const base=process.env.API_BASE_URL||'http://localhost:5000/api';
const token=process.env.SMOKE_TOKEN||process.env.TOKEN||'';

async function run(){
  const r=await fetch(`${base}/incidents/overview`,{
    headers: token ? {Authorization:`Bearer ${token}`} : {}
  });
  if(!r.ok) throw new Error(`Incident API returned ${r.status}`);
  const d=await r.json();
  console.log(`Incident test passed: ${d.incidents?.length||0} incidents, ${d.summary?.critical||0} critical.`);
}

run().catch(e=>{
  console.error(e.message);
  process.exitCode=1;
});
