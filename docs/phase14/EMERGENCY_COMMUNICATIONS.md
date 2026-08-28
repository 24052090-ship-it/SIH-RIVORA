# Phase 14 Architecture

```text
Sensors / AI / Incidents / GIS
            ↓
     Incident Command
            ↓
   Emergency Zone Engine
            ↓
   Broadcast Composer
            ↓
 ┌──────────┼───────────┐
 ↓          ↓           ↓
In-App     Web      External adapters
                         ↓
                    SMS / Email / Siren
```

The platform stores the requested channels and delivery scope. External providers are deliberately adapter-ready rather than mocked as real deliveries.

## Geospatial safety
`emergency_zones.geometry` is PostGIS `POLYGON(4326)` and `shelters.location` is PostGIS `POINT(4326)`. The nearby endpoint uses `ST_DWithin` to find active safety zones and available shelters around a citizen's coordinates.
