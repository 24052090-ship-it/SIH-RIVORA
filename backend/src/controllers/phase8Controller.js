import { query } from '../db/pool.js';
import { env } from '../config/env.js';

function maintenanceRisk({waterLevel=0, blockage=false, capacity=100, daysSinceMaintenance=0, reports=0}) {
  const score = Math.min(100, Math.round(
    Number(waterLevel) * 0.28 +
    (blockage ? 28 : 0) +
    Math.max(0, 100 - Number(capacity)) * 0.22 +
    Math.min(100, Number(daysSinceMaintenance) * 2.1) * 0.18 +
    Math.min(100, Number(reports) * 8) * 0.12
  ));
  const level = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
  return {score, level};
}

export async function predictiveMaintenance(req, res) {
  const { rows } = await query(`
    SELECT d.drain_code, d.zone, d.water_level_percent::float water_level,
           d.available_capacity_percent::float capacity, d.blockage, d.severity,
           d.status, d.last_maintenance,
           GREATEST(0, EXTRACT(DAY FROM NOW() - COALESCE(d.last_maintenance, NOW())))::int days_since_maintenance,
           COALESCE((SELECT COUNT(*) FROM reports r WHERE r.zone=d.zone AND r.created_at > NOW() - INTERVAL '30 days'),0)::int report_count
    FROM drains d ORDER BY d.drain_code
  `);
  const predictions = rows.map(d => {
    const result = maintenanceRisk({waterLevel:d.water_level, blockage:d.blockage, capacity:d.capacity, daysSinceMaintenance:d.days_since_maintenance, reports:d.report_count});
    const factors = [
      {label:'Water level', value:Math.round(d.water_level), weight:28},
      {label:'Blockage', value:d.blockage ? 100 : 0, weight:28},
      {label:'Capacity loss', value:Math.max(0, Math.round(100-d.capacity)), weight:22},
      {label:'Days since maintenance', value:Math.min(100, Math.round(d.days_since_maintenance*2.1)), weight:18},
      {label:'Recent reports', value:Math.min(100, d.report_count*8), weight:12}
    ];
    return {assetCode:d.drain_code, zone:d.zone, riskScore:result.score, riskLevel:result.level, recommendedAction:result.level==='CRITICAL'?'Inspect and deploy crew immediately':result.level==='HIGH'?'Schedule inspection within 24 hours':result.level==='MEDIUM'?'Inspect during next maintenance cycle':'Routine monitoring', factors, modelVersion:'baseline-maintenance-v1', generatedAt:new Date().toISOString()};
  });
  for (const p of predictions) {
    await query(`INSERT INTO maintenance_predictions(asset_code,asset_type,risk_score,risk_level,recommended_action,factors,model_version) VALUES($1,'DRAIN',$2,$3,$4,$5,$6)`,[p.assetCode,p.riskScore,p.riskLevel,p.recommendedAction,JSON.stringify(p.factors),p.modelVersion]);
  }
  res.json({mode:'baseline',warning:'Development baseline. Replace with a trained predictive-maintenance model after collecting labeled maintenance history.',predictions});
}

export async function analyticsSummary(req,res) {
  const [rain, alerts, reports, maintenance, zones] = await Promise.all([
    query(`SELECT COALESCE(SUM(rainfall_mm_hr),0)::float total_rainfall, COALESCE(AVG(rainfall_mm_hr),0)::float avg_rainfall, COALESCE(MAX(rainfall_mm_hr),0)::float peak_rainfall FROM rainfall_readings WHERE recorded_at > NOW()-INTERVAL '24 hours'`),
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE level='CRITICAL')::int critical FROM alerts WHERE created_at > NOW()-INTERVAL '7 days'`),
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='Resolved')::int resolved FROM reports WHERE created_at > NOW()-INTERVAL '7 days'`),
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status IN ('Open','In Progress'))::int open FROM maintenance`),
    query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE risk_level IN ('HIGH','CRITICAL'))::int high_risk FROM flood_zones`)
  ]);
  res.json({rainfall:rain.rows[0],alerts:alerts.rows[0],reports:reports.rows[0],maintenance:maintenance.rows[0],zones:zones.rows[0],generatedAt:new Date().toISOString()});
}

export async function analyticsTrends(req,res) {
  const {days=Math.min(Math.max(Number(req.query.days||7),1),30)}=req.query;
  const {rows}=await query(`SELECT TO_CHAR(DATE_TRUNC('day',recorded_at AT TIME ZONE 'Asia/Kolkata'),'DD Mon') label, AVG(rainfall_mm_hr)::float rainfall, MAX(rainfall_mm_hr)::float peak FROM rainfall_readings WHERE recorded_at>NOW()-($1::int*INTERVAL '1 day') GROUP BY 1 ORDER BY MIN(recorded_at)`,[days]);
  const risk=await query(`SELECT zone_code zone, risk_score::float score, risk_level level FROM flood_zones ORDER BY risk_score DESC`);
  res.json({rainfall:rows,zones:risk.rows,days:Number(days)});
}

export async function satelliteStatus(req,res) {
  res.json({enabled:env.satelliteEnabled, provider:env.satelliteProvider, collection:env.satelliteCollection, configured:Boolean(env.satelliteTileUrl), tileUrlConfigured:Boolean(env.satelliteTileUrl), message:env.satelliteEnabled?'Satellite layer is configured for optional imagery integration.':'Satellite integration is disabled until a provider/tile service is configured.'});
}

export async function satelliteObservations(req,res) {
  const {rows}=await query(`SELECT provider,collection,observed_at,cloud_cover_percent::float cloud_cover_percent,flood_extent_percent::float flood_extent_percent,source_url,metadata FROM satellite_observations ORDER BY observed_at DESC LIMIT 50`);
  res.json(rows);
}
