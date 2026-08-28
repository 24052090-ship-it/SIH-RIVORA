import {Router} from 'express';
import {pool} from '../db/pool.js';
import {env} from '../config/env.js';

const router=Router();

router.get('/deep',async (_req,res)=>{
  const started=Date.now();

  let database='down';
  let databaseLatencyMs=null;
  const dbStarted=Date.now();

  try{
    await pool.query('SELECT 1');
    database='up';
    databaseLatencyMs=Date.now()-dbStarted;
  }catch{}

  let aiService='down';
  let aiLatencyMs=null;
  const aiStarted=Date.now();

  try{
    const response=await fetch(
      `${env.aiServiceUrl.replace(/\/$/,'')}/health`,
      {signal:AbortSignal.timeout(1500)}
    );

    if(response.ok){
      aiService='up';
      aiLatencyMs=Date.now()-aiStarted;
    }
  }catch{}

  res.json({
    status:database==='up'&&aiService==='up'?'ok':'degraded',
    service:'aquaguard-api',
    version:'31.0.0',
    database,
    databaseLatencyMs,
    aiService,
    aiServiceUrl:env.aiServiceUrl,
    aiLatencyMs,
    latencyMs:Date.now()-started,
    timestamp:new Date().toISOString()
  });
});

export default router;
