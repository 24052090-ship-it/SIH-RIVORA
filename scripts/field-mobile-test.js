const base=process.env.AQUAGUARD_API||'http://localhost:5000/api'; const token=process.env.AQUAGUARD_TOKEN;
if(!token){console.error('Set AQUAGUARD_TOKEN to an authority JWT.');process.exit(1)}
const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`};
const r=await fetch(`${base}/field-operations/overview`,{headers}); if(!r.ok){console.error('Overview failed:',r.status);process.exit(1)}
const data=await r.json(); const task=data.tasks?.[0]; if(!task){console.log('PASS: no active task available; endpoint is healthy.');process.exit(0)}
const u=await fetch(`${base}/field-operations/tasks/${task.id}/field-update`,{method:'PATCH',headers,body:JSON.stringify({status:task.status==='QUEUED'?'EN_ROUTE':'ON_SITE',lat:12.935,lng:77.624,accuracy:8})});
if(!u.ok){console.error('Field update failed:',u.status,await u.text());process.exit(1)} console.log('PASS: field mobile update endpoint accepted a location-aware task update.');
