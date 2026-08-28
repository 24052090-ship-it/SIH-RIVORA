from .model import (
    predict as base_predict,
    risk_level,
    model_metadata,
)


FUSION_VERSION = "aquaguard-hydrofusion-v1.1"


FUSION_WEIGHTS = {
    "xgboost_model": 0.48,
    "forecast_rain_3h": 0.16,
    "satellite_water_index": 0.11,
    "soil_saturation": 0.09,
    "sensor_anomaly_score": 0.10,
    "citizen_reports_2h": 0.06,
}


def clamp(value, lower=0.0, upper=100.0):
    return max(
        lower,
        min(
            upper,
            float(value),
        ),
    )


def _normalise_source(value, fallback):
    if not value:
        return fallback

    return str(value).strip().upper()


def _is_available(source):
    return source not in {
        "NOT_AVAILABLE",
        "UNAVAILABLE",
        "MISSING",
        "DISABLED",
    }


def fusion_metadata():
    return {
        "model_version": FUSION_VERSION,
        "task": "multi-signal flood decision-support fusion",
        "base_weights": FUSION_WEIGHTS,
        "weighting": (
            "Configured base weights are renormalised across available "
            "signals so unavailable providers do not artificially reduce "
            "the risk score."
        ),
        "trained_model": False,
        "production_eligible": False,
        "limitations": [
            (
                "HydroFusion is currently an explicit decision-support "
                "fusion rule, not a separately trained probabilistic model."
            ),
            (
                "Forecast and soil inputs may be heuristic when genuine "
                "provider observations are unavailable."
            ),
            (
                "Satellite and anomaly signals are excluded from the "
                "weighted score when explicitly marked NOT_AVAILABLE."
            ),
            (
                "Fusion confidence is a decision-support agreement index "
                "and is not calibrated real-world forecast confidence."
            ),
        ],
    }


def fusion_predict(values: dict):
    base_keys = [
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

    base_values = {
        key: values[key]
        for key in base_keys
    }

    base = base_predict(base_values)

    model_signal = clamp(
        base["probability"] * 100
    )

    forecast_signal = clamp(
        float(
            values.get(
                "forecast_rain_3h",
                0,
            )
        )
        / 80.0
        * 100.0
    )

    satellite_signal = clamp(
        values.get(
            "satellite_water_index",
            0,
        )
    )

    soil_signal = clamp(
        values.get(
            "soil_saturation",
            50,
        )
    )

    anomaly_signal = clamp(
        values.get(
            "sensor_anomaly_score",
            0,
        )
    )

    report_signal = clamp(
        float(
            values.get(
                "citizen_reports_2h",
                0,
            )
        )
        * 8.0
    )


    provenance = {
        "xgboost_model": "MODELLED",

        "forecast_rain_3h": _normalise_source(
            values.get(
                "forecast_rain_3h_source"
            ),
            "HEURISTIC",
        ),

        "satellite_water_index": _normalise_source(
            values.get(
                "satellite_water_index_source"
            ),
            "NOT_AVAILABLE",
        ),

        "soil_saturation": _normalise_source(
            values.get(
                "soil_saturation_source"
            ),
            "HEURISTIC",
        ),

        "sensor_anomaly_score": _normalise_source(
            values.get(
                "sensor_anomaly_score_source"
            ),
            "NOT_AVAILABLE",
        ),

        "citizen_reports_2h": _normalise_source(
            values.get(
                "citizen_reports_2h_source"
            ),
            "MEASURED",
        ),
    }


    signals = [
        {
            "key": "xgboost_model",
            "label": "XGBoost flood model",
            "value": model_signal,
            "base_weight": FUSION_WEIGHTS[
                "xgboost_model"
            ],
            "source": provenance[
                "xgboost_model"
            ],
        },

        {
            "key": "forecast_rain_3h",
            "label": "3-hour rainfall forecast",
            "value": forecast_signal,
            "base_weight": FUSION_WEIGHTS[
                "forecast_rain_3h"
            ],
            "source": provenance[
                "forecast_rain_3h"
            ],
        },

        {
            "key": "satellite_water_index",
            "label": "Satellite water signal",
            "value": satellite_signal,
            "base_weight": FUSION_WEIGHTS[
                "satellite_water_index"
            ],
            "source": provenance[
                "satellite_water_index"
            ],
        },

        {
            "key": "soil_saturation",
            "label": "Soil saturation",
            "value": soil_signal,
            "base_weight": FUSION_WEIGHTS[
                "soil_saturation"
            ],
            "source": provenance[
                "soil_saturation"
            ],
        },

        {
            "key": "sensor_anomaly_score",
            "label": "Sensor anomaly",
            "value": anomaly_signal,
            "base_weight": FUSION_WEIGHTS[
                "sensor_anomaly_score"
            ],
            "source": provenance[
                "sensor_anomaly_score"
            ],
        },

        {
            "key": "citizen_reports_2h",
            "label": "Citizen reports",
            "value": report_signal,
            "base_weight": FUSION_WEIGHTS[
                "citizen_reports_2h"
            ],
            "source": provenance[
                "citizen_reports_2h"
            ],
        },
    ]


    active_signals = [
        signal
        for signal in signals
        if _is_available(
            signal["source"]
        )
    ]


    total_weight = sum(
        signal["base_weight"]
        for signal in active_signals
    )

    if total_weight <= 0:
        active_signals = [
            signals[0]
        ]

        total_weight = (
            signals[0]["base_weight"]
        )


    for signal in signals:
        if signal in active_signals:
            signal["effective_weight"] = (
                signal["base_weight"]
                / total_weight
            )
        else:
            signal["effective_weight"] = 0.0


    score = sum(
        signal["value"]
        * signal["effective_weight"]
        for signal in active_signals
    )

    score = clamp(score)


    active_values = [
        signal["value"]
        for signal in active_signals
    ]

    if len(active_values) <= 1:
        agreement = 100.0
    else:
        spread = (
            max(active_values)
            - min(active_values)
        )

        agreement = clamp(
            100.0 - spread * 0.72
        )


    model_certainty_pct = (
        float(
            base.get(
                "model_certainty",
                base["confidence"],
            )
        )
        * 100.0
    )

    decision_support_confidence = clamp(
        model_certainty_pct * 0.65
        + agreement * 0.35
    )


    level = risk_level(
        score / 100.0
    )


    factors = []

    for signal in signals:
        weighted_points = (
            signal["value"]
            * signal["effective_weight"]
        )

        factors.append(
            {
                "key": signal["key"],
                "label": signal["label"],
                "value": round(
                    signal["value"],
                    1,
                ),
                "base_weight": round(
                    signal["base_weight"]
                    * 100,
                    1,
                ),
                "effective_weight": round(
                    signal[
                        "effective_weight"
                    ]
                    * 100,
                    1,
                ),
                "weighted_points": round(
                    weighted_points,
                    2,
                ),
                "source": signal[
                    "source"
                ],
                "available": _is_available(
                    signal["source"]
                ),
            }
        )


    top_drivers = sorted(
        [
            factor
            for factor in factors
            if factor["available"]
        ],
        key=lambda factor: factor[
            "weighted_points"
        ],
        reverse=True,
    )[:4]


    if score >= 75:
        actions = [
            "Pre-position response crews in critical wards.",
            "Clear priority drains and culverts.",
            "Issue route restrictions for flooded corridors.",
            "Push citizen warnings to affected geofences.",
        ]

    elif score >= 50:
        actions = [
            "Inspect high-risk drains.",
            "Increase sensor polling frequency.",
            "Stage pumps and field crews near vulnerable zones.",
        ]

    elif score >= 25:
        actions = [
            "Continue enhanced monitoring.",
            "Review drainage capacity in flagged catchments.",
        ]

    else:
        actions = [
            "Maintain routine monitoring.",
        ]


    explanation = list(
        base.get(
            "explanation",
            [],
        )
    )


    if forecast_signal >= 50 and _is_available(
        provenance["forecast_rain_3h"]
    ):
        explanation.append(
            (
                "The 3-hour rainfall signal adds material "
                "near-term flood pressure."
            )
        )


    if (
        satellite_signal >= 40
        and _is_available(
            provenance[
                "satellite_water_index"
            ]
        )
    ):
        explanation.append(
            (
                "Satellite water evidence increases the "
                "flood decision-support score."
            )
        )


    if report_signal > 0:
        explanation.append(
            (
                f"Citizen reports from the last two hours "
                f"add corroborating local evidence."
            )
        )


    unavailable = [
        signal["label"]
        for signal in signals
        if not _is_available(
            signal["source"]
        )
    ]


    heuristic = [
        signal["label"]
        for signal in signals
        if signal["source"] == "HEURISTIC"
    ]


    data_quality = {
        "available_signal_count": len(
            active_signals
        ),
        "total_signal_count": len(
            signals
        ),
        "unavailable_signals": unavailable,
        "heuristic_signals": heuristic,
        "satellite_available": _is_available(
            provenance[
                "satellite_water_index"
            ]
        ),
        "input_provenance": provenance,
    }


    limitations = list(
        fusion_metadata()["limitations"]
    )


    return {
        "risk_score": round(
            score,
            1,
        ),

        "risk_level": level,

        "model_probability": round(
            base["probability"],
            4,
        ),

        "signal_agreement": round(
            agreement,
            1,
        ),

        # Retained for compatibility.
        "confidence": round(
            decision_support_confidence,
            1,
        ),

        "decision_support_confidence": round(
            decision_support_confidence,
            1,
        ),

        "model_version": FUSION_VERSION,

        "factors": factors,

        "top_drivers": top_drivers,

        "recommended_actions": actions,

        "explanation": explanation,

        "data_quality": data_quality,

        "input_provenance": provenance,

        "limitations": limitations,

        "base_model": {
            "probability": base[
                "probability"
            ],
            "risk_level": base[
                "risk_level"
            ],
            "model_version": base[
                "model_version"
            ],
            "top_drivers": base.get(
                "top_drivers",
                [],
            ),
        },

        "model_metadata": {
            "fusion": fusion_metadata(),
            "base_xgboost": model_metadata(),
        },

        "disclaimer": (
            "HydroFusion is a development decision-support layer. "
            "It combines the synthetic-development XGBoost model with "
            "measured, modelled, heuristic, and optionally unavailable "
            "signals. It is not a calibrated operational flood forecast. "
            "Validate all components on local historical flood events "
            "before deployment."
        ),
    }