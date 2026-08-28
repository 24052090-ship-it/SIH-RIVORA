import {Router} from 'express';import {requireAuth} from '../middleware/auth.js';import {floodGeoJson,drains,roads,sensors} from '../controllers/gisController.js';
const r=Router();r.get('/flood-zones',requireAuth,floodGeoJson);r.get('/drains',requireAuth,drains);r.get('/roads',requireAuth,roads);r.get('/sensors',requireAuth,sensors);export default r;
