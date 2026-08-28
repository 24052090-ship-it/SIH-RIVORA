import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA==='true';
export const getRainfall=async(params={})=>{if(USE_MOCKS)return null;const {data}=await api.get('/rainfall',{params});return data};
export default {getRainfall};
