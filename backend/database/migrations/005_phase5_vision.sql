ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(120);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_detections JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_reports_ai_label ON reports(ai_label);
