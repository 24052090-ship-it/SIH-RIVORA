# AquaGuard Phase 17 — Field Operations & Crew Dispatch

Phase 17 adds a municipal field-response layer on top of incident command and emergency communications.

## Added
- Response crew registry with PostGIS locations.
- Dispatch task queue linked to incidents.
- Authority-only crew/task APIs.
- Crew lifecycle: AVAILABLE → ASSIGNED → EN_ROUTE → ON_SITE → AVAILABLE.
- Dispatch task lifecycle: QUEUED → ASSIGNED → EN_ROUTE → ON_SITE → COMPLETED.
- Real-time Socket.IO events: `dispatchTaskCreated`, `dispatchTaskUpdated`.
- Authority Field Operations page.
- Field operations smoke test.

## Run

```bash
npm install
npm run backend:migrate
npm run backend:dev
npm run dev
```

For the test:

```powershell
$env:AQUAGUARD_TOKEN="<authority-jwt>"
npm run fieldops:test
```

This phase uses development seed crews/tasks. It does not claim live municipal crews or physical GPS tracking until those integrations are configured.
