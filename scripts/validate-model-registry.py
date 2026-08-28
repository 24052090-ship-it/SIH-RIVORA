"""Validate a simple AquaGuard model registry manifest."""
import argparse, json
from pathlib import Path

REQUIRED = ["name", "version", "status", "dataset_version", "artifact"]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True)
    args = p.parse_args()
    data = json.loads(Path(args.manifest).read_text())
    missing = [k for k in REQUIRED if k not in data]
    if missing:
        raise SystemExit("Missing registry fields: " + ", ".join(missing))
    if data["status"] not in {"CANDIDATE", "APPROVED", "PRODUCTION", "RETIRED"}:
        raise SystemExit("Invalid model status")
    print(json.dumps({"status":"VALID","model":data}, indent=2))

if __name__ == "__main__":
    main()
