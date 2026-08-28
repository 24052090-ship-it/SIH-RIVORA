import { Router } from 'express';
import { realtimeHealth } from '../realtime/health.js';
const r = Router();
r.get('/status', (req, res) => res.json(realtimeHealth(req.app.get('io'))));
export default r;
