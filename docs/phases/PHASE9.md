# AquaGuard Phase 9

## Production hardening, validation and deployment readiness

This phase consolidates Phases 1–8 into a safer, testable baseline.

### Added
1. Lightweight API rate limiting.
2. Deep database health endpoint: `/api/system/deep`.
3. Dataset contracts and validation for flood ML and YOLO vision data.
4. Production Dockerfiles for frontend and backend.
5. Nginx SPA configuration.
6. Smoke-test script for API health/auth/GIS endpoints.
7. CI workflow for build and syntax checks.
8. Deployment, security and model-governance documentation.

### Run dataset validation

```bash
python ai-service/scripts/validate_dataset.py ai-service/data/flood/flood_training_template.csv
```

### Production principle

Use real, provenance-tracked, time-aware local data before reporting model accuracy. Synthetic data is for integration testing only.
