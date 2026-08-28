# Phase 29 Production Runbook

This is a controlled deployment template. No real cloud credentials, TLS
private keys, or application secrets are stored in the repository.

## Pre-deployment gate

1. Choose an immutable release tag.
2. Inject production secrets outside source control.
3. Configure the real HTTPS CORS origin.
4. Provide TLS certificates through TLS_CERT_DIR.
5. Run:
   `python scripts/production-preflight.py --production`
6. Take and verify a database backup.
7. Confirm rollback owner and previous application release tag.

## Deployment

1. Provision or verify PostgreSQL 16/PostGIS 3.4-class infrastructure.
2. Build release-tagged containers using `docker-compose.production.yml`.
3. Run database migrations before serving traffic. Production Compose runs
   migrations but never demo seeding.
4. Start AI and backend services on internal Docker networks.
5. Start Nginx/frontend as the only public application entry point.
6. Verify HTTP redirects to HTTPS and HSTS is present.
7. Verify `/health`, `/api/health`, and `/api/system/deep`.
8. Run authenticated smoke checks and Phase 28 validation against staging or
   the approved production verification window.
9. Verify Socket.IO reconnects through Nginx.
10. Confirm device telemetry rejects non-TLS requests.

## Network model

- PostgreSQL: internal backend network only
- AI service: internal backend network only
- Backend: internal, reachable by Nginx and AI/Postgres dependencies
- Frontend/Nginx: public ports 80 and 443
- Nginx sends X-Forwarded-Proto and X-Forwarded-For
- Express trusts exactly one proxy hop in the bundled deployment
- device TLS checks use trusted-proxy-aware `req.secure`

Do not expose backend port 5000 directly when TRUST_PROXY_HOPS=1.

## Health and monitoring

Monitor:
- API/deep-health status
- PostgreSQL availability and connection saturation
- AI-service health
- HTTP 5xx/4xx rates
- p95/p99 latency
- Socket.IO connection failures
- telemetry freshness and ingestion errors
- rate-limit events
- disk/backup job failures
- audit-log persistence

Phase 28 local measurements are not production SLAs.

## Rollback

Application rollback:
1. stop new traffic or put the deployment in maintenance mode
2. preserve logs and incident evidence
3. set AQUAGUARD_RELEASE_TAG to the previously approved image tag
4. redeploy the previous frontend/backend/AI images
5. rerun health and smoke tests

Database rollback is separate. Do not automatically reverse database state
because application rollback does not imply database rollback. Restore a
database backup only after reviewing migration compatibility and the incident.

## Disaster recovery

1. declare the incident and identify the last known-good release and backup
2. provision isolated recovery infrastructure
3. restore the selected backup
4. run migrations only if required by the selected application release
5. validate PostGIS, critical tables, AI registry data, telemetry schema, and
   application health
6. deploy the selected immutable release
7. run smoke/Phase 28 checks
8. cut traffic over only after validation
9. record actual recovery duration and data-loss window

RPO/RTO are deployment-owner decisions. AquaGuard does not claim recovery
guarantees until they are measured in the real recovery environment.
