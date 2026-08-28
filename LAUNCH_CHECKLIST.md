# AquaGuard SIH Launch Checklist

## Backend
- [ ] `npm run backend:migrate`
- [ ] `npm run backend:seed`
- [ ] `npm run readiness:test`
- [ ] Database backup verified
- [ ] Production JWT secret configured
- [ ] CORS restricted to deployed frontend
- [ ] Device API key rotated

## AI
- [ ] Flood model trained on real/local labels
- [ ] Time-separated evaluation completed
- [ ] YOLO model evaluated on held-out images
- [ ] Model versions recorded
- [ ] Failure cases documented

## GIS
- [ ] PostGIS geometries validated
- [ ] Flood polygons checked visually
- [ ] Road graph checked
- [ ] Safe route tested through flooded-road scenarios
- [ ] Map provider keys/attribution configured

## Realtime / IoT
- [ ] Socket.IO connection tested
- [ ] Sensor simulator tested
- [ ] Physical sensor tested if available
- [ ] Offline sensor behavior verified

## Demo
- [ ] Citizen login/signup
- [ ] Authority login
- [ ] Live monitoring
- [ ] Flood risk
- [ ] Citizen image report
- [ ] Safe route
- [ ] Emergency alert
- [ ] Maintenance recommendation
- [ ] Satellite view/status
- [ ] System readiness
