# Real Data Integration

## Principles
1. Keep raw source files immutable.
2. Record source, provider, collection time, license and geographic coverage.
3. Validate timestamps, coordinates, units, duplicates and missingness before loading.
4. Never mix future observations into historical training labels.
5. Use time- and geography-aware train/validation/test splits.

## Suggested source categories
- Municipal drainage inventory
- Local weather/rain gauges
- Water-level sensors
- Official flood-event records
- Road network / GIS layers
- Properly licensed satellite imagery

## Promotion flow
raw → validated → approved → operational

Rejected records must remain traceable and must not silently disappear.
