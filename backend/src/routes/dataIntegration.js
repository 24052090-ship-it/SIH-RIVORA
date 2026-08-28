import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { overview, stageCsv, approve } from '../controllers/dataIntegrationController.js';
const r=Router(); const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024}});
r.get('/overview',requireAuth,requireRole('authority'),overview);
r.post('/stage-csv',requireAuth,requireRole('authority'),upload.single('file'),stageCsv);
r.post('/:id/approve',requireAuth,requireRole('authority'),approve);
export default r;
