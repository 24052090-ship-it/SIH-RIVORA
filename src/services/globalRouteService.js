import api from './api';

function parseDurationSeconds(value) {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim();
  if (text.endsWith('s')) return Number(text.slice(0, -1)) || 0;
  return Number(text) || 0;
}

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

export async function findGlobalTrafficRoute({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  mode = 'SAFEST',
}) {
  const { data } = await api.post('/providers/google/routes', {
    origin: { lat: Number(originLat), lng: Number(originLng) },
    destination: { lat: Number(destinationLat), lng: Number(destinationLng) },
    travelMode: 'DRIVE',
  });

  if (!data?.configured) {
    throw new Error(data?.message || 'Google Routes is not configured.');
  }

  const routes = Array.isArray(data?.routes) ? data.routes : [];
  if (!routes.length) {
    throw new Error('No route was returned for this trip.');
  }

  const selected = routes[0];
  const seconds = parseDurationSeconds(selected.duration);
  const decoded = decodePolyline(selected?.polyline?.encodedPolyline || '');

  if (decoded.length < 2) {
    throw new Error('The route provider returned no usable route geometry.');
  }

  return {
    provider: 'GOOGLE_ROUTES_GLOBAL',
    routingStrategy: 'GLOBAL_TRAFFIC_FALLBACK',
    routingMode: mode,
    riskDataAvailable: false,
    distanceKm: Number((Number(selected.distanceMeters || 0) / 1000).toFixed(1)),
    estimatedMinutes: Math.max(1, Math.round(seconds / 60)),
    floodRisk: 'NOT SCORED',
    riskScore: null,
    riskySegments: null,
    blockedDrainExposure: null,
    floodedRoads: null,
    floodedSegments: null,
    avoidedRiskyRoads: null,
    blockedDrainsAvoided: null,
    routeGeometry: {
      type: 'LineString',
      coordinates: decoded.map(([lat, lng]) => [lng, lat]),
    },
    segments: [],
    alternatives: [],
    comparison: {
      extraMinutesVsFastest: 0,
      riskReductionVsFastest: null,
    },
    reasoning: [
      'Live Google Routes is used for trips outside the currently loaded AquaGuard local road graph.',
      'Flood and drainage risk are not scored until local GIS risk data for this area is loaded into AquaGuard.',
    ],
    googleBenchmark: null,
    limitations: [
      'This fallback provides live traffic-aware routing, not AquaGuard local flood-risk scoring.',
    ],
  };
}

export default { findGlobalTrafficRoute };
