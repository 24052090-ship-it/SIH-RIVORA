import { query } from '../db/pool.js';
export async function citizenSummary(req,res){
  const rainfall=await query(`SELECT rainfall_mm_hr AS value FROM rainfall_readings ORDER BY recorded_at DESC LIMIT 1`);
  const risk=await query(`SELECT zone_code, risk_level, risk_score FROM flood_zones WHERE zone_code='ZONE-02' LIMIT 1`);
  const alerts=await query(`SELECT COUNT(*)::int AS count FROM alerts WHERE resolved_at IS NULL`);
  const reports=await query(`SELECT COUNT(*)::int AS count FROM reports WHERE user_id=$1`,[req.user.id]);
  res.json({rainfall:Number(rainfall.rows[0]?.value||0),risk:risk.rows[0]||{zone_code:'ZONE-04',risk_level:'CRITICAL',risk_score:91},activeAlerts:alerts.rows[0].count,myReports:reports.rows[0].count});
}
export async function authoritySummary(req,res){
  const [alerts,zones,drains,reports,maintenance]=await Promise.all([
    query(`SELECT COUNT(*)::int count FROM alerts WHERE resolved_at IS NULL`),
    query(`SELECT COUNT(*)::int count FROM flood_zones WHERE risk_level IN ('HIGH','CRITICAL')`),
    query(`SELECT COUNT(*)::int count FROM drains WHERE blockage=true`),
    query(`SELECT COUNT(*)::int count FROM reports`),
    query(`SELECT COUNT(*)::int count FROM maintenance WHERE status NOT IN ('Resolved','Completed')`)
  ]);
  res.json({activeAlerts:alerts.rows[0].count,highRiskZones:zones.rows[0].count,blockedDrains:drains.rows[0].count,citizenReports:reports.rows[0].count,maintenanceTasks:maintenance.rows[0].count});
}
