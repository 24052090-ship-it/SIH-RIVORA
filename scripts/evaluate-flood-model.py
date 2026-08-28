"""Evaluate a saved AquaGuard XGBoost candidate on a held-out CSV.

This tool produces evidence only; it never promotes a model.
"""
import argparse, json
from pathlib import Path

REQUIRED = [
    "rainfall_15m","rainfall_1h","rainfall_3h","rainfall_24h",
    "water_level","drain_capacity","blockage",
    "elevation","slope","historical_incidents","flood_label"
]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", required=True)
    p.add_argument("--model", required=True)
    p.add_argument("--output", default="ai-service/models/evaluation")
    args = p.parse_args()

    try:
        import pandas as pd
        import numpy as np
        from xgboost import XGBClassifier
        from sklearn.metrics import (accuracy_score, precision_score, recall_score,
            f1_score, roc_auc_score, average_precision_score, confusion_matrix)
    except ImportError as exc:
        raise SystemExit(f"Install ML dependencies first: {exc}")

    df = pd.read_csv(args.csv)
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise SystemExit("Missing required columns: " + ", ".join(missing))

    features = REQUIRED[:-1]
    model = XGBClassifier()
    model.load_model(args.model)
    proba = model.predict_proba(df[features])[:,1]
    pred = (proba >= 0.5).astype(int)
    y = df["flood_label"].astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y, pred)),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y, pred).tolist()
    }
    if y.nunique() > 1:
        metrics["roc_auc"] = float(roc_auc_score(y, proba))
        metrics["pr_auc"] = float(average_precision_score(y, proba))

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    (out/"evaluation.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps({"status":"EVALUATED","metrics":metrics}, indent=2))

if __name__ == "__main__":
    main()
