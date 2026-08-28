from pathlib import Path
import argparse
import json

import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from xgboost import XGBClassifier

BASE = Path(__file__).resolve().parents[1]
FEATURES = [
    "rainfall_15m", "rainfall_1h", "rainfall_3h", "rainfall_24h",
    "water_level", "drain_capacity", "blockage", "elevation",
    "slope", "historical_incidents",
]
REQUIRED = ["recorded_at", *FEATURES, "flood"]


def metric_block(y, pred, prob):
    out = {
        "rows": int(len(y)),
        "positive_rate": round(float(np.mean(y)), 4) if len(y) else None,
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "roc_auc": None,
        "pr_auc": None,
    }
    if len(set(y)) > 1:
        out["roc_auc"] = round(float(roc_auc_score(y, prob)), 4)
        out["pr_auc"] = round(float(average_precision_score(y, prob)), 4)
    return out


def load_data(manifest_path):
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if str(manifest.get("status", "")).upper() != "APPROVED":
        raise SystemExit("Refusing evaluation: dataset manifest status must be APPROVED.")
    files = manifest.get("training_data") or []
    if not files:
        raise SystemExit("Refusing evaluation: dataset manifest training_data is empty.")

    frames = []
    for item in files:
        path = Path(item)
        if not path.is_absolute():
            path = (manifest_path.parent / path).resolve()
        if not path.exists():
            raise SystemExit(f"Evaluation data file not found: {path}")
        frame = pd.read_csv(path)
        missing = [c for c in REQUIRED if c not in frame.columns]
        if missing:
            raise SystemExit(f"{path.name}: missing columns {missing}")
        keep = REQUIRED + (["zone"] if "zone" in frame.columns else [])
        frames.append(frame[keep])

    df = pd.concat(frames, ignore_index=True)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, errors="coerce")
    if df["recorded_at"].isna().any():
        raise SystemExit("Invalid recorded_at values found.")
    if not set(df["flood"].dropna().unique()).issubset({0, 1}):
        raise SystemExit("flood must contain only 0/1 labels.")
    if len(df) < 30:
        raise SystemExit("Need at least 30 observations to reproduce the Phase 21 time-aware split.")

    df = df.sort_values("recorded_at").reset_index(drop=True)
    n = len(df)
    a, b = int(n * 0.70), int(n * 0.85)
    train, val, test = df.iloc[:a], df.iloc[a:b], df.iloc[b:]
    if min(len(train), len(val), len(test)) == 0:
        raise SystemExit("Time-aware split produced an empty partition.")
    return manifest, train, val, test


def grouped_metrics(part, pred, prob, groups):
    rows = []
    groups = pd.Series(groups, index=part.index)
    for group in groups.dropna().unique():
        mask = groups.eq(group).to_numpy()
        block = metric_block(
            part.loc[mask, "flood"].to_numpy(),
            pred[mask],
            prob[mask],
        )
        rows.append({"group": str(group), **block})
    return rows


def main():
    p = argparse.ArgumentParser(
        description="Evaluate an AquaGuard real-data flood candidate on the held-out temporal test set."
    )
    p.add_argument("--candidate-manifest", required=True)
    p.add_argument("--dataset-manifest", required=True)
    p.add_argument("--approved", action="store_true")
    args = p.parse_args()

    if not args.approved:
        raise SystemExit("Refusing evaluation: pass --approved only after dataset governance approval.")

    candidate_path = Path(args.candidate_manifest).resolve()
    dataset_path = Path(args.dataset_manifest).resolve()
    if not candidate_path.exists():
        raise SystemExit(f"Candidate manifest not found: {candidate_path}")
    if not dataset_path.exists():
        raise SystemExit(f"Dataset manifest not found: {dataset_path}")

    candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
    if str(candidate.get("status", "")).upper() != "CANDIDATE":
        raise SystemExit("Refusing evaluation: model manifest status must be CANDIDATE.")
    if candidate.get("dataset_type") != "approved real data":
        raise SystemExit("Refusing evaluation: candidate is not labelled as approved real data.")

    dataset, train, val, test = load_data(dataset_path)
    if candidate.get("dataset_version") != dataset.get("dataset_version"):
        raise SystemExit("Refusing evaluation: candidate dataset_version does not match approved dataset manifest.")

    artifact = Path(candidate.get("artifact", ""))
    if not artifact.is_absolute():
        artifact = (candidate_path.parent / artifact).resolve()
    if not artifact.exists():
        raise SystemExit(f"Candidate artifact not found: {artifact}")

    model = XGBClassifier()
    model.load_model(str(artifact))
    pred = model.predict(test[FEATURES])
    prob = model.predict_proba(test[FEATURES])[:, 1]

    tn, fp, fn, tp = [int(v) for v in confusion_matrix(test["flood"], pred, labels=[0, 1]).ravel()]

    try:
        frac_pos, mean_pred = calibration_curve(
            test["flood"], prob,
            n_bins=min(10, max(2, len(test) // 5)),
            strategy="quantile",
        )
        calibration = [
            {
                "mean_predicted_probability": round(float(mp), 4),
                "observed_positive_rate": round(float(op), 4),
            }
            for mp, op in zip(mean_pred, frac_pos)
        ]
    except ValueError:
        calibration = []

    q = min(3, int(test["rainfall_1h"].nunique()))
    rainfall_groups = (
        pd.qcut(test["rainfall_1h"], q=q, duplicates="drop").astype(str)
        if q >= 2 else pd.Series(["single_group"] * len(test), index=test.index)
    )

    fn_mask = (test["flood"].to_numpy() == 1) & (pred == 0)
    review_cols = [
        "recorded_at", "rainfall_1h", "rainfall_24h",
        "water_level", "drain_capacity", "blockage",
    ] + (["zone"] if "zone" in test.columns else [])
    false_negatives = []
    for _, row in test.loc[fn_mask, review_cols].head(25).iterrows():
        item = {}
        for key, value in row.items():
            if key == "recorded_at":
                item[key] = value.isoformat()
            elif pd.isna(value):
                item[key] = None
            elif isinstance(value, (np.integer, np.floating)):
                item[key] = value.item()
            else:
                item[key] = value
        false_negatives.append(item)

    report = {
        "model": {
            "name": candidate.get("name"),
            "version": candidate.get("version"),
            "status": "CANDIDATE",
            "artifact": artifact.name,
        },
        "dataset": {
            "version": dataset.get("dataset_version"),
            "source": dataset.get("source"),
            "geography": dataset.get("geography"),
            "status": "APPROVED",
        },
        "holdout": {
            "method": "time-aware 70/15/15; evaluation uses final 15% only",
            "train_rows": int(len(train)),
            "validation_rows": int(len(val)),
            "test_rows": int(len(test)),
            "test_start": test["recorded_at"].min().isoformat(),
            "test_end": test["recorded_at"].max().isoformat(),
        },
        "test_metrics": metric_block(test["flood"].to_numpy(), pred, prob),
        "confusion_matrix": {
            "true_negative": tn,
            "false_positive": fp,
            "false_negative": fn,
            "true_positive": tp,
        },
        "calibration": calibration,
        "rainfall_intensity_analysis": {
            "method": "test-set quantile groups for diagnostic comparison only; not operational thresholds",
            "groups": grouped_metrics(test, pred, prob, rainfall_groups),
        },
        "zone_performance": (
            grouped_metrics(test, pred, prob, test["zone"])
            if "zone" in test.columns else []
        ),
        "false_negative_review": false_negatives,
        "production_comparison": {
            "status": "NOT_PERFORMED",
            "reason": "No validated production real-data model was supplied to this evaluator.",
        },
        "release_gate": {
            "status": "MANUAL_REVIEW_REQUIRED",
            "automatic_promotion": False,
            "safety_threshold": None,
            "requirements": [
                "Agree acceptance thresholds with responsible local operators.",
                "Review false negatives and calibration.",
                "Re-run Phase 11 validation before promotion.",
                "Confirm a rollback model/version is available.",
                "Manually register/promote only after documented approval.",
            ],
        },
    }

    out = BASE / "models"
    out.mkdir(exist_ok=True)
    report_path = out / "flood_evaluation_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nEvaluation report written to: {report_path}")


if __name__ == "__main__":
    main()
