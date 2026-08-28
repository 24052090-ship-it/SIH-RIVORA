import { query } from '../db/pool.js';
import { emitRealtime } from './gateway.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

export async function publishSensorUpdate(io, sensorCode) {
  const { rows } = await query(`
    SELECT s.sensor_code id, s.type, s.zone, s.status, s.health,
      s.last_seen_at,
      lr.rainfall_mm_hr::float rainfall_mm_hr,
      wr.water_level_percent::float water_level_percent,
      ST_Y(s.location::geometry) latitude, ST_X(s.location::geometry) longitude
    FROM sensors s
    LEFT JOIN LATERAL (SELECT rainfall_mm_hr FROM rainfall_readings WHERE sensor_id=s.id ORDER BY recorded_at DESC LIMIT 1) lr ON TRUE
    LEFT JOIN LATERAL (SELECT water_level_percent FROM water_level_readings WHERE sensor_id=s.id ORDER BY recorded_at DESC LIMIT 1) wr ON TRUE
    WHERE s.sensor_code=$1`, [sensorCode]);
  if (!rows[0]) return null;
  const s = rows[0];
  emitRealtime(io, 'sensorUpdated', { sensor: { ...s, rainfallMmHr: s.rainfall_mm_hr, waterLevelPercent: s.water_level_percent } });
  return s;
}

export async function publishRiskUpdate(io) {
  const { rows } = await query(`SELECT zone_code zone, risk_level level, risk_score::float score FROM flood_zones ORDER BY risk_score DESC LIMIT 1`);
  if (!rows[0]) return null;
  const risk = { ...rows[0], probability: clamp(rows[0].score / 100, 0, 1) };
  emitRealtime(io, 'riskUpdated', { risk });
  return risk;
}

export async function publishAlert(io, alert) {
  emitRealtime(io, 'newAlert', { alert }, ['city', 'citizen', 'authority']);
}

export async function publishReport(io, report) {
  emitRealtime(io, 'newReport', { report }, ['city', 'authority']);
}

export async function publishMaintenance(io, event, maintenance) {
  emitRealtime(io, event, { maintenance }, ['authority']);
}
