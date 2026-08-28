# AquaGuard Phase 5 — Computer Vision

Phase 5 adds a FastAPI computer-vision service using Ultralytics YOLO and integrates image analysis into the citizen reporting flow.

## Classes
- blocked_drain
- overflowing_drain
- flooded_road
- waterlogging
- open_manhole
- garbage_blockage

## Flow
React Report → Express `/api/vision/analyze-image` → FastAPI `/vision/analyze` → YOLO → detection/severity/confidence → React preview → report API/PostGIS.

## Training
1. Collect legally usable, locally relevant images.
2. Annotate in YOLO format.
3. Put images and labels under `ai-service/dataset`.
4. Run `python ai-service/scripts/train_yolo.py`.
5. Copy `best.pt` to `ai-service/models/aquaguard_yolo.pt`.
6. Run `python ai-service/scripts/validate_yolo.py`.
7. Set `VISION_MODEL_PATH` if using another location.

The ZIP intentionally does not include a custom trained weight file. A pretrained generic detector is not a valid substitute for flood/drainage classes. Until custom weights are installed, the endpoint returns HTTP 503 and the frontend can use clearly labeled demo mode when `VITE_USE_MOCK_DATA=true`.
