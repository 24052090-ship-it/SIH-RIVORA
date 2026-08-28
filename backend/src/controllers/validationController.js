import { query } from '../db/pool.js';

export async function validationSummary(req, res, next) {
  try {
    const [rainfall, sensors, reports, maintenance, ai] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '24 hours')::int AS recent FROM rainfall_readings`),
      query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status = 'online')::int AS online FROM sensors`),
      query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recent FROM reports`),
      query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status NOT IN ('resolved','completed'))::int AS open FROM maintenance`),
      query(`SELECT * FROM ai_model_registry ORDER BY created_at DESC LIMIT 1`).catch(() => ({ rows: [] }))
    ]);
    res.json({
      generatedAt: new Date().toISOString(),
      dataQuality: {
        rainfall: { total: rainfall.rows[0].count, last24h: rainfall.rows[0].recent },
        sensors: { total: sensors.rows[0].count, online: sensors.rows[0].online },
        reports: { total: reports.rows[0].count, last7d: reports.rows[0].recent },
        maintenance: { total: maintenance.rows[0].count, open: maintenance.rows[0].open }
      },
      model: ai.rows[0] || {
        name: 'flood-xgboost', version: 'synthetic-dev-v1', status: 'development-only',
        dataset: 'synthetic', metrics: { accuracy: null, precision: null, recall: null, f1: null, rocAuc: null }
      }
    });
  } catch (err) { next(err); }
}

export async function dataQuality(req, res, next) {
  try {
    const checks = [];
    const tables = ['users','sensors','rainfall_readings','water_level_readings','drains','roads','flood_zones','reports','alerts','maintenance'];
    for (const table of tables) {
      const r = await query(`SELECT COUNT(*)::int AS rows FROM ${table}`);
      checks.push({ table, rows: r.rows[0].rows, status: r.rows[0].rows > 0 ? 'ready' : 'empty' });
    }
    res.json({ checkedAt: new Date().toISOString(), checks });
  } catch (err) { next(err); }
}
