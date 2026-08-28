CREATE TABLE IF NOT EXISTS dataset_registry (
  id BIGSERIAL PRIMARY KEY,
  dataset_name TEXT NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('rainfall','water_level','flood_event','gis','vision')),
  source TEXT NOT NULL,
  version TEXT NOT NULL,
  license TEXT,
  geography TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  quality_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'STAGED' CHECK (status IN ('STAGED','VALIDATED','APPROVED','REJECTED','OPERATIONAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS dataset_quality_checks (
  id BIGSERIAL PRIMARY KEY,
  dataset_id BIGINT REFERENCES dataset_registry(id) ON DELETE CASCADE,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASS','WARN','FAIL')),
  details TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dataset_registry_status ON dataset_registry(status);
CREATE INDEX IF NOT EXISTS idx_dataset_quality_dataset ON dataset_quality_checks(dataset_id);
