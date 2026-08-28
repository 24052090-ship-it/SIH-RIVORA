# AquaGuard v31 Upgrade Manifest

## New frontend
- `src/pages/authority/HydroIntelligence/` — rainfall, catchment, drainage-stress and AI-fusion workspace.
- `src/pages/authority/IntegrationHub/` — provider readiness, adapter testing, API contracts and key-isolation design.
- Redesigned `src/pages/authority/Dashboard/` — advanced municipal City Command Center.
- Enhanced `src/pages/authority/Satellite/` — Sentinel scene discovery workflow and evidence gating.
- Enhanced citizen Safe Route — optional Google traffic-aware benchmark alongside AquaGuard flood-aware routing.
- Reorganized authority sidebar and upgraded live topbar.

## New backend/provider layer
- `backend/src/services/providerService.js`
- `backend/src/controllers/providersController.js`
- `backend/src/routes/providers.js`
- Open-Meteo nowcast adapter.
- Google Maps Routes API adapter.
- Sentinel Hub OAuth2 + Catalog API adapter.

## New AI layer
- `ai-service/app/fusion.py`
- `FusionFeatures` / `FusionPrediction` schemas.
- `POST /predict/fusion` FastAPI endpoint.
- `POST /api/ai/fusion` Express proxy.

## Deployment and SIH support
- `.env.demo` — zero-infrastructure UI demo.
- `.env.production` — full local stack frontend defaults.
- `docker-compose.sih.yml` — PostGIS + FastAPI + Express + Nginx/React stack.
- `SIH-START-HERE.md`
- `RUN-SIH-DEMO.bat`
- `run-sih-demo.sh`
- `docs/SIH_2026_UPGRADE.md`
- `docs/API_INTEGRATIONS_V31.md`
- `docs/SIH_DEMO_PITCH.md`

## Validation performed in this packaging session
- New/modified backend JavaScript files passed `node --check`.
- New/modified Python AI files passed `python -m py_compile`.
- Package JSON and lock files were parsed successfully.
- New frontend relative import paths were checked for existence.

A full Vite dependency install/build could not be executed in the packaging sandbox because npm registry installation did not complete within the available tool runtime. The source therefore includes the validation above plus the original project's existing test scripts for local verification.
