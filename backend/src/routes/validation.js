import { Router } from 'express';
import { validationSummary, dataQuality } from '../controllers/validationController.js';
const r = Router();
r.get('/summary', validationSummary);
r.get('/data-quality', dataQuality);
export default r;
