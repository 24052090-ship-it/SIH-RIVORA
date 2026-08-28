import api from './api';
export async function getMaintenancePredictions(){const {data}=await api.get('/maintenance/predictions');return data;}
export async function getAnalyticsSummary(){const {data}=await api.get('/analytics/summary');return data;}
export async function getAnalyticsTrends(days=7){const {data}=await api.get('/analytics/trends',{params:{days}});return data;}
export async function getSatelliteStatus(){const {data}=await api.get('/satellite/status');return data;}
export async function getSatelliteObservations(){const {data}=await api.get('/satellite/observations');return data;}
