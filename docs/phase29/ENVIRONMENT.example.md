# Production environment checklist

Never commit actual secrets. Inject secrets from the deployment platform,
protected environment, or secret manager.

## Required backend values

- NODE_ENV=production
- DATABASE_URL
- JWT_SECRET (at least 32 random characters)
- CORS_ORIGIN=https://your-real-domain
- TRUST_PROXY_HOPS=1 when the backend is reachable only through the bundled Nginx proxy
- DEVICE_API_KEY (at least 32 random characters)
- DEVICE_REQUIRE_TLS=true
- AI_SERVICE_URL=http://ai:8000 inside the production Compose network

## Production Compose values

- AQUAGUARD_RELEASE_TAG
- POSTGRES_DB
- POSTGRES_USER
- POSTGRES_PASSWORD
- DATABASE_URL
- TLS_CERT_DIR containing fullchain.pem and privkey.pem

The production Compose file contains variable references only. It does not
contain real credentials.

## Optional integrations

- GOOGLE_MAPS_API_KEY
- SENTINEL_HUB_CLIENT_ID
- SENTINEL_HUB_CLIENT_SECRET
- SATELLITE_ENABLED
- SATELLITE_TILE_URL
- weather synchronization settings

Provider credentials remain server-side. Do not put provider secrets in Vite
variables because Vite variables are public browser build inputs.

## Frontend

Production frontend requests are same-origin:
- API: /api
- Socket.IO: current HTTPS origin

Nginx proxies both to the backend. The browser does not connect directly to the
AI service or backend container.
