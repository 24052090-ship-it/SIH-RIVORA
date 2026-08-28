# AquaGuard Judge Q&A

## What problem does AquaGuard solve?

Urban flood response often depends on separate sensor feeds, citizen
complaints, maps, weather information and field teams. AquaGuard connects
those signals into one workflow from detection through verified field
response.

## What is innovative?

The contribution is not a single prediction model. AquaGuard combines governed
AI inference, sensor and citizen evidence, PostGIS hazard context, transparent
multimodal risk fusion, incident orchestration, safer routing, realtime alerts
and field-response verification in one auditable system.

## What is AI used for?

The architecture supports XGBoost flood-risk inference and YOLO-based image
detection. The local validated runtime records model provenance. The current
flood model is explicitly development status, and approved custom production
YOLO evidence is still pending.

## What accuracy does the model achieve?

This release does not claim a real held-out accuracy number because an approved
local evaluation dataset and metric package have not been supplied. The system
contains the training/evaluation/governance pipeline needed to produce those
metrics when approved data is available.

## Then what has actually been validated?

The hardened local full-system harness passed 28/28 integration, security,
realtime, resilience and lightweight performance checks. The deterministic
end-to-end fixture suite passed 5/5 scenarios. Those are software/system
validation results, not flood-model accuracy.

## Is the multimodal score a flood probability?

No. It is a transparent weighted decision-support score over available
signals. Missing signals are excluded and weights are renormalized. It must not
be described as a calibrated probability until calibrated against labelled
local outcomes.

## Where does the data come from?

The system supports authenticated IoT telemetry, weather providers, PostGIS
data, governed uploaded datasets and optional satellite/GIS providers.
Unconfigured providers return explicit unavailable states. The system does not
invent missing external data.

## Why PostGIS?

Flood operations are spatial. PostGIS stores and queries flood zones, roads,
drains, sensors, reports and response locations and supports hazard-aware
routing.

## How is the system secured?

The validated controls include JWT authentication, citizen/authority role
boundaries, input validation, upload restrictions, CORS checks, rate limiting,
secret non-disclosure and SQL-parameterized database access. Production
templates place the backend, AI service and database behind Nginx/internal
networks and require HTTPS for device ingestion.

## What happens if the AI service fails?

The deep-health endpoint reports dependency state, and the validated vision
path returns an explicit HTTP 503 when the AI service is unavailable. The
system does not silently claim an unavailable model produced a result.

## What happens if the database fails?

Deep health becomes degraded rather than falsely reporting a healthy complete
system. Phase 28 validated this behavior using a controlled failure simulation.

## What about duplicate or replayed sensor data?

The Phase 27 device contract uses authenticated ingestion, timestamps and a
database replay key. The validation harness accepted the first controlled
device event and rejected its duplicate with HTTP 409.

## Can it scale?

The frontend, Nginx edge, Express API/realtime layer, PostgreSQL/PostGIS and
FastAPI AI service are separated. The production Compose template keeps
database/AI services internal and allows components to be scaled or replaced
independently. Local smoke-load numbers are not presented as production
capacity.

## Is AquaGuard deployed in production?

No production deployment is claimed by this repository. Phase 29 provides
production-safe Compose/Nginx/HTTPS configuration, preflight checks, rollback
guidance and disaster-recovery procedures for a controlled deployment.

## Has backup and disaster recovery been tested?

A local PostgreSQL custom-format backup and disposable restore drill passed.
The drill verified PostGIS and critical AquaGuard schema objects and cleaned up
the temporary restore database. This is evidence of the recovery procedure,
not a production RPO/RTO guarantee.

## What is still needed before municipal operational use?

At minimum:
- approved local datasets and held-out model evaluation
- approved trained vision model
- locally calibrated operational thresholds
- real infrastructure and monitoring
- measured backup/recovery objectives
- responsible-authority review of alert and evacuation rules
- field testing and operational acceptance

## Is this an autonomous emergency-warning system?

No. AquaGuard is decision support. Safety-critical warnings and evacuation
decisions require validated thresholds and responsible-authority approval.
