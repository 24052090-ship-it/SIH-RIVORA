ALTER TABLE rainfall_readings ADD COLUMN IF NOT EXISTS source VARCHAR(40) NOT NULL DEFAULT 'SENSOR';
ALTER TABLE water_level_readings ADD COLUMN IF NOT EXISTS source VARCHAR(40) NOT NULL DEFAULT 'SENSOR';
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS provider VARCHAR(80);
ALTER TABLE sensors ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

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
