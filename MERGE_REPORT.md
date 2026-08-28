# AquaGuard Master — Merge Report

This report documents how `AquaGuard-Master/` was produced from the 30
uploaded development-phase archives (`Full-Model.zip`). The original phase
folders were **not modified**; all work happened in a new, separate master
project.

## 1. Phases inspected

All 30 phases (`aquaguard-phase1` … `aquaguard-phase30`) were extracted and
inventoried (excluding `node_modules`/build caches). Phases 4 onward share a
consistent architecture (`src/`, `backend/`, `ai-service/`, `scripts/`,
`docs/`); phase 30 is a genuine cumulative build containing the full
directory structure of every subsystem described in the brief (auth, GIS,
routing, AI/vision, MLOps, data governance, IoT, field operations, production
deployment docs).

**Finding:** Phase 30 was largely trustworthy as the cumulative base — but not
entirely, per below.

## 2. Project structure discovered

The existing structure already matched the brief's suggested layout closely,
so it was preserved as-is rather than reorganized:

```
src/  backend/  ai-service/  data/  scripts/  docs/  demo/  frontend-deploy/
package.json  README.md  .env.example  .gitignore  docker-compose.yml
```

The only structural change made: historical per-phase `PHASE*.md` files that
lived at the project root and under `docs/` were moved into `docs/phases/`,
since they are development history, not part of the runtime app (per the
brief's own instruction in section 36).

## 3. Files merged

`AquaGuard-Master/` was built by taking **Phase 30 in full** (it is the
correct cumulative base for the vast majority of the system: frontend pages,
backend routes/controllers/services, database schema+migrations, AI service
app, scripts, and docs), then applying the corrections below.

## 4. Conflicts found & resolved

### 4.1 Phase 5 correction — YOLO base model (RESTORED)
- **Bug:** `ai-service/scripts/train_yolo.py` hardcoded `YOLO('yolo26n.pt')`,
  which is **not a valid Ultralytics checkpoint name**.
- **History:** Phase 5 correctly fixed this — its `train_yolo.py` used
  `YOLO(os.getenv('AQUAGUARD_YOLO_BASE_MODEL', 'yolo11n.pt'))`. Starting at
  **Phase 6**, the fix was silently reverted back to the hardcoded invalid
  `'yolo26n.pt'`, and **this regression persisted through every subsequent
  phase, including Phase 30**.
- **Fix applied:** Restored the Phase 5 implementation
  (`os.getenv('AQUAGUARD_YOLO_BASE_MODEL', 'yolo11n.pt')`) in the master, and
  documented the env var in `ai-service/.env.example`.
- **Note:** A separate, newer script (`ai-service/scripts/train-yolo-real.py`,
  introduced in Phase 23) already correctly defaulted its `--model` argument
  to `yolo11n.pt` and was left untouched.

### 4.2 Phase 6 correction — route-cost speed guard (RESTORED)
- **Bug:** `backend/src/controllers/routeController.js`'s `edgeCost()`
  function did not guard against invalid/zero/negative `speed_kmh` values.
- **History:** Phase 6 correctly added a guard:
  `const speed = Math.max(1, Number(edge.speed_kmh || 30));` plus a `1/speed`
  term in the cost formula, to avoid `Infinity`/`NaN` route costs. **This
  guard was dropped at some point after Phase 6** and Phase 30's
  `routeController.js` no longer had it.
- **Fix applied:** Restored the Phase 6 guard and cost term exactly. Dijkstra
  routing, flooded-road avoidance, and drainage/flood-risk penalties were
  otherwise identical between Phase 6 and Phase 30 and required no changes.

### 4.3 Newly discovered — broken frontend build (RESTORED, not previously flagged)
- **Bug:** `src/hooks/useFeatureFlags.js` exported `useFeatureFlags` as a
  **default** export, while `src/context/RealtimeContext.jsx` imported it as
  a **named** export (`import { useFeatureFlags } from ...`). This mismatch
  has existed since `RealtimeContext.jsx` was introduced (**Phase 9**) and
  persisted unchanged through Phase 30.
- **Why it wasn't caught earlier:** Vite's dev server (esbuild) tolerates
  this kind of default/named interop mismatch at dev time, but a production
  `vite build` (Rollup/Rolldown) fails hard on it with `[MISSING_EXPORT]`.
  This means **none of phases 9–30 could produce a working production build**,
  even though `npm run dev` worked.
- **Fix applied:** Changed the export to `export function useFeatureFlags()`
  to match its one actual call site. This was the only usage in the codebase,
  so no other files needed changes.
- **Verified:** `npm run build` now succeeds (see §7).

## 5. Important changes (cosmetic/consistency, low risk)

- Version strings were inconsistent with the final release: root
  `package.json` said `20.0.0`, `backend/package.json` said `17.0.0`, the
  `/api/health` endpoint reported `20.0.0`, and the AI service's FastAPI
  title said `version='9.0.0', description='... Phase 5'`. All were updated
  to `30.0.0` / a phase-neutral description to match `VERSION` (`30.0.0`).
- `backend/README.md` and `ai-service/README.md` titles still said "Phase 2"
  and "Phase 5" respectively, and `backend/README.md` contained an outdated
  line claiming FastAPI/Socket.IO/IoT/satellite were **not yet** implemented
  (false as of the final build). Both were updated to reflect the actual,
  final API surface (cross-checked against `backend/src/app.js`'s real route
  registrations).
- Root `.env.example` had two duplicate `VITE_SATELLITE_TILE_URL` /
  `VITE_SATELLITE_ATTRIBUTION` lines (one blank, one set) from an earlier
  phase's incremental append. Deduplicated, keeping the non-blank values and
  grouping related vars under comments.

## 6. Removed duplicate files

No duplicate runtime source files were found inside Phase 30 itself. The only
"duplication" was the 30 sibling phase folders themselves, which are historical
backups and were **not** copied into `AquaGuard-Master/` (per instruction —
only `docs/phases/*.md` summaries were carried over, not phase source trees).

## 7. Dependencies

- Frontend `npm install`: **succeeded**, 100 packages installed, no changes
  made to `package.json` dependencies (all "latest"-pinned per the existing
  project convention — not altered, since changing pinning strategy wasn't
  requested and risks instability).
- Backend `npm install`: **succeeded**, 179 packages installed. Dependencies
  (`express@5`, `pg`, `socket.io`, `bcryptjs`, `jsonwebtoken`, `helmet`,
  `morgan`, `cors`, `multer`, `axios`, `form-data`, `dotenv`, `nodemon`) were
  already pinned to specific versions and left unchanged.
- AI service `requirements.txt`: pinned versions unchanged
  (`fastapi==0.116.1`, `xgboost==3.1.3`, `ultralytics>=8.3,<9`, etc.).
- No `npm audit fix --force` was run (per instruction — not attempted without
  first verifying compatibility, and no critical advisories blocked basic
  install/build in this session).

## 8. Database migrations

`backend/database/migrations/` contains 12 numbered SQL files
(`003_phase3.sql` through `015_phase20_data_integration.sql`), applied in
filename-sort order by `backend/src/db/migrate.js`. `backend/database/schema.sql`
is the full base schema (applied once via `db:init`) — migration numbers
below 003 are already folded into `schema.sql` rather than being separate
migration files, which is why the sequence starts at `003`. No duplicate or
conflicting migrations were found; order was verified against the running
`db:migrate` script logic (sorts filenames, so the existing numeric prefixes
are sufficient and correct).

**Limitation:** No live PostgreSQL/PostGIS instance was available in this
merge environment, so migrations were reviewed for correctness and ordering
but not executed against a real database. This is an explicit validation gap
— see §11.

## 9. Frontend start command
```bash
npm install
npm run dev        # http://localhost:5173
```

## 10. Backend start command
```bash
cd backend
npm install
npm run db:init && npm run db:migrate && npm run db:seed
npm run dev         # http://localhost:5000
```

## 11. AI start command
```bash
cd ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

## 12. Environment variables

See `.env.example`, `backend/.env.example`, `ai-service/.env.example`.
Key ones: `DATABASE_URL`, `JWT_SECRET`, `DEVICE_API_KEY`, `CORS_ORIGIN`,
`AI_SERVICE_URL`, `AQUAGUARD_YOLO_BASE_MODEL` (restored, see §4.1),
`VITE_ENABLE_*` feature flags. All defaults are clearly dev-only placeholders
(e.g. `dev-only-change-me`), not real secrets.

## 13. Tests actually run

Only checks that could run **offline, without a live PostgreSQL instance**
were executed in this sandboxed merge environment:

| Check | Result |
|---|---|
| `npm install` (frontend) | ✅ Passed — 100 packages |
| `npm run build` (frontend, production Vite build) | ✅ Passed, after fixing §4.3 |
| `npm install` (backend) | ✅ Passed — 179 packages |
| `node --check` syntax validation on every backend `.js` file | ✅ Passed (no syntax errors) |
| Backend boot smoke test (`node src/server.js`, no live DB) | ✅ Server started and listened on port 5000; only the optional external weather-sync call failed (network-restricted sandbox, expected and handled gracefully by the app, not a bug) |
| `python -m py_compile` on all 11 AI-service `.py` files | ✅ Passed (no syntax errors) |
| AI service: `pip install` of core deps (fastapi, pydantic, numpy, pandas, scikit-learn, xgboost, joblib, Pillow, python-multipart) | ✅ Passed |
| Import check: `app.model` (flood/XGBoost module) | ✅ Imports cleanly, reports `MODEL_VERSION = aquaguard-flood-xgb-v1.0` |
| Import check: `app.vision` (YOLO module) | ✅ Imports cleanly without `ultralytics` installed (lazy import), correctly reports `ready: False` since no trained weights are bundled |
| Import check: full FastAPI app (`app.main`) | ✅ All 9 routes registered correctly |

## 14. Tests not run (and why)

- **`ultralytics`/`opencv-python-headless` install and full vision-model
  inference:** these pull in PyTorch and are multi-gigabyte; the sandbox's
  available disk space could not accommodate them alongside the rest of the
  merge work. Static import-boundary checks were done instead (the
  `ultralytics` import inside `app/vision.py` is lazy, confirmed via source
  inspection, so the module itself imports fine without it).
- **Live PostgreSQL/PostGIS validation** (`npm run db:init/migrate/seed`,
  spatial query correctness, `npm run readiness:test`, `smoke:test`, etc.):
  no database server was available in this environment. Migrations and
  seed data were reviewed by inspection only.
- **Node.js integration/E2E scripts** (`scripts/smoke-test.js`,
  `readiness-test.js`, `mlops-test.js`, `incident-test.js`, etc.) and
  **Python validation scripts** (`scripts/integration-smoke.py`,
  `production-preflight.py`, `evaluate-flood-model.py`) were reviewed by
  inspection but not executed, since most of them assume a running
  backend + database + AI service.
- **Real model training/evaluation:** not attempted. Per the brief and per
  the project's own governance design, training requires a real, approved
  dataset the user hasn't provided — the bundled flood model is explicitly
  labeled synthetic/development, and no YOLO weights are bundled at all.

## 15. Known limitations

- Database and full-stack integration were validated by static review, not
  by running against a live PostgreSQL/PostGIS instance (see §14).
- The bundled flood-risk model is a development model trained on synthetic
  data (`ai-service/models/metrics.json` labels it as such); it is not
  production-calibrated.
- No trained YOLO weights are bundled; `/vision/analyze` will report
  `ready: False` until one is trained/approved.
- Frontend production bundle currently emits a "chunk larger than 500 kB"
  size warning from Vite (`dist/assets/index-*.js` ≈ 1 MB / 296 kB gzipped).
  The build still succeeds; this is a performance note, not a bug, and was
  not "fixed" via code-splitting since that would be a structural change
  beyond the scope of a merge/correctness pass.

## 16. Remaining manual setup

1. Provide a real PostgreSQL 16 + PostGIS 3.4 instance (or run
   `docker compose up -d postgres`) and run `db:init` / `db:migrate` / `db:seed`.
2. Set a real `JWT_SECRET`, `DEVICE_API_KEY`, and `CORS_ORIGIN` before any
   non-local deployment.
3. Provide an approved rainfall/water-level/flood dataset (see
   `data/imports/README.md`) if you want to train a real flood-risk model.
4. Provide an approved, labeled image dataset if you want to train the YOLO
   vision model (`ai-service/dataset/aquaguard.yaml` defines the six target
   classes).
5. Run the Node.js and Python integration/validation scripts listed in §14
   against a live stack before any demo or production use.
