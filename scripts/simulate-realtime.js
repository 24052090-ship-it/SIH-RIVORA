import axios from 'axios';

const base = process.env.AQUAGUARD_API_URL || 'http://localhost:5000';
const key = process.env.DEVICE_API_KEY || 'phase3-device-key-change-me';
const sensorCode = process.env.SENSOR_CODE || 'SN-104';
const rounds = Number(process.env.ROUNDS || 5);

for (let i = 0; i < rounds; i += 1) {
  const rainfall = Number((45 + i * 12 + Math.random() * 8).toFixed(1));
  const water = Number((58 + i * 8 + Math.random() * 6).toFixed(1));
  const health = Math.max(65, 96 - i * 3);
  const response = await axios.post(`${base}/api/telemetry/ingest/sensor`, { sensorCode, rainfallMmHr: rainfall, waterLevelPercent: water, health, status: health < 75 ? 'warning' : 'online' }, { headers: { 'x-device-key': key } });
  console.log(`[realtime] ${sensorCode}: rainfall=${rainfall}mm/hr water=${water}% accepted=${response.data.accepted}`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
