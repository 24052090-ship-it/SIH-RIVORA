# Phase 11 Data Validation Protocol

## Flood model
- Use time-based train/validation/test splits.
- Avoid leakage between nearby timestamps.
- Record geographic coverage and sensor provenance.
- Report precision, recall, F1, ROC-AUC and calibration.
- Keep a held-out flood-event test set.

## Vision model
- Split by source/event, not only by random image.
- Report precision, recall, mAP and IoU.
- Record hard cases such as night, rain, blur and occlusion.

## GIS
- Validate coordinate reference systems.
- Check geometry validity.
- Confirm flood polygons intersect expected roads/drains.

## Operational data
- Track source, timestamp and freshness.
- Reject impossible sensor values.
- Preserve raw observations for auditability.
