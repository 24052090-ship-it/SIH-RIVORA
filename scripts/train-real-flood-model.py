"""AquaGuard Phase 21 training scaffold.

Expects an approved CSV containing the documented feature columns and a binary
flood label. This script intentionally refuses to train unless --approved is
supplied, preventing accidental training on unreviewed data.
"""
import argparse, json
from pathlib import Path

REQUIRED = [
    "rainfall_15m", "rainfall_1h", "rainfall_3h", "rainfall_24h",
    "water_level", "drain_capacity", "blockage",
    "elevation", "slope", "historical_incidents", "flood_label"
]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", required=True)
    p.add_argument("--approved", action="store_true")
    p.add_argument("--output", default="ai-service/models")
    args = p.parse_args()

    if not args.approved:
        raise SystemExit("Refusing to train: dataset must be approved by the Phase-20 data workflow.")

    try:
        import pandas as pd
        from xgboost import XGBClassifier
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
    except ImportError as exc:
        raise SystemExit(f"Install ML dependencies first: {exc}")

    df = pd.read_csv(args.csv)
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise SystemExit("Missing required columns: " + ", ".join(missing))

    # Deterministic chronological split when a timestamp is available.
    if "timestamp_utc" in df.columns:
        df = df.sort_values("timestamp_utc")
    cut1, cut2 = int(len(df)*0.70), int(len(df)*0.85)
    train, val, test = df.iloc[:cut1], df.iloc[cut1:cut2], df.iloc[cut2:]

    features = REQUIRED[:-1]
    model = XGBClassifier(
        n_estimators=250, max_depth=5, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85,
        eval_metric="logloss", random_state=42
    )
    model.fit(train[features], train["flood_label"])

    proba = model.predict_proba(test[features])[:, 1]
    pred = (proba >= 0.5).astype(int)
    metrics = {
        "accuracy": accuracy_score(test["flood_label"], pred),
        "precision": precision_score(test["flood_label"], pred, zero_division=0),
        "recall": recall_score(test["flood_label"], pred, zero_division=0),
        "f1": f1_score(test["flood_label"], pred, zero_division=0),
    }
    if test["flood_label"].nunique() > 1:
        metrics["roc_auc"] = roc_auc_score(test["flood_label"], proba)

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    model.save_model(out / "aquaguard-flood-xgb-real-candidate.json")
    (out / "aquaguard-flood-xgb-real-candidate.metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps({"status": "CANDIDATE_CREATED", "metrics": metrics}, indent=2))

if __name__ == "__main__":
    main()
