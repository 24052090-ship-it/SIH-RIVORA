# AquaGuard Phase 11 — Data & AI Validation

Phase 11 moves the platform from feature-complete engineering into evidence-based validation.

## Added
- Authority Data & AI Validation Center at `/authority/validation`.
- `/api/validation/summary` for operational data and model metadata.
- `/api/validation/data-quality` for database availability checks.
- Model governance messaging that distinguishes synthetic development metrics from real-world validation.
- A structured place to review rainfall, sensors, reports and maintenance data before SIH demos.

## Purpose
Do not claim real-world model accuracy until local historical rainfall/flood labels and representative images are used for evaluation.

## Next work
1. Import real/local historical rainfall data.
2. Build a verified flood-event label set.
3. Train and time-split the XGBoost model.
4. Collect and label representative drainage/flood images.
5. Train and evaluate the custom YOLO model.
6. Benchmark safe routing against flood scenarios.
7. Run end-to-end tests with real sensors.
