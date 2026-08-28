import argparse
import json
import os
from pathlib import Path
import subprocess

PLACEHOLDERS = {
    "",
    "change-this-in-production",
    "dev-only-change-me",
    "phase3-device-key-change-me",
    "sih-demo-change-before-production",
    "sih-demo-device-key",
    "password",
}

REQUIRED_FILES = [
    "docker-compose.production.yml",
    "frontend-deploy/Dockerfile.production",
    "frontend-deploy/nginx/production.conf",
    "scripts/phase29-backup-restore.py",
    "docs/phase29/BACKUP_RECOVERY.md",
    "docs/phase29/PRODUCTION_RUNBOOK.md",
]

def read(root, rel):
    return (root / rel).read_text(encoding="utf-8")

def secret_is_safe(value):
    if value is None:
        return False
    stripped = value.strip()
    return (
        stripped not in PLACEHOLDERS
        and len(stripped) >= 32
    )

def git_tracked(root, rel):
    try:
        result = subprocess.run(
            ["git", "ls-files", "--error-unmatch", rel],
            cwd=root,
            text=True,
            capture_output=True,
        )
        return result.returncode == 0
    except OSError:
        return False

def file_audit(root):
    failures = []
    warnings = []

    for rel in REQUIRED_FILES:
        if not (root / rel).exists():
            failures.append(f"missing required file: {rel}")

    if failures:
        return failures, warnings

    frontend_env = read(root, ".env.production")
    if "VITE_API_BASE_URL=/api" not in frontend_env:
        failures.append("production frontend API is not same-origin /api")
    if "localhost" in frontend_env.lower():
        failures.append(".env.production still contains localhost")

    compose = read(root, "docker-compose.production.yml")
    forbidden = [
        "sih-demo-change-before-production",
        "sih-demo-device-key",
        "dev-only-change-me",
        "phase3-device-key-change-me",
    ]
    for value in forbidden:
        if value in compose:
            failures.append(
                f"production compose contains forbidden demo secret: {value}"
            )

    nginx = read(root, "frontend-deploy/nginx/production.conf")
    for expected in [
        "listen 443 ssl",
        "Strict-Transport-Security",
        "location /api/",
        "location /socket.io/",
        "X-Forwarded-Proto",
    ]:
        if expected not in nginx:
            failures.append(f"Nginx production config missing: {expected}")

    env_js = read(root, "backend/src/config/env.js")
    if "trustProxyHops" not in env_js:
        failures.append("backend does not expose TRUST_PROXY_HOPS")

    telemetry = read(root, "backend/src/controllers/telemetryController.js")
    if "req.headers['x-forwarded-proto']" in telemetry:
        failures.append(
            "device TLS check still trusts X-Forwarded-Proto directly"
        )

    if git_tracked(root, "backend/.env"):
        failures.append("backend/.env is tracked by Git")
    if git_tracked(root, ".env"):
        failures.append(".env is tracked by Git")

    if not (root / "backups").exists():
        warnings.append(
            "no local backups directory yet; this is expected before the first drill"
        )

    return failures, warnings

def environment_audit():
    failures = []
    warnings = []

    required = [
        "DATABASE_URL",
        "JWT_SECRET",
        "DEVICE_API_KEY",
        "CORS_ORIGIN",
    ]

    for key in required:
        if not os.getenv(key):
            failures.append(f"missing environment variable: {key}")

    if os.getenv("NODE_ENV") != "production":
        failures.append("NODE_ENV must be production")

    cors = os.getenv("CORS_ORIGIN", "")
    if cors and not cors.startswith("https://"):
        failures.append("CORS_ORIGIN must use https:// in production")

    if not secret_is_safe(os.getenv("JWT_SECRET")):
        failures.append("JWT_SECRET must be non-placeholder and at least 32 characters")

    if not secret_is_safe(os.getenv("DEVICE_API_KEY")):
        failures.append("DEVICE_API_KEY must be non-placeholder and at least 32 characters")

    if os.getenv("DEVICE_REQUIRE_TLS", "").lower() != "true":
        failures.append("DEVICE_REQUIRE_TLS must be true in production")

    try:
        hops = int(os.getenv("TRUST_PROXY_HOPS", "0"))
    except ValueError:
        hops = 0

    if hops < 1:
        failures.append("TRUST_PROXY_HOPS must be at least 1 behind Nginx")

    if not os.getenv("AQUAGUARD_RELEASE_TAG"):
        warnings.append(
            "AQUAGUARD_RELEASE_TAG is not set; Compose deployment requires it"
        )

    if not os.getenv("TLS_CERT_DIR"):
        warnings.append(
            "TLS_CERT_DIR is not set; Compose HTTPS deployment requires it"
        )

    return failures, warnings

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument(
        "--production",
        action="store_true",
        help="also validate injected production environment values",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()

    file_failures, file_warnings = file_audit(root)
    env_failures = []
    env_warnings = []

    if args.production:
        env_failures, env_warnings = environment_audit()

    failures = file_failures + env_failures
    warnings = file_warnings + env_warnings

    if failures:
        status = "BLOCKED"
    elif args.production:
        status = "READY_FOR_DEPLOYMENT_CHECKS"
    else:
        status = "READY_FOR_SECRET_INJECTION"

    result = {
        "phase": 29,
        "status": status,
        "fileAudit": {
            "pass": not file_failures,
            "failures": file_failures,
        },
        "productionEnvironmentAudit": {
            "executed": args.production,
            "pass": args.production and not env_failures,
            "failures": env_failures,
        },
        "warnings": warnings,
        "note": (
            "Static readiness does not prove a production deployment is healthy. "
            "After deployment, run live health, smoke, Phase 28 validation, "
            "and a controlled backup/restore drill."
        ),
    }

    print(json.dumps(result, indent=2))
    if failures:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
