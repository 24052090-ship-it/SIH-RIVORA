# AquaGuard Phase 8

Phase 8 adds three production-oriented foundations: satellite/geospatial intelligence, predictive drainage maintenance, and advanced analytics.

## Predictive maintenance
`GET /api/maintenance/predictions` calculates a transparent baseline risk score from drain water level, blockage, capacity loss, maintenance age and recent reports. It is explicitly a development baseline (`baseline-maintenance-v1`), not a trained ML model.

## Satellite
`GET /api/satellite/status` and `/api/satellite/observations` expose a provider-neutral contract. Configure `SATELLITE_ENABLED`, `SATELLITE_PROVIDER`, `SATELLITE_COLLECTION`, and `SATELLITE_TILE_URL` only when you have an appropriate imagery/tile service. No fabricated satellite detections are generated.

## Analytics
`GET /api/analytics/summary` and `/api/analytics/trends` expose aggregated operational metrics for the authority dashboard.

## Database
Migration `008_phase8.sql` adds `maintenance_predictions` and `satellite_observations`.

## Next
Phase 9 can replace the maintenance baseline with a trained predictive-maintenance model, add validated satellite flood-water segmentation, and introduce a formal geospatial ETL pipeline.
