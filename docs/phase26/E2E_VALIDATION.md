# Phase 26 End-to-End Validation

Validate the complete event chain with deterministic fixtures.

Core scenarios:
1. LOW: normal rainfall, normal water level, no blockage.
2. HIGH: heavy rainfall + elevated water level + blockage.
3. CRITICAL: extreme rainfall + severe water level + strong vision evidence.
4. FALSE-ALARM REVIEW: strong single signal with weak corroboration.
5. SENSOR-GAP: missing telemetry must not silently become zero.

For each scenario record:
- inputs
- model versions
- fusion score/level
- incident decision
- alert decision
- response action
- expected vs actual
- execution timestamp

Do not treat synthetic scenario pass rates as model accuracy.
