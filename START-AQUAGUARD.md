# Starting AquaGuard — Quick Reference

Run these in three separate terminals, plus the database. All commands are
run from the `AquaGuard-Master/` project root unless noted.

## Database (once, before everything else)
```bash
docker compose up -d postgres
cd backend
npm run db:init
npm run db:migrate
npm run db:seed
cd ..
```
Or point `backend/.env`'s `DATABASE_URL` at your own already-running
PostgreSQL + PostGIS instance and run the same three `npm run db:*` commands.

## Terminal 1 — Backend
```bash
cd backend
npm install
cp .env.example .env   # first time only — then edit values
npm run dev
```
Runs at http://localhost:5000 — health check: http://localhost:5000/api/health

## Terminal 2 — AI service
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # first time only
python -m uvicorn app.main:app --reload --port 8000
```
Runs at http://localhost:8000 — health check: http://localhost:8000/health

## Terminal 3 — Frontend
```bash
npm install
cp .env.example .env          # first time only
npm run dev
```
Runs at http://localhost:5173

## Demo credentials
- Citizen: `demo@aquaguard.ai` / `password`
- Authority: `authority@aquaguard.ai` / `password`

## Shutting down
`Ctrl+C` in each terminal, then:
```bash
docker compose down
```
