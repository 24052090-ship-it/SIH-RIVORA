import {Router} from 'express';import {requireAuth} from '../middleware/auth.js';import {listReports,createReport} from '../controllers/reportsController.js';
const r=Router();r.get('/',requireAuth,listReports);r.post('/',requireAuth,createReport);export default r;
