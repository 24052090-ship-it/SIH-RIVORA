CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('citizen','authority')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_code VARCHAR(40) UNIQUE NOT NULL,
  type VARCHAR(40) NOT NULL,
  zone VARCHAR(80),
  status VARCHAR(30) NOT NULL DEFAULT 'ONLINE',
  health INTEGER NOT NULL DEFAULT 100 CHECK (health BETWEEN 0 AND 100),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  provider VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS rainfall_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
  rainfall_mm_hr NUMERIC(8,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(40) NOT NULL DEFAULT 'SENSOR'
);

CREATE TABLE IF NOT EXISTS water_level_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
  water_level_percent NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(40) NOT NULL DEFAULT 'SENSOR'
);

CREATE TABLE IF NOT EXISTS drains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drain_code VARCHAR(40) UNIQUE NOT NULL,
  zone VARCHAR(80),
  water_level_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  available_capacity_percent NUMERIC(5,2) NOT NULL DEFAULT 100,
  blockage BOOLEAN NOT NULL DEFAULT FALSE,
  severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
  status VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL',
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  last_maintenance TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS flood_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code VARCHAR(40) UNIQUE NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  risk_score NUMERIC(5,2) NOT NULL,
  geometry GEOMETRY(POLYGON, 4326) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
  flooded BOOLEAN NOT NULL DEFAULT FALSE,
  geometry GEOMETRY(LINESTRING, 4326) NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code VARCHAR(40) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  image_url TEXT,
  location GEOGRAPHY(POINT, 4326),
  zone VARCHAR(80),
  ai_label VARCHAR(80),
  ai_confidence NUMERIC(5,2),
  severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(40) NOT NULL DEFAULT 'Submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_code VARCHAR(40) UNIQUE NOT NULL,
  level VARCHAR(20) NOT NULL,
  location_label VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  zone VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task VARCHAR(120) NOT NULL,
  asset_code VARCHAR(40) NOT NULL,
  location_label VARCHAR(160) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  crew VARCHAR(100),
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rainfall_recorded_at ON rainfall_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_recorded_at ON water_level_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_location ON sensors USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_drain_location ON drains USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_flood_zone_geometry ON flood_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_road_geometry ON roads USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_report_location ON reports USING GIST(location);


CREATE TABLE IF NOT EXISTS weather_observations (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(40) NOT NULL DEFAULT 'OPEN_METEO',
  station_code VARCHAR(80) NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  rainfall_mm_hr NUMERIC(8,2) NOT NULL DEFAULT 0,
  temperature_c NUMERIC(6,2),
  humidity_percent NUMERIC(5,2),
  pressure_hpa NUMERIC(8,2),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source, station_code, observed_at)
);
CREATE TABLE IF NOT EXISTS telemetry_events (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID REFERENCES sensors(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weather_observed_at ON weather_observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_received_at ON telemetry_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_rainfall_source_time ON rainfall_readings(source, recorded_at DESC);
