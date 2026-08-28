# AquaGuard Phase 6 — Flood-Aware Safe Routing

Phase 6 adds the first real risk-weighted routing engine to AquaGuard.

## Flow

React Safe Route -> Express `/api/routes/safe` -> PostGIS road/flood/drain data -> Dijkstra risk-weighted graph -> GeoJSON route -> React/Leaflet.

## What is implemented

- PostGIS-backed route nodes and edges
- Dynamic road risk from current road state
- Flood-zone intersection risk
- Blocked-drain proximity penalty
- Flooded-road hard exclusion
- Dijkstra safest-route calculation
- Route geometry returned as GeoJSON LineString
- Distance, ETA, risk score, avoided risky roads and flooded-road count
- Browser geolocation support
- Demo/mock routing fallback when `VITE_USE_MOCK_DATA=true`
- No fake Socket.IO or fake external routing provider

## Migration

Existing Phase 5 database:

```bash
npm run backend:migrate
```

Fresh database:

```bash
npm run backend:init
npm run backend:migrate
npm run backend:seed
```

## API

`GET /api/routes/safe?originLat=12.935&originLng=77.615&destinationLat=12.968&destinationLng=77.660`

Requires the normal AquaGuard Bearer JWT.

## Routing philosophy

AquaGuard does not optimize only for shortest travel time. It penalizes high/critical roads, adds a penalty for nearby blocked drains, and makes flooded roads effectively impassable. The output is a safer route recommendation, not a guarantee of physical safety.

## External routing provider

This phase uses the internal PostGIS graph so the project is deterministic and demonstrable offline. A future Google Routes/other provider adapter can supply a base road graph; AquaGuard's risk engine should remain the final layer that scores and filters routes.
