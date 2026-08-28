import api from './api';
export async function getSystemHealth(){const response=await api.get('/system/health');return response.data;}
export default { getSystemHealth };
