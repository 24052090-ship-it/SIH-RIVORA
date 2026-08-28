#!/usr/bin/env node

import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {io as connectSocket} from 'socket.io-client';

const BASE=(process.env.API_BASE_URL||'http://localhost:5000').replace(/\/$/,'');
const CITIZEN_EMAIL=process.env.PHASE28_CITIZEN_EMAIL||'demo@aquaguard.ai';
const AUTHORITY_EMAIL=process.env.PHASE28_AUTHORITY_EMAIL||'authority@aquaguard.ai';
const TEST_PASSWORD=process.env.PHASE28_TEST_PASSWORD||'password';

const checks=[];
const metrics={};

function loadEnvFile(file){
  const values={};
  if(!fs.existsSync(file))return values;

  for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#'))continue;
    const i=line.indexOf('=');
    if(i<1)continue;
    values[line.slice(0,i).trim()]=line.slice(i+1).trim();
  }

  return values;
}

const backendEnv=loadEnvFile('backend/.env');

function record(name,pass,detail=null){
  checks.push({name,pass:Boolean(pass),detail});
}

async function request(method,path,{token=null,body=undefined,headers={},form=null}={}){
  const outgoing={...headers};

  if(token)outgoing.Authorization=`Bearer ${token}`;

  let payload;
  if(form){
    payload=form;
  }else if(body!==undefined){
    outgoing['Content-Type']='application/json';
    payload=JSON.stringify(body);
  }

  const started=performance.now();

  const response=await fetch(BASE+path,{
    method,
    headers:outgoing,
    body:payload
  });

  const elapsedMs=performance.now()-started;
  const text=await response.text();

  let json=null;
  try{json=text?JSON.parse(text):null}catch{}

  return {
    status:response.status,
    ok:response.ok,
    headers:response.headers,
    json,
    text,
    elapsedMs
  };
}

async function login(email,role){
  const r=await request('POST','/api/auth/login',{
    body:{email,password:TEST_PASSWORD,role}
  });

  if(r.status!==200||!r.json?.token){
    throw new Error(`Login failed for ${role}: HTTP ${r.status}`);
  }

  return r.json.token;
}

function percentile(values,p){
  const sorted=[...values].sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const index=Math.min(
    sorted.length-1,
    Math.max(0,Math.ceil((p/100)*sorted.length)-1)
  );
  return Number(sorted[index].toFixed(2));
}

async function performanceSample(path,{token=null,total=40,concurrency=8}={}){
  const latencies=[];
  let errors=0;
  let cursor=0;

  async function worker(){
    while(true){
      const index=cursor++;
      if(index>=total)return;

      try{
        const result=await request('GET',path,{token});
        latencies.push(result.elapsedMs);
        if(!result.ok)errors++;
      }catch{
        errors++;
      }
    }
  }

  const started=performance.now();

  await Promise.all(
    Array.from({length:Math.min(concurrency,total)},()=>worker())
  );

  const elapsedSeconds=(performance.now()-started)/1000;

  return {
    requests:total,
    concurrency,
    elapsedSeconds:Number(elapsedSeconds.toFixed(3)),
    requestsPerSecond:Number((total/elapsedSeconds).toFixed(2)),
    p50Ms:percentile(latencies,50),
    p95Ms:percentile(latencies,95),
    p99Ms:percentile(latencies,99),
    errorRate:Number((errors/total).toFixed(4)),
    note:'Local non-production smoke load only; not a deployed capacity claim.'
  };
}

function waitForSocketStatus(){
  return new Promise((resolve,reject)=>{
    const started=performance.now();

    const socket=connectSocket(BASE,{
      transports:['websocket','polling'],
      reconnection:false,
      timeout:3000
    });

    const timeout=setTimeout(()=>{
      socket.disconnect();
      reject(new Error('Socket.IO connectionStatus timeout'));
    },4000);

    socket.on('connectionStatus',payload=>{
      clearTimeout(timeout);
      const latencyMs=performance.now()-started;
      socket.disconnect();
      resolve({
        payload,
        latencyMs:Number(latencyMs.toFixed(2))
      });
    });

    socket.on('connect_error',error=>{
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });
  });
}

function runProcess(command,args,env={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{
      cwd:process.cwd(),
      env:{...process.env,...env},
      windowsHide:true
    });

    let stdout='';
    let stderr='';

    child.stdout.on('data',chunk=>{stdout+=chunk.toString()});
    child.stderr.on('data',chunk=>{stderr+=chunk.toString()});
    child.on('error',reject);
    child.on('close',code=>resolve({code,stdout,stderr}));
  });
}

async function waitForHttp(url,timeoutMs=6000){
  const deadline=Date.now()+timeoutMs;

  while(Date.now()<deadline){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(500)});
      if(response)return true;
    }catch{}

    await new Promise(resolve=>setTimeout(resolve,150));
  }

  return false;
}

async function withFailureServer(port,overrides,callback){
  const child=spawn(process.execPath,['backend/src/server.js'],{
    cwd:process.cwd(),
    env:{
      ...process.env,
      ...backendEnv,
      ...overrides,
      PORT:String(port),
      WEATHER_SYNC_ENABLED:'false'
    },
    windowsHide:true
  });

  try{
    const ready=await waitForHttp(`http://localhost:${port}/api/health`);

    if(!ready){
      throw new Error(`Failure-simulation server ${port} did not start`);
    }

    return await callback(`http://localhost:${port}`);
  }finally{
    child.kill();
  }
}

async function duplicateTelemetryCheck(){
  const deviceKey=backendEnv.DEVICE_API_KEY;

  if(!deviceKey){
    return {
      skipped:true,
      reason:'DEVICE_API_KEY is not configured in backend/.env'
    };
  }

  Object.assign(
    process.env,
    Object.fromEntries(
      Object.entries(backendEnv).filter(([,value])=>value!=='')
    )
  );

  const {pool}=await import('../backend/src/db/pool.js');
  const deviceId=`P28-${Date.now()}`;
  let sensorId=null;

  try{
    const inserted=await pool.query(
      `INSERT INTO sensors
        (sensor_code,type,zone,status,health,location,metadata)
       VALUES (
         $1,
         'PHASE28_TEST_FIXTURE',
         'Phase28 Test',
         'ONLINE',
         100,
         ST_SetSRID(ST_MakePoint(77.5946,12.9716),4326)::geography,
         '{"testFixture":true}'::jsonb
       )
       RETURNING id`,
      [deviceId]
    );

    sensorId=inserted.rows[0].id;

    const timestamp=new Date().toISOString();

    const payload={
      deviceId,
      timestampUtc:timestamp,
      latitude:12.9716,
      longitude:77.5946,
      rainfallMmHr:1,
      waterLevelCm:1,
      batteryPct:99,
      signalRssi:-60,
      testFixture:true
    };

    const first=await request('POST','/api/telemetry/ingest/device',{
      headers:{'x-device-key':deviceKey},
      body:payload
    });

    const second=await request('POST','/api/telemetry/ingest/device',{
      headers:{'x-device-key':deviceKey},
      body:payload
    });

    return {
      skipped:false,
      firstStatus:first.status,
      duplicateStatus:second.status,
      pass:first.status===202&&second.status===409
    };
  }finally{
    if(sensorId){
      await pool.query('DELETE FROM telemetry_events WHERE sensor_id=$1',[sensorId]);
      await pool.query('DELETE FROM sensors WHERE id=$1',[sensorId]);
    }
    await pool.end();
  }
}

async function rateLimitCheck(){
  let first429At=null;

  for(let index=1;index<=65;index++){
    const response=await request('POST','/api/telemetry/ingest/device',{
      body:{}
    });

    if(response.status===429){
      first429At=index;
      break;
    }
  }

  return {
    first429At,
    pass:first429At!==null,
    note:'Observed route-level throttling; prior requests in the same one-minute window can make 429 occur earlier.'
  };
}

async function phase26Chain(authorityToken){
  const python=process.platform==='win32'
    ? 'ai-service/.venv/Scripts/python.exe'
    : 'python';

  const result=await runProcess(
    python,
    [
      'scripts/e2e-scenarios.py',
      '--execute-actions',
      '--skip-runtime-preflight'
    ],
    {
      TOKEN:authorityToken,
      AQUAGUARD_TOKEN:authorityToken,
      AQUAGUARD_BASE_URL:BASE
    }
  );

  if(result.code!==0){
    return {
      pass:false,
      error:result.stderr||result.stdout
    };
  }

  try{
    const parsed=JSON.parse(result.stdout);
    return {
      pass:parsed.summary?.all_passed===true,
      summary:parsed.summary,
      note:'Synthetic deterministic fixtures only; not model accuracy.'
    };
  }catch(error){
    return {
      pass:false,
      error:`Could not parse Phase 26 output: ${error.message}`
    };
  }
}

async function main(){
  const generatedAt=new Date().toISOString();

  try{
    const citizenToken=await login(CITIZEN_EMAIL,'citizen');
    const authorityToken=await login(AUTHORITY_EMAIL,'authority');

    record('seeded citizen login',Boolean(citizenToken));
    record('seeded authority login',Boolean(authorityToken));

    const health=await request('GET','/api/health');

    record(
      'API health',
      health.status===200&&health.json?.status==='ok',
      {status:health.status,latencyMs:Number(health.elapsedMs.toFixed(2))}
    );

    const deep=await request('GET','/api/system/deep');

    record(
      'database/deep health',
      deep.status===200&&deep.json?.database==='up',
      deep.json
    );

    const gis=await request('GET','/api/gis/flood-zones',{token:authorityToken});

    record(
      'PostGIS flood zones',
      gis.status===200&&
      gis.json?.type==='FeatureCollection'&&
      Array.isArray(gis.json?.features)&&
      gis.json.features.length>0,
      {
        status:gis.status,
        features:gis.json?.features?.length??null
      }
    );

    const ai=await request('GET','/api/ai/current-risk',{token:authorityToken});

    record(
      'AI inference contract',
      ai.status===200&&
      Boolean(ai.json?.inference?.model_version)&&
      ai.json?.inference?.prediction_id!=null,
      {
        status:ai.status,
        modelVersion:ai.json?.inference?.model_version??null,
        modelStatus:ai.json?.inference?.model_status??null,
        mode:ai.json?.inference?.mode??null
      }
    );

    const fusion=await request('POST','/api/ai/multimodal-risk',{
      token:authorityToken,
      body:{zone:'Zone 4'}
    });

    record(
      'multimodal risk fusion contract',
      fusion.status===200&&
      fusion.json?.calibrated_probability===false&&
      fusion.json?.production_eligible===false,
      {
        status:fusion.status,
        riskLevel:fusion.json?.risk_level??null,
        riskScore:fusion.json?.risk_score??null,
        missingSignals:fusion.json?.missing_signals??null
      }
    );

    const missingJwt=await request('GET','/api/gis/flood-zones');
    record('JWT required',missingJwt.status===401,{status:missingJwt.status});

    const invalidJwt=await request('GET','/api/gis/flood-zones',{
      token:'not-a-valid-jwt'
    });
    record('invalid JWT rejected',invalidJwt.status===401,{status:invalidJwt.status});

    const citizenBoundary=await request(
      'GET',
      '/api/field-operations/overview',
      {token:citizenToken}
    );

    record(
      'citizen blocked from authority field operations',
      citizenBoundary.status===403,
      {status:citizenBoundary.status}
    );

    const authorityBoundary=await request(
      'GET',
      '/api/field-operations/overview',
      {token:authorityToken}
    );

    record(
      'authority field-operations access',
      authorityBoundary.status===200,
      {status:authorityBoundary.status}
    );

    const invalidInput=await request('POST','/api/ai/multimodal-risk',{
      token:authorityToken,
      body:{}
    });

    record(
      'input validation',
      invalidInput.status===400,
      {
        status:invalidInput.status,
        message:invalidInput.json?.message??null
      }
    );

    const injection=await request('POST','/api/auth/login',{
      body:{
        email:"' OR 1=1 --",
        password:'wrong'
      }
    });

    record(
      'SQL injection login attempt rejected',
      injection.status===401,
      {status:injection.status}
    );

    const corsProbe=await request('GET','/api/health',{
      headers:{Origin:'https://evil.example'}
    });

    const allowOrigin=corsProbe.headers.get('access-control-allow-origin');

    record(
      'CORS does not authorize hostile origin',
      allowOrigin!=='https://evil.example',
      {allowOrigin}
    );

    const form=new FormData();
    form.append(
      'file',
      new Blob(['not an image'],{type:'text/plain'}),
      'not-image.txt'
    );

    const uploadProbe=await request(
      'POST',
      '/api/vision/analyze-image',
      {token:authorityToken,form}
    );

    record(
      'vision upload type restriction',
      uploadProbe.status===400,
      {status:uploadProbe.status}
    );

    const providerStatus=await request(
      'GET',
      '/api/providers/status',
      {token:authorityToken}
    );

    record(
      'provider contracts',
      providerStatus.status===200&&
      Boolean(providerStatus.json?.contracts?.WeatherProvider)&&
      Boolean(providerStatus.json?.contracts?.DeviceTelemetryProvider),
      {status:providerStatus.status}
    );

    const serializedProviders=JSON.stringify(providerStatus.json||{});

    const configuredSecrets=[
      backendEnv.DEVICE_API_KEY,
      backendEnv.GOOGLE_MAPS_API_KEY,
      backendEnv.SENTINEL_HUB_CLIENT_SECRET,
      backendEnv.JWT_SECRET
    ].filter(value=>typeof value==='string'&&value.length>=8);

    record(
      'provider status does not expose configured secrets',
      configuredSecrets.every(
        secret=>!serializedProviders.includes(secret)
      )
    );

    const satelliteConfigured=providerStatus.json?.providers?.find(
      provider=>provider.id==='sentinel-hub'
    )?.configured;

    if(satelliteConfigured===false){
      const satellite=await request(
        'GET',
        '/api/providers/satellite/scenes',
        {token:authorityToken}
      );

      record(
        'partial satellite outage is explicit',
        satellite.status===200&&
        satellite.json?.configured===false&&
        Array.isArray(satellite.json?.scenes)&&
        satellite.json.scenes.length===0,
        {
          status:satellite.status,
          configured:satellite.json?.configured??null
        }
      );
    }else{
      record(
        'partial satellite outage is explicit',
        true,
        'Skipped because Sentinel Hub is configured.'
      );
    }

    const telemetry=await request(
      'GET',
      '/api/telemetry/live',
      {token:authorityToken}
    );

    const sensorRows=telemetry.json?.sensors||[];

    record(
      'sensor freshness contract',
      telemetry.status===200&&
      sensorRows.length>0&&
      sensorRows.every(
        sensor=>typeof sensor.freshnessStatus==='string'
      ),
      {
        sensorCount:sensorRows.length,
        freshness:sensorRows.map(
          sensor=>({id:sensor.id,status:sensor.freshnessStatus})
        )
      }
    );

    try{
      const socketOne=await waitForSocketStatus();
      const socketTwo=await waitForSocketStatus();

      metrics.socketIo={
        firstConnectionMs:socketOne.latencyMs,
        reconnectMs:socketTwo.latencyMs
      };

      record(
        'Socket.IO connectionStatus and reconnect',
        socketOne.payload?.connected===true&&
        socketTwo.payload?.connected===true,
        metrics.socketIo
      );
    }catch(error){
      record(
        'Socket.IO connectionStatus and reconnect',
        false,
        error.message
      );
    }

    const duplicate=await duplicateTelemetryCheck();

    record(
      'duplicate telemetry replay protection',
      duplicate.skipped||duplicate.pass,
      duplicate
    );

    metrics.apiHealth=await performanceSample(
      '/api/health',
      {total:40,concurrency:8}
    );

    record(
      'API lightweight load sample',
      metrics.apiHealth.errorRate===0,
      metrics.apiHealth
    );

    metrics.databaseRead=await performanceSample(
      '/api/system/deep',
      {total:15,concurrency:3}
    );

    record(
      'database/deep-health latency sample',
      metrics.databaseRead.errorRate===0,
      metrics.databaseRead
    );

    metrics.telemetryRead=await performanceSample(
      '/api/telemetry/live',
      {
        token:authorityToken,
        total:20,
        concurrency:4
      }
    );

    record(
      'telemetry read throughput sample',
      metrics.telemetryRead.errorRate===0,
      metrics.telemetryRead
    );

    const rateLimit=await rateLimitCheck();

    record(
      'device telemetry rate limiting',
      rateLimit.pass,
      rateLimit
    );

    const phase26=await phase26Chain(authorityToken);

    record(
      'end-to-end incident/alert/response chain',
      phase26.pass,
      phase26
    );

    try{
      const dbFailure=await withFailureServer(
        5012,
        {
          DATABASE_URL:
            'postgresql://invalid:invalid@127.0.0.1:65432/aquaguard'
        },
        async secondaryBase=>{
          const response=await fetch(
            secondaryBase+'/api/system/deep'
          );
          const body=await response.json();
          return {status:response.status,body};
        }
      );

      record(
        'database unavailable -> degraded health',
        dbFailure.status===200&&
        dbFailure.body?.status==='degraded'&&
        dbFailure.body?.database==='down',
        dbFailure.body
      );
    }catch(error){
      record(
        'database unavailable -> degraded health',
        false,
        error.message
      );
    }

    try{
      const aiFailure=await withFailureServer(
        5013,
        {
          AI_SERVICE_URL:'http://127.0.0.1:65534'
        },
        async secondaryBase=>{
          const response=await fetch(
            secondaryBase+'/api/vision/status',
            {
              headers:{
                Authorization:`Bearer ${authorityToken}`
              }
            }
          );

          let body=null;
          try{body=await response.json()}catch{}

          return {status:response.status,body};
        }
      );

      record(
        'AI unavailable -> explicit 503',
        aiFailure.status===503,
        aiFailure
      );
    }catch(error){
      record(
        'AI unavailable -> explicit 503',
        false,
        error.message
      );
    }

    const failed=checks.filter(check=>!check.pass);

    const report={
      phase:28,
      title:'Full-System Integration, Security & Performance Validation',
      generatedAt,
      environment:'local/non-production validation',
      disclaimer:
        'Passing these integration and synthetic tests does not prove real-world flood-model accuracy or deployed capacity.',
      checks,
      metrics,
      resilienceNotDestructivelySimulated:[
        {
          scenario:'provider timeout',
          reason:
            'External provider hard-timeout injection is not performed against live third-party services. Provider failure contracts are checked instead.'
        }
      ],
      summary:{
        total:checks.length,
        passed:checks.length-failed.length,
        failed:failed.length,
        allPassed:failed.length===0
      }
    };

    console.log(JSON.stringify(report,null,2));

    if(failed.length){
      process.exitCode=1;
    }
  }catch(error){
    console.log(JSON.stringify({
      phase:28,
      generatedAt,
      fatalError:error.message,
      checks
    },null,2));

    process.exitCode=1;
  }
}

await main();
