# AquaGuard AI Service

This FastAPI service exposes both flood-risk prediction (XGBoost) and computer vision (YOLO).

## Endpoints
- `GET /health`
- `POST /predict/flood`
- `GET /model/info`
- `GET /vision/info`
- `POST /vision/analyze`

`/vision/analyze` accepts JPEG/PNG/WebP multipart uploads up to 10 MB.

## Custom YOLO model
The service expects `models/aquaguard_yolo.pt`. The model should be trained for the six AquaGuard classes in `dataset/aquaguard.yaml`.

Ultralytics supports custom training, validation and prediction through its Python API. See the official docs for the current commands and supported tasks.
