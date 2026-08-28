import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  rainfall,
  currentRisk,
  liveTelemetry,
  weatherObservations,
  syncWeather,
  ingestSensor,
  ingestDeviceTelemetry
} from '../controllers/telemetryController.js';

const r = Router();

r.get('/rainfall', requireAuth, rainfall);
r.get('/flood/current', requireAuth, currentRisk);
r.get('/telemetry/live', requireAuth, liveTelemetry);
r.get('/telemetry/weather', requireAuth, weatherObservations);
r.post('/telemetry/weather/sync', requireAuth, requireRole('authority'), syncWeather);

r.post(
  '/telemetry/ingest/sensor',
  rateLimit({
    windowMs: 60_000,
    max: 120,
    message: 'Device telemetry rate limit exceeded'
  }),
  ingestSensor
);

r.post(
  '/telemetry/ingest/device',
  rateLimit({
    windowMs: 60_000,
    max: 60,
    message: 'Phase 27 device telemetry rate limit exceeded'
  }),
  ingestDeviceTelemetry
);

export default r;
