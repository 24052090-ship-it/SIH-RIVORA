-- Phase 27: secure IoT telemetry ingestion support.
-- Idempotent because AquaGuard reapplies every migration.

ALTER TABLE telemetry_events
  ADD COLUMN IF NOT EXISTS device_timestamp TIMESTAMPTZ;

ALTER TABLE telemetry_events
  ADD COLUMN IF NOT EXISTS replay_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_replay_key
  ON telemetry_events(replay_key)
  WHERE replay_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_device_time
  ON telemetry_events(sensor_id, device_timestamp DESC)
  WHERE device_timestamp IS NOT NULL;

ALTER TABLE water_level_readings
  ADD COLUMN IF NOT EXISTS water_level_cm NUMERIC(8,2);

ALTER TABLE water_level_readings
  ALTER COLUMN water_level_percent DROP NOT NULL;
