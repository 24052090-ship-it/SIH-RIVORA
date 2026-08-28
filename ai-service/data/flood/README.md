# AquaGuard Flood Dataset Contract

Replace the synthetic development dataset with validated, locally relevant observations before claiming model performance.

Required CSV columns:
- rainfall_15m, rainfall_1h, rainfall_3h, rainfall_24h
- water_level, drain_capacity, blockage
- elevation, slope, historical_incidents
- flood (0/1 ground-truth label)
- recorded_at (UTC timestamp used for time-aware splitting)

Recommended additional metadata: zone_id, sensor_id, latitude, longitude, source, label_method.

Keep train/validation/test splits time-aware to avoid leakage from nearby observations in the same storm event.
