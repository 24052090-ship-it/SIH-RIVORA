import { query } from '../db/pool.js';

function riskLevel(score){return score>=75?'CRITICAL':score>=50?'HIGH':score>=25?'MEDIUM':'LOW';}

export async function digitalTwinOverview(req,res){
  const [zones,drains,sensors,roads,rain]=await Promise.all([
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE risk_level IN ('HIGH','CRITICAL'))::int high_risk, COALESCE(AVG(risk_score),0)::float avg_score FROM flood_zones`),
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE blockage=true)::int blocked, COALESCE(AVG(water_level_percent),0)::float avg_water FROM drains`),
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='ONLINE')::int online FROM sensors`),
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE flooded=true)::int impaired FROM roads`),
    query(`SELECT COALESCE(MAX(rainfall_mm_hr),0)::float peak, COALESCE(AVG(rainfall_mm_hr),0)::float avg FROM rainfall_readings WHERE recorded_at>NOW()-INTERVAL '24 hours'`)
  ]);
  res.json({zones:zones.rows[0],drains:drains.rows[0],sensors:sensors.rows[0],roads:roads.rows[0],rainfall:rain.rows[0],generatedAt:new Date().toISOString()});
}

export async function runDigitalTwinScenario(req,res){
  const rainfall=Number(req.body.rainfall ?? 60);
  const drainCapacity=Math.max(0,Math.min(100,Number(req.body.drainCapacity ?? 70)));
  const blockedDrains=Math.max(0,Number(req.body.blockedDrains ?? 5));
  const duration=Math.max(1,Number(req.body.duration ?? 3));
  const current=await query(`SELECT COALESCE(AVG(risk_score),0)::float score FROM flood_zones`);
  const baseline=Number(current.rows[0]?.score||30);
  const score=Math.min(99,Math.round(baseline*.25 + rainfall*.42 + (100-drainCapacity)*.22 + blockedDrains*.7 + duration*1.2));
  const level=riskLevel(score);
  const zones=Math.max(1,Math.round(score/7));
  const roads=Math.max(1,Math.round(score/11));
  const exposure=Math.round(score*155);
  res.json({mode:'digital-twin-scenario',warning:'Planning simulation only. Outputs are scenario estimates, not operational forecasts.',inputs:{rainfall,drainCapacity,blockedDrains,duration},score,level,affectedZones:zones,affectedRoads:roads,populationExposure:exposure,recommendations:level==='CRITICAL'?['Activate emergency communications','Pre-position drainage crews','Review evacuation zones','Recalculate safe routes']:level==='HIGH'?['Prepare response teams','Inspect critical drains','Increase monitoring']:['Continue monitoring','Review maintenance schedule'],generatedAt:new Date().toISOString()});
}
