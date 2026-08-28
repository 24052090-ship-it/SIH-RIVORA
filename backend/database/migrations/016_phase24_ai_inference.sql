INSERT INTO ai_model_registry
(model_name, version, task, status, dataset_version, metrics, artifact_uri)
VALUES (
  'flood-xgboost',
  'aquaguard-flood-xgb-v1.1',
  'flood-risk',
  'development',
  'synthetic-v1',
  '{}'::jsonb,
  'ai-service/models/flood_xgb.json'
)
ON CONFLICT (model_name, version)
DO UPDATE SET
  task = EXCLUDED.task,
  artifact_uri = COALESCE(ai_model_registry.artifact_uri, EXCLUDED.artifact_uri);

INSERT INTO ai_model_registry
(model_name, version, task, status, dataset_version, metrics, artifact_uri)
VALUES (
  'vision-yolo',
  'aquaguard-yolo-custom-v1',
  'vision-detection',
  'development',
  NULL,
  '{}'::jsonb,
  'ai-service/models/aquaguard_yolo.pt'
)
ON CONFLICT (model_name, version)
DO UPDATE SET
  task = EXCLUDED.task,
  artifact_uri = COALESCE(ai_model_registry.artifact_uri, EXCLUDED.artifact_uri);
