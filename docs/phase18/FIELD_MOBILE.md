# Field Mobile Architecture

Field crews need a focused workflow rather than the full municipal command center. The Phase 18 interface is intentionally mobile-first:

1. Open assigned task.
2. Share current location.
3. Move status to EN_ROUTE.
4. Check in ON_SITE.
5. Capture/attach evidence in the future evidence endpoint.
6. Complete the task.
7. Sync queued updates after connectivity returns.

The current implementation uses the browser Geolocation API and localStorage offline queue. For production, replace localStorage with IndexedDB/service-worker synchronization and add a dedicated FIELD_WORKER role with short-lived tokens.
