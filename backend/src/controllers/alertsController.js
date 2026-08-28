import { query } from '../db/pool.js';
export async function listAlerts(req,res){
  const {rows}=await query(`SELECT alert_code id,level,location_label location,message,TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata','HH24:MI') time,created_at FROM alerts WHERE resolved_at IS NULL ORDER BY created_at DESC`);
  res.json(rows);
}

export async function createAlert(req, res, next) {
  try {
    const { level, locationLabel, message, zone } = req.body;
    if (!level || !locationLabel || !message) return res.status(400).json({error: 'level, locationLabel and message required'});
    
    // Deduplication and cooldown: avoid creating the exact same alert for the same location within 60 minutes if unresolved
    const existing = await query(
      `SELECT id FROM alerts WHERE location_label=$1 AND level=$2 AND created_at >= NOW() - INTERVAL '1 hour' AND resolved_at IS NULL LIMIT 1`,
      [locationLabel, level]
    );
    if (existing.rowCount > 0) {
      return res.status(200).json({ message: 'Alert deduplicated (in cooldown).', skipped: true });
    }

    const code = `ALR-${Date.now().toString().slice(-6)}`;
    const r = await query(
      `INSERT INTO alerts(alert_code, level, location_label, message, zone) VALUES($1, $2, $3, $4, $5) RETURNING *`,
      [code, level, locationLabel, message, zone || null]
    );
    
    const io = req.app.get('io');
    if (io) io.emit('alertCreated', r.rows[0]);
    
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
}
