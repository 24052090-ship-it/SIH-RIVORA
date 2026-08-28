# AquaGuard — Phase 3: Live Rainfall + Sensor + GIS Telemetry

Phase 3 upgrades the Phase-2 data foundation into a live telemetry and GIS layer.

## Delivered

- Open-Meteo weather ingestion service for Bengaluru rainfall/meteorological observations.
- Weather observations persisted in PostgreSQL.
- Weather API readings also flow into `rainfall_readings` with `source=WEATHER_API`.
- Secure sensor ingestion endpoint using `x-device-key`.
- IoT-ready rainfall and water-level ingestion.
- Telemetry event audit table.
- Live telemetry endpoint combining sensors with their latest readings.
- PostGIS GIS endpoints consumed by the frontend map.
- Real sensor and drain data on Authority Live Monitoring/Sensors screens.
- Rainfall chart consumes the backend telemetry endpoint.
- Flood map consumes PostGIS GeoJSON and live drain/sensor/road APIs, with mock fallback only when the API is unavailable.
- Weather sync can run automatically at a configurable interval.
- A local sensor simulator is included for development; it is explicitly a test tool, not production IoT.

## External weather source

Open-Meteo provides hourly forecast/historical variables including precipitation, temperature, humidity and pressure. Phase 3 treats the latest completed hourly precipitation value as rainfall intensity for the weather station. This is external weather telemetry, not a physical rain gauge.

## Run

### 1. Start PostGIS

```bash
docker compose up -d postgres
```

### 2. Install backend

```bash
cd backend
npm install
copy .env.example .env
npm run db:init
npm run db:migrate
npm run db:seed
npm run dev
```

Linux/macOS: use `cp .env.example .env`.

### 3. Install frontend

From the project root:

```bash
npm install
copy .env.example .env
npm run dev
```

### 4. Test sensor ingestion

Keep the backend running and run from the project root:

```bash
npm run simulate:sensor
```

Or send your own payload:

```http
POST /api/telemetry/ingest/sensor
x-device-key: phase3-device-key-change-me
Content-Type: application/json

{
  "sensorCode": "SN-104",
  "rainfallMmHr": 72.4,
  "waterLevelPercent": 84,
  "health": 97,
  "status": "ONLINE"
}
```

## Phase 3 API surface

Authenticated:

- `GET /api/telemetry/live`
- `GET /api/telemetry/weather?limit=24`
- `GET /api/rainfall?limit=24`
- `GET /api/flood/current`
- `GET /api/gis/flood-zones`
- `GET /api/gis/drains`
- `GET /api/gis/roads`
- `GET /api/gis/sensors`

Authority only:

- `POST /api/telemetry/weather/sync`

Device ingestion:

- `POST /api/telemetry/ingest/sensor`

## What is not claimed yet

Phase 3 does not implement flood prediction AI, YOLO computer vision, Socket.IO realtime delivery, satellite analytics, or the intelligent evacuation algorithm. Those remain later phases.
