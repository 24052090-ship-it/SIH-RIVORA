import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { safeRoute } from '../controllers/routeController.js';
const r = Router();
r.get('/safe', requireAuth, safeRoute);
export default r;
