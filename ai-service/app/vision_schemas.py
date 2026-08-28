from pydantic import BaseModel

class Detection(BaseModel):
    label: str
    confidence: float
    severity: str
    bbox: list[float]

class VisionAnalysis(BaseModel):
    model_version: str
    label: str
    severity: str
    confidence: float
    detections: list[Detection]
    status: str
    disclaimer: str
