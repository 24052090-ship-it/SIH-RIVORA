# AquaGuard Phase 24 — Unified AI Model Registry & End-to-End Inference

Phase 24 connects the evaluated XGBoost flood model and YOLO vision candidate into one governed inference layer.

Pipeline:
Sensors / rainfall → flood model
Images → vision model
Both → model registry → risk fusion → AquaGuard incident/risk APIs.

Production promotion remains explicit; missing real models falls back to clearly labelled development/demo behavior.
