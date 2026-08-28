from pathlib import Path
import json

import numpy as np
import pandas as pd
from xgboost import XGBClassifier, DMatrix


FEATURES = [
    "rainfall_15m",
    "rainfall_1h",
    "rainfall_3h",
    "rainfall_24h",
    "water_level",
    "drain_capacity",
    "blockage",
    "elevation",
    "slope",
    "historical_incidents",
]

MODEL_VERSION = "aquaguard-flood-xgb-v1.1"

BASE = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE / "models" / "flood_xgb.json"
METRICS_PATH = BASE / "models" / "metrics.json"
IMPORTANCE_PATH = BASE / "models" / "feature_importance.json"

_model = None


FEATURE_LABELS = {
    "rainfall_15m": "15-minute rainfall",
    "rainfall_1h": "1-hour rainfall",
    "rainfall_3h": "3-hour rainfall",
    "rainfall_24h": "24-hour rainfall",
    "water_level": "Water level",
    "drain_capacity": "Drain capacity",
    "blockage": "Drain blockage",
    "elevation": "Elevation",
    "slope": "Slope",
    "historical_incidents": "Historical incidents",
}


def load_model():
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "Model artifact missing. Run: python scripts/train_model.py"
            )

        model = XGBClassifier()
        model.load_model(str(MODEL_PATH))
        _model = model

    return _model


def risk_level(probability: float) -> str:
    if probability >= 0.75:
        return "CRITICAL"
    if probability >= 0.50:
        return "HIGH"
    if probability >= 0.25:
        return "MEDIUM"
    return "LOW"


def _load_json(path: Path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass

    return default


def development_metrics():
    """
    Metrics are from the synthetic development dataset.

    They are useful for software/model development only and must not be
    represented as validated real-world performance.
    """
    return _load_json(METRICS_PATH, {})


def global_feature_importance():
    """
    Global XGBoost importance over the development model.
    """

    stored = _load_json(IMPORTANCE_PATH, {})

    if not stored:
        try:
            model = load_model()
            values = model.feature_importances_

            stored = {
                feature: float(importance)
                for feature, importance in zip(FEATURES, values)
            }
        except Exception:
            stored = {}

    rows = [
        {
            "feature": feature,
            "label": FEATURE_LABELS.get(feature, feature),
            "importance": round(float(importance), 6),
        }
        for feature, importance in stored.items()
    ]

    rows.sort(
        key=lambda row: row["importance"],
        reverse=True,
    )

    for rank, row in enumerate(rows, start=1):
        row["rank"] = rank

    return rows


def model_metadata():
    metrics = development_metrics()

    return {
        "model_version": MODEL_VERSION,
        "model_type": "XGBoost binary classifier",
        "task": "flood-risk probability classification",
        "features": FEATURES,
        "dataset_type": metrics.get(
            "dataset",
            "synthetic development data",
        ),
        "training_samples": metrics.get("samples"),
        "development_metrics": {
            key: metrics.get(key)
            for key in [
                "accuracy",
                "precision",
                "recall",
                "f1",
                "roc_auc",
                "confusion_matrix",
            ]
            if key in metrics
        },
        "production_eligible": False,
        "confidence_calibrated": False,
        "explanation_method": (
            "XGBoost prediction-specific tree margin contributions "
            "(pred_contribs)"
        ),
        "limitations": [
            (
                "Model is trained on synthetic development data and has "
                "not been validated on local historical flood outcomes."
            ),
            (
                "Reported confidence is model certainty, not a calibrated "
                "real-world probability guarantee."
            ),
            (
                "Prediction-specific contributions explain the XGBoost "
                "model score, not causal effects."
            ),
        ],
    }


def _prediction_contributions(values: dict):
    """
    Obtain prediction-specific XGBoost tree contributions.

    XGBoost pred_contribs returns contributions in raw model-margin
    (log-odds) space. These must NOT be interpreted as percentage-point
    changes in flood probability.
    """

    model = load_model()

    frame = pd.DataFrame(
        [[float(values[feature]) for feature in FEATURES]],
        columns=FEATURES,
    )

    try:
        booster = model.get_booster()
        matrix = DMatrix(frame)

        contribution_row = booster.predict(
            matrix,
            pred_contribs=True,
        )[0]

        feature_contributions = contribution_row[: len(FEATURES)]
        bias = float(contribution_row[len(FEATURES)])

        rows = []

        for feature, contribution in zip(
            FEATURES,
            feature_contributions,
        ):
            contribution = float(contribution)

            if contribution > 0:
                direction = "INCREASES_RISK"
            elif contribution < 0:
                direction = "DECREASES_RISK"
            else:
                direction = "NEUTRAL"

            rows.append(
                {
                    "feature": feature,
                    "label": FEATURE_LABELS.get(feature, feature),
                    "value": round(float(values[feature]), 4),
                    "margin_contribution": round(contribution, 6),
                    "absolute_contribution": round(
                        abs(contribution),
                        6,
                    ),
                    "direction": direction,
                }
            )

        rows.sort(
            key=lambda row: row["absolute_contribution"],
            reverse=True,
        )

        for rank, row in enumerate(rows, start=1):
            row["rank"] = rank

        return rows, round(bias, 6)

    except Exception:
        return [], None


def generate_explanation(top_drivers: list[dict]):
    """
    Human-readable explanation derived from the actual prediction-specific
    XGBoost contributions rather than manual threshold rules.
    """

    explanations = []

    for driver in top_drivers[:4]:
        label = driver["label"]
        value = driver["value"]
        direction = driver["direction"]

        if direction == "INCREASES_RISK":
            explanations.append(
                f"{label} ({value}) increases the model's flood-risk score."
            )

        elif direction == "DECREASES_RISK":
            explanations.append(
                f"{label} ({value}) reduces the model's flood-risk score."
            )

        else:
            explanations.append(
                f"{label} ({value}) has little effect on this prediction."
            )

    return explanations


def factor_rows(values: dict):
    """
    Preserve the existing UI-facing factor format.

    These are observed/model input values, not feature contributions.
    """

    return [
        {
            "label": "Rainfall intensity",
            "value": round(float(values["rainfall_1h"]), 1),
        },
        {
            "label": "Water level",
            "value": round(float(values["water_level"]), 1),
        },
        {
            "label": "Drain capacity stress",
            "value": round(
                100 - float(values["drain_capacity"]),
                1,
            ),
        },
        {
            "label": "Drain blockage",
            "value": round(float(values["blockage"]) * 100, 1),
        },
        {
            "label": "Historical incidents",
            "value": round(
                min(
                    100,
                    float(values["historical_incidents"]) * 10,
                ),
                1,
            ),
        },
    ]


def predict(values: dict):
    model = load_model()

    clean_values = {
        feature: float(values[feature])
        for feature in FEATURES
    }

    frame = pd.DataFrame(
        [[clean_values[feature] for feature in FEATURES]],
        columns=FEATURES,
    )

    probability = float(
        model.predict_proba(frame)[0][1]
    )

    level = risk_level(probability)

    # This is classification certainty, not calibrated real-world confidence.
    model_certainty = max(
        probability,
        1.0 - probability,
    )

    contribution_rows, base_margin = (
        _prediction_contributions(clean_values)
    )

    top_drivers = contribution_rows[:5]

    return {
        "probability": round(probability, 4),
        "risk_level": level,

        # Retained for compatibility with existing frontend/backend code.
        "confidence": round(model_certainty, 4),

        "model_certainty": round(model_certainty, 4),
        "model_version": MODEL_VERSION,

        "factors": factor_rows(clean_values),

        "top_drivers": top_drivers,

        "explanation": generate_explanation(
            top_drivers
        ),

        "prediction_base_margin": base_margin,

        "global_feature_importance": (
            global_feature_importance()
        ),

        "model_metadata": model_metadata(),

        "disclaimer": (
            "Development XGBoost model trained on synthetic data. "
            "Validate and recalibrate with local historical flood labels "
            "before operational deployment. Prediction contributions "
            "describe the model score and are not causal effects."
        ),
    }