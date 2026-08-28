import {Router} from 'express';
import {requireAuth,requireRole} from '../middleware/auth.js';
import {emergencyOverview,nearbySafety,createBroadcast,sendBroadcast} from '../controllers/emergencyController.js';
const r=Router();
r.get('/overview',requireAuth,emergencyOverview);
r.get('/nearby',requireAuth,nearbySafety);
r.post('/broadcasts',requireAuth,requireRole('authority'),createBroadcast);
r.post('/broadcasts/:id/send',requireAuth,requireRole('authority'),sendBroadcast);
export default r;
