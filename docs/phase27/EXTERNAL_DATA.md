# External Data Connectors

Keep providers behind service adapters.

Examples:
- WeatherProvider
- SatelliteProvider
- GISProvider
- DeviceTelemetryProvider

Each adapter must define:
- authentication
- rate limits
- units
- coordinate system
- freshness
- attribution/license
- retry behavior
- failure behavior

Never hardcode provider secrets into the frontend.


## Runtime contract registry

GET /api/providers/status exposes the Phase 27 provider contracts for:
- WeatherProvider
- SatelliteProvider
- GISProvider
- DeviceTelemetryProvider

The response records authentication, rate limits, units, coordinate system,
freshness, attribution/license, retry behavior, and failure behavior.

Development simulators remain explicitly separate from these connectors.
