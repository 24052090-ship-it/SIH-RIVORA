import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

import {
  incidentOverview,
  createIncident,
  getIncident,
  updateIncident,
  createIncidentAction,
} from '../controllers/incidentController.js';

const r = Router();

r.get('/overview', requireAuth, incidentOverview);

r.post('/', requireAuth, createIncident);

r.get('/:id', requireAuth, getIncident);

r.patch('/:id', requireAuth, updateIncident);

r.post('/:id/actions', requireAuth, createIncidentAction);

export default r;