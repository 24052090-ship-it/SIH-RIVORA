import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA==='true';
export const getReports=async(params={})=>{if(USE_MOCKS)return null;const {data}=await api.get('/reports',{params});return data};
export const createReport=async(payload)=>{if(USE_MOCKS)return {id:`RPT-${Date.now()}`,...payload,status:'Submitted'};const {data}=await api.post('/reports',payload);return data};
export default {getReports,createReport};
