from pathlib import Path
import tempfile

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)

from .schemas import (
    FloodFeatures,
    FloodPrediction,
    FusionFeatures,
    FusionPrediction,
)

from .model import (
    predict,
    MODEL_VERSION,
    model_metadata,
    global_feature_importance,
    development_metrics,
)

from .vision import (
    analyze_image,
    model_status,
    MODEL_VERSION as VISION_MODEL_VERSION,
)

from .vision_schemas import VisionAnalysis

from .fusion import (
    fusion_predict,
    FUSION_VERSION,
    fusion_metadata,
)


app = FastAPI(
    title="AquaGuard AI Service",
    version="31.0.0",
    description=(
        "Flood-risk prediction, multi-signal decision support, "
        "and computer-vision service for AquaGuard."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "aquaguard-ai",
        "flood_model_version": MODEL_VERSION,
        "fusion_model_version": FUSION_VERSION,
        "vision": model_status(),
    }


@app.post(
    "/predict/flood",
    response_model=FloodPrediction,
)
def flood_prediction(
    features: FloodFeatures,
):
    try:
        return predict(
            features.model_dump()
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )


@app.get("/model/info")
def model_info():
    return {
        "model": model_metadata(),
        "global_feature_importance": (
            global_feature_importance()
        ),
        "development_metrics": (
            development_metrics()
        ),
        "note": (
            "All reported performance metrics are from synthetic "
            "development data and must not be interpreted as "
            "validated real-world flood-prediction performance."
        ),
    }


@app.post(
    "/predict/fusion",
    response_model=FusionPrediction,
)
def fusion_prediction(
    features: FusionFeatures,
):
    try:
        return fusion_predict(
            features.model_dump()
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )


@app.get("/fusion/info")
def fusion_info():
    return {
        "fusion": fusion_metadata(),
        "base_model": model_metadata(),
    }


@app.get("/vision/info")
def vision_info():
    return {
        "vision_model_version": (
            VISION_MODEL_VERSION
        ),
        **model_status(),
    }


@app.post(
    "/vision/analyze",
    response_model=VisionAnalysis,
)
async def vision_analyze(
    file: UploadFile = File(...),
):
    allowed = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in allowed:
        raise HTTPException(
            status_code=415,
            detail=(
                "Only JPEG, PNG, and WebP images "
                "are supported."
            ),
        )

    suffix = (
        Path(
            file.filename or "upload.jpg"
        ).suffix.lower()
        or ".jpg"
    )

    if suffix not in {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }:
        suffix = ".jpg"

    contents = await file.read()

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be 10 MB or smaller.",
        )

    with tempfile.NamedTemporaryFile(
        suffix=suffix,
        delete=False,
    ) as tmp:
        tmp.write(contents)
        temp_path = tmp.name

    try:
        return analyze_image(
            temp_path
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )

    finally:
        Path(
            temp_path
        ).unlink(
            missing_ok=True
        )