# AquaGuard Backend

Express + PostgreSQL + PostGIS backend for AquaGuard.

## Requirements
- Node.js 20+
- Docker Desktop (recommended for PostgreSQL/PostGIS)

## Start database
From the project root:

```bash
docker compose up -d postgres
```

The PostGIS schema is automatically created from `backend/database/schema.sql`.

## Start API

```bash
cd backend
copy .env.example .env
npm install
npm run db:init
npm run db:seed
npm run dev
```

Linux/macOS:

```bash
cp .env.example .env
```

API: http://localhost:5000

Health: http://localhost:5000/api/health

## Demo credentials

Citizen:
- Email: `demo@aquaguard.ai`
- Password: `password`

Authority:
- Email: `authority@aquaguard.ai`
- Password: `password`

## API groups

- `/api/auth`
- `/api/dashboard`
- `/api/gis`
- `/api/reports`
- `/api/alerts`
- `/api/maintenance`
- `/api/system` (incl. `/api/system/operations`, `/api/system/readiness`)
- `/api/ai`
- `/api/vision`
- `/api/routes` (flood-aware safe routing)
- `/api/realtime`
- `/api/audit`
- `/api/validation`
- `/api/mlops`
- `/api/incidents`
- `/api/emergency`
- `/api/digital-twin`
- `/api/field-operations`
- `/api/data-integration`
- rainfall/telemetry, satellite (Phase 8) and IoT device-ingestion endpoints served via `telemetry.js`/`compat.js`/`phase8.js`

See `docs/API_CONTRACTS.md` for request/response contracts and `backend/src/app.js` for the authoritative route registration.
