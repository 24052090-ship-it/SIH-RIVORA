import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {predict,currentRisk,fusion,multimodalRisk} from '../controllers/aiController.js';
const r=Router();
r.get('/current-risk',requireAuth,currentRisk);
r.post('/multimodal-risk',requireAuth,multimodalRisk);
r.post('/flood-predict',requireAuth,predict);r.post('/fusion',requireAuth,fusion);
export default r;
