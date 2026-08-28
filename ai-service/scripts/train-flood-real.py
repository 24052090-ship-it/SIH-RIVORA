from pathlib import Path
import argparse, json
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from xgboost import XGBClassifier

BASE = Path(__file__).resolve().parents[1]
FEATURES = ["rainfall_15m","rainfall_1h","rainfall_3h","rainfall_24h","water_level","drain_capacity","blockage","elevation","slope","historical_incidents"]
REQUIRED = ["recorded_at", *FEATURES, "flood"]

def metrics(y, pred, prob):
    return {
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y, prob)), 4) if len(set(y)) > 1 else None,
    }

def main():
    p = argparse.ArgumentParser(description="Train AquaGuard flood XGBoost from approved real data.")
    p.add_argument("--manifest", required=True)
    p.add_argument("--approved", action="store_true", help="Explicit confirmation that governance approval was reviewed.")
    args = p.parse_args()
    if not args.approved:
        raise SystemExit("Refusing to train: pass --approved only after dataset governance approval.")

    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if str(manifest.get("status", "")).upper() != "APPROVED":
        raise SystemExit("Refusing to train: manifest status must be APPROVED.")
    files = manifest.get("training_data") or []
    if not files:
        raise SystemExit("Refusing to train: manifest training_data is empty.")

    frames = []
    for item in files:
        path = Path(item)
        if not path.is_absolute():
            path = (manifest_path.parent / path).resolve()
        if not path.exists():
            raise SystemExit(f"Training file not found: {path}")
        frame = pd.read_csv(path)
        missing = [c for c in REQUIRED if c not in frame.columns]
        if missing:
            raise SystemExit(f"{path.name}: missing columns {missing}")
        frames.append(frame[REQUIRED])

    df = pd.concat(frames, ignore_index=True)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, errors="coerce")
    if df["recorded_at"].isna().any():
        raise SystemExit("Invalid recorded_at values found.")
    if not set(df["flood"].dropna().unique()).issubset({0, 1}):
        raise SystemExit("flood must contain only 0/1 labels.")
    if len(df) < 30:
        raise SystemExit("Need at least 30 observations for the 70/15/15 time-aware split.")
    df = df.sort_values("recorded_at").reset_index(drop=True)

    n = len(df)
    a, b = int(n * 0.70), int(n * 0.85)
    train, val, test = df.iloc[:a], df.iloc[a:b], df.iloc[b:]
    if min(len(train), len(val), len(test)) == 0:
        raise SystemExit("Time-aware split produced an empty partition.")
    if train["flood"].nunique() < 2:
        raise SystemExit("Training partition must contain both flood classes.")

    model = XGBClassifier(n_estimators=220, max_depth=5, learning_rate=.06, subsample=.85, colsample_bytree=.85, objective="binary:logistic", eval_metric="logloss", random_state=42, n_jobs=2)
    model.fit(train[FEATURES], train["flood"])

    evaluation = {}
    for name, part in [("validation", val), ("test", test)]:
        pred = model.predict(part[FEATURES])
        prob = model.predict_proba(part[FEATURES])[:, 1]
        evaluation[name] = metrics(part["flood"], pred, prob)

    out = BASE / "models"
    out.mkdir(exist_ok=True)
    artifact = out / "aquaguard-flood-xgb-real-candidate.json"
    model.save_model(str(artifact))
    candidate = {
        "name": "aquaguard-flood-xgb",
        "version": "real-candidate-v1",
        "status": "CANDIDATE",
        "dataset_version": manifest.get("dataset_version"),
        "dataset_source": manifest.get("source"),
        "geography": manifest.get("geography"),
        "artifact": artifact.name,
        "dataset_type": "approved real data",
        "split": {
            "method": "time-aware 70/15/15",
            "train_rows": len(train),
            "validation_rows": len(val),
            "test_rows": len(test),
            "train_end": train["recorded_at"].max().isoformat(),
            "validation_end": val["recorded_at"].max().isoformat(),
            "test_end": test["recorded_at"].max().isoformat()
        },
        "metrics": evaluation,
        "promotion": "NONE - manual validation and registry promotion required"
    }
    (out / "real_candidate_manifest.json").write_text(json.dumps(candidate, indent=2), encoding="utf-8")
    print(json.dumps(candidate, indent=2))

if __name__ == "__main__":
    main()
