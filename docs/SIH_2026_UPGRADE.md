# AquaGuard v31 — SIH Advanced Upgrade

AquaGuard v31 keeps the requested stack—React, Express, PostgreSQL/PostGIS and Python AI/ML—and strengthens the system for a high-level Smart India Hackathon demonstration.

## Major additions

- **City Command Center redesign:** live flood map, HydroFusion risk pulse, rainfall nowcast, drainage/road/citizen KPIs, response timeline and crew readiness.
- **Rainfall & Catchment Intelligence:** 12-hour nowcast, catchment threshold ETA, inflow-vs-capacity view, explainable risk factors and forecast-to-street mapping.
- **API & Data Integration Hub:** visual provider health and adapter tests for weather, Google routing, Sentinel satellite data, PostGIS and AquaGuard AI.
- **Sentinel Hub integration:** secure server-side OAuth2 and Sentinel-2 Catalog API search with cloud-cover filtering.
- **Google Maps Platform integration:** optional server-side Routes API adapter for traffic-aware baseline routing. AquaGuard's own PostGIS flood-aware routing remains the safety layer.
- **HydroFusion AI:** combines XGBoost probability, 3-hour rainfall nowcast, satellite water evidence, soil saturation, sensor anomalies and citizen reports.
- **Zero-infrastructure SIH demo mode:** `npm run demo` gives judges a complete frontend experience without requiring PostgreSQL, Express, FastAPI or provider keys.

## Demo mode

```bash
npm install
npm run demo
```

Open `http://localhost:5173`, go to Login, choose **Authority**, and sign in with any valid-looking email and a password of at least six characters.

## Full system

For the real architecture, run PostGIS, the Express API, FastAPI AI service and frontend as described in the main README. Copy `backend/.env.example` to `backend/.env` and add provider keys only when available.

## AI safety / validity

The bundled XGBoost model is still a development model trained on synthetic data. HydroFusion is an advanced decision-support layer, but it must be calibrated and validated on local historical flood events before any real emergency deployment. The UI and APIs do not claim otherwise.
