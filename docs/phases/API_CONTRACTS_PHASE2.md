# Phase 2 API Contracts

Base URL: `http://localhost:5000/api`

## Authentication

### POST `/auth/register`
```json
{"name":"Manoj Kumar","email":"manoj@example.com","password":"password","role":"citizen"}
```

### POST `/auth/login`
```json
{"email":"demo@aquaguard.ai","password":"password","role":"citizen"}
```

Response includes `user` and JWT `token`.

## Dashboard
- GET `/dashboard/citizen`
- GET `/dashboard/authority`

## GIS
- GET `/gis/flood-zones` → GeoJSON FeatureCollection
- GET `/gis/drains`
- GET `/gis/roads`
- GET `/gis/sensors`

## Telemetry
- GET `/rainfall`
- GET `/flood/current`

## Reports
- GET `/reports`
- POST `/reports`

## Alerts
- GET `/alerts`

## Maintenance
- GET `/maintenance` (authority only)

## System
- GET `/system/health`
