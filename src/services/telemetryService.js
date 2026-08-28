import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA==='true';
export async function getLiveTelemetry(){if(USE_MOCKS)return null;const {data}=await api.get('/telemetry/live');return data}
export async function getWeatherObservations(params={}){if(USE_MOCKS)return null;const {data}=await api.get('/telemetry/weather',{params});return data}
export async function syncWeather(){const {data}=await api.post('/telemetry/weather/sync');return data}
export default {getLiveTelemetry,getWeatherObservations,syncWeather};
