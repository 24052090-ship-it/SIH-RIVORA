# AquaGuard Phase 9 — Production Hardening & Data Readiness

Phase 9 does not add another demo feature. It hardens the system and prepares the project for credible real-world/SIH validation.

## Included
- API rate limiting and deep health checks
- real dataset contracts for flood and vision models
- dataset validation utility
- production Dockerfiles for frontend/backend
- Nginx SPA configuration
- smoke-test script
- GitHub Actions CI workflow
- environment/security checklist
- model governance and evaluation guidance
- deployment runbook

## What remains data-dependent
- real local flood labels
- trained custom YOLO weights
- licensed/authorized satellite provider credentials
- physical IoT devices
- production secrets

Never present synthetic development metrics as field performance.
