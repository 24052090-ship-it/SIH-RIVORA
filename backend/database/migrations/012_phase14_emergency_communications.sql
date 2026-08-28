CREATE TABLE IF NOT EXISTS emergency_zones (
  id BIGSERIAL PRIMARY KEY,
  zone_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('ADVISORY','WARNING','EVACUATE')),
  geometry GEOMETRY(POLYGON,4326) NOT NULL,
  shelter_id BIGINT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shelters (
  id BIGSERIAL PRIMARY KEY,
  shelter_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT,4326) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  occupied INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','FULL','CLOSED','STANDBY')),
  contact TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_broadcasts (
  id BIGSERIAL PRIMARY KEY,
  broadcast_code TEXT UNIQUE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','HIGH','CRITICAL')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  zone_id BIGINT REFERENCES emergency_zones(id) ON DELETE SET NULL,
  channel TEXT[] NOT NULL DEFAULT ARRAY['IN_APP'],
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SCHEDULED','SENT','CANCELLED')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_deliveries (
  id BIGSERIAL PRIMARY KEY,
  broadcast_id BIGINT NOT NULL REFERENCES emergency_broadcasts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient_scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='emergency_zones_shelter_fk') THEN
    ALTER TABLE emergency_zones ADD CONSTRAINT emergency_zones_shelter_fk FOREIGN KEY (shelter_id) REFERENCES shelters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS emergency_zones_geometry_gix ON emergency_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS shelters_location_gix ON shelters USING GIST(location);
CREATE INDEX IF NOT EXISTS broadcasts_status_idx ON emergency_broadcasts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS broadcasts_zone_idx ON emergency_broadcasts(zone_id);

INSERT INTO shelters (shelter_code,name,location,capacity,occupied,status,contact)
VALUES
('SH-01','Civic Relief Centre',ST_SetSRID(ST_MakePoint(77.6201,12.9412),4326)::geography,500,182,'OPEN','Municipal Control Room'),
('SH-02','Community Hall North',ST_SetSRID(ST_MakePoint(77.6315,12.9522),4326)::geography,300,284,'OPEN','Ward Operations'),
('SH-03','School Relief Centre',ST_SetSRID(ST_MakePoint(77.6062,12.9510),4326)::geography,250,250,'FULL','Ward Operations')
ON CONFLICT (shelter_code) DO NOTHING;

INSERT INTO emergency_zones (zone_code,name,level,geometry,shelter_id)
SELECT 'EZ-04','Zone 4 Evacuation Area','EVACUATE',
ST_GeomFromText('POLYGON((77.618 12.930,77.633 12.930,77.633 12.943,77.618 12.943,77.618 12.930))',4326),
(SELECT id FROM shelters WHERE shelter_code='SH-01')
WHERE NOT EXISTS (SELECT 1 FROM emergency_zones WHERE zone_code='EZ-04');

INSERT INTO emergency_zones (zone_code,name,level,geometry,shelter_id)
SELECT 'EZ-02','Zone 2 Warning Area','WARNING',
ST_GeomFromText('POLYGON((77.603 12.942,77.618 12.942,77.618 12.955,77.603 12.955,77.603 12.942))',4326),
(SELECT id FROM shelters WHERE shelter_code='SH-02')
WHERE NOT EXISTS (SELECT 1 FROM emergency_zones WHERE zone_code='EZ-02');
