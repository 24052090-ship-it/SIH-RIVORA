# AquaGuard v31 API Integrations

## Server-side environment variables

```env
GOOGLE_MAPS_API_KEY=
SENTINEL_HUB_CLIENT_ID=
SENTINEL_HUB_CLIENT_SECRET=
```

Keep these in `backend/.env`; never put provider secrets in Vite environment variables.

## Endpoints

- `GET /api/providers/status` — normalized provider readiness.
- `GET /api/providers/weather/nowcast?lat=12.9716&lng=77.5946&hours=12` — Open-Meteo precipitation and meteorology nowcast.
- `POST /api/providers/google/routes` — optional Google Routes traffic-aware route baseline.
- `GET /api/providers/satellite/scenes?bbox=77.45,12.82,77.78,13.12&days=7&maxCloud=40` — Sentinel Hub Sentinel-2 scene discovery.
- `GET /api/routes/safe` — AquaGuard PostGIS flood-aware route.
- `POST /api/ai/fusion` — HydroFusion multi-signal risk prediction.

## Recommended production data architecture

1. Authorized municipal/meteorological rain feeds and IoT gauges for operational rainfall.
2. Water-level, drain occupancy, pump-state and sensor-health telemetry.
3. Sentinel-2/Sentinel Hub for independent surface-water evidence and post-event flood extent.
4. Google Routes where procurement/billing permits, used as a traffic baseline rather than the flood-safety decision layer.
5. PostgreSQL/PostGIS as the stable internal geospatial contract so external data providers can be changed without rewriting the React application.

## Security pattern

`React → JWT-authenticated Express adapter → external provider`

The browser never receives Sentinel client secrets or server-side Google credentials. Sentinel access tokens are obtained and cached only in the backend.
