import os
from pathlib import Path
from typing import Any

MODEL_VERSION = os.getenv('VISION_MODEL_VERSION', 'aquaguard-yolo-custom-v1')
MODEL_PATH = Path(os.getenv('VISION_MODEL_PATH', str(Path(__file__).resolve().parents[1] / 'models' / 'aquaguard_yolo.pt')))
FALLBACK_MODEL = os.getenv('VISION_DEV_FALLBACK_MODEL', 'yolo11n.pt')
FALLBACK_MODEL_VERSION = 'yolo11n-coco-development-fallback'

CLASS_TO_SEVERITY = {
    'blocked_drain': 'HIGH',
    'overflowing_drain': 'CRITICAL',
    'flooded_road': 'HIGH',
    'waterlogging': 'HIGH',
    'open_manhole': 'CRITICAL',
    'garbage_blockage': 'MEDIUM',
}

_model = None
_fallback_model = None


def _load_model():
    global _model
    if _model is not None:
        return _model
    if not MODEL_PATH.exists():
        return None
    from ultralytics import YOLO
    _model = YOLO(str(MODEL_PATH))
    return _model


def _load_fallback_model():
    global _fallback_model
    if _fallback_model is not None:
        return _fallback_model
    from ultralytics import YOLO
    _fallback_model = YOLO(FALLBACK_MODEL)
    return _fallback_model


def model_status() -> dict[str, Any]:
    custom_ready = MODEL_PATH.exists()
    return {
        'mode': 'custom-yolo' if custom_ready else 'development-fallback',
        'model_version': MODEL_VERSION if custom_ready else FALLBACK_MODEL_VERSION,
        'model_path': str(MODEL_PATH),
        'ready': True,
        'custom_model_ready': custom_ready,
        'production_eligible': custom_ready,
        'classes': list(CLASS_TO_SEVERITY.keys()),
        'fallback_model': None if custom_ready else FALLBACK_MODEL,
        'note': (
            'Approved AquaGuard custom weights are installed.'
            if custom_ready
            else 'Custom AquaGuard weights are missing. Development fallback performs only generic COCO object detection and does not classify flood/drainage hazards.'
        ),
    }


def _custom_inference(model, image_path: str, confidence: float) -> dict[str, Any]:
    results = model.predict(source=image_path, conf=confidence, verbose=False)
    detections: list[dict[str, Any]] = []
    for result in results:
        names = result.names or {}
        boxes = result.boxes
        if boxes is None:
            continue
        for box in boxes:
            cls_id = int(box.cls[0].item())
            score = float(box.conf[0].item())
            xyxy = [round(float(v), 2) for v in box.xyxy[0].tolist()]
            label = str(names.get(cls_id, cls_id)).lower().strip().replace(' ', '_')
            detections.append({
                'label': label,
                'confidence': round(score, 4),
                'severity': CLASS_TO_SEVERITY.get(label, 'INFO'),
                'bbox': xyxy,
            })
    detections.sort(key=lambda x: x['confidence'], reverse=True)
    top = detections[0] if detections else None
    return {
        'model_version': MODEL_VERSION,
        'mode': 'custom-yolo',
        'label': top['label'] if top else 'no_target_detected',
        'severity': top['severity'] if top else 'LOW',
        'confidence': top['confidence'] if top else 0.0,
        'detections': detections,
        'status': 'ANALYZED',
        'production_eligible': True,
        'disclaimer': 'Custom AquaGuard YOLO inference. Validate model performance on local, labeled flood/drainage imagery before operational use.',
    }


def _development_fallback_inference(image_path: str, confidence: float) -> dict[str, Any]:
    model = _load_fallback_model()
    results = model.predict(source=image_path, conf=confidence, verbose=False)
    detections: list[dict[str, Any]] = []
    for result in results:
        names = result.names or {}
        boxes = result.boxes
        if boxes is None:
            continue
        for box in boxes:
            cls_id = int(box.cls[0].item())
            score = float(box.conf[0].item())
            xyxy = [round(float(v), 2) for v in box.xyxy[0].tolist()]
            raw_label = str(names.get(cls_id, cls_id)).lower().strip().replace(' ', '_')
            detections.append({
                'label': f'context_{raw_label}',
                'confidence': round(score, 4),
                'severity': 'INFO',
                'bbox': xyxy,
            })
    detections.sort(key=lambda x: x['confidence'], reverse=True)
    top = detections[0] if detections else None
    return {
        'model_version': FALLBACK_MODEL_VERSION,
        'mode': 'development-fallback',
        'label': top['label'] if top else 'visual_review_required',
        'severity': 'INFO',
        'confidence': top['confidence'] if top else 0.0,
        'detections': detections,
        'status': 'ANALYZED_DEVELOPMENT_FALLBACK',
        'production_eligible': False,
        'custom_model_ready': False,
        'disclaimer': 'Development fallback only: generic COCO object detection is running because AquaGuard custom YOLO weights are not installed. These detections do not identify or score flood/drainage hazards and must not be presented as validated AquaGuard flood-model output.',
    }


def analyze_image(image_path: str, confidence: float = 0.25) -> dict[str, Any]:
    model = _load_model()
    if model is not None:
        return _custom_inference(model, image_path, confidence)
    return _development_fallback_inference(image_path, confidence)
