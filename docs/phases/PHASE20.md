# AquaGuard Phase 20 — Real Data Integration & Dataset Governance

Phase 20 turns the Phase 19 real-data foundation into an operational staging workflow. Authority users can upload CSV datasets, run schema validation, review quality status, and approve datasets before they are used by AI/GIS pipelines.

## New capabilities
- Authority Data Integration Center at `/authority/data-integration`
- CSV staging for rainfall, water-level and historical flood-event datasets
- Dataset registry with source, version, license, geography and quality score
- Dataset quality checks
- Approval workflow: STAGED → VALIDATED → APPROVED → OPERATIONAL
- 5 MB upload limit and memory-safe multipart handling
- Postgres persistence for dataset metadata and validation results
- Authority-only APIs

## APIs
- `GET /api/data-integration/overview`
- `POST /api/data-integration/stage-csv`
- `POST /api/data-integration/:id/approve`

## Important
This is a data-governance and staging layer, not a claim that external datasets are automatically trustworthy. Real sources must still be checked for licensing, geographic coverage, units, timestamps, missingness and ground truth quality before operational use.
