You are working on **RIVORA v31**, an advanced SIH project for:

> **Drainage, rainfall, flood control, prediction, monitoring, emergency response, and urban resilience.**

The stack is:

* React + Vite frontend
* Express/Node.js backend
* PostgreSQL + PostGIS
* FastAPI Python AI service
* XGBoost
* YOLO / Ultralytics
* Socket.IO
* Leaflet + OpenStreetMap
* Google Routes API
* Open-Meteo
* Docker

You are working in a Git branch named:

```text
ui
```

Do **not** modify `main` directly.

Your task is not to create a toy redesign or replace the application. You must **audit the existing repository first**, preserve everything that already works, identify incomplete/stub/demo functionality, and complete RIVORA into a polished, technically credible SIH-level product.

---

# 1. FIRST: AUDIT THE REPOSITORY

Before modifying anything:

1. Inspect the entire repository structure.
2. Read:

   * root `package.json`
   * frontend source
   * backend source
   * backend database migrations
   * backend `.env.example`
   * AI service
   * Docker files
   * routing implementation
   * weather integration
   * telemetry implementation
   * Google Routes provider
   * satellite provider
   * YOLO/vision implementation
   * HydroFusion implementation
   * documentation
3. Search for:

   * TODO
   * FIXME
   * mock
   * demo
   * placeholder
   * hard-coded status
   * `configured:false`
   * `NOT_CONNECTED`
   * static data where live data should exist
   * unused API functions
   * incomplete buttons
   * dead routes
   * components that render fake values
   * functions that silently fall back to demo data
4. Produce an internal implementation checklist before changing code.

Do not blindly rewrite the project.

---

# 2. CURRENT VERIFIED WORKING STATE

Treat the following as known-good functionality and preserve it.

## Frontend

React/Vite runs at:

```text
http://localhost:5173
```

Real mode is used with:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_DATA=false
VITE_ENABLE_REALTIME=true
VITE_SOCKET_URL=http://localhost:5000
VITE_ENABLE_AI=true
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_ENABLE_IOT=true
VITE_MAP_PROVIDER=osm
```

The frontend currently includes:

* Citizen portal
* Authority portal
* Safe Route
* Flood map
* dashboard
* reports
* alerts
* drainage information
* command-center style pages
* integration/provider UI
* satellite page
* AI/risk pages

The Safe Route frontend is currently working and displays:

```text
Google traffic benchmark
LIVE ROUTES API
```

while RIVORA itself computes the flood-aware route.

Do not break this.

---

# 3. BACKEND

Express runs at:

```text
http://localhost:5000
```

Backend health works:

```text
GET /api/health
```

The backend is connected to PostgreSQL/PostGIS.

Because port 5432 conflicted with another local PostgreSQL installation, the host connection currently uses:

```text
localhost:5433
```

while PostgreSQL inside Docker remains on:

```text
5432
```

Keep this architecture compatible.

The DB connection is effectively:

```env
DATABASE_URL=postgresql://RIVORA:RIVORA@localhost:5433/RIVORA
```

Do not accidentally revert it to host port 5432.

---

# 4. POSTGRESQL / POSTGIS

Docker PostgreSQL/PostGIS is working.

The project already stores/uses:

* rainfall readings
* water-level readings
* sensors
* drains
* road network
* flood-risk information
* user accounts
* citizen reports
* route geometry
* geospatial features

Existing migrations had UUID/BIGINT incompatibilities that were corrected.

Preserve a consistent ID strategy.

Do not introduce new foreign keys where UUID IDs reference BIGINT columns.

All new spatial data must use PostGIS appropriately rather than storing arbitrary geometry JSON when a PostGIS geometry/geography type is suitable.

---

# 5. FASTAPI AI SERVICE

The AI service runs at:

```text
http://localhost:8000
```

and exposes endpoints including:

```text
/health
/predict/flood
/predict/fusion
```

FastAPI is currently successfully receiving live requests.

Do not replace FastAPI with Node logic.

Keep AI inference isolated as a Python service.

---

# 6. CURRENT XGBOOST FLOOD MODEL

A working XGBoost training pipeline exists.

Features include:

```text
rainfall_15m
rainfall_1h
rainfall_3h
rainfall_24h
water_level
drain_capacity
blockage
elevation
slope
historical_incidents
```

Current development training has approximately:

```text
4000 samples
```

and generated approximately:

```text
ROC-AUC ≈ 0.8286
```

with confusion matrix approximately:

```text
[[250, 90],
 [103, 357]]
```

Feature importance currently has water level and blockage among the strongest features.

IMPORTANT:

The current model is trained on **synthetic development data**.

Do not remove this disclosure.

Do not claim that this model is production validated.

---

# 7. REALTIME IOT PIPELINE

Realtime sensor simulation already works.

Commands include:

```bash
npm run simulate:sensor
npm run simulate:realtime
```

Example telemetry:

```text
SN-104
rainfall ≈ 95.9 mm/hr
water level ≈ 94.3%
```

is accepted by the backend.

The telemetry pipeline is:

```text
IoT simulator
→ Express
→ PostgreSQL/PostGIS
→ Socket.IO
→ AI feature generation
→ FastAPI
→ React
```

This has already been verified.

Do not break it.

---

# 8. IMPORTANT RAINFALL FEATURE FIX

The backend originally used only the latest rainfall record, which allowed a later Open-Meteo `0 mm/hr` reading to overwrite a dangerous IoT reading.

This was corrected conceptually to use the recent hazardous signal.

The intended logic is approximately:

```sql
SELECT COALESCE(MAX(rainfall_mm_hr), 0) value
FROM rainfall_readings
WHERE recorded_at >= NOW() - INTERVAL '60 minutes'
```

The resulting AI feature pipeline successfully generated values such as:

```text
rainfall_15m ≈ 33.565
rainfall_1h ≈ 95.9
rainfall_3h ≈ 196.595
rainfall_24h ≈ 350.035
water_level ≈ 94.3
```

and returned approximately:

```text
probability ≈ 0.9918
risk_level = CRITICAL
confidence ≈ 0.9918
```

Preserve this behavior.

However, improve the hydrological feature engineering rather than relying forever on a simple MAX.

Implement a proper aggregation model if feasible:

```text
rainfall_15m
rainfall_1h
rainfall_3h
rainfall_24h
```

based on timestamped observations and source-aware aggregation.

Avoid double-counting multiple providers reporting the same event.

---

# 9. OPEN-METEO

Open-Meteo live weather integration is working.

No key is required.

It already returns:

* precipitation
* precipitation probability
* temperature
* humidity
* wind
* hourly forecast
* total precipitation
* peak hourly precipitation
* severity

Preserve this.

Improve graceful failure handling, caching, timeout handling, and source timestamps if needed.

---

# 10. GOOGLE ROUTES

Google Routes API is now working.

The backend environment contains:

```env
GOOGLE_MAPS_API_KEY=<secret>
```

NEVER expose this key in React.

Never log it.

Never commit it.

The API key is restricted to:

```text
Routes API
```

The backend successfully receives real Google route responses with:

```text
provider = GOOGLE_ROUTES
configured = true
distanceMeters
duration
encodedPolyline
routeLabels
```

The Safe Route frontend already shows:

```text
Google traffic benchmark
LIVE ROUTES API
```

The intended architecture is:

```text
Google Routes API
    ↓
traffic-aware baseline

+

RIVORA/PostGIS
    ↓
flooded roads
blocked drains
risk zones
water levels
citizen incidents
sensor conditions

=
Flood-aware safe route
```

Do not replace RIVORA routing with Google routing.

Google is a benchmark / traffic layer.

RIVORA must remain the flood-risk routing intelligence.

Add useful comparison metrics such as:

* Google baseline distance
* Google baseline ETA
* RIVORA safe distance
* RIVORA safe ETA
* extra travel time for safety
* flood-risk reduction
* hazardous segments avoided
* explanation of why route changed

Decode the Google polyline where useful.

---

# 11. COST CONSTRAINT

This is a student SIH project.

Do NOT add new services that require payment.

Prefer:

* existing Google Routes API already configured
* OpenStreetMap
* Leaflet
* PostGIS
* Open-Meteo
* public/free satellite data
* local AI
* Docker
* local YOLO
* free/open APIs

Any new integration must:

1. have a no-cost development option, or
2. be optional and gracefully disabled.

Do not make the application unusable when a third-party API is unavailable.

---

# 12. MAJOR REMAINING WORK — COMPLETE ALL OF THIS

The following areas are incomplete or need serious upgrading.

---

# A. SYSTEM HEALTH MUST BE REAL

The system health endpoint previously had status values such as:

```text
ai: NOT_CONNECTED
```

even when FastAPI was actually running.

Remove hard-coded provider health states.

Implement real checks for:

* PostgreSQL/PostGIS
* FastAPI AI
* Open-Meteo
* Google Routes
* satellite provider
* Socket.IO/realtime
* telemetry freshness

Return:

```text
ONLINE
DEGRADED
OFFLINE
NOT_CONFIGURED
```

with:

* last checked time
* response latency
* optional human-readable reason

The Integration Hub frontend must display the real result.

---

# B. TELEMETRY FRESHNESS

The UI currently sometimes shows:

```text
Data delayed · 109 sec old
```

Implement robust telemetry freshness.

Each sensor should have:

```text
lastSeenAt
ageSeconds
freshnessStatus
```

Example:

```text
FRESH < 60 sec
DELAYED 60–180 sec
STALE > 180 sec
OFFLINE based on configurable threshold
```

Display freshness visually.

Do not pretend stale telemetry is live.

---

# C. MULTI-SOURCE RAINFALL ENGINE

Create a proper rainfall intelligence layer.

Fuse:

* IoT rainfall sensors
* Open-Meteo nowcast
* historical accumulation

Generate:

```text
15-minute rainfall
1-hour rainfall
3-hour rainfall
24-hour rainfall
peak intensity
rainfall trend
forecast next 1h
forecast next 3h
forecast next 6h
```

Store provider/source metadata.

Do not simply overwrite one source with another.

---

# D. HYDROFUSION

The `/predict/fusion` endpoint exists and is being called.

Audit whether it is genuinely implemented or largely heuristic/demo.

Upgrade HydroFusion into a transparent multi-signal decision-support layer.

Inputs may include:

```text
XGBoost flood probability
rainfall intensity
rainfall accumulation
forecast rainfall
water level
drain available capacity
drain blockage
sensor health
recent citizen reports
road flooding
historical incident density
satellite flood evidence
```

Output:

```json
{
  "riskScore": 0-100,
  "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
  "confidence": 0-1,
  "signals": [],
  "topDrivers": [],
  "recommendedActions": [],
  "dataQuality": {},
  "timestamp": ""
}
```

Do not claim the fusion score is a scientifically validated probability unless it truly is.

Call it a:

```text
decision-support risk score
```

when appropriate.

---

# E. EXPLAINABLE AI

Add meaningful explainability.

At minimum implement:

* model feature importance
* per-prediction driver contributions
* human-readable explanations

Prefer SHAP if compatible and performant.

Example UI:

```text
Why risk is CRITICAL

+ Water level 94%                major increase
+ Rainfall 1h 96 mm              major increase
+ Drain blockage                 high increase
+ 3h accumulation 197 mm         high increase
- Higher drain capacity          small reduction
```

Add an authority-facing explainability panel.

Do not expose meaningless technical values without interpretation.

---

# F. MODEL TRAINING / REAL DATA READINESS

The existing synthetic model is good for software validation but not enough for a high-quality SIH submission.

Implement a proper training framework supporting:

```text
train
validation
test
```

not only a single train/test split.

Generate:

* accuracy
* precision
* recall
* F1
* ROC-AUC
* PR-AUC if useful
* confusion matrix
* threshold analysis
* feature importance
* calibration if feasible
* model metadata
* training timestamp
* dataset provenance
* sample counts
* class balance

Create model registry metadata such as:

```json
{
  "modelName": "...",
  "version": "...",
  "dataset": "...",
  "datasetType": "synthetic|real|mixed",
  "trainedAt": "...",
  "features": [],
  "metrics": {},
  "productionEligible": false
}
```

VERY IMPORTANT:

Do not fabricate a “real dataset”.

If no legitimate labeled real-world dataset is bundled or freely retrievable, create a clean ingestion pipeline and clearly label the synthetic model as development-only.

If adding public data automatically, use only freely available sources and record:

* source URL/provider
* license
* retrieval date
* geography
* temporal coverage

Never invent provenance.

---

# G. SATELLITE INTELLIGENCE

Satellite integration is incomplete.

Sentinel Hub may not currently have credentials.

Do not block the application because of this.

Implement satellite intelligence with graceful provider abstraction.

Ideal providers:

```text
Copernicus Sentinel-1
Copernicus Sentinel-2
```

Provide architecture for:

```text
scene discovery
cloud filtering
AOI selection
imagery metadata
NDWI
MNDWI
water mask
flood extent
before/after comparison
```

Sentinel-1 should be considered because radar can operate through clouds and is highly relevant during flooding.

Sentinel-2 can support optical water indices.

If direct API credentials are not available:

* keep provider clearly `NOT_CONFIGURED`
* show realistic integration workflow
* provide upload/import capability for GeoTIFF/imagery
* do not show fake “live satellite” data as real

Create a satellite scene registry in PostGIS if appropriate.

---

# H. YOLO / COMPUTER VISION

Current AI health has previously shown:

```text
mode: custom-yolo
ready: false
```

Classes intended are:

```text
blocked_drain
overflowing_drain
flooded_road
waterlogging
open_manhole
garbage_blockage
```

Complete the vision system.

First audit whether a valid labeled YOLO dataset actually exists.

If it does:

* validate dataset YAML
* validate train/val split
* train YOLO
* save weights
* evaluate
* expose metrics
* load best weights in FastAPI

If it does not:

DO NOT pretend training happened.

Instead:

1. build a dataset structure
2. add annotation instructions
3. add dataset validator
4. provide an upload pipeline
5. use an available pretrained general model only where semantically valid
6. clearly mark custom flood/drain classes as requiring training data

Implement image upload through frontend for:

```text
citizen report image
authority inspection image
field-worker image
```

Vision result should support:

```text
detected class
confidence
bounding box
image preview
recommended action
```

Store inference metadata.

---

# I. CITIZEN REPORT INTELLIGENCE

Improve citizen reports.

Allow:

* geolocation
* image upload
* category
* description
* severity estimate
* timestamp
* status

Categories:

```text
waterlogging
blocked drain
overflowing drain
open manhole
flooded road
garbage blockage
other
```

Use image inference when available.

Cluster nearby recent reports.

Avoid treating duplicate reports as independent strong signals.

Add trust/data-quality logic.

---

# J. INCIDENT COMMAND

Create or complete a serious authority incident workflow.

When a zone reaches HIGH/CRITICAL:

Allow:

```text
create incident
assign response team
set priority
track status
attach affected drains
attach roads
attach sensors
attach citizen reports
attach map area
add timeline updates
close incident
```

Statuses:

```text
OPEN
ACKNOWLEDGED
DISPATCHED
IN_PROGRESS
MONITORING
RESOLVED
CLOSED
```

Create a chronological incident timeline.

---

# K. ALERT ENGINE

Create an automatic but explainable alert engine.

Alert triggers may include:

```text
critical AI risk
extreme water level
extreme rainfall
blocked critical drain
multiple nearby citizen reports
road flooded
sensor anomaly
satellite flood evidence
```

Alerts must support:

```text
severity
source
zone
createdAt
acknowledgedAt
resolvedAt
related entity IDs
human-readable reason
recommended action
```

Do not spam duplicate alerts.

Implement deduplication and cooldown.

---

# L. COMMAND CENTER

Upgrade the authority Command Center to feel like a genuine municipal emergency operating system.

Show:

```text
city flood risk
active critical zones
rainfall nowcast
rainfall accumulation
drain stress
blocked drains
sensor health
roads affected
citizen incident volume
active response teams
open incidents
alerts
forecast horizon
AI confidence
data freshness
```

Avoid displaying dozens of decorative cards.

Prioritize operational information hierarchy.

---

# M. DIGITAL TWIN / MAP

Make the map a central operational interface.

Layers should include:

```text
risk zones
drains
sensors
rainfall stations
citizen reports
flooded roads
safe routes
incidents
satellite flood extent
catchments
```

Support:

* layer toggles
* marker clustering where needed
* popup details
* timestamps
* severity legend
* route geometry
* selected-zone panel
* data freshness
* fit-to-event

Avoid excessive map clutter.

---

# N. SAFE ROUTING

Keep the existing working flood-aware route engine.

Improve it.

For every route segment calculate:

```text
flood risk
blocked drains nearby
active flood zone overlap
road status
sensor conditions nearby
citizen reports nearby
```

Return an explanation such as:

```text
Route B selected instead of fastest route because:
- avoids 2 high-risk flooded segments
- avoids one blocked drain cluster
- adds 4 minutes
- reduces flood exposure score by 61%
```

Allow comparison:

```text
Fastest
Safest
Balanced
```

Google Routes provides the real traffic-aware baseline.

RIVORA provides flood intelligence.

---

# O. UX / UI — MAJOR POLISH

You are on the `ui` branch.

Perform a professional frontend redesign without destroying the existing design language.

Target quality:

```text
modern emergency command center
premium civic-tech product
high information density
clean hierarchy
excellent map experience
SIH presentation-ready
```

Maintain the current dark RIVORA visual identity.

Improve:

* spacing
* typography
* consistent card hierarchy
* sidebar
* top navigation
* tables
* badges
* status colors
* maps
* charts
* empty states
* loading states
* error states
* mobile responsiveness
* accessibility
* keyboard navigation
* tooltip consistency

Avoid:

* excessive gradients
* neon everywhere
* gimmicky animations
* random glassmorphism
* oversized cards
* fake metrics
* unreadable tiny text

Use animation only where it improves understanding.

---

# P. CITIZEN VS AUTHORITY EXPERIENCE

Keep these clearly distinct.

Citizen portal should focus on:

```text
current local risk
safe route
live flood map
nearby alerts
report issue
my reports
safety instructions
```

Authority portal should focus on:

```text
citywide command
forecast
risk zones
incident command
drain operations
field operations
AI intelligence
routing
satellite
integration health
```

Do not expose unnecessary backend/system details to citizens.

---

# Q. REALTIME EXPERIENCE

Use Socket.IO properly.

Realtime UI updates should occur for:

```text
sensor telemetry
risk changes
new citizen report
alert creation
incident update
drain state
road state
```

Avoid polling every component independently.

Use a centralized realtime state/update strategy.

---

# R. API DESIGN

Audit backend endpoints.

Ensure:

* consistent REST naming
* validation
* clear error codes
* authentication
* role checks
* pagination
* safe query handling
* timeout handling
* source metadata
* timestamp metadata

Do not return raw internal errors to frontend users.

---

# S. SECURITY

Do not leak:

```text
GOOGLE_MAPS_API_KEY
JWT_SECRET
database password
satellite client secret
```

Ensure `.env` is ignored by Git.

Only `.env.example` should be committed.

Add rate limiting where appropriate.

Validate file uploads.

Restrict image size/type.

Use secure CORS defaults.

Do not use `eval`.

Do not put secrets in Vite environment variables.

---

# T. PROVIDER FALLBACKS

RIVORA must degrade gracefully.

Example:

```text
Google Routes unavailable
→ RIVORA PostGIS route still works

Open-Meteo unavailable
→ recent IoT rainfall remains available

AI unavailable
→ rule-based risk summary displayed with warning

Satellite unavailable
→ satellite layer marked unavailable

YOLO unavailable
→ reports still accepted without automatic image classification
```

Never crash the whole dashboard because one provider fails.

---

# U. TESTING

Add meaningful tests.

At minimum:

Backend:

```text
auth
health
telemetry ingestion
AI proxy
weather
provider status
safe routing
Google route adapter
alerts
incidents
```

AI:

```text
health
flood prediction schema
fusion prediction schema
feature validation
```

Frontend:

Test critical flows where practical.

Add an end-to-end smoke-test script covering:

```text
login
telemetry
risk prediction
safe route
provider health
```

---

# V. DEVELOPER EXPERIENCE

Create one clear startup workflow.

Prefer something like:

```bash
npm run dev:all
```

or document separate terminals cleanly.

Current services:

```text
Frontend 5173
Backend 5000
AI 8000
PostGIS host 5433
```

Do not break these defaults.

Create:

```text
docs/LOCAL_DEVELOPMENT.md
```

with exact Windows instructions.

Include:

```text
Docker startup
database migration
database seed
backend
AI virtualenv
frontend
sensor simulation
Google Routes
testing
```

---

# W. SIH DEMO MODE

Create a polished deterministic SIH demonstration scenario.

Example:

### Stage 1

Normal city state.

### Stage 2

Heavy rainfall starts.

### Stage 3

Sensor SN-104 water level rises.

### Stage 4

Drain blockage detected.

### Stage 5

AI risk changes:

```text
LOW → MODERATE → HIGH → CRITICAL
```

### Stage 6

Authority alert appears.

### Stage 7

Road becomes unsafe.

### Stage 8

Google fastest route intersects risk.

### Stage 9

RIVORA proposes safer route.

### Stage 10

Incident team dispatched.

### Stage 11

Risk eventually falls and incident resolves.

Implement this through reproducible simulation scripts.

Prefer commands such as:

```bash
npm run demo:normal
npm run demo:storm
npm run demo:critical
npm run demo:recover
```

Do not rely on manual database editing during the presentation.

---

# X. DOCUMENTATION

Update the architecture documentation.

Create diagrams in Markdown/Mermaid where useful.

Document:

```text
React
Express
PostGIS
FastAPI
XGBoost
HydroFusion
YOLO
Open-Meteo
Google Routes
satellite
Socket.IO
IoT
```

Clearly distinguish:

```text
LIVE
SIMULATED
DEVELOPMENT MODEL
OPTIONAL PROVIDER
```

This is extremely important for SIH credibility.

---

# Y. NO FALSE CLAIMS

Never claim:

```text
99% real-world flood prediction accuracy
production validated
government deployed
satellite live
real YOLO model trained
```

unless the repository genuinely supports that claim.

If something is simulated, label it:

```text
SIMULATED
```

If trained on synthetic data, label it:

```text
DEVELOPMENT MODEL
```

This transparency is preferable to fake claims.

---

# 13. CODE QUALITY

Follow these rules:

* reuse existing components
* avoid giant components
* avoid duplicating API clients
* use typed/validated API contracts where feasible
* centralize constants
* centralize risk-level logic
* centralize environment configuration
* remove dead code
* do not leave commented-out implementations
* do not introduce unnecessary dependencies
* preserve existing architecture unless there is a strong reason to change it

---

# 14. GIT RULES

You are on:

```text
ui
```

Before changes:

```bash
git status
git branch
```

Do not modify `main`.

Do not commit:

```text
.env
API keys
JWT secrets
database credentials
model datasets that violate licenses
node_modules
.venv
```

Commit logical groups separately.

Suggested commits:

```text
feat: harden provider health and telemetry freshness
feat: upgrade rainfall and hydrofusion intelligence
feat: add explainable flood risk
feat: complete incident and alert workflows
feat: improve safe routing comparison
feat: add satellite provider abstraction
feat: complete vision pipeline scaffolding
feat: redesign command center and citizen UI
test: add end-to-end RIVORA smoke tests
docs: add SIH architecture and local development guide
```

---

# 15. DEFINITION OF DONE

Do not stop after visual changes.

The task is complete only when:

### Core system

* frontend builds
* backend starts
* AI starts
* PostgreSQL/PostGIS connects
* migrations succeed
* seed succeeds

### Realtime

* sensor simulation inserts data
* Socket.IO updates frontend
* freshness states work

### Weather

* Open-Meteo works
* provider timestamps shown

### AI

* flood inference works
* HydroFusion works
* explanations work
* synthetic-model status remains transparent

### Routing

* RIVORA flood-aware route works
* Google benchmark route works when configured
* graceful fallback works when Google is absent
* route comparison explanation exists

### Alerts

* risk can trigger alert
* alert can be acknowledged/resolved

### Incidents

* incident lifecycle works

### Satellite

* provider either works genuinely or is clearly `NOT_CONFIGURED`
* no fake live satellite claims

### Vision

* YOLO either loads a valid trained model or reports `MODEL_NOT_TRAINED`
* no fake inference

### UI

* no obvious broken buttons
* no placeholder pages
* no fake loading states
* no console errors
* responsive major pages
* authority/citizen separation preserved

### Security

* no secrets committed
* `.env` ignored

### Testing

Run and report:

```bash
npm test
npm run build
```

and relevant backend/AI tests.

---

# 16. FINAL OUTPUT FROM YOU

After implementing everything, provide a concise engineering report containing:

## Completed

List everything implemented.

## Existing functionality preserved

List important systems not broken.

## Remaining external dependencies

Example:

```text
Sentinel OAuth credentials required
custom YOLO labeled dataset required
```

## Real vs simulated

Explicitly categorize each major data source/model.

## Commands to run

Give exact Windows commands for:

```text
database
backend
AI
frontend
simulation
tests
```

## Environment variables

List variable names only.

Never print secret values.

## Known limitations

Be precise.

## Git status

Show the changed files and confirm work is only on the `ui` branch.

---

# 17. MOST IMPORTANT PRIORITY ORDER

If the scope is too large for one pass, work in this exact priority order:

1. Audit and stabilize existing code
2. Fix real provider/system health
3. Fix telemetry freshness
4. Finish rainfall aggregation
5. Harden HydroFusion
6. Add explainability
7. Improve Safe Route comparison
8. Alerts + incident command
9. Command-center UI redesign
10. Citizen UI polish
11. Satellite provider abstraction
12. YOLO vision readiness
13. real-data training framework
14. tests
15. docs
16. SIH deterministic demo

Do not spend hours polishing animation while core functionality remains incomplete.

The final product should feel like a coherent **Urban Flood Intelligence and Response Operating System**, not a collection of disconnected demo pages.
