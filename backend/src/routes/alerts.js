import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listAlerts,
  createAlert,
} from '../controllers/alertsController.js';

const r = Router();

r.get('/', requireAuth, listAlerts);
r.post('/', requireAuth, createAlert);

export default r;