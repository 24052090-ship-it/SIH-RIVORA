import { query } from '../db/pool.js';
import { predictFlood, predictFusion } from '../services/aiService.js';

const fallback = {
  rainfall_15m: 18,
  rainfall_1h: 42,
  rainfall_3h: 86,
  rainfall_24h: 154,
  water_level: 64,
  drain_capacity: 58,
  blockage: 1,
  elevation: 902,
  slope: 2.1,
  historical_incidents: 4
};

async function resolveFloodRegistryModel(modelVersion) {
  const [runtimeResult, productionResult] = await Promise.all([
    query(
      `SELECT id, model_name, version, task, status, dataset_version,
              artifact_uri, promoted_at
       FROM ai_model_registry
       WHERE model_name = 'flood-xgboost'
         AND version = $1
       LIMIT 1`,
      [modelVersion]
    ),
    query(
      `SELECT id, model_name, version, task, status, dataset_version,
              artifact_uri, promoted_at
       FROM ai_model_registry
       WHERE model_name = 'flood-xgboost'
         AND status = 'production'
       ORDER BY promoted_at DESC NULLS LAST, id DESC
       LIMIT 1`
    )
  ]);

  return {
    runtimeModel: runtimeResult.rows[0] ?? null,
    productionModel: productionResult.rows[0] ?? null
  };
}


async function governFloodInference(features, result, source) {
  const modelVersion = result?.model_version ?? null;
  const {
    runtimeModel,
    productionModel
  } = await resolveFloodRegistryModel(modelVersion);

  /*
   * If a production model exists in the governed registry, the runtime must
   * actually be serving that exact version. Never silently substitute the
   * development model.
   */
  if (
    productionModel &&
    (
      !runtimeModel ||
      runtimeModel.id !== productionModel.id
    )
  ) {
    return {
      blocked: true,
      status: 503,
      message: (
        'A production flood model is registered, but the AI runtime is ' +
        'serving a different model version. Refusing silent development fallback.'
      ),
      productionModel: {
        id: productionModel.id,
        model_name: productionModel.model_name,
        version: productionModel.version,
        status: productionModel.status,
        dataset_version: productionModel.dataset_version
      },
      runtimeModelVersion: modelVersion
    };
  }

  const mode = (
    runtimeModel?.status === 'production'
      ? 'production'
      : 'development-fallback'
  );

  const prediction = await query(
    `INSERT INTO ai_predictions
      (model_id, prediction_type, input_features, output, confidence, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [
      runtimeModel?.id ?? null,
      'flood-risk',
      features,
      result,
      result?.confidence ?? null,
      source
    ]
  );

  return {
    blocked: false,
    inference: {
      prediction_id: prediction.rows[0].id,
      model_name: runtimeModel?.model_name ?? 'flood-xgboost',
      model_version: modelVersion,
      model_status: runtimeModel?.status ?? 'unregistered-development',
      dataset_version: (
        runtimeModel?.dataset_version ??
        result?.model_metadata?.dataset_type ??
        null
      ),
      prediction_timestamp: prediction.rows[0].created_at,
      confidence: result?.confidence ?? null,
      source,
      registry_model_id: runtimeModel?.id ?? null,
      mode,
      production_model: runtimeModel?.status === 'production',
      warning: (
        mode === 'production'
          ? null
          : (
              'No matching production flood model is active. ' +
              'This prediction is explicitly labelled development fallback.'
            )
      )
    }
  };
}



async function governFusionInference(features, result, source) {
  const baseModelVersion = result?.base_model?.model_version ?? null;
  const {
    runtimeModel,
    productionModel
  } = await resolveFloodRegistryModel(baseModelVersion);

  /*
   * HydroFusion is a development decision-support rule, not a separately
   * trained production model. Its governed provenance therefore follows
   * the XGBoost base model actually used at runtime.
   */
  if (
    productionModel &&
    (
      !runtimeModel ||
      runtimeModel.id !== productionModel.id
    )
  ) {
    return {
      blocked: true,
      status: 503,
      message: (
        'A production flood model is registered, but HydroFusion is using ' +
        'a different base-model version. Refusing silent development fallback.'
      ),
      productionModel: {
        id: productionModel.id,
        model_name: productionModel.model_name,
        version: productionModel.version,
        status: productionModel.status,
        dataset_version: productionModel.dataset_version
      },
      runtimeBaseModelVersion: baseModelVersion
    };
  }

  const prediction = await query(
    `INSERT INTO ai_predictions
      (model_id, prediction_type, input_features, output, confidence, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [
      runtimeModel?.id ?? null,
      'risk-fusion',
      features,
      result,
      result?.decision_support_confidence ?? result?.confidence ?? null,
      source
    ]
  );

  return {
    blocked: false,
    inference: {
      prediction_id: prediction.rows[0].id,
      prediction_timestamp: prediction.rows[0].created_at,
      fusion_model_version: result?.model_version ?? null,
      fusion_model_status: 'development-decision-support',
      fusion_production_eligible: false,
      base_model_name: runtimeModel?.model_name ?? 'flood-xgboost',
      base_model_version: baseModelVersion,
      base_model_status: runtimeModel?.status ?? 'unregistered-development',
      base_dataset_version: (
        runtimeModel?.dataset_version ??
        result?.model_metadata?.base_xgboost?.dataset_type ??
        null
      ),
      registry_model_id: runtimeModel?.id ?? null,
      base_model_production: runtimeModel?.status === 'production',
      confidence: (
        result?.decision_support_confidence ??
        result?.confidence ??
        null
      ),
      source,
      mode: 'development-decision-support',
      warning: (
        'HydroFusion is a development decision-support fusion rule and is ' +
        'not a separately trained or production-eligible probabilistic model.'
      )
    }
  };
}


/**
 * Build the latest flood-model feature vector.
 *
 * Important rainfall rule:
 * rainfall_mm_hr is a RATE (mm/hour), not accumulated rainfall.
 *
 * Therefore rainfall accumulation must be calculated as:
 *
 *      rate × elapsed time
 *
 * We also:
 * - keep sensors separate,
 * - keep providers separate,
 * - avoid double-counting providers,
 * - prevent stale readings from being extrapolated,
 * - ignore SEED rainfall whenever real observations exist,
 * - preserve legitimate zero-rainfall values.
 */
async function latestFeatures() {

  const [rain, water, drain] = await Promise.all([

    query(`
      WITH raw AS (

        SELECT
          sensor_id,

          COALESCE(source, 'UNKNOWN') AS source,

          recorded_at,

          GREATEST(
            COALESCE(rainfall_mm_hr::float, 0),
            0
          ) AS rate,

          LEAD(recorded_at) OVER (
            PARTITION BY
              sensor_id,
              COALESCE(source, 'UNKNOWN')
            ORDER BY recorded_at
          ) AS next_at,

          MAX(recorded_at) OVER (
            PARTITION BY
              sensor_id,
              COALESCE(source, 'UNKNOWN')
          ) AS latest_at

        FROM rainfall_readings

        WHERE
          recorded_at >= NOW() - INTERVAL '24 hours'

          AND (

            /*
             * Use SEED data only when no genuine source has supplied
             * rainfall during the last 24 hours.
             */
            COALESCE(source, 'UNKNOWN') <> 'SEED'

            OR NOT EXISTS (
              SELECT 1
              FROM rainfall_readings rr2
              WHERE
                COALESCE(rr2.source, 'UNKNOWN') <> 'SEED'
                AND rr2.recorded_at >= NOW() - INTERVAL '24 hours'
            )

          )
      ),


      segments AS (

        SELECT
          sensor_id,
          source,
          recorded_at,
          rate,

          CASE

            /*
             * Historical observations can be integrated only when
             * another observation arrived within a plausible interval.
             *
             * WEATHER_API observations may naturally be roughly hourly.
             */
            WHEN
              next_at IS NOT NULL
              AND next_at > recorded_at
              AND next_at - recorded_at <=
                CASE
                  WHEN source = 'WEATHER_API'
                    THEN INTERVAL '90 minutes'

                  WHEN source = 'SEED'
                    THEN INTERVAL '4 hours'

                  ELSE INTERVAL '30 minutes'
                END

            THEN next_at


            /*
             * The latest live observation has no next observation yet.
             *
             * Allow it to represent current conditions only while it
             * remains fresh, and never extrapolate it beyond 5 minutes.
             */
            WHEN
              recorded_at = latest_at
              AND recorded_at >= NOW() - INTERVAL '15 minutes'

            THEN LEAST(
              NOW(),
              recorded_at + INTERVAL '5 minutes'
            )


            /*
             * A stale/disconnected reading gets no artificial future
             * duration.
             */
            ELSE recorded_at

          END AS end_at

        FROM raw
      ),


      per_sensor_source AS (

        SELECT
          sensor_id,
          source,


          /*
           * Accumulated rainfall over the last 15 minutes.
           */
          COALESCE(
            SUM(
              CASE

                WHEN
                  end_at > recorded_at
                  AND end_at > NOW() - INTERVAL '15 minutes'

                THEN

                  rate
                  *
                  EXTRACT(
                    EPOCH FROM (
                      LEAST(end_at, NOW())
                      -
                      GREATEST(
                        recorded_at,
                        NOW() - INTERVAL '15 minutes'
                      )
                    )
                  )
                  / 3600.0

                ELSE 0

              END
            ),
            0
          ) AS acc_15m,


          /*
           * Accumulated rainfall over the last hour.
           */
          COALESCE(
            SUM(
              CASE

                WHEN
                  end_at > recorded_at
                  AND end_at > NOW() - INTERVAL '1 hour'

                THEN

                  rate
                  *
                  EXTRACT(
                    EPOCH FROM (
                      LEAST(end_at, NOW())
                      -
                      GREATEST(
                        recorded_at,
                        NOW() - INTERVAL '1 hour'
                      )
                    )
                  )
                  / 3600.0

                ELSE 0

              END
            ),
            0
          ) AS acc_1h,


          /*
           * Accumulated rainfall over the last 3 hours.
           */
          COALESCE(
            SUM(
              CASE

                WHEN
                  end_at > recorded_at
                  AND end_at > NOW() - INTERVAL '3 hours'

                THEN

                  rate
                  *
                  EXTRACT(
                    EPOCH FROM (
                      LEAST(end_at, NOW())
                      -
                      GREATEST(
                        recorded_at,
                        NOW() - INTERVAL '3 hours'
                      )
                    )
                  )
                  / 3600.0

                ELSE 0

              END
            ),
            0
          ) AS acc_3h,


          /*
           * Accumulated rainfall over the last 24 hours.
           */
          COALESCE(
            SUM(
              CASE

                WHEN
                  end_at > recorded_at
                  AND end_at > NOW() - INTERVAL '24 hours'

                THEN

                  rate
                  *
                  EXTRACT(
                    EPOCH FROM (
                      LEAST(end_at, NOW())
                      -
                      GREATEST(
                        recorded_at,
                        NOW() - INTERVAL '24 hours'
                      )
                    )
                  )
                  / 3600.0

                ELSE 0

              END
            ),
            0
          ) AS acc_24h

        FROM segments

        GROUP BY
          sensor_id,
          source
      )


      /*
       * Multiple stations/providers may observe the same storm.
       *
       * Do NOT add them together because that would double-count
       * rainfall geographically.
       *
       * For city-level emergency risk we use the strongest observed
       * station/provider accumulation.
       */
      SELECT
        COALESCE(MAX(acc_15m), 0)::float AS rain_15m,
        COALESCE(MAX(acc_1h), 0)::float AS rain_1h,
        COALESCE(MAX(acc_3h), 0)::float AS rain_3h,
        COALESCE(MAX(acc_24h), 0)::float AS rain_24h

      FROM per_sensor_source
    `),


    query(`
      SELECT
        water_level_percent AS value
      FROM water_level_readings
      ORDER BY recorded_at DESC
      LIMIT 1
    `),


    query(`
      SELECT
        AVG(available_capacity_percent) AS capacity,

        AVG(
          CASE
            WHEN blockage THEN 1
            ELSE 0
          END
        ) AS blockage

      FROM drains
    `)

  ]);


  const rainData = rain.rows[0] ?? {};


  /*
   * IMPORTANT:
   *
   * Use ?? rather than ||.
   *
   * 0 mm rainfall is a valid observation.
   *
   * 0 || fallback  -> fallback     WRONG
   * 0 ?? fallback  -> 0            CORRECT
   */
  const rainfall_15m = Number(
    rainData.rain_15m ?? fallback.rainfall_15m
  );

  const rainfall_1h = Number(
    rainData.rain_1h ?? fallback.rainfall_1h
  );

  const rainfall_3h = Number(
    rainData.rain_3h ?? fallback.rainfall_3h
  );

  const rainfall_24h = Number(
    rainData.rain_24h ?? fallback.rainfall_24h
  );


  const waterLevel = Number(
    water.rows[0]?.value ?? fallback.water_level
  );


  const capacity = Number(
    drain.rows[0]?.capacity ?? fallback.drain_capacity
  );


  const blockage = Number(
    drain.rows[0]?.blockage ?? fallback.blockage
  );


  return {
    ...fallback,

    rainfall_15m,
    rainfall_1h,
    rainfall_3h,
    rainfall_24h,

    water_level: waterLevel,
    drain_capacity: capacity,
    blockage
  };
}


/**
 * Direct XGBoost prediction endpoint.
 *
 * Explicitly supplied values override development fallbacks.
 */
export async function predict(req, res) {

  const features = {
    ...fallback,
    ...(req.body ?? {})
  };


  const result = await predictFlood(features);
  const source = 'fastapi-xgboost';
  const governed = await governFloodInference(
    features,
    result,
    source
  );

  if (governed.blocked) {
    return res.status(governed.status).json(governed);
  }


  res.json({
    features,
    result,
    source,
    inference: governed.inference
  });
}


/**
 * Current live flood risk.
 *
 * Builds features from the latest PostgreSQL observations and sends
 * them to the FastAPI/XGBoost model.
 */
export async function currentRisk(req, res) {

  const features = await latestFeatures();

  const result = await predictFlood(features);
  const source = 'fastapi-xgboost';
  const governed = await governFloodInference(
    features,
    result,
    source
  );

  if (governed.blocked) {
    return res.status(governed.status).json(governed);
  }


  res.json({
    features,
    result,
    source,
    inference: governed.inference
  });
}


/**
 * HydroFusion multi-signal decision-support endpoint.
 *
 * Important:
 * Some signals remain development heuristics until genuine external
 * observations become available.
 *
 * These values must therefore not be represented as independently
 * measured real-world observations.
 */
export async function fusion(req, res) {

  const base = await latestFeatures();

  const body = req.body ?? {};


  /*
   * Count citizen reports generated during the previous two hours.
   *
   * If the reports table is temporarily unavailable, degrade
   * gracefully instead of crashing HydroFusion.
   */
  const citizenReportResult = await query(`
    SELECT
      COUNT(*)::int AS count
    FROM reports
    WHERE created_at >= NOW() - INTERVAL '2 hours'
  `).catch(() => ({
    rows: [
      {
        count: 0
      }
    ]
  }));


  const citizenReports2h = Number(
    citizenReportResult.rows[0]?.count ?? 0
  );


  const features = {

    ...base,

    /*
     * Explicit API values can override automatically generated values.
     */
    ...body,


    /*
     * DEVELOPMENT HEURISTIC:
     *
     * Until the weather intelligence layer supplies an explicit
     * 3-hour forecast, estimate it from recent accumulation.
     */
    forecast_rain_3h: Number(
      body.forecast_rain_3h
      ??
      base.rainfall_3h * 1.2
    ),


    /*
     * 0 means that no satellite flood evidence has been supplied.
     *
     * It must NOT be presented as a live Sentinel measurement.
     */
    satellite_water_index: Number(
      body.satellite_water_index ?? 0
    ),


    /*
     * DEVELOPMENT HEURISTIC:
     *
     * Replace later with measured/modelled soil-moisture data.
     */
    soil_saturation: Number(
      body.soil_saturation
      ??
      Math.min(
        100,
        base.rainfall_24h * 0.4 + 40
      )
    ),


    sensor_anomaly_score: Number(
      body.sensor_anomaly_score ?? 0
    ),


    citizen_reports_2h: Number(
      body.citizen_reports_2h
      ??
      citizenReports2h
    )

  };


  const result = await predictFusion(features);
  const source = 'fastapi-hydrofusion';
  const governed = await governFusionInference(
    features,
    result,
    source
  );

  if (governed.blocked) {
    return res.status(governed.status).json(governed);
  }


  res.json({
    features,
    result,
    source,
    inference: governed.inference
  });
}

const PHASE25_FUSION_VERSION = 'phase25-transparent-fusion-v1';

const PHASE25_WEIGHTS = {
  xgboost_flood_probability: 0.28,
  vision_detection: 0.12,
  rainfall_intensity: 0.12,
  water_level: 0.14,
  drainage_stress: 0.10,
  blockage_state: 0.08,
  incident_history: 0.08,
  gis_zone_context: 0.08
};


function phase25Clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value)));
}


function phase25Zone(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/(\d+)/);

  if (!match) return null;

  const number = Number(match[1]);

  if (!Number.isInteger(number) || number < 1 || number > 99) {
    return null;
  }

  return {
    label: `Zone ${number}`,
    code: `ZONE-${String(number).padStart(2, '0')}`
  };
}


function phase25RiskLevel(score) {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}


function phase25Factor({
  key,
  label,
  value,
  available,
  source,
  normalization,
  provenance
}) {
  return {
    key,
    label,
    value: available ? phase25Clamp(value) : null,
    available,
    base_weight: PHASE25_WEIGHTS[key],
    source,
    normalization,
    provenance
  };
}


export async function multimodalRisk(req, res) {
  const zone = phase25Zone(
    req.body?.zone ??
    req.query?.zone
  );

  if (!zone) {
    return res.status(400).json({
      message: (
        'zone is required, for example "Zone 4" or "ZONE-04"'
      )
    });
  }

  const [
    gisResult,
    drainResult,
    sensorResult,
    incidentResult,
    visionResult
  ] = await Promise.all([
    query(
      `SELECT
         zone_code,
         risk_level,
         risk_score::float AS risk_score,
         updated_at
       FROM flood_zones
       WHERE zone_code = $1
       LIMIT 1`,
      [zone.code]
    ),

    query(
      `SELECT
         COUNT(*)::int AS drain_count,
         COALESCE(AVG(water_level_percent), 0)::float AS avg_water_level,
         COALESCE(AVG(available_capacity_percent), 100)::float AS avg_capacity,
         COUNT(*) FILTER (WHERE blockage)::int AS blocked_count
       FROM drains
       WHERE LOWER(zone) = LOWER($1)`,
      [zone.label]
    ),

    query(
      `SELECT
         COUNT(*)::int AS sensor_count,
         AVG(rr.rainfall_mm_hr)::float AS rainfall_mm_hr,
         AVG(wl.water_level_percent)::float AS water_level_percent
       FROM sensors s
       LEFT JOIN LATERAL (
         SELECT rainfall_mm_hr
         FROM rainfall_readings r
         WHERE r.sensor_id = s.id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) rr ON TRUE
       LEFT JOIN LATERAL (
         SELECT water_level_percent
         FROM water_level_readings w
         WHERE w.sensor_id = s.id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) wl ON TRUE
       WHERE LOWER(s.zone) = LOWER($1)`,
      [zone.label]
    ),

    query(
      `SELECT
         COUNT(*) FILTER (
           WHERE status NOT IN ('RESOLVED', 'CLOSED')
         )::int AS active_count,
         COUNT(*) FILTER (
           WHERE created_at >= NOW() - INTERVAL '30 days'
         )::int AS recent_30d_count,
         COALESCE(AVG(risk_score), 0)::float AS avg_risk_score
       FROM incidents
       WHERE LOWER(COALESCE(zone_name, '')) = LOWER($1)`,
      [zone.label]
    ),

    query(
      `SELECT
         p.id AS prediction_id,
         p.output,
         p.confidence::float AS confidence,
         p.created_at,
         m.id AS model_id,
         m.model_name,
         m.version,
         m.status,
         m.dataset_version
       FROM ai_predictions p
       LEFT JOIN ai_model_registry m
         ON m.id = p.model_id
       WHERE p.prediction_type = 'vision-detection'
         AND LOWER(COALESCE(p.input_features->>'zone', '')) = LOWER($1)
         AND p.created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [zone.label]
    )
  ]);

  const gis = gisResult.rows[0];

  if (!gis) {
    return res.status(404).json({
      message: `No GIS flood zone found for ${zone.code}`
    });
  }

  const floodFeatures = await latestFeatures();
  const floodResult = await predictFlood(floodFeatures);
  const floodGovernance = await governFloodInference(
    floodFeatures,
    floodResult,
    'fastapi-xgboost-phase25'
  );

  if (floodGovernance.blocked) {
    return res
      .status(floodGovernance.status)
      .json(floodGovernance);
  }

  const drains = drainResult.rows[0] ?? {};
  const sensors = sensorResult.rows[0] ?? {};
  const incidents = incidentResult.rows[0] ?? {};
  const visionPrediction = visionResult.rows[0] ?? null;

  const drainCount = Number(drains.drain_count ?? 0);
  const blockedCount = Number(drains.blocked_count ?? 0);
  const rainfallAvailable = sensors.rainfall_mm_hr != null;
  const waterSensorAvailable = sensors.water_level_percent != null;
  const drainAvailable = drainCount > 0;

  const operationalWaterLevel = waterSensorAvailable
    ? Number(sensors.water_level_percent)
    : (
        drainAvailable
          ? Number(drains.avg_water_level)
          : null
      );

  const visionOutput = visionPrediction?.output ?? null;
  const visionHasTarget = Boolean(
    visionOutput &&
    visionOutput.label &&
    visionOutput.label !== 'no_target_detected'
  );

  const visionSignal = visionPrediction
    ? (
        visionHasTarget
          ? Number(visionOutput.confidence ?? 0) * 100
          : 0
      )
    : null;

  const factors = [
    phase25Factor({
      key: 'xgboost_flood_probability',
      label: 'XGBoost flood probability',
      value: Number(floodResult.probability ?? 0) * 100,
      available: true,
      source: 'governed-xgboost',
      normalization: 'model output probability multiplied by 100',
      provenance: {
        prediction_id: floodGovernance.inference.prediction_id,
        model_name: floodGovernance.inference.model_name,
        model_version: floodGovernance.inference.model_version,
        model_status: floodGovernance.inference.model_status,
        dataset_version: floodGovernance.inference.dataset_version,
        mode: floodGovernance.inference.mode
      }
    }),

    phase25Factor({
      key: 'vision_detection',
      label: 'YOLO vision detection',
      value: visionSignal,
      available: Boolean(visionPrediction),
      source: 'governed-yolo',
      normalization: (
        'latest same-zone detection confidence within 24h multiplied by 100; ' +
        'no_target_detected maps to 0'
      ),
      provenance: visionPrediction
        ? {
            prediction_id: visionPrediction.prediction_id,
            model_id: visionPrediction.model_id,
            model_name: visionPrediction.model_name,
            model_version: visionPrediction.version,
            model_status: visionPrediction.status,
            dataset_version: visionPrediction.dataset_version,
            created_at: visionPrediction.created_at
          }
        : {
            status: 'NOT_AVAILABLE',
            reason: 'No same-zone governed vision prediction in previous 24 hours'
          }
    }),

    phase25Factor({
      key: 'rainfall_intensity',
      label: 'Rainfall intensity',
      value: sensors.rainfall_mm_hr,
      available: rainfallAvailable,
      source: 'sensor-readings',
      normalization: 'development linear clip: 0-100 mm/hr maps to 0-100',
      provenance: {
        zone: zone.label,
        sensor_count: Number(sensors.sensor_count ?? 0)
      }
    }),

    phase25Factor({
      key: 'water_level',
      label: 'Water level',
      value: operationalWaterLevel,
      available: operationalWaterLevel != null,
      source: waterSensorAvailable
        ? 'water-level-sensor'
        : 'drain-observation',
      normalization: 'existing 0-100 percent measurement used directly',
      provenance: {
        zone: zone.label,
        fallback_to_drain_average: !waterSensorAvailable && drainAvailable
      }
    }),

    phase25Factor({
      key: 'drainage_stress',
      label: 'Drainage capacity stress',
      value: drainAvailable
        ? 100 - Number(drains.avg_capacity)
        : null,
      available: drainAvailable,
      source: 'drains',
      normalization: '100 minus average available drain capacity percent',
      provenance: {
        zone: zone.label,
        drain_count: drainCount,
        avg_available_capacity: drainAvailable
          ? Number(drains.avg_capacity)
          : null
      }
    }),

    phase25Factor({
      key: 'blockage_state',
      label: 'Drain blockage prevalence',
      value: drainAvailable
        ? (blockedCount / drainCount) * 100
        : null,
      available: drainAvailable,
      source: 'drains',
      normalization: 'blocked drains divided by drains in zone, multiplied by 100',
      provenance: {
        zone: zone.label,
        blocked_count: blockedCount,
        drain_count: drainCount
      }
    }),

    phase25Factor({
      key: 'incident_history',
      label: 'Incident history',
      value: phase25Clamp(
        Number(incidents.active_count ?? 0) * 20 +
        Number(incidents.recent_30d_count ?? 0) * 5
      ),
      available: true,
      source: 'incidents',
      normalization: (
        'development index: active incidents x20 plus recent-30-day incidents x5, capped at 100'
      ),
      provenance: {
        zone: zone.label,
        active_incidents: Number(incidents.active_count ?? 0),
        recent_30d_incidents: Number(incidents.recent_30d_count ?? 0),
        avg_historical_risk_score: Number(incidents.avg_risk_score ?? 0)
      }
    }),

    phase25Factor({
      key: 'gis_zone_context',
      label: 'GIS flood-zone context',
      value: Number(gis.risk_score),
      available: true,
      source: 'flood_zones',
      normalization: 'existing GIS zone risk score used directly',
      provenance: {
        zone_code: gis.zone_code,
        gis_risk_level: gis.risk_level,
        updated_at: gis.updated_at
      }
    })
  ];

  const availableFactors = factors.filter(
    factor => factor.available
  );

  const availableWeight = availableFactors.reduce(
    (sum, factor) => sum + factor.base_weight,
    0
  );

  const scoredFactors = factors.map(factor => {
    const effectiveWeight = factor.available && availableWeight > 0
      ? factor.base_weight / availableWeight
      : 0;

    return {
      ...factor,
      effective_weight: Number(
        (effectiveWeight * 100).toFixed(1)
      ),
      weighted_points: factor.available
        ? Number(
            (
              factor.value *
              effectiveWeight
            ).toFixed(2)
          )
        : 0
    };
  });

  const riskScore = Number(
    scoredFactors
      .reduce(
        (sum, factor) =>
          sum + Number(factor.weighted_points ?? 0),
        0
      )
      .toFixed(1)
  );

  const riskLevel = phase25RiskLevel(riskScore);

  const result = {
    fusion_version: PHASE25_FUSION_VERSION,
    zone: zone.label,
    zone_code: zone.code,
    risk_score: riskScore,
    risk_level: riskLevel,
    calibrated_probability: false,
    trained_model: false,
    production_eligible: false,
    mode: 'development-baseline',
    factors: scoredFactors,
    available_signal_count: availableFactors.length,
    total_signal_count: factors.length,
    missing_signals: scoredFactors
      .filter(factor => !factor.available)
      .map(factor => factor.key),
    weighting: {
      configured_weights: PHASE25_WEIGHTS,
      method: (
        'Configured development weights are renormalized across available signals.'
      )
    },
    decision: {
      automatic_incident_created: false,
      automatic_alert_created: false,
      operator_review_required: true
    },
    limitations: [
      (
        'This weighted score is an explainable development baseline, not a ' +
        'statistically calibrated flood probability.'
      ),
      (
        'Normalisation rules and weights must be calibrated and validated ' +
        'against labeled local historical events before production use.'
      ),
      (
        'YOLO is excluded when no same-zone governed detection is available.'
      ),
      (
        'The XGBoost component uses the current governed platform prediction; ' +
        'operational GIS, sensor, drain, and incident context is zone-specific.'
      )
    ]
  };

  const saved = await query(
    `INSERT INTO ai_predictions
      (model_id, prediction_type, input_features, output, confidence, source)
     VALUES ($1, $2, $3, $4, NULL, $5)
     RETURNING id, created_at`,
    [
      floodGovernance.inference.registry_model_id ?? null,
      'multimodal-risk-fusion',
      {
        zone: zone.label,
        zone_code: zone.code
      },
      result,
      'backend-phase25-fusion'
    ]
  );

  res.json({
    ...result,
    provenance: {
      decision_prediction_id: saved.rows[0].id,
      decision_timestamp: saved.rows[0].created_at,
      source: 'backend-phase25-fusion',
      base_registry_model_id: (
        floodGovernance.inference.registry_model_id
      )
    }
  });
}
