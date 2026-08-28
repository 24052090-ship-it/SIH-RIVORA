# Phase 30 Evidence Matrix

This matrix separates implemented capability from measured local evidence and
from items that still require real deployment/data evidence.

## Evidence recorded on 28 August 2026

| Claim | Status | Evidence | Allowed wording |
|---|---|---|---|
| Full-system integration | Verified locally | Phase 28 validation: 28/28 checks passed | "Passed the local full-system validation harness." |
| Production frontend build | Verified locally | Vite production build completed successfully | "Production build passes." |
| API security controls | Verified locally | JWT 401, invalid JWT 401, citizen/authority 403/200 boundary, hostile-origin CORS check, SQL-injection login rejection, upload restriction | "Core API security controls passed local validation." |
| Realtime | Verified locally | Socket.IO connection + reconnect passed | "Realtime connection and reconnect were validated locally." |
| API latency | Measured locally only | p95 14.42 ms for 40 health requests at concurrency 8; 0 error rate | "Local smoke-load p95 was 14.42 ms." |
| Database-backed health latency | Measured locally only | p95 13.62 ms for 15 requests at concurrency 3; 0 error rate | "Local smoke-load p95 was 13.62 ms." |
| Telemetry read latency | Measured locally only | p95 11.81 ms for 20 requests at concurrency 4; 0 error rate | "Local smoke-load p95 was 11.81 ms." |
| Backup | Verified locally | PostgreSQL custom-format backup created and SHA-256 recorded | "A local backup drill passed." |
| Restore | Verified locally | Disposable restore passed; PostGIS and required schema validated; cleanup passed | "A local disposable restore drill passed." |
| Restore time | Measured locally only | 3.242 seconds in the latest local drill | "Latest local restore drill took 3.242 s." |
| Production deployment | Template/readiness only | Production Compose, Nginx HTTPS config, static preflight | "Prepared for controlled deployment." Do not say deployed. |
| XGBoost inference | Development runtime verified | model version `aquaguard-flood-xgb-v1.1`, status development, mode development-fallback | "Governed development flood inference is running." |
| YOLO vision | Not production-evidenced | no approved custom production weights in the validated runtime | "Vision integration is implemented; production model evidence is pending." |
| Real held-out model accuracy | Not evidenced | no approved real-dataset metric package supplied in this release | Do not state precision/recall/F1/AUC/mAP claims. |
| Multimodal risk fusion | Validated as deterministic decision-support logic | Phase 25/26 and Phase 28 runtime checks | "Transparent weighted risk fusion is validated as decision-support logic." |
| Fusion probability calibration | Not evidenced | weighted score is explicitly not calibrated probability | Do not call the score a calibrated flood probability. |
| Municipal operational impact | Not measured | no real municipal deployment study in repository | Describe intended impact, not achieved impact. |

## Additional validation facts

The latest hardened Phase 28 rerun reported:
- 28 checks passed, 0 failed
- Socket.IO first connection: 17.4 ms
- Socket.IO reconnect: 5.35 ms
- duplicate device telemetry: first request 202, duplicate 409
- route-level device limiter reached HTTP 429 during the controlled rate-limit test
- database failure returned degraded deep health
- unavailable AI vision service returned HTTP 503
- deterministic Phase 26 scenarios passed 5/5

These figures describe a local non-production test environment. They are not
production SLAs, capacity guarantees, flood-model accuracy or impact estimates.

## Remaining evidence before an operational claim

- approved local training/evaluation dataset
- held-out XGBoost metrics and calibration
- trained/approved YOLO artifact and held-out vision metrics
- deployed cloud/municipal environment validation
- production monitoring history
- authority-approved alert/evacuation thresholds
- measured production RPO/RTO
