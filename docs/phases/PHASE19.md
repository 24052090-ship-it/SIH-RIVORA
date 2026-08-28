# AquaGuard Phase 19 — Real Data Integration Foundation

Phase 19 begins the transition from development/mock data to real-world, local datasets. It provides import contracts, validation templates, provenance metadata, and safe staging rules. No synthetic data is presented as production truth.

## Data domains
- rainfall observations
- water-level observations
- drainage assets
- roads / GIS GeoJSON
- flood-event labels
- citizen reports

## Workflow
Source → raw staging → schema validation → quality checks → provenance → approved dataset → PostGIS/AI pipeline.

## Important
The included CSV/GeoJSON files are templates only. Replace them with authoritative datasets before training or operational use.
