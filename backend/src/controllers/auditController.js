import { pool } from '../db/pool.js';

export async function listAuditLogs(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
  const { rows } = await pool.query(`
    SELECT a.id, a.action, a.entity_type AS "entityType", a.entity_id AS "entityId",
           a.metadata, a.ip_address AS "ipAddress", a.created_at AS "createdAt",
           u.name AS "actorName", u.email AS "actorEmail"
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_user_id
    ORDER BY a.created_at DESC
    LIMIT $1`, [limit]);
  res.json({ items: rows });
}

export async function createAuditLog(req, res) {
  const { action, entityType, entityId, metadata = {} } = req.body || {};
  if (!action) return res.status(400).json({ message: 'action is required' });
  const { rows } = await pool.query(`
    INSERT INTO audit_logs(actor_user_id, action, entity_type, entity_id, metadata, ip_address)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id, action, entity_type AS "entityType", entity_id AS "entityId", metadata, created_at AS "createdAt"`,
    [req.user?.id || null, action, entityType || null, entityId || null, metadata, req.ip || null]);
  res.status(201).json(rows[0]);
}
