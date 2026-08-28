# AquaGuard 30.0.0 — Final Release Manifest (Master Build)

**Base:** Merged from all 30 development phases; see `MERGE_REPORT.md` for
the full merge process, corrections applied, and validation results.

**Corrections applied during merge:**
- Phase 5 YOLO base-model fix restored (`AQUAGUARD_YOLO_BASE_MODEL`, defaults to `yolo11n.pt`)
- Phase 6 route-cost speed guard restored (protects against invalid/zero road speeds)
- Frontend production-build export/import mismatch fixed (`useFeatureFlags`)
- Version strings unified to `30.0.0` across frontend, backend, and AI service
- Duplicate `.env.example` entries removed
- Historical per-phase docs consolidated under `docs/phases/`

Development-only templates, synthetic training data, and unapproved model
artifacts are clearly labeled throughout and must not be treated as
production observations or production-ready models.
