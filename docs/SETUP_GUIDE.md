# AquaGuard — Setup Guide (for a new developer)

Follow these steps in order. Commands are copy-pasteable for Linux/macOS;
Windows equivalents are noted where they differ.

## 1. Install Node.js
Install Node.js 20+ from https://nodejs.org, or via `nvm install 20`.
Verify: `node --version`

## 2. Install Python
Install Python 3.11+ from https://python.org.
Verify: `python3 --version`

## 3. Install PostgreSQL
Install PostgreSQL 16, or skip this and use Docker (step 4 covers it via
`docker-compose.yml`, which uses the `postgis/postgis:16-3.4` image).

## 4. Install PostGIS
If using your own PostgreSQL install (not Docker), install the PostGIS 3.4
extension package for your OS, then in your target database:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
(This is also done automatically by `backend/database/schema.sql`.)

## 5. Clone/extract the project
Extract `AquaGuard-Master/` to your workspace. Do not delete the sibling
historical phase folders if you kept them — they are backups only and are
never referenced at runtime.

## 6. Frontend: npm install
```bash
npm install
```

## 7. Configure .env files
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```
Edit `backend/.env` at minimum: set `DATABASE_URL`, `JWT_SECRET`, and
`DEVICE_API_KEY` to real (non-default) values before anything beyond local
demo use.

## 8. Create the database
Option A — Docker (recommended):
```bash
docker compose up -d postgres
```
Option B — your own PostgreSQL server: create a database named `aquaguard`
(or match whatever you set in `DATABASE_URL`).

## 9. Enable PostGIS
Already handled by `docker-compose.yml` (uses a PostGIS image) or by
`backend/database/schema.sql`'s `CREATE EXTENSION` statements (step 10 runs
this file for you).

## 10. Run migrations
```bash
cd backend
npm install
npm run db:init      # applies backend/database/schema.sql (base schema)
npm run db:migrate   # applies backend/database/migrations/*.sql in order
npm run db:seed      # inserts demo users + sample sensors/drains/rainfall
```

## 11. Install AI dependencies
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 12. Start backend
```bash
cd backend
npm run dev
```
Confirm: `curl http://localhost:5000/api/health` returns `{"status":"ok", ...}`.

## 13. Start AI service
```bash
cd ai-service
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```
Confirm: `curl http://localhost:8000/health` returns a JSON status.

## 14. Start frontend
```bash
npm run dev
```

## 15. Open browser
Visit http://localhost:5173

## 16. Test authentication
- Sign up as a citizen, or log in with the seeded demo account:
  `demo@aquaguard.ai` / `password`.
- Log in as authority with: `authority@aquaguard.ai` / `password`.
- Confirm the logged-in user's real name (from the database) appears in the
  UI — not a hardcoded placeholder.

## 17. Test GIS
Open the citizen or authority map view and confirm sensors, drains, flood
zones, and reports render on the Leaflet/OpenStreetMap base layer.

## 18. Test reporting
As a citizen, submit a report (with or without a photo) from "Report Issue"
and confirm it appears under "My Reports" and (if realtime is enabled) is
visible to an authority session in real time.

## 19. Test AI
With `ai-service` running, submit an image via the citizen report flow (or
`POST /vision/analyze` directly) and confirm you get a structured response —
it will report low/no confidence until a trained model is present, which is
expected (see `MERGE_REPORT.md` §15).

## 20. Test authority dashboard
Log in as authority and confirm Live Monitoring, Flood Risk, Reports,
Maintenance, Sensors, and Analytics pages all load without errors.
