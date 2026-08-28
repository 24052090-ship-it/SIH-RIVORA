CREATE TABLE IF NOT EXISTS crew_checkins (
  id BIGSERIAL PRIMARY KEY,
  crew_id BIGINT NOT NULL REFERENCES response_crews(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES dispatch_tasks(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT,4326) NOT NULL,
  accuracy_m DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crew_checkins_location_gix ON crew_checkins USING GIST(location);
CREATE INDEX IF NOT EXISTS crew_checkins_crew_time_idx ON crew_checkins(crew_id,captured_at DESC);
CREATE TABLE IF NOT EXISTS task_evidence (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES dispatch_tasks(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('PHOTO','NOTE')),
  storage_ref TEXT,
  note TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS task_status_updates (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES dispatch_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
