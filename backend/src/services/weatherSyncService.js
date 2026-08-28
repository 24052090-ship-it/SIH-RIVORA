import { query } from '../db/pool.js';
import { env } from '../config/env.js';

function pickLatestIndex(times, now = new Date()) {
  let best = -1;
  let bestTime = -Infinity;
  for (let i = 0; i < times.length; i += 1) {
    const t = Date.parse(times[i]);
    if (Number.isFinite(t) && t <= now.getTime() && t > bestTime) {
      best = i;
      bestTime = t;
    }
  }
  return best === -1 ? times.length - 1 : best;
}

export async function syncOpenMeteo() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(env.weatherLatitude));
  url.searchParams.set('longitude', String(env.weatherLongitude));
  url.searchParams.set('hourly', 'precipitation,temperature_2m,relative_humidity_2m,surface_pressure');
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', env.weatherTimezone);

  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
  const data = await response.json();
  const h = data.hourly || {};
  const index = pickLatestIndex(h.time || []);
  if (index < 0) throw new Error('Open-Meteo returned no hourly observations');

  const observedAt = new Date(h.time[index]);
  const rainfall = Number(h.precipitation?.[index] ?? 0);
  const temperature = Number(h.temperature_2m?.[index] ?? 0);
  const humidity = Number(h.relative_humidity_2m?.[index] ?? 0);
  const pressure = Number(h.surface_pressure?.[index] ?? 0);

  await query(`INSERT INTO weather_observations(source,station_code,latitude,longitude,observed_at,rainfall_mm_hr,temperature_c,humidity_percent,pressure_hpa,raw)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT(source,station_code,observed_at) DO NOTHING`, [
    'OPEN_METEO', env.weatherStationCode, env.weatherLatitude, env.weatherLongitude,
    observedAt.toISOString(), rainfall, temperature, humidity, pressure, JSON.stringify({ units: data.hourly_units, source: 'Open-Meteo' })
  ]);

  const sensor = await query(`SELECT id FROM sensors WHERE sensor_code=$1 LIMIT 1`, [env.weatherStationCode]);
  if (sensor.rowCount) {
    await query(`INSERT INTO rainfall_readings(sensor_id,rainfall_mm_hr,recorded_at,source) VALUES($1,$2,$3,'WEATHER_API')
      ON CONFLICT DO NOTHING`, [sensor.rows[0].id, rainfall, observedAt.toISOString()]);
    await query(`UPDATE sensors SET last_seen_at=NOW(), status='ONLINE', provider='Open-Meteo' WHERE id=$1`, [sensor.rows[0].id]);
  }

  return { source: 'OPEN_METEO', stationCode: env.weatherStationCode, observedAt: observedAt.toISOString(), rainfallMmHr: rainfall, temperatureC: temperature, humidityPercent: humidity, pressureHpa: pressure };
}

export function startWeatherSync() {
  if (!env.weatherSyncEnabled) return null;
  const run = () => syncOpenMeteo().then(r => console.log(`[weather] ${r.observedAt} ${r.rainfallMmHr} mm/hr`)).catch(e => console.error('[weather] sync failed:', e.message));
  run();
  return setInterval(run, env.weatherSyncIntervalMs);
}
