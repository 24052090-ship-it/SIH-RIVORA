# AquaGuard Final SIH Demo Script

Recommended length: 7-10 minutes.

## Before the demo

- Start PostgreSQL/PostGIS, AI service, backend and frontend.
- Run `npm run phase30:check`.
- Confirm `/api/system/deep` reports the expected local service state.
- Keep `docs/phase30/EVIDENCE_MATRIX.md` open for judge questions.
- Do not describe development AI output as production accuracy.

## Scene 1 - The problem and citizen view

1. State the problem: fragmented flood signals delay detection and coordinated
   response.
2. Open AquaGuard citizen view.
3. Show current rainfall/sensor status and the GIS map.
4. Show flood zones, drains, reports and road context.
5. Submit or open a clearly labelled demo citizen drainage/flood report.

Narration:
"AquaGuard brings citizen reports, sensor conditions and spatial context into
one operating picture."

## Scene 2 - AI and risk evidence

6. Open flood-risk prediction and show the model provenance fields.
7. Explain that the validated local runtime uses
   `aquaguard-flood-xgb-v1.1` in development mode.
8. Show multimodal risk fusion and its contributing signals.
9. Point out any missing signal, such as vision, instead of replacing it with a
   fabricated value.

Narration:
"The system records which model and signals produced the decision. The fusion
score is decision-support logic, not a calibrated flood probability."

If showing image analysis, explicitly say whether the output is a development
fallback or an approved trained model. The current release does not contain
approved custom production YOLO evidence.

## Scene 3 - Authority response

10. Open the Authority Command Center.
11. Show the affected zone, alert and incident state.
12. Show the incident lifecycle and recommended response.
13. Explain that alerts and incidents are auditable and realtime-enabled.

## Scene 4 - Routing and field response

14. Calculate or display a flood-aware safe route.
15. Assign a field-response task.
16. Open the mobile/field workflow.
17. Move the demo task through EN_ROUTE -> ON_SITE -> COMPLETED.
18. Show the updated operational state.

## Scene 5 - Digital twin and resilience

19. Run a clearly labelled what-if rainfall/digital-twin scenario.
20. Show the projected operational effects and planning context.
21. Open system health and explain degraded behavior if a dependency fails.

Narration:
"The same platform supports detection, decision support, routing, dispatch,
field verification and system-health visibility."

## Scene 6 - Evidence close

22. Show the evidence matrix.
23. State that the hardened local Phase 28 run passed 28/28 checks.
24. State that a local PostgreSQL backup and disposable restore drill passed.
25. Explain that production Docker/Nginx/HTTPS configuration is prepared but
    no real cloud deployment is claimed.
26. Close with:

**Predict -> Detect -> Decide -> Respond -> Verify.**

## Claims to avoid

Do not claim:
- live municipal deployment unless one exists and is verified
- real-world flood-model accuracy without approved held-out metrics
- YOLO production accuracy without an approved trained artifact
- that the fusion score is a calibrated probability
- production throughput/SLA from local smoke-load results
- measured social impact without a real evaluation
