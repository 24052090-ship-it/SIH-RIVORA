CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  incident_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  zone_name TEXT,
  location GEOGRAPHY(POINT,4326),
  severity TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','HIGH','CRITICAL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','DISPATCHED','CONTAINED','RESOLVED','CLOSED')),
  risk_score NUMERIC(5,2) DEFAULT 0,
  flood_probability NUMERIC(5,4),
  source_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_team TEXT,
  sla_minutes INTEGER DEFAULT 60,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_severity_idx ON incidents(severity);
CREATE INDEX IF NOT EXISTS incidents_created_idx ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS incidents_location_gix ON incidents USING GIST(location);

CREATE TABLE IF NOT EXISTS incident_actions (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  note TEXT,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS incident_actions_incident_idx ON incident_actions(incident_id, created_at DESC);

INSERT INTO incidents (incident_code,title,zone_name,location,severity,status,risk_score,flood_probability,source_summary,recommended_actions,assigned_team,sla_minutes)
VALUES
('INC-1301','Critical rainfall and drainage overload','Zone 4',ST_SetSRID(ST_MakePoint(77.6245,12.9352),4326)::geography,'CRITICAL','OPEN',91.0,0.91,
 '{"rainfall_mm_hr":92,"water_level_pct":94,"blocked_drains":3,"ai_model":"synthetic-dev-v1"}',
 '["Inspect DR-104","Deploy drainage crew","Issue Zone 4 warning","Recalculate safe routes"]','Drainage Crew 03',30),
('INC-1302','Blocked drain with rising water level','Zone 2',ST_SetSRID(ST_MakePoint(77.6102,12.9471),4326)::geography,'HIGH','ACKNOWLEDGED',73.0,0.73,
 '{"rainfall_mm_hr":68,"water_level_pct":82,"blocked_drains":1}',
 '["Inspect drain","Place temporary barricade","Monitor water level"]','Drainage Crew 01',60)
ON CONFLICT (incident_code) DO NOTHING;
