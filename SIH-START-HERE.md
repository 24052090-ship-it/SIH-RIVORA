# AquaGuard v31 — Start Here

## Fastest judge/demo mode

This runs only the React UI with realistic demo data. No PostgreSQL, backend, AI service or API keys are required.

```bash
npm install
npm run demo
```

Open `http://localhost:5173` → **Login** → choose **Authority** → enter any valid-looking email and a password with at least six characters.

Recommended demo pages:
1. Command Center
2. Hydro Intelligence
3. Satellite Intelligence
4. Integration Hub
5. City Digital Twin
6. Incident Command
7. Citizen Safe Route

## Full stack with Docker

Requires Docker Desktop / Docker Engine.

```bash
docker compose -f docker-compose.sih.yml up --build
```

Then open `http://localhost:8080`.

Seeded full-stack credentials:
- Authority: `authority@aquaguard.ai` / `password`
- Citizen: `demo@aquaguard.ai` / `password`

Optional provider credentials can be passed as shell environment variables before starting Docker:

```bash
export GOOGLE_MAPS_API_KEY="..."
export SENTINEL_HUB_CLIENT_ID="..."
export SENTINEL_HUB_CLIENT_SECRET="..."
docker compose -f docker-compose.sih.yml up --build
```

On Windows PowerShell, use `$env:GOOGLE_MAPS_API_KEY="..."` etc.

## Important

The bundled XGBoost artifact is a development model trained on synthetic data. It and the new HydroFusion layer must be validated on approved local historical flood data before operational emergency use.
