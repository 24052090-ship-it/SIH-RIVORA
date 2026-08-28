import { query } from '../db/pool.js';
import { env } from '../config/env.js';

export async function health(req,res) {
  const start = Date.now();
  let db = { status: 'OFFLINE', latency: 0 };
  try {
    const t0 = Date.now();
    await query('SELECT 1');
    db = { status: 'ONLINE', latency: Date.now() - t0 };
  } catch(e) {}

  let ai = { status: 'NOT_CONNECTED', latency: 0 };
  try {
    const t0 = Date.now();
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), 2000);
    const r = await fetch(`${env.aiServiceUrl}/health`, { signal: ac.signal }).catch(()=>null);
    clearTimeout(id);
    if(r && r.ok) ai = { status: 'ONLINE', latency: Date.now() - t0 };
  } catch(e) {}

  let telemetry = { status: 'OFFLINE', latency: 0 };
  try {
    const t0 = Date.now();
    const { rows } = await query('SELECT MAX(last_seen_at) as last_seen FROM sensors');
    telemetry.latency = Date.now() - t0;
    if (rows[0] && rows[0].last_seen) {
      const age = Date.now() - new Date(rows[0].last_seen).getTime();
      if (age < 60000) telemetry.status = 'ONLINE';
      else if (age < 180000) telemetry.status = 'DEGRADED';
      else telemetry.status = 'OFFLINE';
    }
  } catch(e) {}

  const realtime = req.app.get('io') ? 'ONLINE' : 'OFFLINE';
  
  const providers = [
    { name: 'Express API', status: 'ONLINE', latency: `${Date.now() - start} ms` },
    { name: 'PostgreSQL / PostGIS', status: db.status, latency: `${db.latency} ms` },
    { name: 'AI Risk Engine', status: ai.status, latency: `${ai.latency} ms` },
    { name: 'Sensor Network', status: telemetry.status, latency: `${telemetry.latency} ms` },
    { name: 'Realtime Gateway', status: realtime, latency: '0 ms' },
    { name: 'Map Provider', status: env.googleMapsApiKey ? 'ONLINE' : 'STANDBY', latency: '0 ms' },
    { name: 'Satellite Provider', status: env.sentinelHubClientId ? 'ONLINE' : 'STANDBY', latency: '0 ms' }
  ];

  res.json({
    api: 'ONLINE',
    database: db.status,
    realtime,
    ai: ai.status,
    satellite: env.sentinelHubClientId ? 'CONFIGURED' : 'NOT_CONFIGURED',
    timestamp: new Date().toISOString(),
    providers
  });
}
