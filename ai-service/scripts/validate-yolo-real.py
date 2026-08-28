"""Run held-out validation for a candidate AquaGuard YOLO model."""

import argparse
from pathlib import Path


def main():
    p = argparse.ArgumentParser(
        description="Evaluate an approved AquaGuard YOLO candidate on the held-out test split."
    )
    p.add_argument("--model", required=True)
    p.add_argument("--data", required=True)
    p.add_argument(
        "--approved",
        action="store_true",
        help="Explicit confirmation that image dataset licensing/provenance approval was reviewed.",
    )
    args = p.parse_args()

    if not args.approved:
        raise SystemExit("Refusing evaluation: image dataset must be approved first.")

    model_path = Path(args.model)
    data_path = Path(args.data)

    if not model_path.exists():
        raise SystemExit(f"Candidate model not found: {model_path}")
    if not data_path.exists():
        raise SystemExit(f"Approved dataset YAML not found: {data_path}")

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit(f"Install Ultralytics first: {exc}")

    model = YOLO(str(model_path))
    metrics = model.val(data=str(data_path), split="test")
    print("Held-out test evaluation completed.")
    print("Candidate remains unpromoted; review metrics and error analysis before any manual promotion.")
    print(metrics)


if __name__ == "__main__":
    main()
