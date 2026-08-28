from typing import Any

from pydantic import BaseModel, Field


class FloodFeatures(BaseModel):
    rainfall_15m: float = Field(ge=0)
    rainfall_1h: float = Field(ge=0)
    rainfall_3h: float = Field(ge=0)
    rainfall_24h: float = Field(ge=0)

    water_level: float = Field(
        ge=0,
        le=100,
    )

    drain_capacity: float = Field(
        ge=0,
        le=100,
    )

    blockage: float = Field(
        ge=0,
        le=1,
    )

    elevation: float = Field(ge=0)
    slope: float = Field(ge=0)
    historical_incidents: float = Field(
        ge=0
    )


class FloodPrediction(BaseModel):
    probability: float
    risk_level: str

    # Kept for compatibility with existing application code.
    confidence: float

    model_certainty: float
    model_version: str

    factors: list[dict[str, Any]]

    top_drivers: list[
        dict[str, Any]
    ] = Field(
        default_factory=list
    )

    explanation: list[str] = Field(
        default_factory=list
    )

    prediction_base_margin: (
        float | None
    ) = None

    global_feature_importance: list[
        dict[str, Any]
    ] = Field(
        default_factory=list
    )

    model_metadata: dict[
        str,
        Any,
    ] = Field(
        default_factory=dict
    )

    disclaimer: str


class FusionFeatures(FloodFeatures):
    forecast_rain_3h: float = Field(
        default=0,
        ge=0,
    )

    satellite_water_index: float = Field(
        default=0,
        ge=0,
        le=100,
    )

    soil_saturation: float = Field(
        default=50,
        ge=0,
        le=100,
    )

    sensor_anomaly_score: float = Field(
        default=0,
        ge=0,
        le=100,
    )

    citizen_reports_2h: float = Field(
        default=0,
        ge=0,
    )

    # Provenance allows HydroFusion to distinguish genuine observations
    # from development heuristics and unavailable providers.
    forecast_rain_3h_source: str = (
        "HEURISTIC"
    )

    satellite_water_index_source: str = (
        "NOT_AVAILABLE"
    )

    soil_saturation_source: str = (
        "HEURISTIC"
    )

    sensor_anomaly_score_source: str = (
        "NOT_AVAILABLE"
    )

    citizen_reports_2h_source: str = (
        "MEASURED"
    )


class FusionPrediction(BaseModel):
    risk_score: float
    risk_level: str

    model_probability: float
    signal_agreement: float

    # Existing compatibility field.
    confidence: float

    decision_support_confidence: float

    model_version: str

    factors: list[
        dict[str, Any]
    ]

    top_drivers: list[
        dict[str, Any]
    ] = Field(
        default_factory=list
    )

    recommended_actions: list[str]

    explanation: list[str] = Field(
        default_factory=list
    )

    data_quality: dict[
        str,
        Any,
    ] = Field(
        default_factory=dict
    )

    input_provenance: dict[
        str,
        Any,
    ] = Field(
        default_factory=dict
    )

    limitations: list[str] = Field(
        default_factory=list
    )

    base_model: dict[
        str,
        Any,
    ] = Field(
        default_factory=dict
    )

    model_metadata: dict[
        str,
        Any,
    ] = Field(
        default_factory=dict
    )

    disclaimer: str