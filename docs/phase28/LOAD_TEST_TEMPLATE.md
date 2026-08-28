# Load Test Template

Use an approved load-testing tool in a non-production environment.

Capture:
- concurrency
- request rate
- p50/p95/p99 latency
- error rate
- CPU/memory
- database connections
- Socket.IO connection count
- telemetry ingestion rate

Do not report target values as achieved until measured in the deployed environment.


## Local smoke-load measurements

The automated harness records local non-production p50/p95/p99 HTTP latency,
request throughput/error rate, database-backed deep-health latency, telemetry
read throughput, and Socket.IO connection/reconnect latency.

These measurements are not deployed capacity claims or SLAs. Sustained CPU,
memory, database connection saturation, high-rate telemetry ingestion, and
large Socket.IO connection counts require an approved deployed load test.
