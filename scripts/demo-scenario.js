import fs from 'node:fs';

const base=(process.env.API_BASE_URL||'http://localhost:5000/api').replace(/\/$/,'');
const password=process.env.DEMO_PASSWORD||'password';
const email=process.env.DEMO_AUTHORITY_EMAIL||'authority@aquaguard.ai';

const results=[];

async function request(method,path,{token=null,body=undefined}={}){
  const headers={};
  if(token)headers.Authorization=`Bearer ${token}`;
  if(body!==undefined)headers['Content-Type']='application/json';

  const response=await fetch(base+path,{
    method,
    headers,
    body:body===undefined?undefined:JSON.stringify(body)
  });

  let data=null;
  try{data=await response.json()}catch{}

  return {status:response.status,ok:response.ok,data};
}

function add(name,pass,detail=null){
  results.push({name,pass:Boolean(pass),detail});
}

const health=await request('GET','/health');
add('API health',health.status===200,{status:health.status});

const login=await request('POST','/auth/login',{
  body:{email,password,role:'authority'}
});

const token=login.data?.token||null;
add('authority demo login',login.status===200&&Boolean(token),{
  status:login.status
});

if(token){
  const deep=await request('GET','/system/deep');
  add(
    'deep health',
    deep.status===200&&Boolean(deep.data?.database),
    deep.data
  );

  const zones=await request('GET','/gis/flood-zones',{token});
  add(
    'GIS flood zones',
    zones.status===200&&Array.isArray(zones.data?.features),
    {
      status:zones.status,
      features:zones.data?.features?.length??null
    }
  );

  const risk=await request('GET','/ai/current-risk',{token});
  add(
    'governed flood inference',
    risk.status===200&&Boolean(risk.data?.inference?.model_version),
    {
      status:risk.status,
      modelVersion:risk.data?.inference?.model_version??null,
      modelStatus:risk.data?.inference?.model_status??null,
      mode:risk.data?.inference?.mode??null
    }
  );

  const fusion=await request('POST','/ai/multimodal-risk',{
    token,
    body:{zone:'Zone 4'}
  });

  add(
    'multimodal demo risk',
    fusion.status===200&&fusion.data?.production_eligible===false,
    {
      status:fusion.status,
      riskLevel:fusion.data?.risk_level??null,
      riskScore:fusion.data?.risk_score??null,
      missingSignals:fusion.data?.missing_signals??null,
      productionEligible:fusion.data?.production_eligible??null
    }
  );
}

const required=[
  'docs/ARCHITECTURE.md',
  'docs/phase30/EVIDENCE_MATRIX.md',
  'docs/phase30/FINAL_RELEASE_CHECKLIST.md',
  'docs/phase30/DEMO_SCRIPT.md',
  'docs/phase30/JUDGE_QA.md',
  'docs/phase30/RELEASE_NOTES.md',
  'demo/demo-scenario.json'
];

const missing=required.filter(file=>!fs.existsSync(file));
add('final demo evidence files',missing.length===0,{missing});

const failed=results.filter(result=>!result.pass);

console.log(JSON.stringify({
  phase:30,
  name:'AquaGuard SIH demo readiness',
  environment:'local controlled demo',
  results,
  disclaimer:
    'This readiness check does not prove production deployment, model accuracy or real-world impact.',
  summary:{
    total:results.length,
    passed:results.length-failed.length,
    failed:failed.length,
    ready:failed.length===0
  }
},null,2));

if(failed.length)process.exitCode=1;
