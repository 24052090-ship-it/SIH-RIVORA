CREATE TABLE IF NOT EXISTS ai_model_registry (
  id BIGSERIAL PRIMARY KEY,
  model_name VARCHAR(120) NOT NULL,
  version VARCHAR(80) NOT NULL,
  task VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'development',
  dataset_version VARCHAR(120),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  artifact_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_at TIMESTAMPTZ,
  UNIQUE(model_name, version)
);
CREATE TABLE IF NOT EXISTS ai_predictions (
  id BIGSERIAL PRIMARY KEY,
  model_id BIGINT REFERENCES ai_model_registry(id) ON DELETE SET NULL,
  prediction_type VARCHAR(80) NOT NULL,
  input_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(8,5),
  source VARCHAR(40) NOT NULL DEFAULT 'api',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_created_at ON ai_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE TABLE IF NOT EXISTS ai_drift_metrics (
  id BIGSERIAL PRIMARY KEY,
  feature_name VARCHAR(120) NOT NULL,
  reference_mean DOUBLE PRECISION,
  current_mean DOUBLE PRECISION,
  reference_std DOUBLE PRECISION,
  current_std DOUBLE PRECISION,
  drift_score DOUBLE PRECISION,
  status VARCHAR(30) NOT NULL,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_rejected INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO ai_model_registry (model_name, version, task, status, dataset_version, metrics)
VALUES ('flood-xgboost','synthetic-dev-v1','flood-risk','development','synthetic-v1','{"accuracy":null,"precision":null,"recall":null,"f1":null,"rocAuc":null}'::jsonb)
ON CONFLICT (model_name, version) DO NOTHING;
