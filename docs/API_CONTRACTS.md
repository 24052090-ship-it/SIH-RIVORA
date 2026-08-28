# AquaGuard API Contracts — Version 1 Preparation

These are frontend-facing contracts, not an implemented backend.

## Flood risk

`GET /api/flood/current`

```json
{
  "zone": "Zone 4",
  "risk_level": "CRITICAL",
  "risk_probability": 0.91,
  "updated_at": "2026-08-25T06:30:00Z",
  "factors": []
}
```

## Sensors

`GET /api/sensors`

Each sensor should contain `id`, `type`, `latitude`, `longitude`, `value`, `unit`, `status`, and `updated_at`.

## GeoJSON

`GET /api/flood/zones`

Return a GeoJSON FeatureCollection. Flood-zone geometry must be a Polygon/MultiPolygon and risk metadata belongs in `properties`.

## Safe route

`POST /api/routes/safe`

Request:

```json
{
  "origin": { "lat": 12.935, "lng": 77.62 },
  "destination": { "lat": 12.975, "lng": 77.69 }
}
```

Response should include route geometry, distance, duration, flood risk, risk score and avoided road count.

## Simulation

`POST /api/flood/simulate`

Request fields: `rainfall`, `drainCapacity`, `blockedDrains`, `duration`.

Response should include projected score, risk level, affected zones, affected roads, population exposure and recommended action.
