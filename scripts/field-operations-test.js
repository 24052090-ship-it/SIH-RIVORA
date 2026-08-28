const base=process.env.AQUAGUARD_API_URL||'http://localhost:5000/api';
const token=process.env.AQUAGUARD_TOKEN;
if(!token){console.error('Set AQUAGUARD_TOKEN to an authority JWT.');process.exit(1)}
const res=await fetch(`${base}/field-operations/overview`,{headers:{Authorization:`Bearer ${token}`}});
if(!res.ok){console.error(`Field operations test failed: ${res.status}`);console.error(await res.text());process.exit(1)}
const data=await res.json();
console.log('Field operations OK',JSON.stringify({crews:data.crews?.length||0,tasks:data.tasks?.length||0,summary:data.summary},null,2));
