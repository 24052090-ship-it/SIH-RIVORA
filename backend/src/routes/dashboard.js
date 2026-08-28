import {Router} from 'express';import {requireAuth,requireRole} from '../middleware/auth.js';import {citizenSummary,authoritySummary} from '../controllers/dashboardController.js';
const r=Router();r.get('/citizen',requireAuth,requireRole('citizen'),citizenSummary);r.get('/authority',requireAuth,requireRole('authority'),authoritySummary);export default r;
