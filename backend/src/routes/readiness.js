import { Router } from 'express';
import { readiness } from '../controllers/readinessController.js';
const r = Router();
r.get('/', readiness);
export default r;
