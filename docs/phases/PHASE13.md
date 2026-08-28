# AquaGuard Phase 13 — Unified Incident Intelligence

Phase 13 adds an operational incident-command layer that fuses rainfall, water-level telemetry, flood-risk predictions, computer-vision reports, GIS context, and maintenance signals into trackable emergency incidents.

## Added
- Incident and incident_actions PostgreSQL/PostGIS tables
- Priority queue and severity/status lifecycle
- Authority Incident Command page
- Recommended response actions
- Crew assignment tracking
- SLA metadata
- Real-time incidentCreated / incidentUpdated / incidentActionCreated events
- Incident overview REST API
- Incident smoke test

## Incident lifecycle
OPEN → ACKNOWLEDGED → DISPATCHED → CONTAINED → RESOLVED → CLOSED

## New route
`/authority/incident-command`

## API
- `GET /api/incidents/overview`
- `POST /api/incidents`
- `PATCH /api/incidents/:id`
- `POST /api/incidents/:id/actions`

## Important
The incident layer orchestrates existing signals. It does not claim that synthetic AI data is real. Model provenance remains visible through `source_summary` and model-version metadata.
