#!/usr/bin/env python3
"""
AquaGuard Phase 29 — PostgreSQL backup + disposable restore drill.

Safety:
- Reads DATABASE_URL from the environment or backend/.env.
- Never prints the database password.
- Creates a timestamped custom-format backup under backups/phase29/.
- Restores only into a generated disposable database.
- Drops the disposable database after validation.
- Does not modify the source AquaGuard database.
- Measured times are local drill measurements, not production RPO/RTO guarantees.

Compatibility:
- Prefer PostgreSQL client tools matching the server major version.
- If a newer pg_restore emits SET transaction_timeout for an older server,
  the drill generates a temporary SQL restore stream and removes only that
  unsupported SET command before restoring. The original .dump backup remains
  untouched and its checksum is reported.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
from urllib.parse import unquote, urlparse
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT / "backups" / "phase29"
ENV_FILE = ROOT / "backend" / ".env"
DEFAULT_PG_BIN = Path(r"C:\Program Files\PostgreSQL\18\bin")


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def find_tool(name: str) -> str:
    env_bin = os.getenv("PG_BIN")
    candidates: list[Path] = []
    if env_bin:
        candidates.append(Path(env_bin) / f"{name}.exe")
    candidates.append(DEFAULT_PG_BIN / f"{name}.exe")

    found = shutil.which(name)
    if found:
        return found

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    raise RuntimeError(
        f"{name} was not found. Set PG_BIN or install PostgreSQL client tools."
    )


def run(
    args: list[str],
    *,
    env: dict[str, str],
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=check,
    )


def parse_database_url(url: str) -> dict[str, str | int]:
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise RuntimeError("DATABASE_URL must use postgres:// or postgresql://")
    if not parsed.hostname or not parsed.path or not parsed.username:
        raise RuntimeError("DATABASE_URL is missing host, database, or user")

    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
        "user": unquote(parsed.username),
        "password": unquote(parsed.password or ""),
    }


def conn_args(
    info: dict[str, str | int],
    database: str | None = None,
) -> list[str]:
    return [
        "-h", str(info["host"]),
        "-p", str(info["port"]),
        "-U", str(info["user"]),
        "-d", database or str(info["database"]),
    ]


def psql_scalar(
    psql: str,
    info: dict[str, str | int],
    env: dict[str, str],
    sql: str,
    *,
    database: str | None = None,
) -> str:
    result = run(
        [
            psql,
            *conn_args(info, database),
            "-X",
            "-v", "ON_ERROR_STOP=1",
            "-At",
            "-c", sql,
        ],
        env=env,
    )
    return result.stdout.strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def tool_major(tool: str, env: dict[str, str]) -> int | None:
    result = run([tool, "--version"], env=env)
    match = re.search(r"(\d+)(?:\.\d+)?", result.stdout)
    return int(match.group(1)) if match else None


def server_major(version: str) -> int | None:
    match = re.match(r"(\d+)", version)
    return int(match.group(1)) if match else None


def restore_archive(
    pg_restore: str,
    psql: str,
    backup_path: Path,
    info: dict[str, str | int],
    env: dict[str, str],
    restore_db: str,
    *,
    client_major: int | None,
    server_major_version: int | None,
) -> tuple[str, list[str]]:
    """
    Returns (mode, compatibility_adjustments).
    """
    adjustments: list[str] = []

    if (
        client_major is not None
        and server_major_version is not None
        and client_major > server_major_version
    ):
        with tempfile.TemporaryDirectory(prefix="aquaguard-p29-") as temp_dir:
            raw_sql = Path(temp_dir) / "restore-raw.sql"
            compatible_sql = Path(temp_dir) / "restore-compatible.sql"

            run(
                [
                    pg_restore,
                    "--no-owner",
                    "--no-acl",
                    "--file", str(raw_sql),
                    str(backup_path),
                ],
                env=env,
            )

            removed = 0
            with raw_sql.open("r", encoding="utf-8") as source, compatible_sql.open(
                "w", encoding="utf-8", newline="\n"
            ) as target:
                for line in source:
                    if line.strip() == "SET transaction_timeout = 0;":
                        removed += 1
                        continue
                    target.write(line)

            if removed:
                adjustments.append(
                    "Removed unsupported SET transaction_timeout from temporary restore SQL only."
                )

            result = run(
                [
                    psql,
                    *conn_args(info, restore_db),
                    "-X",
                    "-v", "ON_ERROR_STOP=1",
                    "-f", str(compatible_sql),
                ],
                env=env,
                check=False,
            )

            if result.returncode != 0:
                raise subprocess.CalledProcessError(
                    result.returncode,
                    result.args,
                    output=result.stdout,
                    stderr=result.stderr,
                )

        return "compatibility-sql", adjustments

    run(
        [
            pg_restore,
            *conn_args(info, restore_db),
            "--no-owner",
            "--no-acl",
            "--exit-on-error",
            str(backup_path),
        ],
        env=env,
    )
    return "direct-pg_restore", adjustments


def main() -> int:
    local_env = load_env_file(ENV_FILE)
    database_url = os.getenv("DATABASE_URL") or local_env.get("DATABASE_URL")

    if not database_url:
        print(json.dumps({
            "phase": 29,
            "status": "BLOCKED",
            "error": "DATABASE_URL is not configured",
        }, indent=2))
        return 1

    info = parse_database_url(database_url)

    pg_dump = find_tool("pg_dump")
    pg_restore = find_tool("pg_restore")
    psql = find_tool("psql")

    child_env = os.environ.copy()
    child_env["PGPASSWORD"] = str(info["password"])

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_DIR / f"aquaguard-{stamp}.dump"
    restore_db = f"aquaguard_phase29_restore_{int(time.time())}"

    report: dict[str, object] = {
        "phase": 29,
        "title": "Backup and Disaster-Recovery Restore Drill",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "host": info["host"],
            "port": info["port"],
            "database": info["database"],
            "user": info["user"],
        },
        "backup": {},
        "restore": {},
        "validation": {},
        "disclaimer": (
            "Measured backup/restore times are local drill measurements only; "
            "they are not production RPO/RTO guarantees."
        ),
    }

    restore_created = False

    try:
        source_version = psql_scalar(
            psql, info, child_env, "SHOW server_version;"
        )
        postgis_version = psql_scalar(
            psql, info, child_env, "SELECT PostGIS_Version();"
        )

        dump_major = tool_major(pg_dump, child_env)
        restore_major = tool_major(pg_restore, child_env)
        source_major = server_major(source_version)

        report["tooling"] = {
            "serverMajor": source_major,
            "pgDumpMajor": dump_major,
            "pgRestoreMajor": restore_major,
            "majorVersionMatch": (
                dump_major == source_major and restore_major == source_major
            ),
            "productionRecommendation": (
                "Use PostgreSQL client tools matching the server major version."
            ),
        }

        backup_started = time.perf_counter()
        run(
            [
                pg_dump,
                *conn_args(info),
                "--format=custom",
                "--no-owner",
                "--no-acl",
                "--file", str(backup_path),
            ],
            env=child_env,
        )
        backup_seconds = time.perf_counter() - backup_started

        if not backup_path.exists() or backup_path.stat().st_size == 0:
            raise RuntimeError("pg_dump completed but produced an empty backup")

        archive = run(
            [pg_restore, "--list", str(backup_path)],
            env=child_env,
        )
        archive_entries = [
            line
            for line in archive.stdout.splitlines()
            if line and not line.startswith(";")
        ]

        report["backup"] = {
            "status": "PASS",
            "path": str(backup_path.relative_to(ROOT)),
            "bytes": backup_path.stat().st_size,
            "sha256": sha256_file(backup_path),
            "archiveEntries": len(archive_entries),
            "durationSeconds": round(backup_seconds, 3),
        }

        run(
            [
                psql,
                *conn_args(info, "postgres"),
                "-X",
                "-v", "ON_ERROR_STOP=1",
                "-c", f'CREATE DATABASE "{restore_db}";',
            ],
            env=child_env,
        )
        restore_created = True

        restore_started = time.perf_counter()

        mode, adjustments = restore_archive(
            pg_restore,
            psql,
            backup_path,
            info,
            child_env,
            restore_db,
            client_major=restore_major,
            server_major_version=source_major,
        )

        restore_seconds = time.perf_counter() - restore_started

        restored_postgis = psql_scalar(
            psql,
            info,
            child_env,
            "SELECT PostGIS_Version();",
            database=restore_db,
        )

        required_relations = [
            "users",
            "sensors",
            "flood_zones",
            "incidents",
            "alerts",
            "ai_model_registry",
            "ai_predictions",
            "telemetry_events",
            "water_level_readings",
        ]

        missing_relations = []
        for relation in required_relations:
            exists = psql_scalar(
                psql,
                info,
                child_env,
                f"SELECT to_regclass('public.{relation}') IS NOT NULL;",
                database=restore_db,
            )
            if exists != "t":
                missing_relations.append(relation)

        required_columns = [
            ("telemetry_events", "device_timestamp"),
            ("telemetry_events", "replay_key"),
            ("water_level_readings", "water_level_cm"),
        ]

        missing_columns = []
        for table, column in required_columns:
            exists = psql_scalar(
                psql,
                info,
                child_env,
                (
                    "SELECT EXISTS ("
                    "SELECT 1 FROM information_schema.columns "
                    f"WHERE table_schema='public' AND table_name='{table}' "
                    f"AND column_name='{column}'"
                    ");"
                ),
                database=restore_db,
            )
            if exists != "t":
                missing_columns.append(f"{table}.{column}")

        sensor_count = int(
            psql_scalar(
                psql,
                info,
                child_env,
                "SELECT COUNT(*) FROM sensors;",
                database=restore_db,
            )
        )

        report["restore"] = {
            "status": "PASS",
            "database": restore_db,
            "durationSeconds": round(restore_seconds, 3),
            "temporaryDatabase": True,
            "mode": mode,
            "compatibilityAdjustments": adjustments,
        }

        validation_status = (
            "PASS"
            if not missing_relations and not missing_columns
            else "FAIL"
        )

        report["validation"] = {
            "status": validation_status,
            "sourcePostgreSQLVersion": source_version,
            "sourcePostGISVersion": postgis_version,
            "restoredPostGISVersion": restored_postgis,
            "missingRelations": missing_relations,
            "missingColumns": missing_columns,
            "restoredSensorRows": sensor_count,
        }

        report["status"] = validation_status

    except subprocess.CalledProcessError as exc:
        report["status"] = "FAIL"
        report["error"] = {
            "command": Path(str(exc.cmd[0])).name if exc.cmd else None,
            "returnCode": exc.returncode,
            "stderr": (exc.stderr or "").strip()[-2000:],
        }
    except Exception as exc:
        report["status"] = "FAIL"
        report["error"] = str(exc)
    finally:
        if restore_created:
            try:
                run(
                    [
                        psql,
                        *conn_args(info, "postgres"),
                        "-X",
                        "-v", "ON_ERROR_STOP=1",
                        "-c",
                        f'DROP DATABASE IF EXISTS "{restore_db}" WITH (FORCE);',
                    ],
                    env=child_env,
                )
                report["restoreCleanup"] = "PASS"
            except Exception as cleanup_error:
                report["restoreCleanup"] = "FAIL"
                report["restoreCleanupError"] = str(cleanup_error)

    print(json.dumps(report, indent=2))
    return 0 if report.get("status") == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
