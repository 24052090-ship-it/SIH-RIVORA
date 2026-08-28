# Phase 28 Test Plan

## Functional
Sensor → risk → incident → alert → route → dispatch → field update.

## Performance
Measure:
- API p50/p95/p99 latency
- database query latency
- Socket.IO delivery latency
- concurrent users
- telemetry throughput

## Security
Check:
- JWT validation
- role/permission boundaries
- rate limiting
- input validation
- upload restrictions
- CORS
- secret handling
- SQL injection resistance
- audit logging

## Resilience
Simulate:
- database unavailable
- AI service unavailable
- Socket.IO disconnect
- stale sensor data
- provider timeout
- duplicate telemetry
- partial external API outage

Record expected behavior and recovery time.


## Automated harness

Run in a non-production environment with backend and AI services running:

npm run phase28:test

The harness covers API/PostGIS/AI contracts, Socket.IO connection and reconnect,
the Phase 26 incident-alert-response chain, JWT/role boundaries, input/upload
validation, SQL-injection resistance, CORS, secret non-disclosure, telemetry
replay protection and rate limiting, sensor freshness, database failure, AI
service failure, and partial external-provider outage behavior.

Synthetic validation passes are not flood-model accuracy.
