CREATE TABLE IF NOT EXISTS response_crews (
  id BIGSERIAL PRIMARY KEY,
  crew_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT 'DRAINAGE',
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ASSIGNED','EN_ROUTE','ON_SITE','OFFLINE')),
  members INTEGER NOT NULL DEFAULT 1 CHECK (members > 0),
  location GEOGRAPHY(POINT,4326),
  contact TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispatch_tasks (
  id BIGSERIAL PRIMARY KEY,
  task_code TEXT UNIQUE NOT NULL,
  incident_id BIGINT REFERENCES incidents(id) ON DELETE SET NULL,
  crew_id BIGINT REFERENCES response_crews(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','ASSIGNED','EN_ROUTE','ON_SITE','COMPLETED','CANCELLED')),
  location GEOGRAPHY(POINT,4326),
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS response_crews_location_gix ON response_crews USING GIST(location);
CREATE INDEX IF NOT EXISTS response_crews_status_idx ON response_crews(status);
CREATE INDEX IF NOT EXISTS dispatch_tasks_status_priority_idx ON dispatch_tasks(status, priority);
CREATE INDEX IF NOT EXISTS dispatch_tasks_location_gix ON dispatch_tasks USING GIST(location);

INSERT INTO response_crews(crew_code,name,specialty,status,members,location,contact) VALUES
('CR-01','Drainage Crew Alpha','DRAINAGE','AVAILABLE',5,ST_SetSRID(ST_MakePoint(77.6215,12.9380),4326)::geography,'Control Room 101'),
('CR-02','Emergency Response Bravo','FLOOD_RESPONSE','EN_ROUTE',6,ST_SetSRID(ST_MakePoint(77.6280,12.9460),4326)::geography,'Control Room 102'),
('CR-03','Inspection Unit Charlie','INSPECTION','ON_SITE',3,ST_SetSRID(ST_MakePoint(77.6120,12.9490),4326)::geography,'Ward Operations')
ON CONFLICT (crew_code) DO NOTHING;

INSERT INTO dispatch_tasks(task_code,priority,task_type,description,status,location,due_at)
SELECT 'DT-1701','CRITICAL','DRAIN_CLEARANCE','Inspect and clear blocked drainage assets in Zone 4.','QUEUED',ST_SetSRID(ST_MakePoint(77.6250,12.9370),4326)::geography,NOW()+INTERVAL '30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM dispatch_tasks WHERE task_code='DT-1701');

INSERT INTO dispatch_tasks(task_code,priority,task_type,description,status,location,due_at)
SELECT 'DT-1702','HIGH','ROAD_ASSESSMENT','Assess flooded-road conditions and report closure recommendation.','ASSIGNED',ST_SetSRID(ST_MakePoint(77.6310,12.9480),4326)::geography,NOW()+INTERVAL '60 minutes'
WHERE NOT EXISTS (SELECT 1 FROM dispatch_tasks WHERE task_code='DT-1702');
