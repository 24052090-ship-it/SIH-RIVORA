import {Router} from 'express';
import {overview} from '../controllers/operationsController.js';
import {requireAuth,requireRole} from '../middleware/auth.js';
const router=Router();
router.get('/overview',requireAuth,requireRole('authority'),overview);
export default router;
