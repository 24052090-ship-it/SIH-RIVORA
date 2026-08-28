# AquaGuard Phase 14 — Emergency Communications & Evacuation Safety

Phase 14 adds the public-safety communications layer on top of the Phase 13 incident command system.

## Capabilities
- Emergency/evacuation zones stored as PostGIS polygons
- Shelter locations and capacity/status
- Authority broadcast composer
- Targeted or global safety broadcasts
- In-app/web/SMS/email/siren channel contract
- Broadcast delivery audit records
- Citizen/field `nearby` safety endpoint
- Real-time `emergencyBroadcastSent` Socket.IO event
- Explicit distinction between in-app delivery and external gateway adapters

## APIs
- `GET /api/emergency/overview` — authority overview
- `GET /api/emergency/nearby?lat=&lng=&radius=` — nearby safety information
- `POST /api/emergency/broadcasts` — authority creates a broadcast
- `POST /api/emergency/broadcasts/:id/send` — authority sends a broadcast

## External channels
The database records requested channels, but this phase does **not** pretend to send SMS/email/siren messages without configured providers. Add provider adapters and credentials in a later deployment step.

## Run
```bash
npm install
npm run backend:migrate
npm run backend:dev
npm run dev
```

For the broadcast integration test:
```bash
set AQUAGUARD_TOKEN=<authority-jwt>
npm run broadcast:test
```

## Safety note
This is a software development implementation. Emergency messaging must be verified with municipal/emergency authorities, real contact providers, accessibility requirements, and local legal/operational procedures before production use.
