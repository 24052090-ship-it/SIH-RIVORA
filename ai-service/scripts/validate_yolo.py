from pathlib import Path
from ultralytics import YOLO

model_path = Path(__file__).resolve().parents[1] / 'models' / 'aquaguard_yolo.pt'
data = Path(__file__).resolve().parents[1] / 'dataset' / 'aquaguard.yaml'

if not model_path.exists():
    raise SystemExit(f'Missing custom model: {model_path}')
model = YOLO(str(model_path))
metrics = model.val(data=str(data), imgsz=640)
print(metrics)
