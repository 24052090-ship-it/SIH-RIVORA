# Phase 24 AI Inference

The unified inference contract records:
- model name
- model version
- model status
- dataset version
- prediction timestamp
- confidence/probability
- source

Flood risk and vision detections remain separate signals before optional fusion.

Recommended production flow:
1. Load only approved model versions.
2. Validate feature schema.
3. Record model provenance.
4. Run inference.
5. Persist prediction metadata.
6. Emit risk/incident events.
7. Never silently substitute a development model for a production model.
