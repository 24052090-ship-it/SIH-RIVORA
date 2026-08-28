# AquaGuard Phase 3 API Contracts

## Live telemetry

`GET /api/telemetry/live`

```json
{
  "sensors": [
    {
      "id": "SN-104",
      "type": "Rainfall",
      "zone": "Zone 4",
      "status": "ONLINE",
      "health": 98,
      "latitude": 12.958,
      "longitude": 77.612,
      "rainfallMmHr": 72.4,
      "waterLevelPercent": null,
      "lastSeenAt": "2026-08-25T13:00:00.000Z"
    }
  ],
  "drains": [],
  "receivedAt": "2026-08-25T13:00:05.000Z"
}
```

## Sensor ingestion

`POST /api/telemetry/ingest/sensor`

Header:

`x-device-key: <DEVICE_API_KEY>`

Body:

```json
{
  "sensorCode": "SN-104",
  "rainfallMmHr": 72.4,
  "waterLevelPercent": 84,
  "health": 97,
  "status": "ONLINE",
  "recordedAt": "2026-08-25T13:00:00.000Z"
}
```

The endpoint records the measurement, updates `last_seen_at`, and writes an audit event to `telemetry_events`.

## Weather observations

`GET /api/telemetry/weather?limit=24`

The response is persisted data from the Open-Meteo ingestion service, not a browser-direct API call.
