# AquaGuard Final Release Checklist

Legend:
- [x] implemented and supported by repository/test evidence
- [ ] still requires external evidence or a final presentation asset

## Product
- [x] Citizen dashboard
- [x] Authority command center
- [x] Live GIS map
- [x] Flood-risk visualization
- [x] Citizen reporting
- [x] Safe route
- [x] Alerts
- [x] Incident command
- [x] Emergency communications
- [x] Digital twin
- [x] Field operations
- [x] Mobile field workflow

## Backend
- [x] Express API
- [x] PostgreSQL/PostGIS
- [x] Authentication/authorization
- [x] API validation
- [x] Socket.IO
- [x] Error handling/degraded health behavior
- [x] Audit logging

## AI
- [x] XGBoost development-model provenance and inference contract
- [ ] Approved production XGBoost held-out metric package
- [x] YOLO integration/governance contract
- [ ] Approved trained YOLO production artifact and held-out metrics
- [x] Dataset provenance/governance workflow
- [x] Model versions and registry metadata
- [x] Risk-fusion deterministic scenario validation
- [x] Clear distinction between development/candidate/production models
- [x] Explicit statement that weighted fusion is not a calibrated probability

## Operations
- [x] Production static preflight
- [x] Production Docker/Nginx/HTTPS template
- [x] Local database backup drill
- [x] Local disposable restore test
- [x] Health/deep-health monitoring surface
- [x] Security validation
- [x] Local performance smoke test
- [x] Rollback procedure
- [x] Disaster-recovery procedure
- [ ] Real production deployment verification
- [ ] Production RPO/RTO measured and approved

## SIH release package
- [x] Problem/solution one-liner
- [x] Released architecture and technology summary
- [x] Innovation and technical-feasibility Q&A
- [x] Scalability explanation
- [x] End-to-end demo script
- [x] Evidence matrix with measured local results
- [x] Final release notes
- [ ] Repository demo screenshots
- [ ] Final presentation file
- [ ] Real-world impact metrics, if claimed

## Final acceptance

The software package is ready for final SIH review when the automated release
check passes. It is not an operational municipal deployment claim.

Before presenting:
1. capture screenshots from the actual running build
2. prepare the final presentation
3. use only claims allowed by `EVIDENCE_MATRIX.md`
4. label development AI outputs clearly
5. never present synthetic scenario pass rates as model accuracy
