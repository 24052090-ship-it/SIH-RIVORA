CREATE TABLE IF NOT EXISTS maintenance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code VARCHAR(40) NOT NULL,
  asset_type VARCHAR(40) NOT NULL DEFAULT 'DRAIN',
  risk_score NUMERIC(5,2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level VARCHAR(20) NOT NULL,
  recommended_action TEXT NOT NULL,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version VARCHAR(60) NOT NULL DEFAULT 'baseline-maintenance-v1',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_asset ON maintenance_predictions(asset_code, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_risk ON maintenance_predictions(risk_score DESC);

CREATE TABLE IF NOT EXISTS satellite_observations (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(80) NOT NULL,
  collection VARCHAR(120) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  cloud_cover_percent NUMERIC(5,2),
  bbox JSONB,
  flood_extent_percent NUMERIC(6,2),
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_satellite_observed_at ON satellite_observations(observed_at DESC);
