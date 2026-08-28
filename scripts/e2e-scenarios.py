import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE_URL = os.getenv("AQUAGUARD_BASE_URL", "http://localhost:5000").rstrip("/")
TOKEN = os.getenv("AQUAGUARD_TOKEN") or os.getenv("TOKEN")

FUSION_VERSION = "phase25-transparent-fusion-v1"
WEIGHTS = {
    "xgboost_flood_probability": 0.28,
    "vision_detection": 0.12,
    "rainfall_intensity": 0.12,
    "water_level": 0.14,
    "drainage_stress": 0.10,
    "blockage_state": 0.08,
    "incident_history": 0.08,
    "gis_zone_context": 0.08,
}

SCENARIOS = [
    {
        "id": "LOW-001",
        "name": "Normal conditions",
        "zone": "Zone 1",
        "expected_level": "LOW",
        "expected_decision": "MONITOR",
        "signals": {
            "xgboost_flood_probability": 10,
            "vision_detection": 0,
            "rainfall_intensity": 8,
            "water_level": 20,
            "drainage_stress": 10,
            "blockage_state": 0,
            "incident_history": 0,
            "gis_zone_context": 22,
        },
    },
    {
        "id": "HIGH-001",
        "name": "Heavy rain, elevated water, blockage",
        "zone": "Zone 2",
        "expected_level": "HIGH",
        "expected_decision": "DISPATCH",
        "signals": {
            "xgboost_flood_probability": 70,
            "vision_detection": 55,
            "rainfall_intensity": 75,
            "water_level": 72,
            "drainage_stress": 60,
            "blockage_state": 100,
            "incident_history": 25,
            "gis_zone_context": 68,
        },
    },
    {
        "id": "CRITICAL-001",
        "name": "Extreme rain, severe water, strong vision evidence",
        "zone": "Zone 4",
        "expected_level": "CRITICAL",
        "expected_decision": "DISPATCH",
        "signals": {
            "xgboost_flood_probability": 95,
            "vision_detection": 90,
            "rainfall_intensity": 98,
            "water_level": 96,
            "drainage_stress": 92,
            "blockage_state": 100,
            "incident_history": 75,
            "gis_zone_context": 91,
        },
    },
    {
        "id": "FALSE-ALARM-001",
        "name": "Strong single signal with weak corroboration",
        "zone": "Zone 1",
        "expected_level": "MEDIUM",
        "expected_decision": "REVIEW",
        "signals": {
            "xgboost_flood_probability": 92,
            "vision_detection": None,
            "rainfall_intensity": 8,
            "water_level": 20,
            "drainage_stress": 10,
            "blockage_state": 0,
            "incident_history": 0,
            "gis_zone_context": 22,
        },
    },
    {
        "id": "SENSOR-GAP-001",
        "name": "Missing rainfall and water telemetry",
        "zone": "Zone 2",
        "expected_level": "MEDIUM",
        "expected_decision": "REVIEW",
        "expected_missing": [
            "vision_detection",
            "rainfall_intensity",
            "water_level",
        ],
        "signals": {
            "xgboost_flood_probability": 35,
            "vision_detection": None,
            "rainfall_intensity": None,
            "water_level": None,
            "drainage_stress": 20,
            "blockage_state": 0,
            "incident_history": 0,
            "gis_zone_context": 48,
        },
    },
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clamp(value):
    return max(0.0, min(100.0, float(value)))


def risk_level(score):
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MEDIUM"
    return "LOW"


def fuse(signals):
    available = {
        key: clamp(value)
        for key, value in signals.items()
        if value is not None
    }
    available_weight = sum(WEIGHTS[key] for key in available)

    factors = []
    score = 0.0

    for key, base_weight in WEIGHTS.items():
        raw = signals.get(key)
        is_available = raw is not None
        effective_weight = (
            base_weight / available_weight
            if is_available and available_weight > 0
            else 0.0
        )
        value = clamp(raw) if is_available else None
        weighted_points = (
            value * effective_weight
            if is_available
            else 0.0
        )
        score += weighted_points
        factors.append({
            "key": key,
            "value": value,
            "available": is_available,
            "base_weight": base_weight,
            "effective_weight_percent": round(effective_weight * 100, 1),
            "weighted_points": round(weighted_points, 2),
        })

    score = round(score, 2)
    return {
        "score": score,
        "level": risk_level(score),
        "factors": factors,
        "missing_signals": [
            factor["key"]
            for factor in factors
            if not factor["available"]
        ],
        "calibrated_probability": False,
        "production_eligible": False,
        "mode": "deterministic-test-fixture",
    }


def request_json(method, path, body=None, auth=True):
    headers = {"Accept": "application/json"}
    if auth:
        if not TOKEN:
            raise RuntimeError(
                "No token found. Set TOKEN or AQUAGUARD_TOKEN first."
            )
        headers["Authorization"] = f"Bearer {TOKEN}"

    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    request = urllib.request.Request(
        BASE_URL + path,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else {}
            return response.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        raise RuntimeError(
            f"{method} {path} failed with HTTP {exc.code}: {payload}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"{method} {path} failed: {exc.reason}"
        ) from exc


def runtime_preflight():
    health_status, health = request_json(
        "GET",
        "/api/health",
        auth=False,
    )
    current_status, current = request_json(
        "GET",
        "/api/ai/current-risk",
    )
    vision_status, vision = request_json(
        "GET",
        "/api/vision/status",
    )
    fusion_status, fusion = request_json(
        "POST",
        "/api/ai/multimodal-risk",
        {"zone": "Zone 4"},
    )

    return {
        "health": {
            "http_status": health_status,
            "status": health.get("status"),
            "service": health.get("service"),
        },
        "flood_ai": {
            "http_status": current_status,
            "model_version": (
                current.get("inference", {}).get("model_version")
            ),
            "model_status": (
                current.get("inference", {}).get("model_status")
            ),
            "dataset_version": (
                current.get("inference", {}).get("dataset_version")
            ),
            "mode": current.get("inference", {}).get("mode"),
        },
        "vision_ai": {
            "http_status": vision_status,
            "ready": vision.get("ready"),
            "model_version": vision.get("model_version"),
            "registry_status": (
                vision.get("inference", {}).get("model_status")
            ),
            "mode": vision.get("inference", {}).get("mode"),
        },
        "phase25_runtime_fusion": {
            "http_status": fusion_status,
            "fusion_version": fusion.get("fusion_version"),
            "risk_score": fusion.get("risk_score"),
            "risk_level": fusion.get("risk_level"),
            "calibrated_probability": fusion.get("calibrated_probability"),
            "production_eligible": fusion.get("production_eligible"),
            "missing_signals": fusion.get("missing_signals"),
            "decision_prediction_id": (
                fusion.get("provenance", {}).get("decision_prediction_id")
            ),
        },
    }


def execute_response_chain(scenario, fusion):
    incident_status, incident = request_json(
        "POST",
        "/api/incidents",
        {
            "title": f"[TEST FIXTURE] Phase 26 {scenario['id']}",
            "zoneName": scenario["zone"],
            "severity": fusion["level"],
            "riskScore": fusion["score"],
            "floodProbability": (
                scenario["signals"]["xgboost_flood_probability"] / 100
            ),
            "sourceSummary": {
                "phase": 26,
                "scenario": scenario["id"],
                "synthetic_fixture": True,
                "fusion_version": FUSION_VERSION,
                "signals": scenario["signals"],
                "warning": (
                    "Decision-support validation fixture; "
                    "not a real-world emergency."
                ),
            },
            "recommendedActions": [
                "Validation fixture only; do not treat as a real emergency."
            ],
            "assignedTeam": "Phase26 Validation",
            "slaMinutes": 60,
        },
    )

    incident_id = incident.get("id")
    if not incident_id:
        raise RuntimeError(
            f"Incident creation returned no id: {incident}"
        )

    alert_status, alert = request_json(
        "POST",
        "/api/alerts",
        {
            "level": fusion["level"],
            "locationLabel": f"Phase26 {scenario['id']}",
            "message": (
                f"[TEST FIXTURE] Phase 26 {scenario['id']} "
                "synthetic scenario validation only."
            ),
            "zone": scenario["zone"],
        },
    )

    task_status, task = request_json(
        "POST",
        "/api/field-operations/tasks",
        {
            "priority": fusion["level"],
            "taskType": "INSPECTION",
            "description": (
                f"[TEST FIXTURE] Phase 26 response for "
                f"{scenario['id']}"
            ),
            "incidentId": incident_id,
        },
    )

    task_id = task.get("id")
    if not task_id:
        raise RuntimeError(
            f"Field task creation returned no id: {task}"
        )

    dispatched_status, dispatched = request_json(
        "PATCH",
        f"/api/incidents/{incident_id}",
        {
            "status": "DISPATCHED",
            "note": (
                "Phase 26 deterministic validation fixture dispatched."
            ),
            "actionType": "E2E_VALIDATION",
        },
    )

    enroute_status, enroute = request_json(
        "PATCH",
        f"/api/field-operations/tasks/{task_id}",
        {"status": "EN_ROUTE"},
    )

    completed_status, completed = request_json(
        "PATCH",
        f"/api/field-operations/tasks/{task_id}",
        {"status": "COMPLETED"},
    )

    resolved_status, resolved = request_json(
        "PATCH",
        f"/api/incidents/{incident_id}",
        {
            "status": "RESOLVED",
            "note": (
                "Phase 26 deterministic validation fixture completed."
            ),
            "actionType": "E2E_VALIDATION",
        },
    )

    return {
        "incident": {
            "http_status": incident_status,
            "id": incident_id,
            "code": incident.get("incident_code"),
            "created_status": incident.get("status"),
            "dispatch_http_status": dispatched_status,
            "dispatch_status": dispatched.get("status"),
            "resolve_http_status": resolved_status,
            "final_status": resolved.get("status"),
        },
        "alert": {
            "http_status": alert_status,
            "id": alert.get("id"),
            "code": alert.get("alert_code"),
            "deduplicated": bool(alert.get("skipped")),
        },
        "response": {
            "task_http_status": task_status,
            "task_id": task_id,
            "task_code": task.get("task_code"),
            "enroute_http_status": enroute_status,
            "enroute_status": enroute.get("status"),
            "complete_http_status": completed_status,
            "final_status": completed.get("status"),
        },
    }


def run_scenario(scenario, execute_actions):
    fusion = fuse(scenario["signals"])
    expected_missing = scenario.get("expected_missing")
    missing_ok = (
        expected_missing is None
        or sorted(fusion["missing_signals"]) == sorted(expected_missing)
    )

    level_ok = fusion["level"] == scenario["expected_level"]
    action_required = scenario["expected_decision"] == "DISPATCH"

    operational = {
        "incident_decision": (
            "CREATE_TEST_INCIDENT" if action_required else "NO_INCIDENT"
        ),
        "alert_decision": (
            "CREATE_TEST_ALERT" if action_required else "NO_ALERT"
        ),
        "response_action": scenario["expected_decision"],
        "executed": False,
    }

    chain_ok = True
    if execute_actions and action_required:
        chain = execute_response_chain(scenario, fusion)
        operational.update(chain)
        operational["executed"] = True

        chain_ok = (
            chain["incident"]["final_status"] == "RESOLVED"
            and chain["response"]["final_status"] == "COMPLETED"
            and (
                chain["alert"]["http_status"] in (200, 201)
            )
        )

    if execute_actions and not action_required:
        operational["executed"] = True
        operational["note"] = (
            "No incident/alert was created by design for this scenario."
        )

    passed = level_ok and missing_ok and chain_ok

    return {
        "id": scenario["id"],
        "name": scenario["name"],
        "zone": scenario["zone"],
        "inputs": scenario["signals"],
        "model_versions": {
            "fusion": FUSION_VERSION,
            "xgboost_signal": "deterministic-fixture-output",
            "vision_signal": (
                "deterministic-fixture-output"
                if scenario["signals"]["vision_detection"] is not None
                else "NOT_AVAILABLE"
            ),
        },
        "fusion": fusion,
        "expected": {
            "risk_level": scenario["expected_level"],
            "decision": scenario["expected_decision"],
            "missing_signals": expected_missing,
        },
        "actual": {
            "risk_level": fusion["level"],
            "missing_signals": fusion["missing_signals"],
            "operational": operational,
        },
        "checks": {
            "risk_level_matches": level_ok,
            "missing_signals_preserved": missing_ok,
            "operational_chain_passed": chain_ok,
        },
        "pass": passed,
        "execution_timestamp": now_iso(),
    }


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Phase 26 deterministic end-to-end validation. "
            "Synthetic scenario passes are not model accuracy."
        )
    )
    parser.add_argument(
        "--execute-actions",
        action="store_true",
        help=(
            "Create clearly labeled test incidents/alerts/tasks "
            "for HIGH and CRITICAL scenarios."
        ),
    )
    parser.add_argument(
        "--skip-runtime-preflight",
        action="store_true",
        help="Skip live AquaGuard API/AI preflight checks.",
    )
    args = parser.parse_args()

    if not TOKEN and not args.skip_runtime_preflight:
        print(
            "ERROR: Set TOKEN or AQUAGUARD_TOKEN before running.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    report = {
        "phase": 26,
        "title": "End-to-End Scenario Validation",
        "generated_at": now_iso(),
        "mode": (
            "execute-actions"
            if args.execute_actions
            else "dry-run"
        ),
        "disclaimer": (
            "These are deterministic synthetic test fixtures and "
            "decision-support simulations. Scenario pass rates are "
            "not model accuracy or real-world performance."
        ),
        "runtime_preflight": None,
        "scenario_results": [],
    }

    try:
        if not args.skip_runtime_preflight:
            report["runtime_preflight"] = runtime_preflight()

        for scenario in SCENARIOS:
            report["scenario_results"].append(
                run_scenario(
                    scenario,
                    execute_actions=args.execute_actions,
                )
            )
    except Exception as exc:
        report["fatal_error"] = str(exc)
        print(json.dumps(report, indent=2))
        raise SystemExit(1)

    report["summary"] = {
        "total": len(report["scenario_results"]),
        "passed": sum(
            1
            for result in report["scenario_results"]
            if result["pass"]
        ),
        "failed": sum(
            1
            for result in report["scenario_results"]
            if not result["pass"]
        ),
        "all_passed": all(
            result["pass"]
            for result in report["scenario_results"]
        ),
        "synthetic_pass_rate_is_model_accuracy": False,
    }

    print(json.dumps(report, indent=2))

    if not report["summary"]["all_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
