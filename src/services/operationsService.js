import api from './api';
export async function getOperationsOverview(){ const {data}=await api.get('/system/operations/overview'); return data; }
