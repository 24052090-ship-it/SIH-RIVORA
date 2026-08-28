import { query, pool } from '../db/pool.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { syncOpenMeteo } from '../services/weatherSyncService.js';
import { publishSensorUpdate, publishRiskUpdate } from '../realtime/eventEngine.js';

export async function rainfall(req,res){
  const limit=Math.min(Math.max(Number(req.query.limit||24),1),200);
  const {rows}=await query(`SELECT TO_CHAR(recorded_at AT TIME ZONE 'Asia/Kolkata','HH24:MI') time,
    rainfall_mm_hr::float value, recorded_at, source, COALESCE(s.sensor_code,'EXTERNAL') sensor_code
    FROM rainfall_readings r LEFT JOIN sensors s ON s.id=r.sensor_id
    ORDER BY recorded_at DESC LIMIT $1`,[limit]);
  res.json(rows.reverse());
}

export async function currentRisk(req,res){
  const {rows}=await query(`SELECT zone_code zone, risk_level level, risk_score::float score FROM flood_zones ORDER BY risk_score DESC LIMIT 1`);
  const r=rows[0]||{zone:'ZONE-04',level:'CRITICAL',score:91};
  res.json({...r,probability:r.score/100,updatedAt:new Date().toISOString(),factors:[{label:'Rainfall intensity',value:92,tone:'danger'},{label:'Drain occupancy',value:87,tone:'warning'},{label:'Blocked drainage',value:83,tone:'danger'},{label:'Elevation exposure',value:76,tone:'warning'},{label:'Historical incidents',value:81,tone:'info'}]});
}

export async function liveTelemetry(req,res){
  const {rows}=await query(`SELECT s.sensor_code id,s.type,s.zone,s.status,s.health,
    ST_Y(s.location::geometry) latitude,ST_X(s.location::geometry) longitude,
    s.last_seen_at,
    lr.rainfall_mm_hr::float rainfall_mm_hr,
    wr.water_level_percent::float water_level_percent
    FROM sensors s
    LEFT JOIN LATERAL (SELECT rainfall_mm_hr FROM rainfall_readings r WHERE r.sensor_id=s.id ORDER BY recorded_at DESC LIMIT 1) lr ON TRUE
    LEFT JOIN LATERAL (SELECT water_level_percent FROM water_level_readings w WHERE w.sensor_id=s.id ORDER BY recorded_at DESC LIMIT 1) wr ON TRUE
    ORDER BY s.sensor_code`);
  const drains = await query(`SELECT drain_code id,zone,water_level_percent::float water_level,available_capacity_percent::float capacity,blockage,severity,status,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude FROM drains ORDER BY severity DESC`);
  
  const now = Date.now();
  const sensors = rows.map(r => {
    let ageSeconds = null;
    let freshnessStatus = 'OFFLINE';
    if (r.last_seen_at) {
      ageSeconds = Math.max(0, Math.floor((now - new Date(r.last_seen_at).getTime()) / 1000));
      if (ageSeconds < 60) freshnessStatus = 'FRESH';
      else if (ageSeconds <= 180) freshnessStatus = 'DELAYED';
      else if (ageSeconds <= 600) freshnessStatus = 'STALE';
    }
    return {
      ...r,
      lastSeenAt: r.last_seen_at,
      ageSeconds,
      freshnessStatus,
      rainfallMmHr: r.rainfall_mm_hr,
      waterLevelPercent: r.water_level_percent
    };
  });

  res.json({sensors, drains: drains.rows, receivedAt: new Date().toISOString()});
}

export async function weatherObservations(req,res){
  const limit=Math.min(Math.max(Number(req.query.limit||24),1),168);
  const {rows}=await query(`SELECT observed_at,station_code,rainfall_mm_hr::float rainfall_mm_hr,temperature_c::float temperature_c,humidity_percent::float humidity_percent,pressure_hpa::float pressure_hpa,source FROM weather_observations ORDER BY observed_at DESC LIMIT $1`,[limit]);
  res.json(rows.reverse());
}

export async function syncWeather(req,res){
  const result=await syncOpenMeteo();
  res.json(result);
}

export async function ingestSensor(req,res){
  if(req.headers['x-device-key']!==env.deviceApiKey)return res.status(401).json({error:'Invalid device key'});
  const {sensorCode,rainfallMmHr,waterLevelPercent,health,status,recordedAt}=req.body;
  if(!sensorCode)return res.status(400).json({error:'sensorCode is required'});
  const sensor=await query('SELECT id FROM sensors WHERE sensor_code=$1',[sensorCode]);
  if(!sensor.rowCount)return res.status(404).json({error:'Unknown sensor. Register the sensor before ingestion.'});
  const id=sensor.rows[0].id; const ts=recordedAt||new Date().toISOString();
  await query('BEGIN');
  try {
    if(rainfallMmHr!==undefined) await query(`INSERT INTO rainfall_readings(sensor_id,rainfall_mm_hr,recorded_at,source) VALUES($1,$2,$3,'IOT')`,[id,Number(rainfallMmHr),ts]);
    if(waterLevelPercent!==undefined) await query(`INSERT INTO water_level_readings(sensor_id,water_level_percent,recorded_at,source) VALUES($1,$2,$3,'IOT')`,[id,Number(waterLevelPercent),ts]);
    await query(`UPDATE sensors SET last_seen_at=NOW(), health=COALESCE($2,health), status=COALESCE($3,status) WHERE id=$1`,[id,health===undefined?null:Number(health),status||null]);
    await query(`INSERT INTO telemetry_events(sensor_id,event_type,payload) VALUES($1,'SENSOR_READING',$2)`,[id,JSON.stringify(req.body)]);
    await query('COMMIT');
  } catch(error){await query('ROLLBACK');throw error;}
  await publishSensorUpdate(req.app.get('io'), sensorCode);
  await publishRiskUpdate(req.app.get('io'));
  res.status(202).json({accepted:true,sensorCode,receivedAt:new Date().toISOString()});
}


function secureDeviceKey(provided) {
  const expected = String(env.deviceApiKey || '');
  const actual = String(provided || '');
  if (!expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function deviceTransportIsSecure(req) {
  if (!env.deviceRequireTls) return true;
  return req.secure;
}

function phase27TelemetryPayload(body = {}) {
  const required = [
    'deviceId',
    'timestampUtc',
    'latitude',
    'longitude',
    'rainfallMmHr',
    'waterLevelCm',
    'batteryPct',
    'signalRssi'
  ];

  const missing = required.filter(
    key => body[key] === undefined || body[key] === null || body[key] === ''
  );

  if (missing.length) {
    return {
      ok: false,
      status: 400,
      error: `Missing fields: ${missing.join(', ')}`
    };
  }

  const deviceId = String(body.deviceId).trim();
  const timestampText = String(body.timestampUtc).trim();
  const timestampMs = Date.parse(timestampText);

  if (!deviceId) {
    return { ok: false, status: 400, error: 'Invalid deviceId' };
  }

  if (!Number.isFinite(timestampMs) || !/Z$/i.test(timestampText)) {
    return {
      ok: false,
      status: 400,
      error: 'timestampUtc must be a valid UTC timestamp ending in Z'
    };
  }

  const now = Date.now();

  if (timestampMs > now + env.deviceMaxClockSkewMs) {
    return {
      ok: false,
      status: 400,
      error: 'Device timestamp is too far in the future'
    };
  }

  if (timestampMs < now - env.deviceMaxBufferAgeMs) {
    return {
      ok: false,
      status: 400,
      error: 'Device timestamp is older than the configured offline buffer window'
    };
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const rainfallMmHr = Number(body.rainfallMmHr);
  const waterLevelCm = Number(body.waterLevelCm);
  const batteryPct = Number(body.batteryPct);
  const signalRssi = Number(body.signalRssi);

  const checks = [
    [Number.isFinite(latitude) && latitude >= -90 && latitude <= 90, 'Invalid latitude'],
    [Number.isFinite(longitude) && longitude >= -180 && longitude <= 180, 'Invalid longitude'],
    [Number.isFinite(rainfallMmHr) && rainfallMmHr >= 0, 'Invalid rainfallMmHr'],
    [Number.isFinite(waterLevelCm) && waterLevelCm >= 0, 'Invalid waterLevelCm'],
    [Number.isFinite(batteryPct) && batteryPct >= 0 && batteryPct <= 100, 'Invalid batteryPct'],
    [Number.isFinite(signalRssi) && signalRssi >= -150 && signalRssi <= 0, 'Invalid signalRssi']
  ];

  for (const [valid, error] of checks) {
    if (!valid) return { ok: false, status: 400, error };
  }

  return {
    ok: true,
    value: {
      deviceId,
      timestampUtc: new Date(timestampMs).toISOString(),
      timestampMs,
      latitude,
      longitude,
      rainfallMmHr,
      waterLevelCm,
      batteryPct,
      signalRssi
    }
  };
}

function calibratedWaterPercent(metadata, waterLevelCm) {
  const maxCm = Number(
    metadata?.calibration?.waterLevelMaxCm ??
    metadata?.waterLevelMaxCm
  );

  if (!Number.isFinite(maxCm) || maxCm <= 0) {
    return { percent: null, applied: false, calibration: null };
  }

  return {
    percent: Math.max(0, Math.min(100, (waterLevelCm / maxCm) * 100)),
    applied: true,
    calibration: { waterLevelMaxCm: maxCm }
  };
}

export async function ingestDeviceTelemetry(req, res, next) {
  if (!deviceTransportIsSecure(req)) {
    return res.status(426).json({
      error: 'TLS is required for device telemetry ingestion'
    });
  }

  if (!secureDeviceKey(req.headers['x-device-key'])) {
    return res.status(401).json({ error: 'Invalid device key' });
  }

  const parsed = phase27TelemetryPayload(req.body || {});
  if (!parsed.ok) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  const payload = parsed.value;
  const replayKey = createHash('sha256')
    .update(`${payload.deviceId}|${payload.timestampUtc}`)
    .digest('hex');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sensor = await client.query(
      `SELECT id, sensor_code, metadata
       FROM sensors
       WHERE sensor_code = $1
       FOR UPDATE`,
      [payload.deviceId]
    );

    if (!sensor.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Unknown device. Register the sensor before ingestion.'
      });
    }

    const sensorRow = sensor.rows[0];

    const latest = await client.query(
      `SELECT device_timestamp
       FROM telemetry_events
       WHERE sensor_id = $1
         AND device_timestamp IS NOT NULL
       ORDER BY device_timestamp DESC
       LIMIT 1`,
      [sensorRow.id]
    );

    const latestTimestamp = latest.rows[0]?.device_timestamp
      ? new Date(latest.rows[0].device_timestamp).getTime()
      : null;

    if (
      Number.isFinite(latestTimestamp) &&
      payload.timestampMs <= latestTimestamp
    ) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Replay or non-monotonic device timestamp rejected',
        deviceId: payload.deviceId,
        latestAcceptedTimestampUtc: latest.rows[0].device_timestamp
      });
    }

    const water = calibratedWaterPercent(
      sensorRow.metadata || {},
      payload.waterLevelCm
    );

    await client.query(
      `INSERT INTO rainfall_readings
        (sensor_id, rainfall_mm_hr, recorded_at, source)
       VALUES ($1, $2, $3, 'IOT_PHASE27')`,
      [sensorRow.id, payload.rainfallMmHr, payload.timestampUtc]
    );

    await client.query(
      `INSERT INTO water_level_readings
        (sensor_id, water_level_percent, water_level_cm, recorded_at, source)
       VALUES ($1, $2, $3, $4, 'IOT_PHASE27')`,
      [
        sensorRow.id,
        water.percent,
        payload.waterLevelCm,
        payload.timestampUtc
      ]
    );

    const deviceMetadata = {
      phase27: {
        lastDeviceTimestampUtc: payload.timestampUtc,
        lastIngestedAtUtc: new Date().toISOString(),
        batteryPct: payload.batteryPct,
        signalRssi: payload.signalRssi,
        latitude: payload.latitude,
        longitude: payload.longitude,
        calibrationApplied: water.applied,
        calibration: water.calibration,
        authentication: 'x-device-key',
        transportPolicy: env.deviceRequireTls
          ? 'TLS_REQUIRED'
          : 'TLS_OPTIONAL_LOCAL_DEVELOPMENT'
      }
    };

    await client.query(
      `UPDATE sensors
       SET
         last_seen_at = NOW(),
         metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
       WHERE id = $1`,
      [sensorRow.id, JSON.stringify(deviceMetadata)]
    );

    await client.query(
      `INSERT INTO telemetry_events
        (sensor_id, event_type, payload, device_timestamp, replay_key)
       VALUES ($1, 'DEVICE_TELEMETRY', $2, $3, $4)`,
      [
        sensorRow.id,
        JSON.stringify({
          ...req.body,
          ingestion: {
            contract: 'phase27-device-telemetry-v1',
            calibrationApplied: water.applied,
            waterLevelPercent: water.percent
          }
        }),
        payload.timestampUtc,
        replayKey
      ]
    );

    await client.query('COMMIT');

    await publishSensorUpdate(req.app.get('io'), payload.deviceId);
    await publishRiskUpdate(req.app.get('io'));

    return res.status(202).json({
      accepted: true,
      contract: 'phase27-device-telemetry-v1',
      deviceId: payload.deviceId,
      deviceTimestampUtc: payload.timestampUtc,
      receivedAt: new Date().toISOString(),
      replayProtection: 'accepted-monotonic-timestamp',
      calibration: {
        waterLevelPercent: water.percent,
        applied: water.applied,
        note: water.applied
          ? 'Converted from cm using registered sensor calibration metadata.'
          : (
              'Raw waterLevelCm stored without inventing a percent conversion. ' +
              'Add calibration.waterLevelMaxCm to sensor metadata to enable conversion.'
            )
      },
      deviceHealth: {
        batteryPct: payload.batteryPct,
        signalRssi: payload.signalRssi
      }
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}

    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Replay telemetry rejected' });
    }

    next(error);
  } finally {
    client.release();
  }
}
