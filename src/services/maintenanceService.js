import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA!=="false";
export const getMaintenance=async(params={})=>{if(USE_MOCKS)return null;const {data}=await api.get('/maintenance',{params});return data};
export default {getMaintenance};
