import argparse
import json
from datetime import datetime, timezone

REQUIRED = [
    "deviceId",
    "timestampUtc",
    "latitude",
    "longitude",
    "rainfallMmHr",
    "waterLevelCm",
    "batteryPct",
    "signalRssi",
]


def fail(message):
    raise SystemExit(message)


def main():
    parser = argparse.ArgumentParser(
        description="Validate the AquaGuard Phase 27 device telemetry contract."
    )
    parser.add_argument("--json", required=True)
    args = parser.parse_args()

    data = json.loads(args.json)
    missing = [
        key
        for key in REQUIRED
        if key not in data or data[key] is None or data[key] == ""
    ]

    if missing:
        fail("Missing fields: " + ", ".join(missing))

    device_id = str(data["deviceId"]).strip()
    if not device_id:
        fail("Invalid deviceId")

    timestamp_text = str(data["timestampUtc"]).strip()
    if not timestamp_text.endswith("Z"):
        fail("timestampUtc must end in Z")

    try:
        timestamp = datetime.fromisoformat(
            timestamp_text.replace("Z", "+00:00")
        )
    except ValueError:
        fail("Invalid timestampUtc")

    if timestamp.tzinfo is None:
        fail("timestampUtc must include UTC timezone")

    latitude = float(data["latitude"])
    longitude = float(data["longitude"])
    rainfall = float(data["rainfallMmHr"])
    water_cm = float(data["waterLevelCm"])
    battery = float(data["batteryPct"])
    rssi = float(data["signalRssi"])

    if not -90 <= latitude <= 90:
        fail("Invalid latitude")

    if not -180 <= longitude <= 180:
        fail("Invalid longitude")

    if rainfall < 0:
        fail("Invalid rainfallMmHr")

    if water_cm < 0:
        fail("Invalid waterLevelCm")

    if not 0 <= battery <= 100:
        fail("Invalid batteryPct")

    if not -150 <= rssi <= 0:
        fail("Invalid signalRssi")

    print(json.dumps({
        "status": "VALID_TELEMETRY",
        "contract": "phase27-device-telemetry-v1",
        "deviceId": device_id,
        "timestampUtc": timestamp.astimezone(timezone.utc).isoformat()
    }, indent=2))


if __name__ == "__main__":
    main()
