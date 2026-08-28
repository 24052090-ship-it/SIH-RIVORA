# AquaGuard Phase 15 — City Digital Twin & Resilience Planning

Phase 15 adds a City Digital Twin planning layer over the existing GIS, telemetry, AI, routing, incident and emergency-communications architecture.

## New capabilities
- Authority City Digital Twin page
- Live infrastructure snapshot from PostgreSQL
- What-if resilience scenarios
- Rainfall, drainage capacity, blocked-drain and duration controls
- Projected affected zones, roads and population exposure
- Recommended planning actions
- Explicit planning-only warning; no unvalidated emergency forecast claims

## API
- `GET /api/digital-twin/overview`
- `POST /api/digital-twin/scenario`

## Architecture
Sensors + rainfall + drains + roads + flood zones + AI risk + incidents + emergency state -> Digital Twin planning view.

The scenario engine is a transparent planning baseline. It must be replaced or calibrated against validated local hydrology/flood models before operational use.
