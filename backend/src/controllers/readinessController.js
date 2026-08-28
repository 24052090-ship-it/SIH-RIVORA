import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

export async function readiness(req, res) {
  const checks = {};
  try { await pool.query('SELECT 1'); checks.database = { status: 'ready' }; }
  catch (error) { checks.database = { status: 'down', error: error.message }; }
  checks.ai = { status: env.aiServiceUrl ? 'configured' : 'not-configured', url: env.aiServiceUrl };
  checks.realtime = { status: 'configured', enabled: true };
  checks.gis = { status: checks.database.status === 'ready' ? 'ready' : 'blocked', provider: 'PostGIS' };
  checks.satellite = { status: env.satelliteEnabled ? 'configured' : 'standby', provider: env.satelliteProvider };
  checks.environment = { node: process.version, mode: process.env.NODE_ENV || 'development' };
  const criticalReady = checks.database.status === 'ready';
  res.status(criticalReady ? 200 : 503).json({ status: criticalReady ? 'ready' : 'degraded', version: '10.0.0', checks, checkedAt: new Date().toISOString() });
}
