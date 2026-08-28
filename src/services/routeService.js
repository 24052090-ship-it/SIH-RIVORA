import api from './api';

const USE_MOCKS =
  import.meta.env.VITE_USE_MOCK_DATA === 'true';


function mockRoute(mode = 'SAFEST') {
  const normalizedMode =
    String(mode || 'SAFEST').toUpperCase();

  return {
    provider: 'DEMO_SIMULATION',
    routingStrategy: 'FLOOD_AWARE',
    routingMode: normalizedMode,

    distanceKm: 6.4,
    estimatedMinutes: 18,
    floodRisk: 'LOW',
    riskScore: 14,

    avoidedRiskyRoads: 2,
    riskySegments: 0,
    floodedRoads: 0,
    floodedSegments: 0,
    avoidedFloodedSegments: 1,
    blockedDrainExposure: 0,
    blockedDrainsAvoided: 1,

    routeGeometry: {
      type: 'LineString',
      coordinates: [
        [77.615, 12.935],
        [77.625, 12.955],
        [77.645, 12.970],
        [77.660, 12.968],
      ],
    },

    segments: [
      {
        roadName: 'Northern Safe Link',
        risk: 'LOW',
        riskScore: 10,
        flooded: false,
        blockedDrains: 0,
      },
      {
        roadName: 'Northern Connector',
        risk: 'MEDIUM',
        riskScore: 35,
        flooded: false,
        blockedDrains: 0,
      },
    ],

    alternatives: [
      {
        mode: 'FASTEST',
        distanceKm: 6.1,
        estimatedMinutes: 16,
        floodRisk: 'MEDIUM',
        riskScore: 35,
        riskySegments: 1,
        floodedSegments: 0,
        blockedDrainExposure: 1,
        extraMinutesVsFastest: 0,
        riskReductionVsFastest: 0,
      },
      {
        mode: 'BALANCED',
        distanceKm: 6.3,
        estimatedMinutes: 17,
        floodRisk: 'LOW',
        riskScore: 22,
        riskySegments: 0,
        floodedSegments: 0,
        blockedDrainExposure: 0,
        extraMinutesVsFastest: 1,
        riskReductionVsFastest: 13,
      },
      {
        mode: 'SAFEST',
        distanceKm: 6.4,
        estimatedMinutes: 18,
        floodRisk: 'LOW',
        riskScore: 14,
        riskySegments: 0,
        floodedSegments: 0,
        blockedDrainExposure: 0,
        extraMinutesVsFastest: 2,
        riskReductionVsFastest: 21,
      },
    ],

    comparison: {
      fastestMode: 'FASTEST',
      selectedMode: normalizedMode,
      extraMinutesVsFastest:
        normalizedMode === 'SAFEST'
          ? 2
          : normalizedMode === 'BALANCED'
            ? 1
            : 0,
      riskReductionVsFastest:
        normalizedMode === 'SAFEST'
          ? 21
          : normalizedMode === 'BALANCED'
            ? 13
            : 0,
      avoidedRiskySegments: 2,
      avoidedFloodedSegments: 1,
      blockedDrainsAvoided: 1,
      extraMinutesVsGoogle: -3,
    },

    reasoning: [
      'Demo flood-aware route selected.',
      'Avoids higher-risk road segments.',
    ],

    googleBenchmark: {
      configured: false,
      provider: 'GOOGLE_ROUTES',
      available: false,
      message: 'Demo mode.',
    },
  };
}


export async function findSafeRoute(params) {
  if (USE_MOCKS) {
    return mockRoute(params?.mode);
  }

  const { data } = await api.get(
    '/routes/safe',
    {
      params,
    },
  );

  return data;
}


export default {
  findSafeRoute,
};