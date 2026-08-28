import {Router} from 'express';import {health} from '../controllers/systemController.js';const r=Router();r.get('/health',health);export default r;
