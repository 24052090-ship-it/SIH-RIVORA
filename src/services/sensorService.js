import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA==='true';
export const getSensors=async()=>{if(USE_MOCKS)return null;const {data}=await api.get('/gis/sensors');return data};
export default {getSensors};
