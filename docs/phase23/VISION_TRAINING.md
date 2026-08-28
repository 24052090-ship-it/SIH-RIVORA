# Phase 23 Vision Training

Expected dataset structure:

dataset/
  images/train
  images/val
  images/test
  labels/train
  labels/val
  labels/test

Classes:
- blocked_drain
- overflowing_drain
- flooded_road
- waterlogging
- open_manhole
- garbage_blockage

Recommended evidence:
- precision
- recall
- mAP50
- mAP50-95
- per-class performance
- confusion/error review
- performance under rain, low light, occlusion and camera-angle changes

Do not train or evaluate on images whose licensing or consent status is unknown.
