# Phase 12 MLOps Protocol

1. Version datasets independently from model artifacts.
2. Store model name, version, task, metrics and dataset version.
3. Log prediction metadata without unnecessary personal data.
4. Compare live feature distributions with a fixed reference window.
5. Mark drift as `ok`, `warning`, or `alert` using validated thresholds.
6. Record ingestion runs and rejected-row counts.
7. Never promote a synthetic-data model to production.
8. Re-run Phase 11 validation before promotion.
9. Keep a rollback model version available.
