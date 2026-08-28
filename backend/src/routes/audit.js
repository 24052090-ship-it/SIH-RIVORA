import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listAuditLogs, createAuditLog } from '../controllers/auditController.js';
const r = Router();
r.get('/', requireAuth, requireRole('authority'), listAuditLogs);
r.post('/', requireAuth, requireRole('authority'), createAuditLog);
export default r;
