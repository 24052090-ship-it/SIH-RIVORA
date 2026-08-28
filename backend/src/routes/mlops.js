import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { mlopsOverview, registerPrediction, createDriftMetric, registerModelCandidate, promoteModel } from '../controllers/mlopsController.js';
const r=Router();r.get('/overview',mlopsOverview);r.post('/predictions',registerPrediction);r.post('/drift',createDriftMetric);r.post('/models/candidates',requireAuth,requireRole('authority'),registerModelCandidate);
r.post('/models/:id/promote',requireAuth,requireRole('authority'),promoteModel);
export default r;
