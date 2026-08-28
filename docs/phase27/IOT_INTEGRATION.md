# Phase 27 IoT Integration

Recommended telemetry contract:

{
  "deviceId": "SN-104",
  "timestampUtc": "...",
  "latitude": 0,
  "longitude": 0,
  "rainfallMmHr": 0,
  "waterLevelCm": 0,
  "batteryPct": 0,
  "signalRssi": -70
}

Production requirements:
- device authentication
- TLS
- monotonic timestamps / clock validation
- payload schema validation
- replay protection
- rate limits
- sensor calibration metadata
- offline buffering
- device health monitoring

Do not expose unauthenticated public telemetry ingestion.


## Implemented Phase 27 endpoint

POST /api/telemetry/ingest/device

Authentication:
- send the device credential in the x-device-key request header
- keep DEVICE_API_KEY on the backend/device deployment only
- set DEVICE_REQUIRE_TLS=true outside local development

Validation:
- exact Phase 27 payload fields
- UTC timestamp and clock-window validation
- monotonic per-device timestamps
- database replay protection
- coordinate and unit bounds
- per-route ingestion rate limit

Water-level calibration:
- raw waterLevelCm is persisted
- percent conversion is performed only when the sensor has
  calibration.waterLevelMaxCm metadata
- missing calibration never silently invents a percentage

Offline devices may replay buffered readings in chronological order within
DEVICE_MAX_BUFFER_AGE_MS.
