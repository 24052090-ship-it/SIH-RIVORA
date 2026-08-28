# Deployment Runbook

## Local
1. Start PostGIS.
2. Run backend migrations and seed.
3. Start AI service.
4. Start backend.
5. Start frontend.
6. Run `npm run smoke:test`.

## Production
- PostgreSQL/PostGIS should use managed or hardened infrastructure.
- Put Express and FastAPI behind a reverse proxy/TLS.
- Build frontend with `npm run build` and serve the `dist` directory via Nginx/CDN.
- Configure CORS and secrets for the real domain.
- Enable database backups and monitoring.
- Use real model artifacts only after validation and approval.
