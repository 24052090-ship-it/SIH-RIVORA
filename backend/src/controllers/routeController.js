import { query } from '../db/pool.js';
import { computeGoogleRoute } from '../services/providerService.js';


const RISK_RANK = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const RISK_SCORE = {
  LOW: 10,
  MEDIUM: 35,
  HIGH: 70,
  CRITICAL: 95,
};

const MODES = new Set([
  'FASTEST',
  'BALANCED',
  'SAFEST',
]);


const clamp = (value, min, max) =>
  Math.max(
    min,
    Math.min(max, value),
  );


function normalizeRisk(value) {
  const risk = String(
    value || 'LOW',
  ).toUpperCase();

  return RISK_RANK[risk]
    ? risk
    : 'LOW';
}


function riskFromScore(score) {
  const value = Number(score || 0);

  if (value >= 75) return 'CRITICAL';
  if (value >= 50) return 'HIGH';
  if (value >= 25) return 'MEDIUM';

  return 'LOW';
}


function effectiveRisk(edge) {
  if (edge.flooded) {
    return 'CRITICAL';
  }

  const roadRisk = normalizeRisk(
    edge.road_risk,
  );

  const zoneRisk = normalizeRisk(
    edge.zone_risk
      || riskFromScore(
        edge.zone_score,
      ),
  );

  return (
    RISK_RANK[roadRisk]
    >= RISK_RANK[zoneRisk]
  )
    ? roadRisk
    : zoneRisk;
}


function travelMinutes(edge) {
  const speed = Math.max(
    1,
    Number(edge.speed_kmh || 30),
  );

  const length = Math.max(
    0,
    Number(edge.length_km || 0),
  );

  return (
    length / speed
  ) * 60;
}


/**
 * Mode-aware route cost.
 *
 * FASTEST:
 *   Minimise travel time while still treating flooded roads as
 *   effectively impassable.
 *
 * BALANCED:
 *   Trade travel time against flood and drainage exposure.
 *
 * SAFEST:
 *   Strongly avoid HIGH/CRITICAL roads, flooded roads and blocked
 *   drains even when the alternative takes longer.
 */
function edgeCost(
  edge,
  mode = 'SAFEST',
) {
  const normalizedMode = MODES.has(mode)
    ? mode
    : 'SAFEST';

  const minutes = travelMinutes(
    edge,
  );

  const lengthKm = Math.max(
    0.01,
    Number(edge.length_km || 0),
  );

  const risk = effectiveRisk(edge);

  const blockedDrains = Math.max(
    0,
    Number(
      edge.blocked_drains || 0,
    ),
  );


  if (edge.flooded) {
    /*
     * Flooded segments are treated as effectively impassable in
     * every mode. Dijkstra can still return one only if no meaningful
     * alternative exists.
     */
    return (
      minutes
      + 10000
      + blockedDrains * 50
    );
  }


  const penalties = {
    FASTEST: {
      LOW: 0,
      MEDIUM: 0.15,
      HIGH: 1.5,
      CRITICAL: 15,
      blockedDrain: 0.5,
    },

    BALANCED: {
      LOW: 0,
      MEDIUM: 0.8,
      HIGH: 5,
      CRITICAL: 60,
      blockedDrain: 3,
    },

    SAFEST: {
      LOW: 0,
      MEDIUM: 2.5,
      HIGH: 18,
      CRITICAL: 250,
      blockedDrain: 10,
    },
  };


  const config = penalties[
    normalizedMode
  ];


  const riskPenalty =
    config[risk]
    * lengthKm;


  const blockagePenalty =
    blockedDrains
    * config.blockedDrain;


  return (
    minutes
    + riskPenalty
    + blockagePenalty
  );
}


function dijkstra(
  nodes,
  edges,
  startId,
  endId,
  mode,
) {
  const graph = new Map(
    nodes.map(
      node => [
        node.id,
        [],
      ],
    ),
  );


  for (const edge of edges) {
    graph
      .get(edge.from_node_id)
      ?.push(edge);

    if (edge.bidirectional) {
      graph
        .get(edge.to_node_id)
        ?.push({
          ...edge,
          from_node_id:
            edge.to_node_id,
          to_node_id:
            edge.from_node_id,
          reversed: true,
        });
    }
  }


  const distance = new Map(
    nodes.map(
      node => [
        node.id,
        Infinity,
      ],
    ),
  );

  const previous = new Map();
  const visited = new Set();


  distance.set(
    startId,
    0,
  );


  while (
    visited.size
    < nodes.length
  ) {
    let current = null;
    let best = Infinity;


    for (
      const [id, value]
      of distance
    ) {
      if (
        !visited.has(id)
        && value < best
      ) {
        best = value;
        current = id;
      }
    }


    if (
      current === null
      || current === endId
    ) {
      break;
    }


    visited.add(current);


    for (
      const edge
      of graph.get(current) || []
    ) {
      const next =
        edge.to_node_id;

      const candidate =
        best
        + edgeCost(
          edge,
          mode,
        );


      if (
        candidate
        < (
          distance.get(next)
          ?? Infinity
        )
      ) {
        distance.set(
          next,
          candidate,
        );

        previous.set(
          next,
          {
            nodeId: current,
            edge,
          },
        );
      }
    }
  }


  if (
    !previous.has(endId)
    && startId !== endId
  ) {
    return null;
  }


  const path = [];

  let cursor = endId;


  while (
    cursor !== startId
  ) {
    const previousEntry =
      previous.get(cursor);

    if (!previousEntry) {
      return null;
    }

    path.unshift(
      previousEntry.edge,
    );

    cursor =
      previousEntry.nodeId;
  }


  return {
    path,
    cost:
      distance.get(endId),
  };
}


async function nearestNode(
  lat,
  lng,
) {
  const { rows } = await query(
    `
      SELECT
        id,
        node_code,
        name,

        ST_Y(
          location::geometry
        ) AS latitude,

        ST_X(
          location::geometry
        ) AS longitude,

        ST_Distance(
          location,
          ST_SetSRID(
            ST_MakePoint(
              $1,
              $2
            ),
            4326
          )::geography
        ) AS distance_m

      FROM route_nodes

      ORDER BY
        location
        <->
        ST_SetSRID(
          ST_MakePoint(
            $1,
            $2
          ),
          4326
        )::geography

      LIMIT 1
    `,
    [
      lng,
      lat,
    ],
  );


  return rows[0];
}


async function loadGraph() {
  const {
    rows: nodes,
  } = await query(
    `
      SELECT
        id,
        node_code,
        name,

        ST_Y(
          location::geometry
        ) AS latitude,

        ST_X(
          location::geometry
        ) AS longitude

      FROM route_nodes
    `,
  );


  const {
    rows: edges,
  } = await query(
    `
      SELECT
        e.id,
        e.edge_code,
        e.from_node_id,
        e.to_node_id,
        e.road_code,
        e.length_km,
        e.speed_kmh,
        e.bidirectional,

        r.name AS road_name,

        COALESCE(
          r.risk_level,
          'LOW'
        ) AS road_risk,

        COALESCE(
          r.flooded,
          false
        ) AS flooded,

        COALESCE(
          (
            SELECT
              MAX(
                fz.risk_score
              )

            FROM flood_zones fz

            WHERE
              ST_Intersects(
                e.geometry,
                fz.geometry
              )
          ),
          0
        )::float AS zone_score,

        COALESCE(
          (
            SELECT
              COUNT(*)

            FROM drains d

            WHERE
              d.blockage = true

              AND ST_DWithin(
                d.location,
                e.geometry::geography,
                350
              )
          ),
          0
        )::int AS blocked_drains,

        ST_AsGeoJSON(
          e.geometry
        )::json AS geometry

      FROM route_edges e

      LEFT JOIN roads r
        ON r.road_code =
           e.road_code
    `,
  );


  /*
   * Derive the categorical zone risk from the numeric risk score.
   * This avoids relying on lexical MAX() behaviour for text labels.
   */
  const normalisedEdges =
    edges.map(
      edge => ({
        ...edge,

        zone_risk:
          riskFromScore(
            edge.zone_score,
          ),
      }),
    );


  return {
    nodes,
    edges:
      normalisedEdges,
  };
}


function processPath(path) {
  const coordinates = [];

  let distanceKm = 0;
  let minutes = 0;

  let weightedRisk = 0;
  let weightedLength = 0;

  let maxRisk = 'LOW';

  let riskySegments = 0;
  let floodedSegments = 0;

  let blockedDrainExposure = 0;
  let highRiskDistanceKm = 0;


  const segments = [];


  for (const edge of path) {
    const coords =
      edge.geometry
        ?.coordinates
      || [];


    const ordered =
      edge.reversed
        ? [...coords].reverse()
        : coords;


    if (
      coordinates.length
      && ordered.length
    ) {
      ordered.shift();
    }


    coordinates.push(
      ...ordered,
    );


    const lengthKm =
      Math.max(
        0,
        Number(
          edge.length_km || 0,
        ),
      );


    distanceKm +=
      lengthKm;

    minutes +=
      travelMinutes(edge);


    const risk =
      effectiveRisk(edge);


    if (
      RISK_RANK[risk]
      > RISK_RANK[maxRisk]
    ) {
      maxRisk = risk;
    }


    if (
      risk === 'HIGH'
      || risk === 'CRITICAL'
    ) {
      riskySegments += 1;

      highRiskDistanceKm +=
        lengthKm;
    }


    if (edge.flooded) {
      floodedSegments += 1;
    }


    const blockedDrains =
      Math.max(
        0,
        Number(
          edge.blocked_drains || 0,
        ),
      );


    blockedDrainExposure +=
      blockedDrains;


    const edgeRiskScore =
      edge.flooded
        ? 100
        : Math.max(
            Number(
              edge.zone_score || 0,
            ),
            RISK_SCORE[risk],
          );


    weightedRisk +=
      edgeRiskScore
      * Math.max(
        lengthKm,
        0.01,
      );


    weightedLength +=
      Math.max(
        lengthKm,
        0.01,
      );


    segments.push({
      edgeCode:
        edge.edge_code,

      roadCode:
        edge.road_code,

      roadName:
        edge.road_name,

      distanceKm:
        Number(
          lengthKm.toFixed(2),
        ),

      risk,

      riskScore:
        Math.round(
          edgeRiskScore,
        ),

      flooded:
        Boolean(
          edge.flooded,
        ),

      blockedDrains,
    });
  }


  const riskScore =
    weightedLength > 0
      ? clamp(
          Math.round(
            weightedRisk
            / weightedLength,
          ),
          0,
          100,
        )
      : 0;


  if (
    floodedSegments > 0
  ) {
    maxRisk =
      'CRITICAL';
  }


  return {
    coordinates,

    distanceKm:
      Number(
        distanceKm.toFixed(2),
      ),

    minutes:
      Math.max(
        1,
        Math.round(minutes),
      ),

    maxRisk,

    riskScore,

    riskySegments,

    floodedSegments,

    blockedDrainExposure,

    highRiskDistanceKm:
      Number(
        highRiskDistanceKm
          .toFixed(2),
      ),

    segments,
  };
}


function parseGoogleDuration(
  value,
) {
  if (!value) {
    return null;
  }

  if (
    typeof value === 'number'
  ) {
    return value;
  }

  const text =
    String(value);

  if (
    text.endsWith('s')
  ) {
    const seconds =
      Number(
        text.slice(0, -1),
      );

    return Number.isFinite(
      seconds,
    )
      ? seconds
      : null;
  }

  const numeric =
    Number(text);

  return Number.isFinite(
    numeric,
  )
    ? numeric
    : null;
}


function summariseGoogle(
  googleResult,
) {
  if (
    !googleResult
    || !googleResult.configured
  ) {
    return {
      configured: false,

      provider:
        'GOOGLE_ROUTES',

      available: false,

      message:
        googleResult?.message
        || 'Google Routes is unavailable.',
    };
  }


  const routes =
    googleResult.routes
    || [];


  const alternatives =
    routes.map(
      (route, index) => {
        const durationSeconds =
          parseGoogleDuration(
            route.duration,
          );

        const staticSeconds =
          parseGoogleDuration(
            route.staticDuration,
          );


        return {
          index,

          distanceKm:
            Number(
              (
                Number(
                  route.distanceMeters
                  || 0,
                )
                / 1000
              ).toFixed(2),
            ),

          trafficMinutes:
            durationSeconds
              == null
              ? null
              : Math.round(
                  durationSeconds
                  / 60,
                ),

          staticMinutes:
            staticSeconds
              == null
              ? null
              : Math.round(
                  staticSeconds
                  / 60,
                ),

          routeLabels:
            route.routeLabels
            || [],
        };
      },
    );


  return {
    configured: true,

    provider:
      'GOOGLE_ROUTES',

    available:
      alternatives.length > 0,

    selected:
      alternatives[0]
      || null,

    alternatives,
  };
}


function buildReasoning(
  mode,
  selected,
  fastest,
) {
  const reasoning = [];


  if (mode === 'FASTEST') {
    reasoning.push(
      'Prioritizes minimum travel time on the AquaGuard road graph.',
    );
  }


  if (mode === 'BALANCED') {
    reasoning.push(
      'Balances travel time against flood, road-risk and drainage exposure.',
    );
  }


  if (mode === 'SAFEST') {
    reasoning.push(
      'Prioritizes lower flood and drainage exposure even when the trip is longer.',
    );
  }


  const extraMinutes =
    selected.minutes
    - fastest.minutes;


  const riskReduction =
    fastest.riskScore
    - selected.riskScore;


  if (riskReduction > 0) {
    reasoning.push(
      `Reduces flood-risk exposure by ${riskReduction} points compared with the fastest AquaGuard route.`,
    );
  }


  if (extraMinutes > 0) {
    reasoning.push(
      `Adds approximately ${extraMinutes} minute${extraMinutes === 1 ? '' : 's'} for the safer path.`,
    );
  }


  const avoidedRiskySegments =
    Math.max(
      0,
      fastest.riskySegments
      - selected.riskySegments,
    );


  if (
    avoidedRiskySegments > 0
  ) {
    reasoning.push(
      `Avoids ${avoidedRiskySegments} HIGH/CRITICAL road segment${avoidedRiskySegments === 1 ? '' : 's'}.`,
    );
  }


  const avoidedFloodedSegments =
    Math.max(
      0,
      fastest.floodedSegments
      - selected.floodedSegments,
    );


  if (
    avoidedFloodedSegments > 0
  ) {
    reasoning.push(
      `Avoids ${avoidedFloodedSegments} flooded segment${avoidedFloodedSegments === 1 ? '' : 's'}.`,
    );
  }


  const blockedDrainsAvoided =
    Math.max(
      0,
      fastest.blockedDrainExposure
      - selected.blockedDrainExposure,
    );


  if (
    blockedDrainsAvoided > 0
  ) {
    reasoning.push(
      `Reduces exposure to ${blockedDrainsAvoided} nearby blocked drain${blockedDrainsAvoided === 1 ? '' : 's'}.`,
    );
  }


  if (
    reasoning.length === 1
  ) {
    reasoning.push(
      'Current road conditions produce similar risk and travel-time outcomes across available routes.',
    );
  }


  return reasoning;
}


function routeSummary(
  mode,
  stats,
  fastest,
) {
  return {
    mode,

    distanceKm:
      stats.distanceKm,

    estimatedMinutes:
      stats.minutes,

    floodRisk:
      stats.maxRisk,

    riskScore:
      stats.riskScore,

    riskySegments:
      stats.riskySegments,

    floodedSegments:
      stats.floodedSegments,

    blockedDrainExposure:
      stats.blockedDrainExposure,

    highRiskDistanceKm:
      stats.highRiskDistanceKm,

    extraMinutesVsFastest:
      Math.max(
        0,
        stats.minutes
        - fastest.minutes,
      ),

    riskReductionVsFastest:
      Math.max(
        0,
        fastest.riskScore
        - stats.riskScore,
      ),
  };
}


export async function safeRoute(
  req,
  res,
) {
  try {
    const originLat =
      Number(
        req.query.originLat,
      );

    const originLng =
      Number(
        req.query.originLng,
      );

    const destinationLat =
      Number(
        req.query.destinationLat,
      );

    const destinationLng =
      Number(
        req.query.destinationLng,
      );


    if (
      ![
        originLat,
        originLng,
        destinationLat,
        destinationLng,
      ].every(
        Number.isFinite,
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'originLat, originLng, destinationLat and destinationLng are required',
        });
    }


    const requestedMode =
      String(
        req.query.mode
        || 'SAFEST',
      ).toUpperCase();


    const mode =
      MODES.has(
        requestedMode,
      )
        ? requestedMode
        : 'SAFEST';


    const [
      origin,
      destination,
      graph,
    ] = await Promise.all([
      nearestNode(
        originLat,
        originLng,
      ),

      nearestNode(
        destinationLat,
        destinationLng,
      ),

      loadGraph(),
    ]);


    if (
      !origin
      || !destination
    ) {
      return res
        .status(404)
        .json({
          error:
            'Route network is unavailable',
        });
    }


    const routeResults = {};


    for (
      const routeMode
      of [
        'FASTEST',
        'BALANCED',
        'SAFEST',
      ]
    ) {
      const result =
        dijkstra(
          graph.nodes,
          graph.edges,
          origin.id,
          destination.id,
          routeMode,
        );


      if (result) {
        routeResults[
          routeMode
        ] = {
          result,

          stats:
            processPath(
              result.path,
            ),
        };
      }
    }


    if (
      !routeResults[
        mode
      ]
    ) {
      return res
        .status(404)
        .json({
          error:
            'No route found for the current road-risk state',
        });
    }


    const selected =
      routeResults[
        mode
      ].stats;


    const fastest =
      routeResults
        .FASTEST
        ?.stats
      || selected;


    const reasoning =
      buildReasoning(
        mode,
        selected,
        fastest,
      );


    const alternatives =
      Object.entries(
        routeResults,
      ).map(
        ([
          alternativeMode,
          value,
        ]) =>
          routeSummary(
            alternativeMode,
            value.stats,
            fastest,
          ),
      );


    const avoidedRiskyRoads =
      Math.max(
        0,
        fastest.riskySegments
        - selected.riskySegments,
      );


    const avoidedFloodedSegments =
      Math.max(
        0,
        fastest.floodedSegments
        - selected.floodedSegments,
      );


    const blockedDrainsAvoided =
      Math.max(
        0,
        fastest.blockedDrainExposure
        - selected.blockedDrainExposure,
      );


    /*
     * Google is a benchmark, not the source of AquaGuard's flood-risk
     * decision. Failure must therefore never make Safe Route fail.
     */
    let googleBenchmark;

    try {
      const googleResult =
        await computeGoogleRoute({
          origin: {
            lat:
              originLat,

            lng:
              originLng,
          },

          destination: {
            lat:
              destinationLat,

            lng:
              destinationLng,
          },

          travelMode:
            'DRIVE',
        });


      googleBenchmark =
        summariseGoogle(
          googleResult,
        );

    } catch (error) {
      googleBenchmark = {
        configured: true,

        provider:
          'GOOGLE_ROUTES',

        available: false,

        message:
          error?.message
          || 'Google Routes request failed.',
      };
    }


    const googleMinutes =
      googleBenchmark
        ?.selected
        ?.trafficMinutes;


    const extraMinutesVsGoogle =
      Number.isFinite(
        googleMinutes,
      )
        ? selected.minutes
          - googleMinutes
        : null;


    return res.json({
      provider:
        'AQUAGUARD_RISK_ROUTER',

      routingStrategy:
        'FLOOD_AWARE',

      routingMode:
        mode,


      origin: {
        lat:
          originLat,

        lng:
          originLng,

        snappedNode:
          origin.node_code,

        snappedDistanceM:
          Number(
            origin.distance_m,
          ),
      },


      destination: {
        lat:
          destinationLat,

        lng:
          destinationLng,

        snappedNode:
          destination.node_code,

        snappedDistanceM:
          Number(
            destination.distance_m,
          ),
      },


      /*
       * Existing top-level fields are preserved so the current frontend
       * continues working before Phase 3B UI changes.
       */
      distanceKm:
        selected.distanceKm,

      estimatedMinutes:
        selected.minutes,

      floodRisk:
        selected.maxRisk,

      riskScore:
        selected.riskScore,


      /*
       * Corrected semantics:
       * this is now genuinely how many risky segments were avoided
       * relative to FASTEST.
       */
      avoidedRiskyRoads,

      riskySegments:
        selected.riskySegments,

      floodedRoads:
        selected.floodedSegments,

      floodedSegments:
        selected.floodedSegments,

      avoidedFloodedSegments,

      blockedDrainExposure:
        selected.blockedDrainExposure,

      blockedDrainsAvoided,

      highRiskDistanceKm:
        selected.highRiskDistanceKm,


      routeGeometry: {
        type:
          'LineString',

        coordinates:
          selected.coordinates,
      },


      segments:
        selected.segments,


      alternatives,

      comparison: {
        fastestMode:
          'FASTEST',

        selectedMode:
          mode,

        extraMinutesVsFastest:
          Math.max(
            0,
            selected.minutes
            - fastest.minutes,
          ),

        riskReductionVsFastest:
          Math.max(
            0,
            fastest.riskScore
            - selected.riskScore,
          ),

        avoidedRiskySegments:
          avoidedRiskyRoads,

        avoidedFloodedSegments,

        blockedDrainsAvoided,

        extraMinutesVsGoogle:
          extraMinutesVsGoogle,
      },


      reasoning,

      googleBenchmark,


      limitations: [
        (
          'AquaGuard routing uses the internal PostGIS road graph; '
          + 'Google Routes is displayed as an independent traffic benchmark.'
        ),

        (
          'Flood-risk penalties are explicit decision-support rules '
          + 'and should be calibrated against local road-closure and flood-history data.'
        ),
      ],
    });

  } catch (error) {
    console.error(
      '[safe-route]',
      error,
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to calculate safe route',

        detail:
          error?.message
          || 'Unknown routing error',
      });
  }
}