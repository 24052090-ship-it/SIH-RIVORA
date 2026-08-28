import {Router} from 'express';
import {requireAuth,requireRole} from '../middleware/auth.js';
import {digitalTwinOverview,runDigitalTwinScenario} from '../controllers/digitalTwinController.js';
const r=Router();
r.get('/overview',requireAuth,requireRole('authority'),digitalTwinOverview);
r.post('/scenario',requireAuth,requireRole('authority'),runDigitalTwinScenario);
export default r;
