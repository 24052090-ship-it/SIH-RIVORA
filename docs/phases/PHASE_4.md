# AquaGuard Phase 4 — AI Flood Prediction

Phase 4 adds the first real ML service: FastAPI + XGBoost binary flood-risk classification.

## Architecture

React → Express `/api/ai/*` → FastAPI `/predict/flood` → XGBoost → prediction + factors → React.

FastAPI uses Pydantic request models for validated JSON bodies and automatically exposes OpenAPI documentation. XGBoost provides the Python/scikit-learn classifier interface used by the training script.

## Model features

- rainfall_15m
- rainfall_1h
- rainfall_3h
- rainfall_24h
- water_level
- drain_capacity
- blockage
- elevation
- slope
- historical_incidents

## Risk thresholds

- LOW: < 0.25
- MEDIUM: 0.25–0.49
- HIGH: 0.50–0.74
- CRITICAL: >= 0.75

## Important limitation

The included training data is synthetic development data. Metrics are engineering smoke-test metrics, not evidence of field accuracy. For SIH final validation, replace it with labeled local historical events and use a time-aware train/validation/test split.
