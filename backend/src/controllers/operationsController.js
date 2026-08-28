import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

export async function overview(req,res,next){
  try{
    const dbStart=Date.now();
    await pool.query('SELECT 1');
    const dbLatencyMs=Date.now()-dbStart;
    const result=await pool.query(`SELECT
      (SELECT COUNT(*) FROM sensors WHERE status='ONLINE')::int AS online_sensors,
      (SELECT COUNT(*) FROM alerts WHERE resolved_at IS NULL)::int AS active_alerts,
      (SELECT COUNT(*) FROM incidents WHERE status NOT IN ('RESOLVED','CLOSED'))::int AS open_incidents`);
    res.json({status:'operational',environment:env.nodeEnv,api:{status:'UP'},database:{status:'UP',latencyMs:dbLatencyMs},realtime:{status:'CONFIGURED'},ai:{status:env.aiEnabled?'ENABLED':'STANDBY'},satellite:{status:env.satelliteEnabled?'ENABLED':'STANDBY'},metrics:result.rows[0],checkedAt:new Date().toISOString()});
  }catch(err){next(err)}
}
