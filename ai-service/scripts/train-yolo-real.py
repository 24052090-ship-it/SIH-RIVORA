"""AquaGuard Phase 23 YOLO training scaffold.

Requires an approved Ultralytics dataset YAML. Training is gated by --approved.
"""
import argparse
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, help="Path to approved YOLO dataset YAML")
    p.add_argument("--approved", action="store_true")
    p.add_argument("--model", default="yolo11n.pt")
    p.add_argument("--epochs", type=int, default=50)
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--project", default="ai-service/models/vision")
    args = p.parse_args()

    if not args.approved:
        raise SystemExit("Refusing to train: image dataset must be approved first.")

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit(f"Install Ultralytics first: {exc}")

    model = YOLO(args.model)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        project=args.project,
        name="aquaguard-yolo-real-candidate"
    )
    print("Training completed. Review validation metrics before promotion.")

if __name__ == "__main__":
    main()
