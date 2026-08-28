# AquaGuard Phase 7 — Real-time IoT + Socket.IO

Phase 7 adds a real Socket.IO gateway, sensor event broadcasting, real-time React context/status UI, telemetry simulator, and a realtime health endpoint. It does not pretend to have physical hardware: `scripts/simulate-realtime.js` is explicitly a development simulator for the same ingestion endpoint an ESP32 can use later.

## Flow

ESP32 / sensor gateway → POST `/api/telemetry/ingest/sensor` → PostgreSQL → Socket.IO → React dashboards.

Events:
- `sensorUpdated`
- `riskUpdated`
- `newReport`
- `newAlert`
- `maintenanceAssigned`
- `maintenanceUpdated`

## Run

1. Start PostgreSQL/PostGIS.
2. `npm install` in the root.
3. `npm install` in `backend`.
4. Start backend: `npm run backend:dev`.
5. Start frontend: `npm run dev`.
6. Keep `VITE_ENABLE_REALTIME=true` to enable the live connection.
7. Optional simulator: `npm run simulate:realtime`.

The simulator sends real HTTP telemetry to the backend and the backend broadcasts real Socket.IO events. No fake Socket.IO timer is used.

## ESP32 contract

Send JSON to `POST /api/telemetry/ingest/sensor` with header `x-device-key`:

```json
{
  "sensorCode": "SN-104",
  "rainfallMmHr": 72.4,
  "waterLevelPercent": 84.1,
  "health": 96,
  "status": "online",
  "recordedAt": "2026-08-25T13:00:00.000Z"
}
```
