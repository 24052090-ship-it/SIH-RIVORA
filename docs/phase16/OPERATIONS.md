# Phase 16 Operations Runbook

## Pre-release gate
1. `npm install` and `npm run build` from the frontend root.
2. Start PostgreSQL/PostGIS and run migrations.
3. Start Express and verify `/api/health` and `/api/system/deep`.
4. Verify the authority Operations Center.
5. Run smoke, validation, incident, broadcast and operations tests.
6. Verify AI model status and dataset/model versions.
7. Verify Socket.IO connectivity if realtime is enabled.
8. Confirm satellite provider configuration before enabling satellite features.
9. Back up the database before release.

## Observability targets
- API availability: target >= 99.5% for demo/staging; define a stricter production SLO after deployment data is available.
- Database latency: investigate sustained API DB checks above 200 ms.
- Telemetry freshness: investigate sensors with stale readings.
- Critical incidents: acknowledgement and dispatch times should be tracked from Phase 13 SLA fields.

These are operational targets, not measured production guarantees.

## Recovery
- Restore the latest verified PostgreSQL/PostGIS backup.
- Re-run migrations only after checking schema compatibility.
- Revert the application image/version using the release manifest.
- Disable optional AI/satellite/realtime flags if a dependent service is unavailable.
