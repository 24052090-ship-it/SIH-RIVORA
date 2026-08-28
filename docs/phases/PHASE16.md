# AquaGuard Phase 16 — Production Operations & Observability

Phase 16 is the release-engineering layer after the City Digital Twin. It focuses on operational visibility, measurable service health, release gates and production readiness rather than adding another simulated AI feature.

## Added
- Authority Operations Center at `/authority/operations`.
- Authenticated authority API: `GET /api/system/operations/overview`.
- Database latency and service-state reporting.
- Online sensor, active alert and open incident counters.
- Release-gate checklist and operational documentation.
- Operations smoke test: `npm run operations:test`.

## Run
Set an authority JWT:
- PowerShell: `$env:AQUAGUARD_TOKEN="<jwt>"`
- CMD: `set AQUAGUARD_TOKEN=<jwt>`

Then run:
`npm run operations:test`

## Production principles
- No claim of physical sensor connectivity unless hardware is connected.
- No claim of real satellite processing unless a provider is configured.
- AI models remain explicitly versioned and should only be promoted after validation.
- Keep secrets in environment variables, never in source control.
- Back up PostgreSQL/PostGIS before migrations and rehearse restore procedures.
- Use HTTPS, restrictive CORS and production rate limits at deployment.
