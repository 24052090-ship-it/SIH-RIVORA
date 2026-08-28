# AquaGuard Vision Dataset Contract

Use YOLO format: one `.txt` label file per image, with normalized `class x_center y_center width height` values.

Classes:
0 blocked_drain
1 overflowing_drain
2 flooded_road
3 waterlogging
4 open_manhole
5 garbage_blockage

Do not train on scraped images without checking licensing and provenance. Keep a held-out test set from locations/events not present in training.
