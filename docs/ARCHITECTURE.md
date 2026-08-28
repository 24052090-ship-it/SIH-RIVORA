# AquaGuard Release Architecture

## System boundary

AquaGuard is implemented as a multi-service urban flood-response platform.

```text
Browser
  -> React + Vite
  -> Nginx / HTTPS in production
       -> Express REST API + Socket.IO
            -> PostgreSQL + PostGIS
            -> FastAPI AI service
            -> weather / GIS / satellite adapters
            -> authenticated IoT telemetry ingestion
```

Production frontend traffic is same-origin. Nginx proxies `/api` and
`/socket.io` to the backend. PostgreSQL and the AI service remain on internal
networks in the production Compose template.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Axios, Leaflet, Recharts |
| API | Node.js, Express 5 |
| Realtime | Socket.IO |
| Authentication | JWT, bcrypt |
| Database | PostgreSQL 16 + PostGIS |
| AI service | FastAPI, Uvicorn |
| Flood ML | XGBoost / scikit-learn pipeline |
| Vision | Ultralytics YOLO interface |
| Geospatial | PostGIS, Leaflet, provider adapters |
| Production edge | Nginx, HTTPS |
| Packaging | Docker / Docker Compose templates |

## Main operational flow

```text
Telemetry / reports / external data
  -> governed input validation
  -> flood + vision inference contracts
  -> multimodal risk fusion
  -> incident / alert decision support
  -> GIS routing and response assignment
  -> field workflow
  -> audit and realtime updates
```

## GIS contracts

| Entity | Geometry |
|---|---|
| Sensor | Point |
| Drain | Point |
| Citizen report | Point |
| Road | LineString |
| Safe route | LineString |
| Flood zone | Polygon |

## AI governance boundary

AquaGuard records model version, model status, dataset version, prediction
timestamp, output/confidence and source. Development models are not silently
presented as production models.

The currently validated local runtime uses an XGBoost development model and
does not have an approved custom YOLO production artifact. Multimodal risk
fusion is a transparent weighted score and is not a calibrated probability.

## External-data boundary

Provider adapters support weather, GIS, satellite and device telemetry.
Unconfigured providers return explicit unavailable/configuration states rather
than fabricated data.

## Production security boundary

- HTTPS terminates at Nginx.
- Express trusts only the configured reverse-proxy hop count.
- Device TLS checks use trusted-proxy-aware `req.secure`.
- JWT and role checks protect authority endpoints.
- Provider and device credentials remain server-side.
- Local secret files and backup artifacts are excluded from Git and Docker
  build contexts.

## Failure behavior

Deep health reports database and AI-service status independently. Phase 28
validated database degradation, AI-service unavailability, Socket.IO
reconnects, stale sensor states, duplicate telemetry rejection and partial
provider outage behavior in the local non-production environment.
