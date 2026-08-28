import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA==='true';
export async function getFloodZones(){if(USE_MOCKS)return null;const {data}=await api.get('/gis/flood-zones');return data}
export async function getDrains(){if(USE_MOCKS)return null;const {data}=await api.get('/gis/drains');return data}
export async function getRoads(){if(USE_MOCKS)return null;const {data}=await api.get('/gis/roads');return data}
export async function getSensors(){if(USE_MOCKS)return null;const {data}=await api.get('/gis/sensors');return data}
export default {getFloodZones,getDrains,getRoads,getSensors};
