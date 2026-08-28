import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {rainfall,currentRisk} from '../controllers/telemetryController.js';
import {sensors} from '../controllers/gisController.js';
const r=Router();r.get('/rainfall',requireAuth,rainfall);r.get('/flood',requireAuth,currentRisk);r.get('/sensors',requireAuth,sensors);export default r;
