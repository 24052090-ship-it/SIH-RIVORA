import {Router} from 'express';
import {requireAuth,requireRole} from '../middleware/auth.js';
import {overview,createTask,updateTask,fieldUpdate} from '../controllers/fieldOperationsController.js';
const r=Router();
r.get('/overview',requireAuth,requireRole('authority'),overview);
r.post('/tasks',requireAuth,requireRole('authority'),createTask);
r.patch('/tasks/:id',requireAuth,requireRole('authority'),updateTask);
r.patch('/tasks/:id/field-update',requireAuth,requireRole('authority'),fieldUpdate);
export default r;
