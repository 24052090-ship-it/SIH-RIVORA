from pathlib import Path
import os
from ultralytics import YOLO

DATA = Path(__file__).resolve().parents[1] / 'dataset' / 'aquaguard.yaml'
OUTPUT = Path(__file__).resolve().parents[1] / 'models'

if __name__ == '__main__':
    # Start from a pretrained detection checkpoint and fine-tune on AquaGuard labels.
    # Phase 5 correction: 'yolo26n.pt' is not a valid Ultralytics checkpoint name.
    # Default to the valid 'yolo11n.pt' base model, configurable via env var so a
    # locally cached/approved checkpoint can be swapped in without editing code.
    model = YOLO(os.getenv('AQUAGUARD_YOLO_BASE_MODEL', 'yolo11n.pt'))
    results = model.train(data=str(DATA), epochs=50, imgsz=640, project=str(OUTPUT / 'runs'), name='aquaguard')
    print(results)
    print('Copy best.pt to ai-service/models/aquaguard_yolo.pt before enabling production inference.')
