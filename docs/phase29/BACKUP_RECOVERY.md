# Backup & Recovery

## Backup strategy

For PostgreSQL/PostGIS:
- schedule logical custom-format backups with pg_dump
- use PostgreSQL client tools matching the database server major version
- encrypt backup storage
- maintain a documented retention policy
- keep at least one off-site or independent copy
- restrict backup access using least privilege
- verify backup checksums
- run periodic restore drills

A backup is not considered valid until a restore has been tested.

## AquaGuard restore drill

Run in a controlled non-production environment:

```
ai-service\.venv\Scripts\python.exe scripts\phase29-backup-restore.py
```

The drill:
1. reads DATABASE_URL without printing its password
2. creates a timestamped custom-format dump
3. records SHA-256, size, archive entry count, and local duration
4. creates a disposable restore database
5. restores the dump
6. verifies PostGIS and critical AquaGuard relations/Phase 27 columns
7. records restored sensor row count
8. drops the disposable database

Backups are written under `backups/phase29/`, which is ignored by Git.

The drill detects PostgreSQL client/server major-version mismatch. The tested
local machine has PostgreSQL 18 client tools against a PostgreSQL 16 server, so
the validation script can remove the PostgreSQL 18-only
`SET transaction_timeout` statement from a temporary SQL restore stream.
The original custom-format backup is never modified.

For production backup jobs, install client tools matching the server major
version rather than relying on the compatibility path.

## Recovery records

Record:
- backup timestamp and checksum
- database and PostGIS versions
- application release tag
- latest migration included in the release
- restore result
- measured restore duration
- validation result
- operator and incident/change ticket

Do not state a production RPO or RTO until the deployment owner defines a
target and drills it in the real recovery environment.
