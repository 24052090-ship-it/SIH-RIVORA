# AquaGuard Phase 12 — MLOps & Operational Intelligence

Phase 12 adds an operational MLOps layer after Phase 11 validation. It tracks model versions, prediction activity, feature drift and data-ingestion runs.

## New APIs
- `GET /api/mlops/overview`
- `POST /api/mlops/predictions`
- `POST /api/mlops/drift`

## Database migration
`010_phase12_mlops.sql` adds `ai_model_registry`, `ai_predictions`, `ai_drift_metrics`, and `ingestion_runs`.

## Frontend
Authority → **MLOps Center** at `/authority/mlops`.

Synthetic/development models remain explicitly labelled. This phase does not claim production AI accuracy.
