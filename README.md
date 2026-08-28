# AquaGuard — AI-Powered Smart City Flood & Drainage Command Center

**Version:** 31.0.0 (Final SIH Release, merged from 30 development phases)

AquaGuard is an AI-powered urban resilience platform that monitors rainfall and
drainage conditions, predicts flood risk, detects waterlogging/blockages from
images, maps hazards on a live GIS command view, recommends safer travel
routes, and coordinates municipal (authority) response — from citizen
reporting through field-crew dispatch to post-incident maintenance.

This is the **consolidated master build**, merged from 30 incremental
development phases (`docs/phases/` and `docs/phaseNN/` hold the historical
per-phase documentation). See `MERGE_REPORT.md` for exactly how the merge was
done, what was inspected, and what was fixed.

---

## v31 SIH advanced upgrade

This build adds a redesigned City Command Center, a new Rainfall & Catchment Intelligence workspace, a secure API Integration Hub, Sentinel Hub catalog discovery, an optional Google Routes traffic adapter, and a FastAPI HydroFusion multi-signal risk layer. A zero-infrastructure frontend demo mode is also included for judging. See `docs/SIH_2026_UPGRADE.md` and `docs/API_INTEGRATIONS_V31.md`.

Quick UI demo:
```bash
npm install
npm run demo
```
Then open the login page, choose the Authority role, and sign in with any valid-looking email/password. Demo mode uses local mock authentication and data; the full deployment still uses Express, PostGIS and FastAPI.

## 1. Architecture

```text
React + Vite (frontend)
   -> Axios services
   -> Express.js REST API (backend)
        -> PostgreSQL + PostGIS (spatial data)
        -> FastAPI AI/ML service (flood risk + vision)
   -> Socket.IO (realtime: reports, alerts, sensors, maintenance)
   -> IoT device telemetry ingestion
   -> External provider adapters (weather, satellite) behind service boundaries
```

See `docs/ARCHITECTURE.md` and `docs/API_CONTRACTS.md` for details.

## 2. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript/JSX, React Router, Axios, Leaflet + React-Leaflet, Recharts, plain CSS |
| Backend | Node.js, Express.js, Socket.IO |
| Database | PostgreSQL + PostGIS |
| AI/ML | Python, FastAPI, XGBoost (flood risk), YOLO/Ultralytics (vision) |
| Realtime | Socket.IO |

No TypeScript, Tailwind, Bootstrap, Material UI, Next.js, or MongoDB is used anywhere in this project — the original stack has been preserved throughout the merge.

## 3. Folder structure

```text
AquaGuard-Master/
├── src/                 # React + Vite frontend (citizen + authority command center)
├── backend/             # Express + PostgreSQL/PostGIS API
│   ├── src/
│   └── database/        # schema.sql + migrations/
├── ai-service/          # FastAPI AI/ML service (flood risk + vision)
│   ├── app/
│   ├── scripts/         # training/validation scripts
│   ├── dataset/, data/, models/
├── data/imports/        # rainfall/water-level/flood-event import templates
├── demo/                # SIH demo scenario data
├── docs/                # architecture, API contracts, per-phase historical docs
│   └── phases/          # historical PHASE*.md notes (development history only)
├── scripts/             # smoke/readiness/mlops/validation/demo scripts
├── frontend-deploy/      # Nginx + Dockerfile for the built frontend
├── docker-compose.yml    # PostGIS + AI service containers
└── reference/            # UI reference image
```

## 4. Installation

### Prerequisites
- Node.js 20+
- Python 3.11+ (3.12 verified)
- PostgreSQL 16 with PostGIS 3.4 (or use the provided `docker-compose.yml`)
- (Optional) Docker, for the PostGIS/AI containers

### Environment variables
Copy and edit each `.env.example`:
```bash
cp .env.example .env                    # frontend (Vite)
cp backend/.env.example backend/.env    # backend (Express)
cp ai-service/.env.example ai-service/.env  # AI service
```
Never commit real `.env` files or secrets — `.gitignore` already excludes them.

### Frontend
```bash
npm install
npm run dev        # http://localhost:5173
npm run build       # production build -> dist/
```

### Backend
```bash
cd backend
npm install
docker compose up -d postgres   # or point DATABASE_URL at your own PostGIS instance
npm run db:init                 # applies backend/database/schema.sql
npm run db:migrate              # applies backend/database/migrations/*.sql in order
npm run db:seed                 # demo users + sample sensors/drains/rainfall
npm run dev                     # http://localhost:5000
```

Demo credentials (seeded, not production accounts):
- Citizen: `demo@aquaguard.ai` / `password`
- Authority: `authority@aquaguard.ai` / `password`

### AI service
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

## 5. Testing / validation

Run from the project root once backend deps are installed:
```bash
npm run smoke:test
npm run readiness:test
npm run mlops:test
npm run ingestion:test
npm run incident:test
npm run broadcast:test
npm run operations:test
npm run fieldops:test
npm run fieldmobile:test
npm run data:validate
npm run data:integration:test
```
Python-side validation (from `ai-service/` with the venv active):
```bash
python ../scripts/integration-smoke.py
python ../scripts/production-preflight.py
python ../scripts/validate-model-registry.py
python ../scripts/evaluate-flood-model.py
```
See `MERGE_REPORT.md` for exactly which of these were actually run during the merge and their results — this README does not claim success for anything that wasn't verified.

## 6. AI model setup

Two model families, both **explicitly gated** — nothing is silently promoted to production:

- **Flood risk (XGBoost):** `ai-service/models/flood_xgb.json` ships as a
  **development model trained on synthetic data** (see `ai-service/models/metrics.json`
  — labeled `"dataset": "synthetic development data"`). Train a real model with
  `scripts/train-real-flood-model.py` once you have an **approved** local
  dataset (see `data/imports/README.md` for the provenance workflow).
- **Vision (YOLO):** no trained weights are bundled. `ai-service/scripts/train_yolo.py`
  fine-tunes from a base checkpoint controlled by `AQUAGUARD_YOLO_BASE_MODEL`
  (default `yolo11n.pt`, corrected from a prior invalid `yolo26n.pt` — see
  `MERGE_REPORT.md`). `ai-service/scripts/train-yolo-real.py` is gated behind
  `--approved` and requires an approved Ultralytics dataset YAML.

Model status flows `CANDIDATE -> APPROVED -> PRODUCTION` (or `RETIRED`) per
`ai-service/model_registry.example.json`; nothing is claimed production-ready
without evaluation evidence.

## 7. GIS configuration

- Leaflet + React-Leaflet with OpenStreetMap tiles (no API key required by default).
- PostGIS geometries: sensors/drains/reports = `POINT`, roads/safe routes = `LINESTRING`, flood zones = `POLYGON`.
- Satellite overlays (Phase 8) are optional and controlled by `VITE_ENABLE_SATELLITE` / `SATELLITE_*` env vars — off by default, and no provider keys are hardcoded in the frontend.

## 8. IoT configuration

Device telemetry ingestion expects `deviceId, timestampUtc, latitude, longitude, rainfallMmHr, waterLevelCm, batteryPct, signalRssi`, authenticated via `DEVICE_API_KEY` (see `backend/.env.example`). `npm run simulate:sensor` sends simulated telemetry for local testing — clearly a simulator, not real sensor data.

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `npm run build` fails | Re-run `npm install`; make sure you're on the merged master, not an older phase copy |
| Backend can't connect to DB | Check `DATABASE_URL` in `backend/.env` and that PostGIS is running (`docker compose up -d postgres`) |
| `/vision/analyze` returns not-ready | No trained `aquaguard_yolo.pt` present yet — this is expected until you train/approve one |
| Weather sync errors in logs | External weather API unreachable from your network; this only affects the optional live weather sync, not core functionality |

## 10. SIH demonstration

See `docs/phase30/DEMO_SCRIPT.md`, `docs/phase30/JUDGE_QA.md`, `docs/sih/PROJECT_ONE_LINER.md`, and `START-AQUAGUARD.md` for the exact three-terminal startup sequence used for demos.

## 11. Further reading

- `MERGE_REPORT.md` — how this master build was produced from the 30 phases
- `docs/SETUP_GUIDE.md` — step-by-step setup for a new developer
- `START-AQUAGUARD.md` — exact commands to run all services
- `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md` — technical reference
- `CHANGELOG.md` — full phase-by-phase change history
- `docs/phases/` and `docs/phaseNN/` — historical per-phase documentation (development history only, not part of the runtime app)
