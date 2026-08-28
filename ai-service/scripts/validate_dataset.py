"""Validate AquaGuard flood CSV training data before model training.
Expected columns are documented in data/flood/README.md.
"""
from pathlib import Path
import csv, sys

REQUIRED = ['recorded_at','rainfall_15m','rainfall_1h','rainfall_3h','rainfall_24h','water_level','drain_capacity','blockage','elevation','slope','historical_incidents','flood']
path = Path(sys.argv[1]) if len(sys.argv)>1 else Path('data/flood/flood_training_template.csv')
with path.open(newline='', encoding='utf-8') as f:
    rows=list(csv.DictReader(f))
    missing=[c for c in REQUIRED if c not in (rows[0].keys() if rows else [])]
    if missing: raise SystemExit(f'Missing columns: {missing}')
    if not rows: raise SystemExit('Dataset is empty')
    bad=[i+2 for i,r in enumerate(rows) if r.get('flood') not in {'0','1'}]
    if bad: raise SystemExit(f'Invalid flood labels at rows: {bad[:10]}')
print(f'OK: {path} contains {len(rows)} rows and all required columns.')
