# AquaGuard Phase 18 — Field Mobile & Offline Operations

Phase 18 adds a mobile-first field crew interface on top of Phase 17 dispatch. It supports task status updates, browser location check-ins, an offline queue, and a real backend field-update endpoint.

## New route
`/authority/field-mobile`

The demo currently uses the existing Authority JWT because the project has not yet introduced a separate FIELD_WORKER role. Production should add a dedicated least-privilege field-worker role and mobile authentication.

## Backend
- Migration `014_phase18_field_mobile.sql`
- `PATCH /api/field-operations/tasks/:id/field-update`
- `crew_checkins`
- `task_status_updates`
- `task_evidence` schema for the next evidence-upload integration
- Socket.IO event `fieldTaskUpdated`

## Offline behavior
If the browser is offline, task updates are stored in localStorage and can be synchronized with **Sync Queue** after connectivity returns. This is an explicit client-side offline queue, not a claim of full offline database replication.

## Run
```bash
npm run backend:migrate
npm run dev
```

For the API integration test:
```bash
$env:AQUAGUARD_TOKEN="<authority-jwt>"
npm run fieldmobile:test
```
