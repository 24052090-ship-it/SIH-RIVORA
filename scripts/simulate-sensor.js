const api = process.env.AQUAGUARD_API_URL || 'http://localhost:5000/api';
const key = process.env.DEVICE_API_KEY || 'phase3-device-key-change-me';
const sensorCode = process.env.SENSOR_CODE || 'SN-104';
const rainfall = Number(process.env.RAINFALL_MM_HR || (45 + Math.random() * 35).toFixed(1));
const water = Number(process.env.WATER_LEVEL_PERCENT || (65 + Math.random() * 25).toFixed(1));
const payload = {sensorCode,rainfallMmHr:rainfall,waterLevelPercent:water,health:98,status:'ONLINE'};
const response = await fetch(`${api}/telemetry/ingest/sensor`,{method:'POST',headers:{'Content-Type':'application/json','x-device-key':key},body:JSON.stringify(payload)});
console.log(await response.text());
if(!response.ok)process.exit(1);
